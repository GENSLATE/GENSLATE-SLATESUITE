//! Shared foundations of every GENSLATE app core (`crates/core/<app>`), kept free of Tauri so
//! they are unit-testable.
//!
//! - [`config`]: the sections every app's `config.toml` shares (`[appearance]`, `[window]`,
//!   `[logging]`) and the TOML loader (a missing file means defaults).
//! - [`app_info`]: the [`AppInfo`] payload returned by every app's `get_app_info` command.
#![forbid(unsafe_code)]

pub mod app_info;
pub mod config;

pub use app_info::AppInfo;
pub use config::{Appearance, ConfigError, LogLevel, Logging, ThemePreference, Window};
