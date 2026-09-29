//! Terminal sessions: start a shell in a pseudo terminal, send it input, resize it, end it,
//! and report on it. Output streams through the `output` channel as raw bytes; finished
//! commands and exits are events (`terminal://command`, `terminal://exit`).

use std::path::PathBuf;
use std::sync::Arc;

use genslate_core_terminal::TerminalError;
use genslate_core_terminal::history::{HistoryEntry, NewCommand};
use genslate_core_terminal::pty::{SessionEvent, SessionInfo, SpawnInfo, SpawnRequest};
use genslate_core_terminal::tracker::FinishedCommand;
use serde::Serialize;
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::{AppHandle, Manager, State};

use crate::state::Terminal;
use crate::{AppError, events};

/// The most sessions one `sessions_info` call reports on.
const MAX_INFO_IDS: usize = 256;

/// `terminal://exit` payload.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExitPayload {
    id: String,
    code: Option<i32>,
}

/// `terminal://command` payload.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandPayload {
    id: String,
    entry: HistoryEntry,
}

/// Starts profile `profile_id` in a new session `id` (a tab id: letters, digits, `-`, `_`).
/// `cwd` must be absolute; without it the shell starts in the profile's folder, else home.
#[tauri::command(async)]
#[expect(
    clippy::too_many_arguments,
    reason = "the arguments are the IPC contract of `pty_spawn`"
)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn pty_spawn(
    app: AppHandle,
    terminal: State<'_, Terminal>,
    id: String,
    profile_id: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
    output: Channel<InvokeResponseBody>,
) -> Result<SpawnInfo, AppError> {
    let cwd = match cwd.filter(|cwd| !cwd.trim().is_empty()) {
        Some(cwd) => {
            let path = PathBuf::from(cwd);
            if !path.is_absolute() {
                return Err(TerminalError::NotAbsolute(path).into());
            }
            Some(path)
        }
        None => None,
    };
    let profile = terminal
        .profiles()
        .into_iter()
        .find(|profile| profile.id == profile_id)
        .ok_or(TerminalError::UnknownProfile(profile_id))?;
    let shell = profile.name.clone();
    let request = SpawnRequest {
        id,
        profile,
        cwd,
        cols,
        rows,
        integration: terminal.settings().shell_integration,
        cache_dir: terminal.paths.cache_dir.clone(),
        env: Vec::new(),
    };
    let mut warned = false;
    let on_output = Box::new(move |chunk: &[u8]| {
        // Fails only when the webview is gone or reloaded; the session keeps running.
        if let Err(error) = output.send(InvokeResponseBody::Raw(chunk.to_vec()))
            && !warned
        {
            warned = true;
            log::debug!("terminal output is not delivered: {error}");
        }
    });
    let on_event = Arc::new(move |id: &str, event: SessionEvent| match event {
        SessionEvent::Command(finished) => {
            let entry = record(&app, &shell, &finished);
            super::emit(
                &app,
                events::COMMAND,
                CommandPayload {
                    id: id.to_owned(),
                    entry,
                },
            );
        }
        SessionEvent::Exit { code } => super::emit(
            &app,
            events::EXIT,
            ExitPayload {
                id: id.to_owned(),
                code,
            },
        ),
    });
    Ok(terminal.sessions.spawn(request, on_output, on_event)?)
}

/// Stores a finished command when history is on and returns it; `entry.id` is 0 when it was
/// not stored (history off or unavailable, a leading space, a database error).
fn record(app: &AppHandle, shell: &str, finished: &FinishedCommand) -> HistoryEntry {
    let terminal = app.state::<Terminal>();
    if terminal.settings().history
        && let Some(history) = &terminal.history
    {
        let stored = history.record(NewCommand {
            command: &finished.command,
            cwd: finished.cwd.as_deref(),
            shell,
            exit_code: finished.exit_code,
            started_at: finished.started_at,
            duration_ms: Some(finished.duration_ms),
            output_tail: &finished.output_tail,
        });
        match stored {
            Ok(Some(entry)) => return entry,
            Ok(None) => {}
            Err(error) => log::warn!("could not record a command: {error}"),
        }
    }
    HistoryEntry {
        id: 0,
        command: finished.command.trim().to_owned(),
        cwd: finished.cwd.clone(),
        shell: shell.to_owned(),
        exit_code: finished.exit_code,
        started_at: finished.started_at,
        duration_ms: Some(finished.duration_ms),
    }
}

/// Sends input (keys, pastes) to a session.
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn pty_write(terminal: State<'_, Terminal>, id: String, data: String) -> Result<(), AppError> {
    Ok(terminal.sessions.write(&id, data.as_bytes())?)
}

/// Resizes a session's terminal (in cells).
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn pty_resize(
    terminal: State<'_, Terminal>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), AppError> {
    Ok(terminal.sessions.resize(&id, cols, rows)?)
}

/// Ends a session and forgets it; unknown or finished sessions are fine.
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn pty_kill(terminal: State<'_, Terminal>, id: String) -> Result<(), AppError> {
    if id.is_empty() {
        return Err(AppError::InvalidArgument(
            "a session id is required".to_owned(),
        ));
    }
    terminal.sessions.kill(&id);
    Ok(())
}

/// The state of the sessions in `ids` (unknown ids are skipped).
#[tauri::command(async)]
pub fn sessions_info(
    terminal: State<'_, Terminal>,
    ids: Vec<String>,
) -> Result<Vec<SessionInfo>, AppError> {
    if ids.len() > MAX_INFO_IDS {
        return Err(AppError::InvalidArgument(format!(
            "at most {MAX_INFO_IDS} sessions per call"
        )));
    }
    let mut probe = terminal.probe();
    Ok(terminal.sessions.info(&ids, &mut probe))
}
