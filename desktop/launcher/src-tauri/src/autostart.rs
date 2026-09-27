//! Start with the OS (`[behavior] autostart`). Off by default; when on, the entry is
//! re-registered at every start because a portable install may move (drive letters change).

use tauri::{AppHandle, Runtime};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

/// Passed to the launcher when the OS starts it: stay in the tray instead of popping up.
pub const AUTOSTART_ARG: &str = "--autostart";

pub fn plugin<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![AUTOSTART_ARG]))
}

/// Enables (refreshing the path) or disables autostart.
pub fn apply<R: Runtime>(app: &AppHandle<R>, enabled: bool) {
    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else if manager.is_enabled().unwrap_or(false) {
        manager.disable()
    } else {
        Ok(())
    };
    if let Err(error) = result {
        log::warn!("autostart: {error}");
    }
}
