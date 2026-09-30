//! GENSLATE Explorer: the Tauri 2 shell.
//!
//! Startup order: resolve portable paths (`genslate-paths`) → load the TOML config
//! (`genslate-core-explorer`) → register plugins, the preview and thumbnail schemes and the
//! folder watcher → create the window (webview profile in the app's cache folder) → paint it
//! with the Nord canvas colour (no white flash).

mod commands;
mod error;
mod events;
mod preview_scheme;
mod state;
mod thumb_scheme;
mod window;

use std::time::Duration;

use genslate_core_explorer::watch::FolderWatcher;
use genslate_core_explorer::{Config, LogLevel};
use genslate_paths::AppPaths;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_window_state::StateFlags;

pub use error::AppError;

/// Kebab-case app name: config file, log folder and `other/logs/app-logs/<name>`.
const APP_NAME: &str = "explorer";

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
                // The plugin joins this onto the OS config dir; an absolute path replaces it,
                // which keeps the state file portable.
                .with_filename(window_state_file(&paths))
                .build(),
        );
    }

    let explorer = state::Explorer::new(paths.clone(), config.clone());
    builder
        .manage(explorer)
        .register_asynchronous_uri_scheme_protocol(preview_scheme::SCHEME, preview_scheme::handle)
        .register_asynchronous_uri_scheme_protocol(thumb_scheme::SCHEME, thumb_scheme::handle)
        .setup(move |app| {
            log::info!(
                "{} {} ({:?} mode, root {})",
                app.package_info().name,
                app.package_info().version,
                paths.mode(),
                paths.layout.root.display()
            );
            log::debug!(
                "config: {}, logs: {}",
                paths.config_file.display(),
                paths.log_dir.display()
            );
            if let Some(error) = &config_error {
                log::warn!("using default config: {error}");
            }
            start_watcher(app.handle());
            window::create_main_window(app.handle(), paths.cache_dir.join("webview"))?;
            window::prepare_main_window(app.handle(), config.appearance.theme)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info::get_app_info,
            commands::files::get_context,
            commands::files::get_volumes,
            commands::files::list_dir,
            commands::files::create_folder,
            commands::files::create_file,
            commands::files::rename,
            commands::files::trash,
            commands::files::delete_permanently,
            commands::files::undo,
            commands::files::read_text,
            commands::files::get_properties,
            commands::files::open_path,
            commands::files::open_with,
            commands::files::reveal_path,
            commands::files::watch_folders,
            commands::files::set_setting,
            commands::tasks::find_conflicts,
            commands::tasks::start_transfer,
            commands::tasks::start_search,
            commands::tasks::folder_size,
            commands::tasks::cancel_task,
        ])
        .run(context)?;
    Ok(())
}

/// Starts live refresh: changed folders are sent to the UI as `explorer://changed`. Without a
/// watcher (e.g. the OS limit on watches is reached) the UI still refreshes on focus.
fn start_watcher(app: &AppHandle) {
    let handle = app.clone();
    let watcher = FolderWatcher::new(Duration::from_millis(250), move |folders| {
        let folders: Vec<String> = folders
            .iter()
            .filter_map(|folder| folder.to_str().map(str::to_owned))
            .collect();
        commands::files::emit(&handle, events::CHANGED, folders);
    });
    match watcher {
        Ok(watcher) => *app.state::<state::Explorer>().watcher() = Some(watcher),
        Err(error) => log::warn!("live refresh is off: {error}"),
    }
}

/// `<data dir>/window-state.json`, as the string the window-state plugin expects.
fn window_state_file(paths: &AppPaths) -> String {
    paths
        .data_dir
        .join("window-state.json")
        .to_string_lossy()
        .into_owned()
}

/// Logs to stdout and to `<log dir>/explorer.log` (see `genslate-paths` for the folder).
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
        .level(log::LevelFilter::from(level))
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
    eprintln!("genslate-explorer: {error}");
}
