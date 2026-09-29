//! Resolves where a GENSLATE app keeps its config, data, logs and user files.
//!
//! GENSLATE apps are portable: they never write to OS user folders unless they must.
//!
//! | Mode         | When                                                   | Root (`<root>/other`, `<root>/storage`) |
//! |--------------|--------------------------------------------------------|-----------------------------------------|
//! | `Suite`      | exe in `<installDir>/programs/genslate/<app>/`         | `installDir`                            |
//! | `Dev`        | debug build inside a GENSLATE checkout                 | the repo (+ `desktop/launcher/installDir`) |
//! | `Standalone` | extracted from its own zip                             | the app's folder                        |
//! | `Fallback`   | app folder read-only or macOS-translocated             | `<OS data dir>/GENSLATE`                |
//!
//! Inside `other/`: `config/genslate/<app>/{config,keybindings}.toml`,
//! `config/appdata/metadata/`, `logs/app-logs/<app>/`, `databases/genslate/<app>/`,
//! `databases/genslate/shared/` (suite-wide databases every app shares, e.g. the AI memory),
//! `cache/genslate/<app>/`.
//!
//! [`resolve`] reads the real environment; [`resolve_with`] / [`detect_layout`] take an
//! explicit [`Environment`] so every mode is unit-testable.
#![forbid(unsafe_code)]

mod environment;
mod error;
mod layout;
mod repo;
mod resolve;

pub use environment::{Environment, INSTALL_DIR_ENV, OsDirs, REPO_ROOT_ENV};
pub use error::PathsError;
pub use layout::{
    Layout, Mode, SHARED_PROFILE, bundle_dir, detect_layout, fallback_layout, find_install_dir,
};
pub use repo::find_repo_root;
pub use resolve::{AppPaths, SHARED_DATA, resolve, resolve_with};
