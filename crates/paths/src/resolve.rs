//! [`AppPaths`] resolution for the three [`Mode`]s.

use std::fs;
use std::path::{Path, PathBuf};

use crate::{Environment, PathsError};

/// Where an app keeps its files.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Mode {
    /// Debug build inside the repo: `other/config` and `other/logs`.
    Dev,
    /// Installed app: per-user OS directories.
    Installed,
    /// Next to the executable (`GENSLATE_PORTABLE=1`).
    Portable,
}

/// Resolved directories for one app. Nothing is created until [`AppPaths::create_dirs`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppPaths {
    pub mode: Mode,
    /// Folder holding the config file.
    pub config_dir: PathBuf,
    /// The app's TOML config file (may not exist yet).
    pub config_file: PathBuf,
    /// App state (window state, caches, databases).
    pub data_dir: PathBuf,
    /// Log files.
    pub log_dir: PathBuf,
}

impl AppPaths {
    /// Creates the config, data and log folders.
    pub fn create_dirs(&self) -> Result<(), PathsError> {
        for dir in [&self.config_dir, &self.data_dir, &self.log_dir] {
            fs::create_dir_all(dir).map_err(|source| PathsError::CreateDir {
                path: dir.clone(),
                source,
            })?;
        }
        Ok(())
    }
}

/// Resolves paths for `app` (kebab-case name) / `identifier` (bundle id) from the real
/// process environment.
pub fn resolve(app: &str, identifier: &str) -> Result<AppPaths, PathsError> {
    resolve_with(app, identifier, &Environment::detect())
}

/// Resolves paths from an explicit [`Environment`].
///
/// Precedence: portable, then dev (debug build with a repo root), then installed.
pub fn resolve_with(
    app: &str,
    identifier: &str,
    env: &Environment,
) -> Result<AppPaths, PathsError> {
    validate(app, identifier)?;
    if env.portable {
        let exe_dir = env
            .exe_dir
            .as_deref()
            .ok_or(PathsError::MissingExecutableDir)?;
        return Ok(portable(app, exe_dir));
    }
    if env.debug
        && let Some(repo) = env.repo_root.as_deref()
    {
        return Ok(dev(app, repo));
    }
    installed(app, identifier, env)
}

fn validate(app: &str, identifier: &str) -> Result<(), PathsError> {
    let valid_name = !app.is_empty()
        && !app.starts_with('-')
        && app
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
    if !valid_name {
        return Err(PathsError::InvalidName(app.to_owned()));
    }
    let valid_identifier = !identifier.trim().is_empty()
        && !identifier.contains(['/', '\\'])
        && identifier != "."
        && identifier != "..";
    if !valid_identifier {
        return Err(PathsError::InvalidIdentifier(identifier.to_owned()));
    }
    Ok(())
}

fn dev(app: &str, repo: &Path) -> AppPaths {
    let apps = repo.join("other").join("config").join("apps");
    let file_name = format!("{app}.toml");
    // Grouped apps (e.g. `other/config/apps/slate/explorer.toml`) live one level down.
    let config_file = if apps.join(&file_name).is_file() {
        apps.join(&file_name)
    } else {
        find_grouped(&apps, &file_name).unwrap_or_else(|| apps.join(&file_name))
    };
    let config_dir = config_file
        .parent()
        .map_or_else(|| apps.clone(), Path::to_path_buf);
    AppPaths {
        mode: Mode::Dev,
        config_dir,
        config_file,
        data_dir: repo.join(".genslate").join(app),
        log_dir: repo.join("other").join("logs").join("app-logs").join(app),
    }
}

fn find_grouped(apps: &Path, file_name: &str) -> Option<PathBuf> {
    let mut groups: Vec<PathBuf> = fs::read_dir(apps)
        .ok()?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();
    groups.sort();
    groups
        .into_iter()
        .map(|group| group.join(file_name))
        .find(|file| file.is_file())
}

fn portable(app: &str, exe_dir: &Path) -> AppPaths {
    let root = exe_dir.join(format!("{app}-data"));
    let config_dir = root.join("config");
    AppPaths {
        mode: Mode::Portable,
        config_file: config_dir.join(format!("{app}.toml")),
        config_dir,
        data_dir: root.join("data"),
        log_dir: root.join("logs"),
    }
}

fn installed(app: &str, identifier: &str, env: &Environment) -> Result<AppPaths, PathsError> {
    let config_dir = env
        .os
        .config
        .as_deref()
        .ok_or(PathsError::MissingOsDir("config"))?
        .join(identifier);
    let data_dir = env
        .os
        .data
        .as_deref()
        .ok_or(PathsError::MissingOsDir("data"))?
        .join(identifier);
    let log_root = env
        .os
        .logs
        .as_deref()
        .ok_or(PathsError::MissingOsDir("log"))?
        .join(identifier);
    // Mirrors Tauri's `app_log_dir()`: `~/Library/Logs/<id>` on macOS, `<local data>/<id>/logs` elsewhere.
    let log_dir = if cfg!(target_os = "macos") {
        log_root
    } else {
        log_root.join("logs")
    };
    Ok(AppPaths {
        mode: Mode::Installed,
        config_file: config_dir.join(format!("{app}.toml")),
        config_dir,
        data_dir,
        log_dir,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::OsDirs;
    use genslate_testing::{TempTree, fake_repo};

    const ID: &str = "space.angeletti.genslate.example";

    fn os_dirs(root: &Path) -> OsDirs {
        OsDirs {
            config: Some(root.join("config")),
            data: Some(root.join("data")),
            logs: Some(root.join("logs")),
        }
    }

    #[test]
    fn dev_mode_uses_the_repo_other_folder() -> Result<(), Box<dyn std::error::Error>> {
        let repo = fake_repo()?;
        let env = Environment {
            debug: true,
            repo_root: Some(repo.path().to_path_buf()),
            ..Environment::default()
        };
        let paths = resolve_with("example", ID, &env)?;
        assert_eq!(paths.mode, Mode::Dev);
        assert_eq!(
            paths.config_file,
            repo.join("other/config/apps/example.toml")
        );
        assert_eq!(paths.log_dir, repo.join("other/logs/app-logs/example"));
        assert_eq!(paths.data_dir, repo.join(".genslate/example"));
        Ok(())
    }

    #[test]
    fn dev_mode_finds_grouped_configs() -> Result<(), Box<dyn std::error::Error>> {
        let repo = fake_repo()?.file("other/config/apps/slate/explorer.toml", "")?;
        let env = Environment {
            debug: true,
            repo_root: Some(repo.path().to_path_buf()),
            ..Environment::default()
        };
        let paths = resolve_with("explorer", "space.angeletti.genslate.explorer", &env)?;
        assert_eq!(
            paths.config_file,
            repo.join("other/config/apps/slate/explorer.toml")
        );
        assert_eq!(paths.config_dir, repo.join("other/config/apps/slate"));
        Ok(())
    }

    #[test]
    fn release_builds_ignore_the_repo() -> Result<(), Box<dyn std::error::Error>> {
        let home = TempTree::new()?;
        let env = Environment {
            debug: false,
            repo_root: Some(home.path().to_path_buf()),
            os: os_dirs(home.path()),
            ..Environment::default()
        };
        let paths = resolve_with("example", ID, &env)?;
        assert_eq!(paths.mode, Mode::Installed);
        assert_eq!(
            paths.config_file,
            home.join("config").join(ID).join("example.toml")
        );
        assert_eq!(paths.data_dir, home.join("data").join(ID));
        assert!(paths.log_dir.starts_with(home.join("logs").join(ID)));
        Ok(())
    }

    #[test]
    fn portable_wins_over_everything() -> Result<(), Box<dyn std::error::Error>> {
        let exe = TempTree::new()?;
        let env = Environment {
            debug: true,
            portable: true,
            repo_root: Some(PathBuf::from("/repo")),
            exe_dir: Some(exe.path().to_path_buf()),
            os: os_dirs(Path::new("/os")),
        };
        let paths = resolve_with("example", ID, &env)?;
        assert_eq!(paths.mode, Mode::Portable);
        assert_eq!(
            paths.config_file,
            exe.join("example-data/config/example.toml")
        );
        assert_eq!(paths.log_dir, exe.join("example-data/logs"));
        paths.create_dirs()?;
        assert!(paths.data_dir.is_dir());
        Ok(())
    }

    #[test]
    fn reports_missing_inputs() {
        let portable = Environment {
            portable: true,
            ..Environment::default()
        };
        assert!(matches!(
            resolve_with("example", ID, &portable),
            Err(PathsError::MissingExecutableDir)
        ));
        assert!(matches!(
            resolve_with("example", ID, &Environment::default()),
            Err(PathsError::MissingOsDir("config"))
        ));
    }

    #[test]
    fn validates_names() {
        let env = Environment::default();
        for bad in ["", "Example", "../x", "-x", "a b"] {
            assert!(
                matches!(resolve_with(bad, ID, &env), Err(PathsError::InvalidName(_))),
                "{bad}"
            );
        }
        for bad in ["", " ", "a/b", "..", "a\\b"] {
            assert!(
                matches!(
                    resolve_with("example", bad, &env),
                    Err(PathsError::InvalidIdentifier(_))
                ),
                "{bad}"
            );
        }
    }
}
