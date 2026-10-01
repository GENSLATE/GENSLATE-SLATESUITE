//! Per-app [`AppPaths`] inside a [`Layout`].

use std::fs;
use std::path::PathBuf;

use crate::{Environment, Layout, Mode, PathsError, detect_layout, fallback_layout};

/// Resolved files and folders for one app. Nothing is created until [`AppPaths::create_dirs`].
///
/// | Field | Location (inside `<root>/other/`) |
/// |---|---|
/// | `config_file` | `config/slatesuite/apps/<app>.config.toml` |
/// | `keybindings_file` | `config/slatesuite/apps/<app>.keybindings.toml` |
/// | `config_sibling(kind)` | `config/slatesuite/apps/<app>.<kind>.toml` (e.g. `snippets`) |
/// | `metadata_dir` | `config/slatesuite/metadata/` |
/// | `log_dir` | `logs/app-logs/<app>/` |
/// | `data_dir` | `databases/genslate/<app>/` |
/// | `shared_data_dir` | `databases/genslate/shared/` (suite-wide databases, e.g. AI memory) |
/// | `cache_dir` | `cache/genslate/<app>/` (safe to delete: webview data, icon cache) |
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppPaths {
    /// The layout the paths were resolved in.
    pub layout: Layout,
    /// The app's name (lowercase kebab-case); prefixes its files in [`AppPaths::config_dir`].
    pub app: String,
    /// Folder holding every app's config files (`<app>.<kind>.toml`), shared by the suite.
    pub config_dir: PathBuf,
    /// The app's TOML config (may not exist yet).
    pub config_file: PathBuf,
    /// The app's TOML keybindings (may not exist yet).
    pub keybindings_file: PathBuf,
    /// Per-app launcher metadata (`<app>.toml`) and per-source tab settings.
    pub metadata_dir: PathBuf,
    /// Durable app state (recents, databases).
    pub data_dir: PathBuf,
    /// Durable state shared by every GENSLATE app (suite-wide databases such as the AI
    /// memory). Sits next to the per-app data folders.
    pub shared_data_dir: PathBuf,
    /// Disposable state (webview profile, thumbnails).
    pub cache_dir: PathBuf,
    /// Log files.
    pub log_dir: PathBuf,
}

impl AppPaths {
    /// The mode the paths were resolved in.
    pub fn mode(&self) -> Mode {
        self.layout.mode
    }

    /// `<app>.<kind>.toml` next to the config file (the file need not exist), e.g. the
    /// Terminal's `snippets`.
    pub fn config_sibling(&self, kind: &str) -> PathBuf {
        self.config_dir.join(format!("{}.{kind}.toml", self.app))
    }

    /// Creates the config, data, shared data, cache and log folders.
    pub fn create_dirs(&self) -> Result<(), PathsError> {
        for dir in [
            &self.config_dir,
            &self.data_dir,
            &self.shared_data_dir,
            &self.cache_dir,
            &self.log_dir,
        ] {
            fs::create_dir_all(dir).map_err(|source| PathsError::CreateDir {
                path: dir.clone(),
                source,
            })?;
        }
        Ok(())
    }
}

/// Folder name of the suite-wide data folder inside `other/databases/genslate/`. Reserved: no
/// app may be called this.
pub const SHARED_DATA: &str = "shared";

impl Layout {
    /// Paths for `app` (lowercase kebab-case) inside this layout.
    pub fn app(&self, app: &str) -> Result<AppPaths, PathsError> {
        validate(app)?;
        let config = self.other.join("config");
        let slatesuite = config.join("slatesuite");
        let config_dir = slatesuite.join("apps");
        let databases = self.other.join("databases").join("genslate");
        Ok(AppPaths {
            config_file: config_dir.join(format!("{app}.config.toml")),
            keybindings_file: config_dir.join(format!("{app}.keybindings.toml")),
            config_dir,
            metadata_dir: slatesuite.join("metadata"),
            app: app.to_owned(),
            data_dir: databases.join(app),
            shared_data_dir: databases.join(SHARED_DATA),
            cache_dir: self.other.join("cache").join("genslate").join(app),
            log_dir: self.other.join("logs").join("app-logs").join(app),
            layout: self.clone(),
        })
    }
}

/// Resolves paths for `app` from the real process environment and creates its folders.
///
/// If the app's own location is not writable (read-only media, locked-down folder) this
/// falls back to the OS data dir ([`Mode::Fallback`]) so the app still starts.
pub fn resolve(app: &str) -> Result<AppPaths, PathsError> {
    let env = Environment::detect();
    let paths = resolve_with(app, &env)?;
    match paths.create_dirs() {
        Ok(()) => Ok(paths),
        Err(error) if error.is_not_writable() && paths.mode() != Mode::Fallback => {
            let fallback = fallback_layout(&env)?.app(app)?;
            fallback.create_dirs()?;
            Ok(fallback)
        }
        Err(error) => Err(error),
    }
}

/// Resolves paths for `app` from an explicit [`Environment`] without touching the disk
/// (beyond detecting the suite folder shape).
pub fn resolve_with(app: &str, env: &Environment) -> Result<AppPaths, PathsError> {
    validate(app)?;
    detect_layout(env)?.app(app)
}

fn validate(app: &str) -> Result<(), PathsError> {
    let valid = !app.is_empty()
        && !app.starts_with('-')
        && app != SHARED_DATA
        && app
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
    if valid {
        Ok(())
    } else {
        Err(PathsError::InvalidName(app.to_owned()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::{fake_repo, fake_suite};

    #[test]
    fn suite_paths_live_in_the_install_dir() -> Result<(), Box<dyn std::error::Error>> {
        let suite = fake_suite(&["launcher"])?;
        let env = Environment {
            exe: Some(suite.join("programs/genslate/launcher/genslate-launcher.exe")),
            ..Environment::default()
        };
        let paths = resolve_with("launcher", &env)?;
        assert_eq!(paths.mode(), Mode::Suite);
        assert_eq!(
            paths.config_file,
            suite.join("other/config/slatesuite/apps/launcher.config.toml")
        );
        assert_eq!(
            paths.keybindings_file,
            suite.join("other/config/slatesuite/apps/launcher.keybindings.toml")
        );
        assert_eq!(
            paths.metadata_dir,
            suite.join("other/config/slatesuite/metadata")
        );
        assert_eq!(paths.log_dir, suite.join("other/logs/app-logs/launcher"));
        assert_eq!(
            paths.data_dir,
            suite.join("other/databases/genslate/launcher")
        );
        assert_eq!(
            paths.shared_data_dir,
            suite.join("other/databases/genslate/shared")
        );
        assert_eq!(paths.cache_dir, suite.join("other/cache/genslate/launcher"));
        assert_eq!(
            paths.config_sibling("snippets"),
            suite.join("other/config/slatesuite/apps/launcher.snippets.toml")
        );
        paths.create_dirs()?;
        assert!(paths.cache_dir.is_dir());
        assert!(paths.shared_data_dir.is_dir());
        Ok(())
    }

    #[test]
    fn dev_paths_use_the_repo_other_folder() -> Result<(), Box<dyn std::error::Error>> {
        let repo = fake_repo()?;
        let env = Environment {
            debug: true,
            repo_root: Some(repo.path().to_path_buf()),
            exe: Some(repo.join("target/debug/genslate-example.exe")),
            ..Environment::default()
        };
        let paths = resolve_with("example", &env)?;
        assert_eq!(paths.mode(), Mode::Dev);
        assert_eq!(
            paths.config_file,
            repo.join("other/config/slatesuite/apps/example.config.toml")
        );
        assert_eq!(paths.log_dir, repo.join("other/logs/app-logs/example"));
        assert_eq!(
            paths.shared_data_dir,
            repo.join("other/databases/genslate/shared")
        );
        Ok(())
    }

    #[test]
    fn validates_names() {
        let env = Environment::default();
        for bad in ["", "Example", "../x", "-x", "a b", "a/b", SHARED_DATA] {
            assert!(
                matches!(resolve_with(bad, &env), Err(PathsError::InvalidName(_))),
                "{bad}"
            );
        }
    }

    #[test]
    fn not_writable_is_detected() {
        let error = PathsError::CreateDir {
            path: PathBuf::from("/x"),
            source: std::io::Error::from(std::io::ErrorKind::PermissionDenied),
        };
        assert!(error.is_not_writable());
        let other = PathsError::CreateDir {
            path: PathBuf::from("/x"),
            source: std::io::Error::from(std::io::ErrorKind::NotFound),
        };
        assert!(!other.is_not_writable());
    }
}
