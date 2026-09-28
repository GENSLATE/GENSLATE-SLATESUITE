//! GENSLATE Explorer logic: plain Rust, no Tauri, unit-tested.
//!
//! - [`config`]: `config.toml` (the shared sections plus `[explorer]`) and single-key writes.
//! - [`entry`]: listing a folder; path validation for everything the UI sends.
//! - [`kind`]: file categories (icons, previews, the Type column).
//! - [`names`]: portable name rules and free names (`report (2).pdf`).
//! - [`ops`]: create, rename, trash (and restore), delete.
//! - [`transfer`]: copy and move with progress, cancel and a conflict policy.
//! - [`undo`]: how to reverse each finished operation.
//! - [`search`]: recursive name, glob and text search.
//! - [`preview`]: text previews, folder sizes and properties.
//! - [`places`]: standard folders and drives for the sidebar.
//! - [`watch`]: live refresh of the folders on screen.
//!
//! `desktop/explorer/src-tauri` only wires these to IPC commands and events.
#![forbid(unsafe_code)]

pub mod config;
pub mod entry;
mod error;
pub mod kind;
pub mod names;
pub mod ops;
pub mod places;
pub mod preview;
pub mod search;
pub mod transfer;
pub mod undo;
pub mod watch;

pub use config::Config;
pub use error::ExplorerError;
pub use genslate_app_common::{AppInfo, ConfigError, LogLevel, ThemePreference};
