//! Generates the Tauri context and an `allow-<command>` permission per IPC command, so each
//! window's capability lists exactly the commands it may call (the tray menu gets a subset).

/// Every command in `lib.rs`'s `generate_handler!` (keep in step).
const COMMANDS: &[&str] = &[
    "run_action",
    "get_context",
    "list_apps",
    "rescan",
    "launch_app",
    "open_app_folder",
    "set_app_override",
    "open_folder",
    "open_config_file",
    "set_setting",
    "get_volume_info",
    "set_telemetry_active",
    "window_set_pinned",
    "window_set_expanded",
    "window_set_popup_open",
    "window_hide",
    "window_show",
    "tray_menu_hide",
    "quit",
];

fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let manifest = tauri_build::AppManifest::new().commands(COMMANDS);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))?;
    Ok(())
}
