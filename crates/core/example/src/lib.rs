//! Core logic for the GENSLATE example app, kept free of Tauri so it is unit-testable.
//!
//! - [`config`]: the user config file (`other/config/apps/example.toml` in dev).
//! - [`app_info`]: the [`AppInfo`] payload returned by the `get_app_info` command.
#![forbid(unsafe_code)]

pub mod app_info;
pub mod config;

pub use app_info::AppInfo;
pub use config::{Config, ConfigError, LogLevel, ThemePreference};
