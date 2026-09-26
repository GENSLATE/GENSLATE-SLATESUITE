//! Main window preparation: Nord background colour and minimum size from the design tokens.

use genslate_design_tokens::{Scheme, size, theme_for_scheme};
use tauri::window::Color;
use tauri::{AppHandle, LogicalSize, Manager, Runtime};

use crate::AppError;

/// Label of the window declared in `tauri.conf.json`.
pub const MAIN: &str = "main";

/// Paints the main window with the OS scheme's canvas colour and applies the minimum size.
pub fn prepare_main_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    let window = app
        .get_webview_window(MAIN)
        .ok_or(AppError::MissingWindow(MAIN))?;
    let scheme = match window.theme() {
        Ok(tauri::Theme::Light) => Scheme::Light,
        _ => Scheme::Dark,
    };
    let (r, g, b, a) = theme_for_scheme(scheme).colors.canvas.to_rgba();
    window.set_background_color(Some(Color(r, g, b, a)))?;
    window.set_min_size(Some(LogicalSize::new(
        size::WINDOW_MIN_WIDTH,
        size::WINDOW_MIN_HEIGHT,
    )))?;
    Ok(())
}
