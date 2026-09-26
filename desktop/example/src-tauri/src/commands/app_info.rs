//! `get_app_info`: build metadata for the About panel and status bar.

use genslate_core_example::AppInfo;
use tauri::{AppHandle, Runtime};

use crate::AppError;

/// Returns the product name, versions, OS/arch and build profile.
#[tauri::command]
pub fn get_app_info<R: Runtime>(app: AppHandle<R>) -> Result<AppInfo, AppError> {
    let name = app
        .config()
        .product_name
        .clone()
        .ok_or(AppError::MissingConfig("productName"))?;
    Ok(AppInfo::new(
        name,
        app.package_info().version.to_string(),
        tauri::VERSION,
    ))
}
