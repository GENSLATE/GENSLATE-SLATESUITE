//! GENSLATE Launcher: the Tauri 2 shell around the launcher UI.
//!
//! Startup: resolve portable paths (`genslate-paths`) → read `config.toml`/`keybindings.toml`
//! → scan the catalog → create the transparent window, tray and global shortcut → start hot
//! reload, click-through and status sampling → show (unless started with the OS).
//! Business logic lives in `genslate-core-launcher`; this crate wires it to Tauri.

mod actions;
mod autostart;
mod commands;
mod error;
mod events;
mod files;
mod hotkey;
mod icons;
mod monitor;
mod reload;
mod state;
mod tray;
mod window;

use genslate_core_launcher::config::LogLevel;
use genslate_paths::AppPaths;
use tauri::{Manager, RunEvent, Runtime, WindowEvent};
use tauri_plugin_log::{Target, TargetKind};

pub use error::AppError;

use crate::state::Launcher;

/// Kebab-case app name: config folder, log folder and metadata key.
const APP_NAME: &str = "launcher";

/// Builds and runs the app. Exits with status 1 if startup fails.
pub fn run() {
    if let Err(error) = try_run() {
        report_fatal(&error);
        std::process::exit(1);
    }
}

fn try_run() -> Result<(), AppError> {
    let context = tauri::generate_context!();
    let paths = genslate_paths::resolve(APP_NAME)?;
    let settings = reload::load_settings(&paths, None);
    let level = settings.config.logging.level;
    let autostarted = std::env::args().any(|arg| arg == autostart::AUTOSTART_ARG);

    let app = tauri::Builder::default()
        // Must be registered first so a second launch shows the running launcher.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Err(error) = window::show(app) {
                log::warn!("could not show the launcher: {error}");
            }
        }))
        .plugin(log_plugin(&paths, level))
        .plugin(hotkey::plugin())
        .plugin(autostart::plugin())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .register_uri_scheme_protocol(icons::SCHEME, |context, request| icons::handle(context, request))
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            log::info!(
                "{} {} ({:?} mode, root {})",
                app.package_info().name,
                app.package_info().version,
                paths.mode(),
                paths.layout.root.display()
            );
            if let Some(issue) = &settings.issue {
                log::warn!("settings: {issue} — using defaults");
            }
            let toggle = settings.keybindings.global.toggle.clone();
            let autostart_enabled = settings.config.behavior.autostart;
            app.manage(Launcher::new(paths, settings));
            let handle = app.handle();
            window::create(handle, &handle.state::<Launcher>())?;
            tray::create(handle)?;
            hotkey::register(handle, &toggle);
            autostart::apply(handle, autostart_enabled);
            reload::start(handle);
            window::spawn_hit_test(handle.clone());
            monitor::spawn(handle.clone());
            if !autostarted {
                window::show(handle)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Focused(false) = event {
                window::on_blur(window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            actions::run_action,
            commands::get_context,
            commands::list_apps,
            commands::rescan,
            commands::launch_app,
            commands::open_app_folder,
            commands::set_app_override,
            commands::open_folder,
            commands::open_config_file,
            commands::set_setting,
            commands::get_volume_info,
            commands::set_telemetry_active,
            commands::window_set_pinned,
            commands::window_set_expanded,
            commands::window_set_popup_open,
            commands::window_hide,
            commands::quit,
        ])
        .build(context)?;

    app.run(|_app, event| {
        // The launcher lives in the tray: closing windows never quits, only `exit()` does.
        if let RunEvent::ExitRequested {
            api, code: None, ..
        } = event
        {
            api.prevent_exit();
        }
    });
    Ok(())
}

/// Logs to stdout and to `<log dir>/launcher.log`.
fn log_plugin<R: Runtime>(paths: &AppPaths, level: LogLevel) -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::Folder {
                path: paths.log_dir.clone(),
                file_name: Some(APP_NAME.to_owned()),
            }),
        ])
        .level(level_filter(level))
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
        .build()
}

const fn level_filter(level: LogLevel) -> log::LevelFilter {
    match level {
        LogLevel::Off => log::LevelFilter::Off,
        LogLevel::Error => log::LevelFilter::Error,
        LogLevel::Warn => log::LevelFilter::Warn,
        LogLevel::Info => log::LevelFilter::Info,
        LogLevel::Debug => log::LevelFilter::Debug,
        LogLevel::Trace => log::LevelFilter::Trace,
    }
}

#[expect(
    clippy::print_stderr,
    reason = "the logger may not be running when startup fails"
)]
fn report_fatal(error: &AppError) {
    log::error!("fatal: {error}");
    eprintln!("genslate-launcher: {error}");
}
