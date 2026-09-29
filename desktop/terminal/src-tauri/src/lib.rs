//! GENSLATE Terminal: the Tauri 2 shell.
//!
//! Startup order: resolve portable paths (`genslate-paths`) → load the TOML config
//! (`genslate-core-terminal`) → read `--cwd` / `--profile` → register plugins and the shared
//! state → start the folder watcher → create the window (webview profile in the app's cache
//! folder) → paint it with the Nord canvas colour (no white flash). Every shell is ended when
//! the app exits.

mod commands;
mod error;
mod events;
mod state;
mod window;

use std::path::{Path, PathBuf};
use std::time::Duration;

use genslate_core_terminal::launch::{self, LaunchArgs};
use genslate_core_terminal::watch::DirWatcher;
use genslate_core_terminal::{Config, LogLevel};
use genslate_paths::AppPaths;
use serde::Serialize;
use tauri::{AppHandle, Manager, RunEvent, Runtime, WindowEvent};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_window_state::StateFlags;

pub use error::AppError;

/// Kebab-case app name: config file, log folder and `other/logs/app-logs/<name>`.
const APP_NAME: &str = "terminal";

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
        // A second launch opens a new tab here (`terminal://open`) and focuses the window.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            open_from_second_launch(app, &args, &cwd);
        }))
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

    let launch = launch::parse(&std::env::args().collect::<Vec<_>>(), &launch_base());
    let terminal = state::Terminal::new(paths.clone(), config.clone(), launch);
    let app = builder
        .manage(terminal)
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
            commands::context::get_context,
            commands::context::set_setting,
            commands::pty::pty_spawn,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
            commands::pty::sessions_info,
            commands::history::history_search,
            commands::history::history_delete,
            commands::history::history_clear,
            commands::snippets::list_snippets,
            commands::snippets::save_snippet,
            commands::snippets::delete_snippet,
            commands::files::list_dir,
            commands::files::git_info,
            commands::files::watch_dirs,
            commands::files::open_path,
            commands::files::reveal_path,
            commands::files::save_output,
        ])
        .build(context)?;
    app.run(|app, event| {
        let closing = match &event {
            RunEvent::Exit => true,
            RunEvent::WindowEvent { label, event, .. } => {
                label == window::MAIN && matches!(event, WindowEvent::Destroyed)
            }
            _ => false,
        };
        if closing {
            // No shell outlives the window (ConPTY children would otherwise linger on Windows).
            app.state::<state::Terminal>().sessions.kill_all();
        }
    });
    Ok(())
}

/// `terminal://open` payload.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenPayload {
    cwd: Option<String>,
    profile_id: Option<String>,
}

/// The folder relative `--cwd` values are resolved against: the launching process's folder.
fn launch_base() -> PathBuf {
    std::env::current_dir()
        .ok()
        .or_else(dirs::home_dir)
        .unwrap_or_default()
}

/// Hands a second launch's `--cwd` / `--profile` to the UI and brings the window forward.
fn open_from_second_launch<R: Runtime>(app: &AppHandle<R>, args: &[String], cwd: &str) {
    let LaunchArgs { cwd, profile_id } = launch::parse(args, Path::new(cwd));
    commands::emit(app, events::OPEN, OpenPayload { cwd, profile_id });
    focus_main_window(app);
}

/// Starts live refresh of the Files panel: changed folders are sent as
/// `terminal://files-changed`. Without a watcher (e.g. the OS limit on watches is reached)
/// the UI still refreshes on focus.
fn start_watcher<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    let watcher = DirWatcher::new(Duration::from_millis(250), move |folders| {
        let folders: Vec<String> = folders
            .iter()
            .map(|folder| folder.to_string_lossy().into_owned())
            .collect();
        commands::emit(&handle, events::FILES_CHANGED, folders);
    });
    match watcher {
        Ok(watcher) => *app.state::<state::Terminal>().watcher() = Some(watcher),
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

/// Logs to stdout and to `<log dir>/terminal.log` (see `genslate-paths` for the folder).
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
    eprintln!("genslate-terminal: {error}");
}
