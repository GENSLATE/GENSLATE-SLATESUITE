//! Core logic for GENSLATE Editor, kept free of Tauri so it is unit-testable.
//!
//! - [`config`]: the user config file (`other/config/slatesuite/apps/editor.config.toml` in dev).
//! - [`AppInfo`] (from `genslate-app-common`): the payload returned by the `get_app_info`
//!   command.
//!
//! Business logic lives here; `desktop/editor/src-tauri` only wires it to IPC commands.
#![forbid(unsafe_code)]

pub mod config;

pub use config::Config;
pub use genslate_app_common::{AppInfo, ConfigError, LogLevel, ThemePreference};
