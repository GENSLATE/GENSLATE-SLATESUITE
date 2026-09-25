//! Main window preparation: Nord background colour and minimum size from the design tokens.

use genslate_core_example::ThemePreference;
use genslate_design_tokens::{Scheme, Theme, size, theme, theme_for_scheme};
use tauri::window::Color;
use tauri::{AppHandle, LogicalSize, Manager, Runtime};

use crate::AppError;

/// Label of the window declared in `tauri.conf.json`.
pub const MAIN: &str = "main";

/// Paints the main window with the theme's canvas colour (so resizing and the first frame
/// never flash white) and applies the design-token minimum size.
pub fn prepare_main_window<R: Runtime>(
    app: &AppHandle<R>,
    preference: ThemePreference,
) -> Result<(), AppError> {
    let window = app
        .get_webview_window(MAIN)
        .ok_or(AppError::MissingWindow(MAIN))?;

    let resolved = resolve_theme(preference, || window.theme().ok());
    if preference != ThemePreference::System {
        window.set_theme(Some(native_theme(resolved.scheme)))?;
    }
    let (r, g, b, a) = resolved.colors.canvas.to_rgba();
    window.set_background_color(Some(Color(r, g, b, a)))?;
    window.set_min_size(Some(LogicalSize::new(
        size::WINDOW_MIN_WIDTH,
        size::WINDOW_MIN_HEIGHT,
    )))?;
    log::debug!("main window prepared with theme {}", resolved.id);
    Ok(())
}

/// Picks the design-token theme: the configured one, else the OS scheme (dark if unknown).
fn resolve_theme(
    preference: ThemePreference,
    system: impl FnOnce() -> Option<tauri::Theme>,
) -> &'static Theme {
    preference.theme_id().and_then(theme).unwrap_or_else(|| {
        let scheme = match system() {
            Some(tauri::Theme::Light) => Scheme::Light,
            _ => Scheme::Dark,
        };
        theme_for_scheme(scheme)
    })
}

const fn native_theme(scheme: Scheme) -> tauri::Theme {
    match scheme {
        Scheme::Dark => tauri::Theme::Dark,
        Scheme::Light => tauri::Theme::Light,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explicit_preference_wins() {
        let resolved = resolve_theme(ThemePreference::SnowStorm, || Some(tauri::Theme::Dark));
        assert_eq!(resolved.id, "snow-storm");
    }

    #[test]
    fn system_preference_follows_the_os() {
        assert_eq!(
            resolve_theme(ThemePreference::System, || Some(tauri::Theme::Light)).id,
            "snow-storm"
        );
        assert_eq!(
            resolve_theme(ThemePreference::System, || Some(tauri::Theme::Dark)).id,
            "polar-night"
        );
        assert_eq!(
            resolve_theme(ThemePreference::System, || None).id,
            "polar-night"
        );
    }
}
