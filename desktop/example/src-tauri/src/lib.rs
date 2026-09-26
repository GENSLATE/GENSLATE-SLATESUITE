//! GENSLATE Example: the Tauri 2 shell around the Design Kit showcase UI.
//!
//! Startup order: resolve paths (`genslate-paths`) → load the TOML config
//! (`genslate-core-example`) → register plugins → paint the window with the Nord canvas
//! colour before the `WebView` renders (no white flash).

mod commands;
mod error;
mod window;

use genslate_core_example::{Config, LogLevel};
use genslate_paths::AppPaths;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_window_state::StateFlags;

pub use error::AppError;

/// Kebab-case app name: config file, log folder and `other/logs/app-logs/<name>`.
const APP_NAME: &str = "example";

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
    // A broken config must not stop the app: fall back to defaults and log why once the
    // logger is up.
    let (config, config_error) = match Config::load(&paths.config_file) {
        Ok(config) => (config, None),
        Err(error) => (Config::default(), Some(error)),
    };

    let mut builder = tauri::Builder::default()
        // Must be registered first so a second launch focuses the running window.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| focus_main_window(app)))
        .plugin(log_plugin(&paths, config.logging.level))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init());
    if config.window.remember_state {
        builder = builder.plugin(
            tauri_plugin_window_state::Builder::default()
                // Decorations and visibility are owned by tauri.conf.json, not the saved state.
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED | StateFlags::FULLSCREEN)
                .build(),
        );
    }

    builder
        .setup(move |app| {
            log::info!(
                "{} {} ({:?} mode)",
                app.package_info().name,
                app.package_info().version,
                paths.mode
            );
            log::debug!(
                "config: {}, logs: {}",
                paths.config_file.display(),
                paths.log_dir.display()
            );
            if let Some(error) = &config_error {
                log::warn!("using default config: {error}");
            }
            window::prepare_main_window(app.handle(), config.appearance.theme)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::app_info::get_app_info])
        .run(context)?;
    Ok(())
}

/// Logs to stdout and to `<log dir>/example.log` (see `genslate-paths` for the folder).
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
    eprintln!("genslate-example: {error}");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_levels_map_one_to_one() {
        assert_eq!(level_filter(LogLevel::Off), log::LevelFilter::Off);
        assert_eq!(level_filter(LogLevel::Info), log::LevelFilter::Info);
        assert_eq!(level_filter(LogLevel::Trace), log::LevelFilter::Trace);
    }
}
