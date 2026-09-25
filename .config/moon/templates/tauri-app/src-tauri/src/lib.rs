//! {{ title }}: Tauri 2 shell.
//!
//! Startup: resolve paths (`genslate-paths`) → register plugins → paint the window with the
//! Nord canvas colour before the `WebView` renders (no white flash).

mod commands;
mod error;
mod window;

use genslate_paths::AppPaths;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_window_state::StateFlags;

pub use error::AppError;

/// Kebab-case app name: config file, log folder and `other/logs/app-logs/<name>`.
const APP_NAME: &str = "{{ name }}";

/// Builds and runs the app. Exits with status 1 if startup fails.
pub fn run() {
    if let Err(error) = try_run() {
        report_fatal(&error);
        std::process::exit(1);
    }
}

fn try_run() -> Result<(), AppError> {
    let context = tauri::generate_context!();
    let paths = genslate_paths::resolve(APP_NAME, &context.config().identifier)?;
    paths.create_dirs()?;

    tauri::Builder::default()
        // Must be registered first so a second launch focuses the running window.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }))
        .plugin(log_plugin(&paths))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    StateFlags::SIZE
                        | StateFlags::POSITION
                        | StateFlags::MAXIMIZED
                        | StateFlags::FULLSCREEN,
                )
                .build(),
        )
        .setup(move |app| {
            log::info!(
                "{} {} ({:?} mode)",
                app.package_info().name,
                app.package_info().version,
                paths.mode
            );
            window::prepare_main_window(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::app_info::get_app_info])
        .run(context)?;
    Ok(())
}

/// Logs to stdout and to `<log dir>/{{ name }}.log`.
fn log_plugin<R: Runtime>(paths: &AppPaths) -> tauri::plugin::TauriPlugin<R> {
    let level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };
    tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::Folder {
                path: paths.log_dir.clone(),
                file_name: Some(APP_NAME.to_owned()),
            }),
        ])
        .level(level)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
        .build()
}

fn focus_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window(window::MAIN) else {
        return;
    };
    let result = window
        .unminimize()
        .and_then(|()| window.show())
        .and_then(|()| window.set_focus());
    if let Err(error) = result {
        log::warn!("could not focus the main window: {error}");
    }
}

#[expect(
    clippy::print_stderr,
    reason = "the logger may not be running when startup fails"
)]
fn report_fatal(error: &AppError) {
    log::error!("fatal: {error}");
    eprintln!("genslate-{{ name }}: {error}");
}
