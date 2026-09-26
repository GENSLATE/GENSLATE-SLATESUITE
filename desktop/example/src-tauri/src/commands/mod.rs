//! `#[tauri::command]` handlers, registered in `lib.rs` via `generate_handler!`.
//! The frontend calls them through `commands` in `@genslate/tauri-bridge`.
//!
//! Handlers are referenced by their full module path: `#[tauri::command]` generates
//! companion items that a `pub use` re-export would not carry.

pub mod app_info;
