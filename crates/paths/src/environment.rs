//! A snapshot of everything path resolution depends on.

use std::env;
use std::path::PathBuf;

use crate::repo::find_repo_root;

/// Forces suite mode with this folder as the install dir (tests, debugging, wrapper scripts).
pub const INSTALL_DIR_ENV: &str = "GENSLATE_INSTALL_DIR";
/// Overrides repository detection in dev mode (useful when the cwd is outside the repo).
pub const REPO_ROOT_ENV: &str = "GENSLATE_REPO_ROOT";
/// Set by the `AppImage` runtime to the `.AppImage` file; `current_exe` is a temporary mount.
const APPIMAGE_ENV: &str = "APPIMAGE";

/// Standard per-user OS directories, used only by [`crate::Mode::Fallback`].
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct OsDirs {
    /// `~/.local/share`, `~/Library/Application Support`, `%APPDATA%`.
    pub data: Option<PathBuf>,
}

impl OsDirs {
    /// Reads the current user's directories.
    pub fn detect() -> Self {
        Self {
            data: dirs::data_dir(),
        }
    }
}

/// Inputs to [`crate::resolve_with`] and [`crate::detect_layout`].
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Environment {
    /// Debug build (`cfg!(debug_assertions)`); dev mode is only ever used in debug builds.
    pub debug: bool,
    /// The running executable.
    pub exe: Option<PathBuf>,
    /// The `.AppImage` file when running from one (Linux).
    pub appimage: Option<PathBuf>,
    /// [`INSTALL_DIR_ENV`], if set.
    pub install_dir_override: Option<PathBuf>,
    /// Root of the GENSLATE checkout, if the process runs from one.
    pub repo_root: Option<PathBuf>,
    /// Per-user OS directories.
    pub os: OsDirs,
}

impl Environment {
    /// Captures the real process environment.
    pub fn detect() -> Self {
        let debug = cfg!(debug_assertions);
        let exe = env::current_exe().ok();
        let repo_root = if debug {
            detect_repo_root(exe.as_ref())
        } else {
            None
        };
        Self {
            debug,
            exe,
            appimage: non_empty_path(APPIMAGE_ENV),
            install_dir_override: non_empty_path(INSTALL_DIR_ENV),
            repo_root,
            os: OsDirs::detect(),
        }
    }
}

fn non_empty_path(name: &str) -> Option<PathBuf> {
    env::var_os(name)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn detect_repo_root(exe: Option<&PathBuf>) -> Option<PathBuf> {
    if let Some(explicit) = non_empty_path(REPO_ROOT_ENV) {
        return find_repo_root(&explicit);
    }
    // `target/debug/<exe>` lives inside the checkout; so does the cwd of `tauri dev`.
    let candidates = [
        exe.and_then(|exe| exe.parent().map(PathBuf::from)),
        env::current_dir().ok(),
    ];
    candidates
        .iter()
        .flatten()
        .find_map(|start| find_repo_root(start))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_reports_debug_build_and_exe() {
        let env = Environment::detect();
        assert_eq!(env.debug, cfg!(debug_assertions));
        assert!(env.exe.is_some());
    }
}
