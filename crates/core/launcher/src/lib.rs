//! GENSLATE Launcher logic — plain Rust, no Tauri, fully unit-tested.
//!
//! - [`config`]: `config.toml` / `keybindings.toml` (hand-editable, hot-reloaded).
//! - [`catalog`]: GENSLATE apps plus user-installed PortableApps.com and portapps.io apps.
//! - [`metadata`]: per-app metadata and per-tab overrides (comment-preserving writes).
//! - [`launch`]: validated, detached app launching (ids in, never paths).
//! - [`actions`]: the command registry behind the slash bar — and, later, AI agents.
//! - [`geometry`]: bottom-right placement on the monitor under the cursor.
//! - [`system`]: drive space, temperatures, usage, running processes.
//! - [`recent`], [`watch`]: launch history and file watching.
#![forbid(unsafe_code)]

pub mod actions;
pub mod catalog;
pub mod config;
mod error;
pub mod geometry;
pub mod launch;
pub mod metadata;
pub mod recent;
pub mod system;
pub mod watch;

pub use error::LauncherError;
