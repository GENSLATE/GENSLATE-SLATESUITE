//! A snapshot of everything path resolution depends on.

use std::env;
use std::path::PathBuf;

use crate::repo::find_repo_root;

/// Set to `1`/`true` to keep config, data and logs next to the executable.
pub const PORTABLE_ENV: &str = "GENSLATE_PORTABLE";
/// Overrides repository detection in dev mode (useful when the cwd is outside the repo).
pub const REPO_ROOT_ENV: &str = "GENSLATE_REPO_ROOT";

/// Standard per-user OS directories (from the `dirs` crate).
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct OsDirs {
    /// `~/.config`, `~/Library/Application Support`, `%APPDATA%`.
    pub config: Option<PathBuf>,
    /// `~/.local/share`, `~/Library/Application Support`, `%APPDATA%`.
    pub data: Option<PathBuf>,
    /// Log root: `~/Library/Logs` on macOS, the local data dir elsewhere.
    pub logs: Option<PathBuf>,
}

impl OsDirs {
    /// Reads the current user's directories.
    pub fn detect() -> Self {
        let logs = if cfg!(target_os = "macos") {
            dirs::home_dir().map(|home| home.join("Library").join("Logs"))
        } else {
            dirs::data_local_dir()
        };
        Self {
            config: dirs::config_dir(),
            data: dirs::data_dir(),
            logs,
        }
    }
}

/// Inputs to [`crate::resolve_with`].
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Environment {
    /// Debug build (`cfg!(debug_assertions)`); dev mode is only ever used in debug builds.
    pub debug: bool,
    /// `GENSLATE_PORTABLE` is set to a truthy value.
    pub portable: bool,
    /// Root of the GENSLATE checkout, if the process runs from one.
    pub repo_root: Option<PathBuf>,
    /// Folder containing the running executable.
    pub exe_dir: Option<PathBuf>,
    /// Per-user OS directories.
    pub os: OsDirs,
}

impl Environment {
    /// Captures the real process environment.
    pub fn detect() -> Self {
        let debug = cfg!(debug_assertions);
        let exe_dir = env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(PathBuf::from));
        let repo_root = if debug {
            detect_repo_root(exe_dir.as_ref())
        } else {
            None
        };
        Self {
            debug,
            portable: env::var(PORTABLE_ENV).is_ok_and(|value| is_truthy(&value)),
            repo_root,
            exe_dir,
            os: OsDirs::detect(),
        }
    }
}

fn detect_repo_root(exe_dir: Option<&PathBuf>) -> Option<PathBuf> {
    if let Some(explicit) = env::var_os(REPO_ROOT_ENV) {
        return find_repo_root(&PathBuf::from(explicit));
    }
    // `target/debug/<exe>` lives inside the checkout; so does the cwd of `tauri dev`.
    let candidates = [exe_dir.cloned(), env::current_dir().ok()];
    candidates
        .iter()
        .flatten()
        .find_map(|start| find_repo_root(start))
}

/// `1`, `true`, `yes` and `on` (any case) are truthy.
pub(crate) fn is_truthy(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "1" | "true" | "yes" | "on"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truthy_values() {
        for value in ["1", "true", "TRUE", " yes ", "on"] {
            assert!(is_truthy(value), "{value}");
        }
        for value in ["", "0", "false", "off", "portable"] {
            assert!(!is_truthy(value), "{value}");
        }
    }

    #[test]
    fn detect_reports_debug_build() {
        assert_eq!(Environment::detect().debug, cfg!(debug_assertions));
    }
}
