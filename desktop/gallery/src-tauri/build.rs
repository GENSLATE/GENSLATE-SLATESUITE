//! Generates the Tauri context and an `allow-<command>` permission per IPC command, so the
//! main window's capability lists exactly the commands it may call.

/// Every command in `lib.rs`'s `generate_handler!` (keep in step).
const COMMANDS: &[&str] = &[
    "get_app_info",
    "get_context",
    "get_summary",
    "query_media",
    "get_details",
    "add_folder",
    "add_folder_path",
    "remove_folder",
    "rescan",
    "open_paths",
    "set_favorite",
    "set_rating",
    "add_tag",
    "remove_tag",
    "create_album",
    "rename_album",
    "delete_album",
    "add_to_album",
    "remove_from_album",
    "set_setting",
    "rename_media",
    "move_media",
    "copy_media",
    "trash_media",
    "restore_media",
    "forget_media",
    "undo",
    "open_media",
    "reveal_media",
    "save_edit",
    "find_duplicates",
    "export_media",
    "cancel_task",
    "refresh_watcher",
    "start_scan",
];

fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let manifest = tauri_build::AppManifest::new().commands(COMMANDS);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))?;
    Ok(())
}
