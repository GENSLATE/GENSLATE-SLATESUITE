//! Resolves GENSLATE config, data and log directories.
//!
//! | Mode        | When                                              | Config file                                    | Logs                               |
//! |-------------|---------------------------------------------------|------------------------------------------------|------------------------------------|
//! | `Dev`       | debug build running inside a GENSLATE checkout    | `<repo>/other/config/apps/[<group>/]<app>.toml` | `<repo>/other/logs/app-logs/<app>` |
//! | `Portable`  | `GENSLATE_PORTABLE=1`                             | `<exe dir>/<app>-data/config/<app>.toml`        | `<exe dir>/<app>-data/logs`        |
//! | `Installed` | otherwise                                         | `<OS config dir>/<identifier>/<app>.toml`       | OS log dir (same as Tauri's)       |
//!
//! [`resolve`] reads the real environment; [`resolve_with`] takes an explicit
//! [`Environment`] so every mode is unit-testable.
#![forbid(unsafe_code)]

mod environment;
mod error;
mod repo;
mod resolve;

pub use environment::{Environment, OsDirs, PORTABLE_ENV, REPO_ROOT_ENV};
pub use error::PathsError;
pub use repo::find_repo_root;
pub use resolve::{AppPaths, Mode, resolve, resolve_with};
