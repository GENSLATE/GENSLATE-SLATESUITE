//! Which folder plays the role of `installDir` for the running app.
//!
//! GENSLATE apps are portable. Every mode has the same shape so the rest of the code never
//! cares where it runs:
//!
//! ```text
//! <root>/
//! ├─ programs/   genslate/<app>/, portableapps.com/, portapps.io/   (suite + dev only)
//! ├─ other/      config/, logs/, databases/, cache/, documents/, …
//! └─ storage/    users/<profile>/{Desktop,Documents,…}
//! ```

use std::path::{Component, Path, PathBuf};

use crate::{Environment, PathsError};

/// Where the app keeps its files. See [`detect_layout`] for the precedence.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Mode {
    /// Debug build inside the repo: the repo's `other/`, and the launcher's template
    /// `desktop/launcher/installDir/` for `programs/` and `storage/`.
    Dev,
    /// Inside a launcher install folder: `<installDir>/programs/genslate/<app>/<exe>`.
    Suite,
    /// Extracted from its own zip: everything beside the executable.
    Standalone,
    /// The app folder can't be used (read-only, macOS App Translocation): OS data dir.
    Fallback,
}

/// The resolved folders of a [`Mode`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Layout {
    pub mode: Mode,
    /// `installDir` (suite), the app folder (standalone), the repo (dev) or the fallback root.
    pub root: PathBuf,
    /// `other/`: config, logs, databases, cache and documents.
    pub other: PathBuf,
    /// `programs/`: only suites (and the launcher in dev) have one.
    pub programs: Option<PathBuf>,
    /// `storage/`: the user's portable files.
    pub storage: PathBuf,
}

/// The profile every install has; more profiles may be added later.
pub const SHARED_PROFILE: &str = "shared";
/// Launcher template used as `programs/` + `storage/` in dev mode.
const DEV_INSTALL_DIR: &str = "desktop/launcher/installDir";
/// Folder name of the fallback root inside the OS data dir.
const FALLBACK_DIR: &str = "GENSLATE";

impl Layout {
    fn with_root(mode: Mode, root: PathBuf, programs: bool) -> Self {
        Self {
            mode,
            other: root.join("other"),
            programs: programs.then(|| root.join("programs")),
            storage: root.join("storage"),
            root,
        }
    }

    /// `storage/users/<profile>`.
    pub fn profile_dir(&self, profile: &str) -> PathBuf {
        self.storage.join("users").join(profile)
    }

    /// The display name of the install: the root folder's name (`GENSLATE`, `MY-USB`, …).
    pub fn name(&self) -> Option<&str> {
        self.root.file_name().and_then(|name| name.to_str())
    }
}

/// Detects the layout from `env`.
///
/// Precedence: [`crate::INSTALL_DIR_ENV`] override → suite (folder shape) → dev (debug build
/// in the repo) → standalone → fallback. Suite beats dev so a debug build staged into a suite
/// behaves like the real thing.
pub fn detect_layout(env: &Environment) -> Result<Layout, PathsError> {
    if let Some(root) = &env.install_dir_override {
        return Ok(Layout::with_root(Mode::Suite, root.clone(), true));
    }
    let app_dir = app_dir(env);
    if let Some(dir) = &app_dir {
        if is_translocated(dir) {
            return fallback_layout(env);
        }
        if let Some(root) = find_install_dir(dir) {
            return Ok(Layout::with_root(Mode::Suite, root, true));
        }
    }
    if env.debug
        && let Some(repo) = &env.repo_root
    {
        let install = repo.join(DEV_INSTALL_DIR);
        return Ok(Layout {
            mode: Mode::Dev,
            root: repo.clone(),
            other: repo.join("other"),
            programs: Some(install.join("programs")),
            storage: install.join("storage"),
        });
    }
    match app_dir {
        Some(dir) => Ok(Layout::with_root(Mode::Standalone, dir, false)),
        None => fallback_layout(env),
    }
}

/// The OS-data-dir layout (`<data>/GENSLATE/{other,storage}`), used when the app folder is
/// unusable.
pub fn fallback_layout(env: &Environment) -> Result<Layout, PathsError> {
    let data = env.os.data.as_deref().ok_or(PathsError::NoLocation)?;
    Ok(Layout::with_root(
        Mode::Fallback,
        data.join(FALLBACK_DIR),
        false,
    ))
}

/// The folder an app "lives" in: the `AppImage` folder, the folder around a macOS `.app`
/// bundle, or the executable's folder.
fn app_dir(env: &Environment) -> Option<PathBuf> {
    if let Some(appimage) = &env.appimage {
        return appimage.parent().map(Path::to_path_buf);
    }
    env.exe.as_deref().and_then(bundle_dir)
}

/// The folder containing the app: for `X/Foo.app/Contents/MacOS/foo` that is `X`,
/// otherwise the executable's own folder.
pub fn bundle_dir(exe: &Path) -> Option<PathBuf> {
    let dir = exe.parent()?;
    let is_macos_bundle = dir.file_name().is_some_and(|name| name == "MacOS")
        && dir
            .parent()
            .and_then(Path::file_name)
            .is_some_and(|name| name == "Contents");
    if is_macos_bundle {
        let bundle = dir.parent()?.parent()?;
        if bundle
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("app"))
        {
            return bundle.parent().map(Path::to_path_buf);
        }
    }
    Some(dir.to_path_buf())
}

/// `Some(X)` when `app_dir` is `X/programs/genslate/<app>` and `X/other/config` exists.
///
/// Folder names are matched case-insensitively (Windows and macOS file systems are).
pub fn find_install_dir(app_dir: &Path) -> Option<PathBuf> {
    let genslate = app_dir.parent()?;
    let programs = genslate.parent()?;
    let root = programs.parent()?;
    let named = |dir: &Path, name: &str| {
        dir.file_name()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case(name))
    };
    (named(genslate, "genslate")
        && named(programs, "programs")
        && root.join("other").join("config").is_dir())
    .then(|| root.to_path_buf())
}

/// macOS runs quarantined apps from a random read-only mount (`/private/var/folders/…/AppTranslocation/…`).
fn is_translocated(dir: &Path) -> bool {
    dir.components()
        .any(|part| matches!(part, Component::Normal(name) if name == "AppTranslocation"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::OsDirs;
    use genslate_testing::{TempTree, fake_repo, fake_suite};

    fn env_for_exe(exe: PathBuf) -> Environment {
        Environment {
            exe: Some(exe),
            os: OsDirs {
                data: Some(PathBuf::from("/os-data")),
            },
            ..Environment::default()
        }
    }

    #[test]
    fn suite_is_detected_from_the_folder_shape() -> Result<(), Box<dyn std::error::Error>> {
        let suite = fake_suite(&["explorer"])?;
        let env = env_for_exe(suite.join("programs/genslate/explorer/genslate-explorer.exe"));
        let layout = detect_layout(&env)?;
        assert_eq!(layout.mode, Mode::Suite);
        assert_eq!(layout.root, suite.path());
        assert_eq!(layout.other, suite.join("other"));
        assert_eq!(
            layout.programs.as_deref(),
            Some(suite.join("programs").as_path())
        );
        assert_eq!(
            layout.profile_dir(SHARED_PROFILE),
            suite.join("storage/users/shared")
        );
        Ok(())
    }

    #[test]
    fn install_dir_can_have_any_name() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .dir("My Portable Stuff/other/config")?
            .dir("My Portable Stuff/programs/GenSlate/editor")?;
        let env = env_for_exe(tree.join("My Portable Stuff/programs/GenSlate/editor/editor"));
        let layout = detect_layout(&env)?;
        assert_eq!(layout.mode, Mode::Suite);
        assert_eq!(layout.name(), Some("My Portable Stuff"));
        Ok(())
    }

    #[test]
    fn macos_bundles_are_unwrapped() -> Result<(), Box<dyn std::error::Error>> {
        let suite = fake_suite(&["explorer"])?;
        let exe = suite.join(
            "programs/genslate/explorer/GENSLATE Explorer.app/Contents/MacOS/genslate-explorer",
        );
        let layout = detect_layout(&env_for_exe(exe))?;
        assert_eq!(layout.mode, Mode::Suite);
        assert_eq!(layout.root, suite.path());
        Ok(())
    }

    #[test]
    fn without_other_config_it_is_standalone() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("x/programs/genslate/explorer")?;
        let dir = tree.join("x/programs/genslate/explorer");
        let layout = detect_layout(&env_for_exe(dir.join("explorer.exe")))?;
        assert_eq!(layout.mode, Mode::Standalone);
        assert_eq!(layout.root, dir);
        assert_eq!(layout.programs, None);
        assert_eq!(layout.storage, dir.join("storage"));
        Ok(())
    }

    #[test]
    fn suite_wins_over_dev() -> Result<(), Box<dyn std::error::Error>> {
        let suite = fake_suite(&["example"])?;
        let env = Environment {
            debug: true,
            repo_root: Some(PathBuf::from("/repo")),
            ..env_for_exe(suite.join("programs/genslate/example/example.exe"))
        };
        assert_eq!(detect_layout(&env)?.mode, Mode::Suite);
        Ok(())
    }

    #[test]
    fn dev_uses_the_repo_and_the_launcher_template() -> Result<(), Box<dyn std::error::Error>> {
        let repo = fake_repo()?;
        let env = Environment {
            debug: true,
            repo_root: Some(repo.path().to_path_buf()),
            ..env_for_exe(repo.join("target/debug/genslate-launcher.exe"))
        };
        let layout = detect_layout(&env)?;
        assert_eq!(layout.mode, Mode::Dev);
        assert_eq!(layout.other, repo.join("other"));
        assert_eq!(
            layout.programs,
            Some(repo.join("desktop/launcher/installDir/programs"))
        );
        assert_eq!(
            layout.storage,
            repo.join("desktop/launcher/installDir/storage")
        );
        Ok(())
    }

    #[test]
    fn release_builds_in_the_repo_are_standalone() -> Result<(), Box<dyn std::error::Error>> {
        let repo = fake_repo()?;
        let env = Environment {
            debug: false,
            repo_root: Some(repo.path().to_path_buf()),
            ..env_for_exe(repo.join("target/release/app.exe"))
        };
        assert_eq!(detect_layout(&env)?.mode, Mode::Standalone);
        Ok(())
    }

    #[test]
    fn appimage_uses_the_image_folder() -> Result<(), Box<dyn std::error::Error>> {
        let env = Environment {
            appimage: Some(PathBuf::from("/media/usb/apps/Explorer.AppImage")),
            ..env_for_exe(PathBuf::from("/tmp/.mount_abc/usr/bin/explorer"))
        };
        let layout = detect_layout(&env)?;
        assert_eq!(layout.mode, Mode::Standalone);
        assert_eq!(layout.root, PathBuf::from("/media/usb/apps"));
        Ok(())
    }

    #[test]
    fn translocated_apps_fall_back_to_os_dirs() -> Result<(), Box<dyn std::error::Error>> {
        let exe = PathBuf::from(
            "/private/var/folders/x/AppTranslocation/ABC/d/Explorer.app/Contents/MacOS/explorer",
        );
        let layout = detect_layout(&env_for_exe(exe))?;
        assert_eq!(layout.mode, Mode::Fallback);
        assert_eq!(layout.root, PathBuf::from("/os-data/GENSLATE"));
        Ok(())
    }

    #[test]
    fn override_forces_a_suite() -> Result<(), Box<dyn std::error::Error>> {
        let env = Environment {
            install_dir_override: Some(PathBuf::from("/suite")),
            ..Environment::default()
        };
        let layout = detect_layout(&env)?;
        assert_eq!(layout.mode, Mode::Suite);
        assert_eq!(layout.root, PathBuf::from("/suite"));
        Ok(())
    }

    #[test]
    fn nothing_known_is_an_error() {
        assert!(matches!(
            detect_layout(&Environment::default()),
            Err(PathsError::NoLocation)
        ));
    }

    #[test]
    fn bundle_dir_leaves_plain_executables_alone() {
        assert_eq!(
            bundle_dir(Path::new("/a/b/tool")),
            Some(PathBuf::from("/a/b"))
        );
        // `Contents/MacOS` without a `.app` bundle around it is just a folder.
        assert_eq!(
            bundle_dir(Path::new("/a/Contents/MacOS/tool")),
            Some(PathBuf::from("/a/Contents/MacOS"))
        );
    }
}
