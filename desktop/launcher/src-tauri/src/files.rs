//! Opening folders and files: portable storage folders go to GENSLATE Explorer when it is
//! installed, otherwise to the OS file manager; config files open in the default editor.

use std::path::{Path, PathBuf};

use genslate_core_launcher::catalog::{AppId, Source};
use genslate_core_launcher::launch::LaunchSpec;
use serde::Deserialize;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_opener::OpenerExt;

use crate::AppError;
use crate::state::Launcher;

/// Folders in the right-hand rail (`storage/users/shared/<Name>`), plus the storage root.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SharedFolder {
    Desktop,
    Documents,
    Downloads,
    Music,
    Pictures,
    Videos,
    Storage,
}

impl SharedFolder {
    /// Parses the slash-command spelling (`/folder documents`).
    pub fn parse(name: &str) -> Option<Self> {
        serde_json::from_value(serde_json::Value::String(name.to_ascii_lowercase())).ok()
    }

    fn path(self, profile: &Path, storage: &Path) -> PathBuf {
        let name = match self {
            Self::Desktop => "Desktop",
            Self::Documents => "Documents",
            Self::Downloads => "Downloads",
            Self::Music => "Music",
            Self::Pictures => "Pictures",
            Self::Videos => "Videos",
            Self::Storage => return storage.to_path_buf(),
        };
        profile.join(name)
    }
}

/// The launcher's own files the user can open.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConfigFile {
    Settings,
    Keybindings,
    Logs,
}

/// Opens a storage folder (created if missing) in GENSLATE Explorer or the OS file manager.
pub fn open_shared_folder<R: Runtime>(
    app: &AppHandle<R>,
    folder: SharedFolder,
) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    let path = folder.path(&launcher.profile_dir(), &launcher.paths.layout.storage);
    std::fs::create_dir_all(&path).map_err(|source| {
        AppError::Launcher(genslate_core_launcher::LauncherError::Write {
            path: path.clone(),
            source,
        })
    })?;
    open_in_file_manager(app, &path)
}

/// GENSLATE Explorer if it is installed, else the OS file manager.
pub fn open_in_file_manager<R: Runtime>(app: &AppHandle<R>, path: &Path) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    let explorer = launcher
        .catalog()
        .find(&AppId::new(Source::Genslate, "explorer"))
        .filter(|app| app.status.is_launchable())
        .cloned();
    if let Some(explorer) = explorer {
        let spec = LaunchSpec::resolve(
            &explorer,
            Some(vec![path.to_string_lossy().into_owned()]),
            &launcher.allowed_roots,
            launcher.roots.host,
        )?;
        spec.spawn()?;
        return Ok(());
    }
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(AppError::from)
}

/// Opens `config.toml`, `keybindings.toml` or the log folder. Files without an associated
/// editor are revealed in the file manager instead.
pub fn open_config<R: Runtime>(app: &AppHandle<R>, file: ConfigFile) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    let path = match file {
        ConfigFile::Settings => launcher.paths.config_file.clone(),
        ConfigFile::Keybindings => launcher.paths.keybindings_file.clone(),
        ConfigFile::Logs => return open_in_file_manager(app, &launcher.paths.log_dir),
    };
    if !path.exists() {
        genslate_core_launcher::metadata::write_atomic(&path, "")?;
    }
    if let Err(error) = app.opener().open_path(path.to_string_lossy(), None::<&str>) {
        log::info!(
            "no editor for {}: {error} — revealing it instead",
            path.display()
        );
        app.opener().reveal_item_in_dir(&path)?;
    }
    Ok(())
}

/// Opens an app's own folder.
pub fn open_app_folder<R: Runtime>(app: &AppHandle<R>, id: &AppId) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    let dir = launcher
        .catalog()
        .find(id)
        .and_then(|entry| entry.dir.clone())
        .ok_or_else(|| AppError::InvalidArgument(format!("{id} has no folder")))?;
    open_in_file_manager(app, &dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_folder_names() {
        assert_eq!(
            SharedFolder::parse("Documents"),
            Some(SharedFolder::Documents)
        );
        assert_eq!(SharedFolder::parse("storage"), Some(SharedFolder::Storage));
        assert_eq!(SharedFolder::parse("../etc"), None);
    }

    #[test]
    fn maps_folders_into_the_profile() {
        let profile = Path::new("/suite/storage/users/shared");
        let storage = Path::new("/suite/storage");
        assert_eq!(
            SharedFolder::Music.path(profile, storage),
            profile.join("Music")
        );
        assert_eq!(SharedFolder::Storage.path(profile, storage), storage);
    }
}
