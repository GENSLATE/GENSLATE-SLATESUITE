//! The global show/hide shortcut (`[global] toggle` in keybindings.toml).

use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::window;

/// The plugin, toggling the launcher when the registered shortcut is pressed.
pub fn plugin<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed
                && let Err(error) = window::toggle(app)
            {
                log::warn!("hotkey: {error}");
            }
        })
        .build()
}

/// Replaces the registered shortcut with `accelerator` (empty = none). A shortcut another
/// app already owns is logged, not fatal.
pub fn register<R: Runtime>(app: &AppHandle<R>, accelerator: &str) {
    let shortcuts = app.global_shortcut();
    if let Err(error) = shortcuts.unregister_all() {
        log::debug!("unregister shortcuts: {error}");
    }
    let accelerator = accelerator.trim();
    if accelerator.is_empty() {
        return;
    }
    match shortcuts.register(accelerator) {
        Ok(()) => log::info!("global shortcut {accelerator}"),
        Err(error) => log::warn!("could not register the global shortcut {accelerator:?}: {error}"),
    }
}
