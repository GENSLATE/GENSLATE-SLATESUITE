//! Core logic for GENSLATE Terminal, kept free of Tauri so it is unit-testable.
//!
//! - [`config`]: `config.toml` (`[terminal]` settings, `[[profiles]]`) and single-key
//!   write-back for the Settings dialog.
//! - [`profiles`]: the shells on this machine (PowerShell, cmd, WSL, Git Bash, VS developer
//!   shells, zsh, bash, fish, Nushell, …) plus the config's profiles.
//! - [`pty`]: sessions in pseudo terminals, with [`env`] (the spawn environment) and
//!   [`integration`] (the shell scripts that report prompts, commands and folders).
//! - [`tracker`]: reads those reports (OSC 133 / 633 / 7 / 9;9) from the output stream.
//! - [`history`] (SQLite via `genslate-storage`) with [`fuzzy`] search; [`snippets`].
//! - [`files`], [`git`] and [`watch`] for the side panel's file tree; [`process`] for what a
//!   shell is running.
//! - [`launch`]: `--cwd` / `--profile` command-line arguments.
//! - [`AppInfo`] (from `genslate-app-common`): the payload returned by `get_app_info`.
//!
//! Business logic lives here; `desktop/terminal/src-tauri` only wires it to IPC commands.
#![forbid(unsafe_code)]

pub mod config;
pub mod env;
mod error;
pub mod files;
pub mod fuzzy;
pub mod git;
pub mod history;
pub mod integration;
pub mod launch;
pub mod process;
pub mod profiles;
pub mod pty;
pub mod snippets;
pub mod tracker;
pub mod watch;

pub use config::{Config, TerminalSettings};
pub use error::TerminalError;
pub use genslate_app_common::{AppInfo, ConfigError, LogLevel, ThemePreference};
pub use genslate_storage::StorageError;
