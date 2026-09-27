//! The tray icon's right-click menu: a small frameless, transparent window that draws the
//! design system's menu (`tray-menu.html`), so it looks like every other GENSLATE menu instead
//! of the OS's native one.
//!
//! The window is created hidden at startup (so it opens instantly), placed next to the cursor
//! on every right-click and hidden again when the menu closes or loses focus. Linux trays don't
//! report clicks, so Linux keeps a native menu (`tray::native_menu`).

use std::thread;
use std::time::Duration;

use genslate_core_launcher::geometry::{self, Rect, TRAY_MENU_SIZE};
use serde::Serialize;
use tauri::window::Color;
use tauri::{
    AppHandle, Emitter, EventTarget, Manager, PhysicalPosition, PhysicalSize, Runtime, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
};

use crate::AppError;
use crate::events;
use crate::state::Launcher;

/// Label of the tray menu window.
pub const TRAY_MENU: &str = "tray-menu";
/// How long the menu's exit animation gets after a blur before the window hides anyway.
const BLUR_HIDE_DELAY: Duration = Duration::from_millis(160);

/// Where the UI anchors the menu inside the window (sent with [`events::TRAY_MENU_OPEN`]).
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuAnchor {
    /// Anchor point from the window's left edge (logical px).
    pub x: f64,
    /// Anchor point from the window's top edge (logical px).
    pub y: f64,
    /// Open upwards (tray at the bottom of the screen).
    pub opens_up: bool,
    /// Right-align the menu on the anchor (tray on the right).
    pub align_end: bool,
}

/// Creates the hidden tray menu window. It shares the launcher's webview profile.
#[cfg_attr(
    target_os = "linux",
    expect(
        dead_code,
        reason = "Linux trays report no clicks; the native menu is used instead"
    )
)]
pub fn create<R: Runtime>(
    app: &AppHandle<R>,
    launcher: &Launcher,
) -> Result<WebviewWindow<R>, AppError> {
    let window =
        WebviewWindowBuilder::new(app, TRAY_MENU, WebviewUrl::App("tray-menu.html".into()))
            .title("GENSLATE Launcher Menu")
            .inner_size(TRAY_MENU_SIZE.0, TRAY_MENU_SIZE.1)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .skip_taskbar(true)
            .always_on_top(true)
            .visible(false)
            .background_color(Color(0, 0, 0, 0))
            .data_directory(launcher.paths.cache_dir.join("webview"))
            .build()?;
    Ok(window)
}

fn menu_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, AppError> {
    app.get_webview_window(TRAY_MENU)
        .ok_or(AppError::MissingWindow(TRAY_MENU))
}

/// Opens the menu next to `cursor` (physical px), on the monitor under it.
pub fn open<R: Runtime>(app: &AppHandle<R>, cursor: PhysicalPosition<f64>) -> Result<(), AppError> {
    let window = menu_window(app)?;
    let monitor = app
        .monitor_from_point(cursor.x, cursor.y)?
        .or(app.primary_monitor()?);
    let Some(monitor) = monitor else {
        return Err(AppError::InvalidArgument(
            "no monitor for the tray menu".to_owned(),
        ));
    };
    let screen = rect(*monitor.position(), *monitor.size());
    let work = monitor.work_area();
    let work = rect(work.position, work.size);
    let placement = geometry::tray_menu_placement(
        (cursor.x, cursor.y),
        screen,
        work,
        monitor.scale_factor(),
        TRAY_MENU_SIZE,
    );
    let position = PhysicalPosition::new(placement.window.x, placement.window.y);
    // Move first so the window adopts the target monitor's DPI, then size, then settle.
    window.set_position(position)?;
    window.set_size(PhysicalSize::new(
        placement.window.width,
        placement.window.height,
    ))?;
    window.set_position(position)?;
    let anchor = MenuAnchor {
        x: placement.anchor.0,
        y: placement.anchor.1,
        opens_up: placement.opens_up,
        align_end: placement.align_end,
    };
    app.emit_to(
        EventTarget::webview_window(TRAY_MENU),
        events::TRAY_MENU_OPEN,
        anchor,
    )?;
    window.show()?;
    window.set_focus()?;
    Ok(())
}

/// Hides the menu window (the UI calls this once its exit animation finished).
pub fn hide<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    let window = menu_window(app)?;
    if window.is_visible()? {
        window.hide()?;
    }
    Ok(())
}

/// Focus left the menu (a click elsewhere): let the UI animate out, then make sure it's gone.
pub fn on_blur<R: Runtime>(app: &AppHandle<R>) {
    if let Err(error) = app.emit_to(
        EventTarget::webview_window(TRAY_MENU),
        events::TRAY_MENU_CLOSE,
        (),
    ) {
        log::warn!("tray menu: {error}");
    }
    let handle = app.clone();
    let spawned = thread::Builder::new()
        .name("tray-menu-hide".to_owned())
        .spawn(move || {
            thread::sleep(BLUR_HIDE_DELAY);
            let still_blurred = menu_window(&handle)
                .and_then(|window| Ok(!window.is_focused()?))
                .unwrap_or(true);
            if still_blurred && let Err(error) = hide(&handle) {
                log::warn!("tray menu: {error}");
            }
        });
    if let Err(error) = spawned {
        log::warn!("tray menu: {error}");
    }
}

const fn rect(position: PhysicalPosition<i32>, size: PhysicalSize<u32>) -> Rect {
    Rect {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    }
}
