//! The launcher window: a fixed-size transparent window anchored bottom-right of the work area
//! of the monitor under the cursor.
//!
//! The window is always as wide as the *expanded* (tools) layout; the UI draws the frame at the
//! right edge and animates it in CSS, so showing, hiding and expanding are pure
//! transform/opacity animations (Tauri can't move + resize atomically, which would flash). The
//! transparent area is made click-through by [`spawn_hit_test`], which polls the cursor.

use std::sync::atomic::Ordering;
use std::thread;
use std::time::{Duration, Instant};

use genslate_core_launcher::geometry::{self, EDGE_MARGIN, Rect};
use serde::{Deserialize, Serialize};
use tauri::window::Color;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Runtime, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
};

use crate::AppError;
use crate::events;
use crate::state::Launcher;

/// Label of the only window.
pub const MAIN: &str = "main";
/// How long the UI's exit animation gets before the native window hides.
const HIDE_DELAY: Duration = Duration::from_millis(140);
/// A toggle right after a hide is the second half of a tray click, not a request to show.
const TOGGLE_DEBOUNCE: Duration = Duration::from_millis(300);

/// Creates the (hidden) launcher window. Its webview profile lives in the app's cache folder.
pub fn create<R: Runtime>(
    app: &AppHandle<R>,
    launcher: &Launcher,
) -> Result<WebviewWindow<R>, AppError> {
    let size = launcher.settings().config.appearance.size;
    let (width, height) = geometry::window_size(size);
    let pinned = launcher.window().pinned;
    let window = WebviewWindowBuilder::new(app, MAIN, WebviewUrl::default())
        .title("GENSLATE Launcher")
        .inner_size(width, height)
        .resizable(false)
        .maximizable(false)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .skip_taskbar(true)
        .always_on_top(pinned)
        .visible(false)
        .background_color(Color(0, 0, 0, 0))
        .data_directory(launcher.paths.cache_dir.join("webview"))
        .build()?;
    Ok(window)
}

/// The main window, or an error if it's gone.
pub fn main_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, AppError> {
    app.get_webview_window(MAIN)
        .ok_or(AppError::MissingWindow(MAIN))
}

/// The view the UI opens on when the window shows.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShowView {
    /// The apps list (every regular show).
    #[default]
    Apps,
    /// Shortcuts and commands (the tray menu's Help).
    Help,
}

/// Places the window on the monitor under the cursor, shows and focuses it, then tells the UI
/// to play its entrance on the apps list.
pub fn show<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    show_view(app, ShowView::Apps)
}

/// Like [`show`], opening on `view`.
pub fn show_view<R: Runtime>(app: &AppHandle<R>, view: ShowView) -> Result<(), AppError> {
    let window = main_window(app)?;
    let launcher = app.state::<Launcher>();
    let size = launcher.settings().config.appearance.size;
    if let Some(rect) = target_rect(app, size) {
        // Move first so the window adopts the target monitor's DPI, then size, then settle.
        let position = PhysicalPosition::new(rect.x, rect.y);
        window.set_position(position)?;
        window.set_size(PhysicalSize::new(rect.width, rect.height))?;
        window.set_position(position)?;
    }
    window.show()?;
    window.set_focus()?;
    launcher.window().visible = true;
    app.emit(events::SHOWN, view)?;
    Ok(())
}

/// Plays the UI's exit animation, then hides the native window.
pub fn hide<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    {
        let mut flags = launcher.window();
        if !flags.visible {
            return Ok(());
        }
        flags.visible = false;
        flags.hidden_at = Some(Instant::now());
    }
    app.emit(events::WILL_HIDE, ())?;
    let handle = app.clone();
    thread::spawn(move || {
        thread::sleep(HIDE_DELAY);
        let launcher = handle.state::<Launcher>();
        // Shown again during the animation? Then stay.
        if launcher.is_visible() {
            return;
        }
        if let Err(error) = main_window(&handle).and_then(|window| Ok(window.hide()?)) {
            log::warn!("could not hide the launcher: {error}");
        }
    });
    Ok(())
}

/// Tray click / global hotkey: hide when visible and focused, otherwise show.
pub fn toggle<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    let (visible, recently_hidden) = {
        let flags = launcher.window();
        let recent = flags
            .hidden_at
            .is_some_and(|at| at.elapsed() < TOGGLE_DEBOUNCE);
        (flags.visible, recent)
    };
    if recently_hidden {
        return Ok(());
    }
    let focused = main_window(app)?.is_focused().unwrap_or(false);
    if visible && focused {
        hide(app)
    } else {
        show(app)
    }
}

/// Pins (always on top, never auto-hides) or unpins the window.
pub fn set_pinned<R: Runtime>(app: &AppHandle<R>, pinned: bool) -> Result<(), AppError> {
    main_window(app)?.set_always_on_top(pinned)?;
    app.state::<Launcher>().window().pinned = pinned;
    app.emit(events::PINNED, pinned)?;
    Ok(())
}

/// Resizes for a new height preset (the width never changes).
pub fn apply_size<R: Runtime>(app: &AppHandle<R>) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    if launcher.is_visible() {
        show(app)
    } else {
        let (width, height) = geometry::window_size(launcher.settings().config.appearance.size);
        main_window(app)?.set_size(tauri::LogicalSize::new(width, height))?;
        Ok(())
    }
}

/// Hides on focus loss unless pinned or disabled in the config.
pub fn on_blur<R: Runtime>(app: &AppHandle<R>) {
    let launcher = app.state::<Launcher>();
    let pinned = launcher.window().pinned;
    let enabled = launcher.settings().config.behavior.hide_on_blur;
    if !pinned
        && enabled
        && let Err(error) = hide(app)
    {
        log::warn!("could not hide on blur: {error}");
    }
}

/// Bottom-right rectangle on the monitor under the cursor.
fn target_rect<R: Runtime>(
    app: &AppHandle<R>,
    size: genslate_core_launcher::config::SizePreset,
) -> Option<Rect> {
    let monitors = app.available_monitors().ok()?;
    let rects: Vec<Rect> = monitors
        .iter()
        .map(|monitor| {
            rect(
                monitor.position().x,
                monitor.position().y,
                monitor.size().width,
                monitor.size().height,
            )
        })
        .collect();
    let cursor = app
        .cursor_position()
        .map_or((0.0, 0.0), |position| (position.x, position.y));
    let monitor = monitors.get(geometry::pick_monitor(cursor, &rects)?)?;
    let work = monitor.work_area();
    let work = rect(
        work.position.x,
        work.position.y,
        work.size.width,
        work.size.height,
    );
    Some(geometry::anchor_bottom_right(
        work,
        monitor.scale_factor(),
        geometry::window_size(size),
        EDGE_MARGIN,
    ))
}

const fn rect(x: i32, y: i32, width: u32, height: u32) -> Rect {
    Rect {
        x,
        y,
        width,
        height,
    }
}

/// Keeps the transparent part of the window click-through: about 60 times a second while the
/// window is visible, the cursor is tested against the frame the UI draws at the right edge.
pub fn spawn_hit_test<R: Runtime>(app: AppHandle<R>) {
    let spawned = thread::Builder::new()
        .name("launcher-hit-test".to_owned())
        .spawn(move || {
            let mut passing_through: Option<bool> = None;
            loop {
                let launcher = app.state::<Launcher>();
                let (visible, expanded) = {
                    let flags = launcher.window();
                    (flags.visible, flags.expanded)
                };
                if !visible {
                    passing_through = None;
                    thread::sleep(Duration::from_millis(120));
                    continue;
                }
                let inside =
                    launcher.popup_open() || cursor_in_frame(&app, expanded).unwrap_or(true);
                if passing_through != Some(!inside)
                    && let Ok(window) = main_window(&app)
                    && window.set_ignore_cursor_events(!inside).is_ok()
                {
                    passing_through = Some(!inside);
                }
                thread::sleep(Duration::from_millis(16));
            }
        });
    if let Err(error) = spawned {
        log::error!("click-through thread failed to start: {error}");
    }
}

fn cursor_in_frame<R: Runtime>(app: &AppHandle<R>, expanded: bool) -> Option<bool> {
    let window = main_window(app).ok()?;
    let cursor = app.cursor_position().ok()?;
    let origin = window.outer_position().ok()?;
    let size = window.outer_size().ok()?;
    let frame = geometry::frame_rect(
        rect(origin.x, origin.y, size.width, size.height),
        window.scale_factor().ok()?,
        expanded,
    );
    Some(frame.contains(cursor.x, cursor.y))
}

/// Marks the expanded (tools) layout — the UI animates; the shell widens the hit area.
pub fn set_expanded<R: Runtime>(app: &AppHandle<R>, expanded: bool) {
    app.state::<Launcher>().window().expanded = expanded;
}

/// Records that a popup is open (menus may extend over the transparent area).
pub fn set_popup<R: Runtime>(app: &AppHandle<R>, open: bool) {
    app.state::<Launcher>()
        .popup_open
        .store(open, Ordering::Relaxed);
}
