//! Generates the Tauri context and an `allow-<command>` permission per IPC command, so the
//! main window's capability lists exactly the commands it may call.

/// Every command in `lib.rs`'s `generate_handler!` (keep in step).
const COMMANDS: &[&str] = &[
    "get_app_info",
    "get_context",
    "get_volumes",
    "list_dir",
    "create_folder",
    "create_file",
    "rename",
    "trash",
    "delete_permanently",
    "undo",
    "read_text",
    "get_properties",
    "open_path",
    "open_with",
    "reveal_path",
    "watch_folders",
    "set_setting",
    "find_conflicts",
    "start_transfer",
    "start_search",
    "folder_size",
    "cancel_task",
];

fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let manifest = tauri_build::AppManifest::new().commands(COMMANDS);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))?;
    Ok(())
}
