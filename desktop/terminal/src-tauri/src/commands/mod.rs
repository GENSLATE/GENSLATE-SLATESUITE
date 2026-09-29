//! `#[tauri::command]` handlers, registered in `lib.rs` by full module path
//! (`#[tauri::command]` companion items are not carried by `pub use`). They are thin: check
//! the arguments, delegate to `genslate-core-terminal`, emit events. File system and process
//! work runs off the main thread (`async` commands).

pub mod app_info;
pub mod context;
pub mod files;
pub mod history;
pub mod pty;
pub mod snippets;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};

/// Emits an event to every window; a failure only means no window is listening.
pub fn emit<R: Runtime, T: Serialize + Clone>(app: &AppHandle<R>, event: &str, payload: T) {
    if let Err(error) = app.emit(event, payload) {
        log::debug!("emit {event}: {error}");
    }
}
