//! The tray icon: click toggles the launcher; the menu has Show, Pin, Settings and Quit.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime};

use crate::state::Launcher;
use crate::{AppError, files, window};

/// Builds the tray icon (kept alive by Tauri under the id `main`).
pub fn create<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    let show = MenuItem::with_id(app, "show", "Show Launcher", true, None::<&str>)?;
    let pin = MenuItem::with_id(app, "pin", "Pin / Unpin", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Edit Settings…", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit GENSLATE Launcher", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &pin,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;
    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("GENSLATE Launcher")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let result = match event.id().as_ref() {
                "show" => window::show(app),
                "pin" => {
                    let pinned = app.state::<Launcher>().window().pinned;
                    window::set_pinned(app, !pinned)
                }
                "settings" => files::open_config(app, files::ConfigFile::Settings),
                "quit" => {
                    app.exit(0);
                    Ok(())
                }
                _ => Ok(()),
            };
            if let Err(error) = result {
                log::warn!("tray: {error}");
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
                && let Err(error) = window::toggle(tray.app_handle())
            {
                log::warn!("tray: {error}");
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}
