//! GENSLATE apps: every `metadata/<app>.toml` (so reserved, not-yet-installed apps are listed)
//! plus every folder in `programs/genslate/`.

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use super::icon::IconSource;
use super::model::{AppEntry, AppId, AppStatus, HostOs, Source, title_case};
use crate::metadata::AppMetadata;

/// Folders the GENSLATE scanner reads.
#[derive(Debug, Clone)]
pub struct GenslateRoots {
    /// `programs/genslate/`
    pub programs: PathBuf,
    /// `other/config/appdata/metadata/`
    pub metadata: PathBuf,
    /// `other/resources/icons/genslate/` (`<app>.svg`)
    pub icons: PathBuf,
    /// Dev only: `target/debug`, used when an app isn't staged into `programs/` yet.
    pub dev_target: Option<PathBuf>,
    /// Apps not to list (the launcher itself).
    pub exclude: Vec<String>,
    pub host: HostOs,
}

/// Default category when the metadata has none.
const DEFAULT_CATEGORY: &str = "Utilities";

/// Scans GENSLATE apps. Never fails: problems become [`AppStatus::BrokenManifest`] /
/// [`AppStatus::MissingExe`] entries.
pub fn scan(roots: &GenslateRoots) -> Vec<AppEntry> {
    app_keys(roots)
        .into_iter()
        .filter(|key| !roots.exclude.iter().any(|excluded| excluded == key))
        .map(|key| entry(roots, &key))
        .collect()
}

fn app_keys(roots: &GenslateRoots) -> BTreeSet<String> {
    let tab_files: Vec<&str> = Source::ALL
        .iter()
        .map(|source| source.settings_file())
        .collect();
    let from_metadata = list(&roots.metadata).into_iter().filter_map(|path| {
        let name = path.file_name()?.to_str()?;
        if tab_files.contains(&name) || path.extension()? != "toml" {
            return None;
        }
        Some(path.file_stem()?.to_str()?.to_owned())
    });
    let from_programs = list(&roots.programs)
        .into_iter()
        .filter(|path| path.is_dir())
        .filter_map(|path| path.file_name()?.to_str().map(str::to_owned));
    from_metadata
        .chain(from_programs)
        .filter(|key| is_app_key(key))
        .collect()
}

fn entry(roots: &GenslateRoots, key: &str) -> AppEntry {
    let (meta, broken) = match AppMetadata::load(&roots.metadata.join(format!("{key}.toml"))) {
        Ok(meta) => (meta, false),
        Err(error) => {
            log::warn!("{error}");
            (AppMetadata::default(), true)
        }
    };
    let name = meta.app.name.clone().unwrap_or_else(|| title_case(key));
    let dir = roots.programs.join(key);
    let exe_name = exe_name(&meta, key, &name, roots.host);
    let staged = dir.join(&exe_name);
    let dev = roots
        .dev_target
        .as_ref()
        .map(|target| target.join(dev_exe_name(key, roots.host)))
        .filter(|path| path.exists());

    let (status, program) = if staged.exists() {
        (AppStatus::Ready, Some(staged))
    } else if let Some(dev) = dev {
        (AppStatus::Ready, Some(dev))
    } else if has_files(&dir) {
        (AppStatus::MissingExe, None)
    } else {
        (AppStatus::NotInstalled, None)
    };

    let icon_path = roots.icons.join(format!("{key}.svg"));
    let icon = icon_path.is_file().then_some(IconSource::Svg(icon_path));
    let mut app = AppEntry::new(AppId::new(Source::Genslate, key), name);
    app.description = meta.app.description;
    app.category = meta
        .app
        .category
        .unwrap_or_else(|| DEFAULT_CATEGORY.to_owned());
    app.color = meta.app.color;
    app.keywords = meta.app.keywords;
    app.version = meta.build.version;
    app.publisher = Some("GENSLATE".to_owned());
    app.status = if broken {
        AppStatus::BrokenManifest
    } else {
        status
    };
    app.program = program;
    app.dir = dir.is_dir().then_some(dir);
    app.has_icon = icon.is_some();
    app.icon = icon;
    app
}

/// The executable (or `.app`) in `programs/genslate/<key>/` for this OS.
fn exe_name(meta: &AppMetadata, key: &str, name: &str, host: HostOs) -> String {
    let stamped = match host {
        HostOs::Windows => meta.exe.windows.clone(),
        HostOs::Macos => meta.exe.macos.clone(),
        HostOs::Linux => meta.exe.linux.clone(),
    };
    // Stamped values come from a file the user can edit: only accept a plain relative path.
    stamped
        .filter(|path| is_relative_inside(path))
        .unwrap_or_else(|| match host {
            HostOs::Windows => format!("genslate-{key}.exe"),
            HostOs::Macos => format!("GENSLATE {name}.app"),
            HostOs::Linux => format!("genslate-{key}"),
        })
}

fn dev_exe_name(key: &str, host: HostOs) -> String {
    match host {
        HostOs::Windows => format!("genslate-{key}.exe"),
        HostOs::Macos | HostOs::Linux => format!("genslate-{key}"),
    }
}

/// `true` for `a.exe` or `bin/a`, `false` for absolute paths and anything with `..`.
///
/// Judged the same on every OS: both `/` and `\` separate segments and a `:` (drive letter,
/// stream name) is refused, so a Windows-style `C:\x.exe` or `..\..\x.exe` from a config file
/// is rejected on macOS and Linux too, where `Path` would read it as one plain file name.
pub(super) fn is_relative_inside(path: &str) -> bool {
    !path.is_empty()
        && path
            .split(['/', '\\'])
            .all(|part| !part.is_empty() && part != "." && part != ".." && !part.contains(':'))
}

/// App keys are the folder/metadata names: lowercase kebab-case.
fn is_app_key(key: &str) -> bool {
    !key.is_empty()
        && !key.starts_with(['-', '.'])
        && key
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

fn has_files(dir: &Path) -> bool {
    fs::read_dir(dir).is_ok_and(|mut entries| {
        entries.any(|entry| entry.is_ok_and(|entry| entry.file_name() != ".gitkeep"))
    })
}

pub(super) fn list(dir: &Path) -> Vec<PathBuf> {
    let mut paths: Vec<PathBuf> = fs::read_dir(dir)
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .collect()
        })
        .unwrap_or_default();
    paths.sort();
    paths
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    fn roots(tree: &TempTree) -> GenslateRoots {
        GenslateRoots {
            programs: tree.join("programs/genslate"),
            metadata: tree.join("metadata"),
            icons: tree.join("icons"),
            dev_target: None,
            exclude: vec!["launcher".to_owned()],
            host: HostOs::Windows,
        }
    }

    #[test]
    fn lists_installed_reserved_and_broken_apps() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("metadata/explorer.toml", "[app]\nname = \"Explorer\"\ndescription = \"Files\"\ncategory = \"System\"\ncolor = \"nord8\"\n[build]\nversion = \"1.0.0\"\n")?
            .file("metadata/terminal.toml", "[app]\nname = \"Terminal\"\n")?
            .file("metadata/broken.toml", "[app\n")?
            .file("metadata/genslate.toml", "enabled = true\n")?
            .file("metadata/launcher.toml", "[app]\nname = \"Launcher\"\n")?
            .file("programs/genslate/explorer/genslate-explorer.exe", "")?
            .file("programs/genslate/editor/readme.txt", "")?
            .dir("programs/genslate/Weird Folder")?
            .file("icons/explorer.svg", "<svg/>")?;
        let apps = scan(&roots(&tree));
        let keys: Vec<&str> = apps.iter().map(|app| app.id.key.as_str()).collect();
        assert_eq!(keys, ["broken", "editor", "explorer", "terminal"]);

        let status = |key: &str| apps.iter().find(|a| a.id.key == key).map(|a| a.status);
        assert_eq!(status("explorer"), Some(AppStatus::Ready));
        assert_eq!(status("terminal"), Some(AppStatus::NotInstalled));
        assert_eq!(status("editor"), Some(AppStatus::MissingExe));
        assert_eq!(status("broken"), Some(AppStatus::BrokenManifest));

        let explorer = apps
            .iter()
            .find(|a| a.id.key == "explorer")
            .ok_or("explorer")?;
        assert_eq!(explorer.category, "System");
        assert_eq!(explorer.color.as_deref(), Some("nord8"));
        assert_eq!(explorer.version.as_deref(), Some("1.0.0"));
        assert!(explorer.has_icon);
        Ok(())
    }

    #[test]
    fn stamped_exe_paths_cannot_escape() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file(
                "metadata/evil.toml",
                "[exe]\nwindows = \"../../outside.exe\"\n",
            )?
            .file("programs/genslate/outside.exe", "")?;
        let apps = scan(&roots(&tree));
        assert_eq!(
            apps.first().map(|a| a.status),
            Some(AppStatus::NotInstalled)
        );
        assert!(!is_relative_inside("../x.exe"));
        assert!(!is_relative_inside("C:\\x.exe"));
        assert!(!is_relative_inside("..\\..\\x.exe"));
        assert!(!is_relative_inside("/usr/bin/x"));
        assert!(!is_relative_inside("\\\\server\\share\\x.exe"));
        assert!(is_relative_inside("bin/x"));
        assert!(is_relative_inside("App\\x.exe"));
        Ok(())
    }

    #[test]
    fn dev_builds_are_found_in_target() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("metadata/example.toml", "[app]\nname = \"Example\"\n")?
            .file("target/debug/genslate-example.exe", "")?;
        let mut roots = roots(&tree);
        roots.dev_target = Some(tree.join("target/debug"));
        let apps = scan(&roots);
        assert_eq!(apps.first().map(|a| a.status), Some(AppStatus::Ready));
        Ok(())
    }
}
