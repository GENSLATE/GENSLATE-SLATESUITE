//! `get_app_info`: build metadata (mirrors `AppInfo` in `@genslate/tauri-bridge`).

use serde::Serialize;
use tauri::{AppHandle, Runtime};

use crate::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
    tauri_version: String,
    os: String,
    arch: String,
    debug: bool,
}

/// Returns the product name, versions, OS/arch and build profile.
#[tauri::command]
pub fn get_app_info<R: Runtime>(app: AppHandle<R>) -> Result<AppInfo, AppError> {
    let name = app
        .config()
        .product_name
        .clone()
        .ok_or(AppError::MissingConfig("productName"))?;
    Ok(AppInfo {
        name,
        version: app.package_info().version.to_string(),
        tauri_version: tauri::VERSION.to_owned(),
        os: std::env::consts::OS.to_owned(),
        arch: std::env::consts::ARCH.to_owned(),
        debug: cfg!(debug_assertions),
    })
}
