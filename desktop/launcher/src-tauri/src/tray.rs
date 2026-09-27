//! The tray icon. Left-click toggles the launcher; right-click opens the tray menu.
//!
//! On Windows and macOS the menu is the styled webview menu in [`crate::tray_menu`]. Linux trays
//! don't report clicks, so there the icon carries a native menu with the same rows, rebuilt
//! whenever the catalog, settings or pin state change.

use tauri::AppHandle;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

use crate::{AppError, tray_menu, window};

/// Id of the tray icon.
pub const TRAY_ID: &str = "main";

/// Builds the tray icon (kept alive by Tauri under [`TRAY_ID`]).
pub fn create(app: &AppHandle) -> Result<(), AppError> {
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("GENSLATE Launcher")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            let TrayIconEvent::Click {
                button,
                button_state: MouseButtonState::Up,
                position,
                ..
            } = event
            else {
                return;
            };
            let app = tray.app_handle();
            let result = match button {
                MouseButton::Left => window::toggle(app),
                MouseButton::Right => tray_menu::open(app, position),
                MouseButton::Middle => Ok(()),
            };
            if let Err(error) = result {
                log::warn!("tray: {error}");
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    #[cfg(target_os = "linux")]
    {
        builder = builder
            .menu(&native::build(app)?)
            .on_menu_event(|app, event| native::on_event(app, event.id().as_ref()));
    }
    builder.build(app)?;
    #[cfg(target_os = "linux")]
    native::watch(app);
    Ok(())
}

/// The native tray menu for Linux: the same rows and submenus as the styled menu.
#[cfg(target_os = "linux")]
mod native {
    use genslate_core_launcher::catalog::{AppEntry, AppStatus};
    use genslate_core_launcher::config::{SizePreset, ThemePreference};
    use tauri::menu::{CheckMenuItem, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
    use tauri::{AppHandle, Listener, Manager, Wry};

    use super::TRAY_ID;
    use crate::commands::{self, SettingKey};
    use crate::files::{self, ConfigFile, SharedFolder};
    use crate::state::{Launcher, Settings};
    use crate::window::{self, ShowView};
    use crate::{AppError, events};

    /// How many recent apps the Recent submenu lists.
    const RECENT_LIMIT: usize = 5;

    const FOLDERS: [(&str, &str); 7] = [
        ("desktop", "Desktop"),
        ("documents", "Documents"),
        ("downloads", "Downloads"),
        ("music", "Music"),
        ("pictures", "Pictures"),
        ("videos", "Videos"),
        ("storage", "Storage"),
    ];
    const THEMES: [(ThemePreference, &str, &str); 3] = [
        (ThemePreference::PolarNight, "polar-night", "Polar Night"),
        (ThemePreference::SnowStorm, "snow-storm", "Snow Storm"),
        (ThemePreference::System, "system", "Match System"),
    ];
    const SIZES: [(SizePreset, &str, &str); 3] = [
        (SizePreset::S, "s", "Small"),
        (SizePreset::M, "m", "Medium"),
        (SizePreset::L, "l", "Large"),
    ];

    /// Builds the menu from the current state.
    pub fn build(app: &AppHandle) -> Result<Menu<Wry>, AppError> {
        let launcher = app.state::<Launcher>();
        let settings = launcher.settings().clone();
        let pinned = launcher.window().pinned;
        let (recent, favorites) = {
            let catalog = launcher.catalog();
            let apps = catalog.apps();
            let find = |id: &genslate_core_launcher::catalog::AppId| {
                apps.iter().find(|app| &app.id == id).cloned()
            };
            let recent: Vec<AppEntry> = launcher
                .recent()
                .latest(RECENT_LIMIT)
                .iter()
                .filter_map(find)
                .collect();
            let favorites: Vec<AppEntry> = apps
                .iter()
                .filter(|app| app.favorite && !app.hidden)
                .cloned()
                .collect();
            (recent, favorites)
        };
        let version = app.package_info().version.to_string();

        let header = MenuItem::with_id(
            app,
            "header",
            format!("GENSLATE Launcher {version}"),
            false,
            None::<&str>,
        )?;
        let show = MenuItem::with_id(app, "show", "Show Launcher", true, None::<&str>)?;
        let pin = CheckMenuItem::with_id(app, "pin", "Pin on Top", true, pinned, None::<&str>)?;
        let recent = apps_submenu(app, "Recent", "No recent apps", &recent)?;
        let favorites = apps_submenu(app, "Favorites", "No favorites yet", &favorites)?;
        let folders = folders_submenu(app)?;
        let appearance = appearance_submenu(app, &settings)?;
        let settings_menu = settings_submenu(app, settings.config.behavior.autostart)?;
        let help = MenuItem::with_id(app, "help", "Help", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "Quit GENSLATE Launcher", true, None::<&str>)?;
        let items: [&dyn IsMenuItem<Wry>; 14] = [
            &header,
            &PredefinedMenuItem::separator(app)?,
            &show,
            &pin,
            &PredefinedMenuItem::separator(app)?,
            &recent,
            &favorites,
            &folders,
            &PredefinedMenuItem::separator(app)?,
            &appearance,
            &settings_menu,
            &help,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ];
        Ok(Menu::with_items(app, &items)?)
    }

    fn folders_submenu(app: &AppHandle) -> Result<Submenu<Wry>, AppError> {
        let folders = Submenu::with_id(app, "folders", "Folders", true)?;
        for (folder, label) in FOLDERS {
            folders.append(&MenuItem::with_id(
                app,
                format!("folder:{folder}"),
                label,
                true,
                None::<&str>,
            )?)?;
        }
        Ok(folders)
    }

    fn appearance_submenu(app: &AppHandle, settings: &Settings) -> Result<Submenu<Wry>, AppError> {
        let appearance = Submenu::with_id(app, "appearance", "Appearance", true)?;
        for (theme, value, label) in THEMES {
            let checked = settings.config.appearance.theme == theme;
            appearance.append(&CheckMenuItem::with_id(
                app,
                format!("theme:{value}"),
                label,
                true,
                checked,
                None::<&str>,
            )?)?;
        }
        appearance.append(&PredefinedMenuItem::separator(app)?)?;
        for (size, value, label) in SIZES {
            let checked = settings.config.appearance.size == size;
            appearance.append(&CheckMenuItem::with_id(
                app,
                format!("size:{value}"),
                label,
                true,
                checked,
                None::<&str>,
            )?)?;
        }
        Ok(appearance)
    }

    fn settings_submenu(app: &AppHandle, autostart: bool) -> Result<Submenu<Wry>, AppError> {
        Ok(Submenu::with_id_and_items(
            app,
            "settings",
            "Settings",
            true,
            &[
                &MenuItem::with_id(app, "config:settings", "Edit Settings…", true, None::<&str>)?,
                &MenuItem::with_id(
                    app,
                    "config:keybindings",
                    "Edit Keybindings…",
                    true,
                    None::<&str>,
                )?,
                &MenuItem::with_id(app, "config:logs", "Open Logs", true, None::<&str>)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItem::with_id(app, "rescan", "Rescan Apps", true, None::<&str>)?,
                &CheckMenuItem::with_id(
                    app,
                    "autostart",
                    "Start with System",
                    true,
                    autostart,
                    None::<&str>,
                )?,
            ],
        )?)
    }

    fn apps_submenu(
        app: &AppHandle,
        label: &str,
        empty: &str,
        apps: &[AppEntry],
    ) -> Result<Submenu<Wry>, AppError> {
        let submenu = Submenu::with_id(app, label.to_lowercase(), label, true)?;
        if apps.is_empty() {
            submenu.append(&MenuItem::with_id(
                app,
                format!("{}:empty", label.to_lowercase()),
                empty,
                false,
                None::<&str>,
            )?)?;
        }
        for entry in apps {
            let launchable = !matches!(
                entry.status,
                AppStatus::NotInstalled | AppStatus::MissingExe | AppStatus::BrokenManifest
            );
            submenu.append(&MenuItem::with_id(
                app,
                format!("launch:{}", entry.id),
                &entry.name,
                launchable,
                None::<&str>,
            )?)?;
        }
        Ok(submenu)
    }

    /// Runs a picked row.
    pub fn on_event(app: &AppHandle, id: &str) {
        if let Err(error) = run(app, id) {
            log::warn!("tray: {error}");
        }
    }

    fn run(app: &AppHandle, id: &str) -> Result<(), AppError> {
        let launcher = app.state::<Launcher>();
        match id.split_once(':') {
            Some(("launch", app_id)) => commands::launch(app, &commands::parse_id(app_id)?, None),
            Some(("folder", name)) => match SharedFolder::parse(name) {
                Some(folder) => files::open_shared_folder(app, folder),
                None => Ok(()),
            },
            Some(("theme", value)) => commands::write_setting(&launcher, SettingKey::Theme, value),
            Some(("size", value)) => commands::write_setting(&launcher, SettingKey::Size, value),
            Some(("config", "settings")) => files::open_config(app, ConfigFile::Settings),
            Some(("config", "keybindings")) => files::open_config(app, ConfigFile::Keybindings),
            Some(("config", "logs")) => files::open_config(app, ConfigFile::Logs),
            _ => match id {
                "show" => window::show(app),
                "help" => window::show_view(app, ShowView::Help),
                "pin" => {
                    let pinned = launcher.window().pinned;
                    window::set_pinned(app, !pinned)
                }
                "rescan" => {
                    launcher.rescan();
                    crate::reload::emit(app, events::CATALOG, ());
                    Ok(())
                }
                "autostart" => {
                    let enabled = launcher.settings().config.behavior.autostart;
                    let value = if enabled { "false" } else { "true" };
                    commands::write_setting(&launcher, SettingKey::Autostart, value)
                }
                "quit" => {
                    app.exit(0);
                    Ok(())
                }
                _ => Ok(()),
            },
        }
    }

    /// Rebuilds the menu when what it shows changes (check marks, recents, favorites).
    pub fn watch(app: &AppHandle) {
        for event in [events::CATALOG, events::SETTINGS, events::PINNED] {
            let handle = app.clone();
            app.listen_any(event, move |_| refresh(&handle));
        }
    }

    fn refresh(app: &AppHandle) {
        let Some(tray) = app.tray_by_id(TRAY_ID) else {
            return;
        };
        if let Err(error) = build(app).and_then(|menu| Ok(tray.set_menu(Some(menu))?)) {
            log::warn!("tray: {error}");
        }
    }
}
