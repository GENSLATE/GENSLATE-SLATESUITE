//! Terminal sessions: shells running in pseudo terminals (`ConPTY` on Windows).
//!
//! Each session has a reader thread (output → [`Tracker`] → the output callback) and a waiter
//! thread (process exit → the event callback). Nothing here blocks the caller beyond a write
//! or resize. On Windows the reader never sees EOF while the pseudo console is open, so the
//! waiter closes it once the shell has exited (after giving the reader a moment to drain).
//!
//! An exited session keeps its last folder and command for [`SessionManager::info`] until it
//! is [killed](SessionManager::kill) (the tab closed).

use std::collections::HashMap;
use std::io::{ErrorKind, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::thread;
use std::time::Duration;

use portable_pty::{Child, ChildKiller, CommandBuilder, MasterPty, PtySize, native_pty_system};
use serde::Serialize;

use crate::integration;
use crate::process::{ProcessProbe, RunningProgram};
use crate::profiles::Profile;
use crate::tracker::{FinishedCommand, Tracker};
use crate::{TerminalError, env};

/// The reader's buffer: output is forwarded in chunks of at most this many bytes.
const READ_CHUNK: usize = 64 * 1024;
/// The largest terminal accepted, in cells.
const MAX_CELLS: u16 = 2_000;
/// How long the waiter lets the reader drain the last output before closing the terminal.
const DRAIN: Duration = Duration::from_millis(300);

/// What [`SessionManager::spawn`] starts.
#[derive(Debug, Clone)]
pub struct SpawnRequest {
    /// Chosen by the UI (a tab id); letters, digits, `-` and `_`.
    pub id: String,
    pub profile: Profile,
    /// Starting folder; falls back to the profile's, then home.
    pub cwd: Option<PathBuf>,
    pub cols: u16,
    pub rows: u16,
    /// Load the shell integration (the `shell-integration` setting).
    pub integration: bool,
    /// Where integration scripts are written (the app's cache folder).
    pub cache_dir: PathBuf,
    /// Extra variables, applied last.
    pub env: Vec<(String, String)>,
}

/// A started session (`SpawnInfo`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnInfo {
    pub id: String,
    pub pid: Option<u32>,
    pub profile_id: String,
    pub shell_name: String,
    pub cwd: String,
    /// The secret the shell integration appends to its command reports (`633;E`); `None` when
    /// the shell reports nothing or on its own. The webview checks it too.
    pub nonce: Option<String>,
}

/// A session's state (`SessionInfo`).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: String,
    pub pid: Option<u32>,
    pub alive: bool,
    /// Reported by the shell integration, else the starting folder.
    pub cwd: Option<String>,
    pub last_command: Option<String>,
    /// The program the shell is running; `None` when idle.
    pub running: Option<RunningProgram>,
}

/// Something a session reports besides output.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SessionEvent {
    /// The integration saw a command finish.
    Command(FinishedCommand),
    /// The shell process ended (`None`: killed by a signal, or the code is unknown).
    Exit { code: Option<i32> },
}

/// Receives raw output chunks (on the session's reader thread).
pub type OutputSink = Box<dyn FnMut(&[u8]) + Send>;
/// Receives `(session id, event)` (on the session's reader or waiter thread).
pub type EventSink = Arc<dyn Fn(&str, SessionEvent) + Send + Sync>;

/// Every running session; thread-safe.
#[derive(Default)]
pub struct SessionManager {
    sessions: Mutex<HashMap<String, Arc<Session>>>,
}

impl std::fmt::Debug for SessionManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SessionManager")
            .field("sessions", &lock(&self.sessions).keys().collect::<Vec<_>>())
            .finish()
    }
}

struct Session {
    pid: Option<u32>,
    spawn_cwd: String,
    nonce: Option<String>,
    alive: AtomicBool,
    writer: Mutex<Option<Box<dyn Write + Send>>>,
    master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
    tracked: Mutex<Tracked>,
}

#[derive(Default)]
struct Tracked {
    cwd: Option<String>,
    last_command: Option<String>,
}

impl Session {
    /// Closes the pseudo terminal (the shell sees a hang-up; on Windows the reader unblocks).
    fn close(&self) {
        drop(lock(&self.writer).take());
        drop(lock(&self.master).take());
    }
}

impl SessionManager {
    /// No sessions yet.
    pub fn new() -> Self {
        Self::default()
    }

    /// Starts `request.profile` in a new pseudo terminal. Output goes to `on_output`,
    /// finished commands and the exit to `on_event`.
    pub fn spawn(
        &self,
        request: SpawnRequest,
        mut on_output: OutputSink,
        on_event: EventSink,
    ) -> Result<SpawnInfo, TerminalError> {
        validate_id(&request.id)?;
        let size = pty_size(request.cols, request.rows)?;
        if lock(&self.sessions)
            .get(&request.id)
            .is_some_and(|session| session.alive.load(Ordering::SeqCst))
        {
            return Err(TerminalError::SessionExists(request.id));
        }
        let cwd = resolve_cwd(
            request.cwd.as_deref(),
            request.profile.cwd.as_deref(),
            dirs::home_dir(),
        )?;
        let (child, reader, session) = open(&request, size, &cwd)?;
        let pid = session.pid;
        let spawn_cwd = session.spawn_cwd.clone();
        let nonce = session.nonce.clone();
        {
            // Checked again under the same lock as the insert: two spawns of one id may both
            // have passed the check above while their shells started.
            let mut sessions = lock(&self.sessions);
            if sessions
                .get(&request.id)
                .is_some_and(|existing| existing.alive.load(Ordering::SeqCst))
            {
                drop(sessions);
                let _ = lock(&session.killer).kill();
                session.close();
                return Err(TerminalError::SessionExists(request.id));
            }
            sessions.insert(request.id.clone(), Arc::clone(&session));
        }

        let (drained_tx, drained_rx) = mpsc::channel::<()>();
        let reading = Arc::clone(&session);
        let reader_events = Arc::clone(&on_event);
        let reader_id = request.id.clone();
        let started = thread::Builder::new()
            .name(format!("pty-read-{}", request.id))
            .spawn(move || {
                read_loop(
                    reader,
                    &reading,
                    &reader_id,
                    &mut on_output,
                    &*reader_events,
                );
                let _ = drained_tx.send(());
            });
        if let Err(error) = started {
            self.discard(&request.id, &session);
            return Err(TerminalError::io("could not start reading", "pty-read")(
                error,
            ));
        }

        let waiting = Arc::clone(&session);
        let waiter_id = request.id.clone();
        let mut child = child;
        let started = thread::Builder::new()
            .name(format!("pty-wait-{}", request.id))
            .spawn(move || {
                let code = wait_for_exit(&mut *child, &waiter_id);
                // Let the reader forward the last output, then close the terminal (which ends
                // the reader on Windows) and give it a moment more.
                if drained_rx.recv_timeout(DRAIN).is_err() {
                    waiting.close();
                    let _ = drained_rx.recv_timeout(DRAIN);
                }
                waiting.close();
                waiting.alive.store(false, Ordering::SeqCst);
                on_event(&waiter_id, SessionEvent::Exit { code });
            });
        if let Err(error) = started {
            self.discard(&request.id, &session);
            return Err(TerminalError::io(
                "could not start watching the shell",
                "pty-wait",
            )(error));
        }

        log::info!(
            "session {} started {} (pid {pid:?}) in {spawn_cwd}",
            request.id,
            request.profile.command
        );
        Ok(SpawnInfo {
            id: request.id,
            pid,
            profile_id: request.profile.id,
            shell_name: request.profile.name,
            cwd: spawn_cwd,
            nonce,
        })
    }

    /// Removes a session that failed half-way through starting.
    fn discard(&self, id: &str, session: &Session) {
        let _ = lock(&session.killer).kill();
        session.close();
        lock(&self.sessions).remove(id);
    }

    fn session(&self, id: &str) -> Result<Arc<Session>, TerminalError> {
        lock(&self.sessions)
            .get(id)
            .cloned()
            .ok_or_else(|| TerminalError::UnknownSession(id.to_owned()))
    }

    /// Sends input (typed text, pastes, escape sequences) to a session. Input for a session
    /// whose shell already exited is dropped.
    pub fn write(&self, id: &str, data: &[u8]) -> Result<(), TerminalError> {
        let session = self.session(id)?;
        let mut writer = lock(&session.writer);
        let Some(writer) = writer.as_mut() else {
            return Ok(());
        };
        writer
            .write_all(data)
            .and_then(|()| writer.flush())
            .map_err(|error| TerminalError::pty("could not write to the shell")(&error))
    }

    /// Resizes a session's terminal (a no-op once its shell exited).
    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), TerminalError> {
        let size = pty_size(cols, rows)?;
        let session = self.session(id)?;
        let master = lock(&session.master);
        let Some(master) = master.as_ref() else {
            return Ok(());
        };
        master
            .resize(size)
            .map_err(|error| TerminalError::pty("could not resize the terminal")(&error))
    }

    /// Ends a session (hang-up on Unix, terminate on Windows) and forgets it. Unknown or
    /// already finished sessions are fine.
    pub fn kill(&self, id: &str) {
        let Some(session) = lock(&self.sessions).remove(id) else {
            return;
        };
        if session.alive.load(Ordering::SeqCst)
            && let Err(error) = lock(&session.killer).kill()
        {
            log::debug!("killing session {id}: {error}");
        }
        session.close();
    }

    /// Ends every session (app exit).
    pub fn kill_all(&self) {
        let ids: Vec<String> = lock(&self.sessions).keys().cloned().collect();
        for id in ids {
            self.kill(&id);
        }
    }

    /// The state of the sessions in `ids` (unknown ids are skipped). Refreshes `probe` once
    /// when a live session needs its running program.
    pub fn info(&self, ids: &[String], probe: &mut ProcessProbe) -> Vec<SessionInfo> {
        let sessions: Vec<(String, Arc<Session>)> = {
            let map = lock(&self.sessions);
            ids.iter()
                .filter_map(|id| map.get(id).map(|session| (id.clone(), Arc::clone(session))))
                .collect()
        };
        if sessions
            .iter()
            .any(|(_, session)| session.alive.load(Ordering::SeqCst))
        {
            probe.refresh();
        }
        sessions
            .into_iter()
            .map(|(id, session)| {
                let alive = session.alive.load(Ordering::SeqCst);
                let tracked = lock(&session.tracked);
                SessionInfo {
                    id,
                    pid: session.pid,
                    alive,
                    cwd: tracked
                        .cwd
                        .clone()
                        .or_else(|| Some(session.spawn_cwd.clone())),
                    last_command: tracked.last_command.clone(),
                    running: session
                        .pid
                        .filter(|_| alive)
                        .and_then(|pid| probe.foreground(pid)),
                }
            })
            .collect()
    }

    /// The ids of every session (live or exited but not yet killed).
    pub fn ids(&self) -> Vec<String> {
        lock(&self.sessions).keys().cloned().collect()
    }
}

/// A started shell: its process, the terminal's output and the session state.
type Opened = (
    Box<dyn Child + Send + Sync>,
    Box<dyn Read + Send>,
    Arc<Session>,
);

/// Opens the pseudo terminal and starts the shell in it.
fn open(request: &SpawnRequest, size: PtySize, cwd: &Path) -> Result<Opened, TerminalError> {
    let (command, nonce) = build_command(request, cwd);
    let pair = native_pty_system()
        .openpty(size)
        .map_err(|error| TerminalError::pty("could not open a terminal")(&error))?;
    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| TerminalError::Pty {
            action: "could not start the shell",
            message: format!("{}: {error}", request.profile.command),
        })?;
    // The shell holds the only slave handle now, so its exit ends the reader on Unix.
    drop(pair.slave);
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| TerminalError::pty("could not read the terminal")(&error))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|error| TerminalError::pty("could not write to the terminal")(&error))?;
    let session = Arc::new(Session {
        pid: child.process_id(),
        spawn_cwd: cwd.to_string_lossy().into_owned(),
        nonce,
        alive: AtomicBool::new(true),
        writer: Mutex::new(Some(writer)),
        master: Mutex::new(Some(pair.master)),
        killer: Mutex::new(child.clone_killer()),
        tracked: Mutex::new(Tracked::default()),
    });
    Ok((child, reader, session))
}

/// Waits for the shell to end; its exit code, or `None` when a signal ended it.
fn wait_for_exit(child: &mut (dyn Child + Send + Sync), id: &str) -> Option<i32> {
    match child.wait() {
        // Windows exit codes are u32 and crashes are NTSTATUS values above `i32::MAX`
        // (0xC0000005 is -1073741819, as shells print it): keep the bits, not the range.
        Ok(status) if status.signal().is_none() => {
            Some(i32::from_ne_bytes(status.exit_code().to_ne_bytes()))
        }
        Ok(_) => None,
        Err(error) => {
            log::debug!("waiting for {id}: {error}");
            None
        }
    }
}

fn read_loop(
    mut reader: Box<dyn Read + Send>,
    session: &Session,
    id: &str,
    on_output: &mut OutputSink,
    on_event: &(dyn Fn(&str, SessionEvent) + Send + Sync),
) {
    let mut tracker = Tracker::with_nonce(cfg!(windows), session.nonce.clone());
    let mut buffer = vec![0; READ_CHUNK];
    loop {
        let read = match reader.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => read,
            Err(error) if error.kind() == ErrorKind::Interrupted => continue,
            // EIO on Linux once the shell (and everything holding the terminal) exited.
            Err(error) => {
                log::debug!("session {id}: output ended: {error}");
                break;
            }
        };
        let chunk = &buffer[..read];
        let finished = tracker.advance(chunk);
        {
            let mut shared = lock(&session.tracked);
            if shared.cwd.as_deref() != tracker.cwd() {
                shared.cwd = tracker.cwd().map(str::to_owned);
            }
            if shared.last_command.as_deref() != tracker.last_command() {
                shared.last_command = tracker.last_command().map(str::to_owned);
            }
        }
        for command in finished {
            on_event(id, SessionEvent::Command(command));
        }
        on_output(chunk);
    }
}

/// The command that starts the shell, and the nonce its integration will prove reports with.
fn build_command(request: &SpawnRequest, cwd: &Path) -> (CommandBuilder, Option<String>) {
    let profile = &request.profile;
    let mut command = CommandBuilder::new(&profile.command);
    let inherited = |name: &str| {
        command
            .get_env(name)
            .and_then(|value| value.to_str())
            .map(str::to_owned)
    };
    let prepared = if request.integration {
        match integration::prepare(profile.kind, &profile.args, &request.cache_dir, inherited) {
            Ok(prepared) => prepared,
            Err(error) => {
                log::warn!("shell integration is off for {}: {error}", profile.name);
                None
            }
        }
    } else {
        None
    };
    // Without a secret the scripts' reports could be forged by any output: no integration.
    let (prepared, nonce) = match prepared {
        Some(prepared) if prepared.reports_commands => match new_nonce() {
            Ok(nonce) => (Some(prepared), Some(nonce)),
            Err(error) => {
                log::warn!("shell integration is off for {}: {error}", profile.name);
                (None, None)
            }
        },
        other => (other, None),
    };
    let leaked = env::leaked_names(
        command
            .iter_full_env_as_str()
            .map(|(name, _)| std::ffi::OsStr::new(name)),
    );
    for name in leaked {
        command.env_remove(name);
    }
    for (name, value) in env::terminal_vars() {
        command.env(name, value);
    }
    if cfg!(target_os = "macos")
        && let Some((name, value)) = env::macos_locale(|name| {
            command
                .get_env(name)
                .and_then(|value| value.to_str())
                .map(str::to_owned)
        })
    {
        command.env(name, value);
    }
    for (name, value) in &profile.env {
        command.env(name, value);
    }
    match prepared {
        Some(prepared) => {
            command.args(&prepared.args);
            for (name, value) in prepared.env {
                command.env(name, value);
            }
        }
        None => command.args(&profile.args),
    }
    if let Some(nonce) = &nonce {
        command.env(integration::NONCE_VAR, nonce);
    }
    for (name, value) in &request.env {
        command.env(name, value);
    }
    // Shells keep a logical `$PWD` (symlinks as the user typed them) when it names the
    // folder they start in; the inherited one names the app's folder.
    if cfg!(unix) {
        command.env("PWD", cwd);
    }
    command.cwd(cwd);
    (command, nonce)
}

/// 128 random bits as hex: unguessable by anything printing to the terminal.
fn new_nonce() -> Result<String, getrandom::Error> {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes)?;
    Ok(bytes
        .iter()
        .flat_map(|byte| [HEX[usize::from(byte >> 4)], HEX[usize::from(byte & 0xf)]])
        .map(char::from)
        .collect())
}

/// The requested folder if it exists, else the profile's, else home.
fn resolve_cwd(
    requested: Option<&Path>,
    profile: Option<&str>,
    home: Option<PathBuf>,
) -> Result<PathBuf, TerminalError> {
    let candidates = [
        requested.map(Path::to_path_buf),
        profile.map(PathBuf::from),
        home,
    ];
    let wanted = candidates.iter().flatten().next().cloned();
    candidates
        .into_iter()
        .flatten()
        .find(|path| path.is_absolute() && path.is_dir())
        .ok_or_else(|| TerminalError::NotFound(wanted.unwrap_or_default()))
}

fn validate_id(id: &str) -> Result<(), TerminalError> {
    let valid = !id.is_empty()
        && id.len() <= 128
        && id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_');
    if valid {
        Ok(())
    } else {
        Err(TerminalError::InvalidArgument(format!(
            "“{id}” is not a valid session id"
        )))
    }
}

fn pty_size(cols: u16, rows: u16) -> Result<PtySize, TerminalError> {
    if !(1..=MAX_CELLS).contains(&cols) || !(1..=MAX_CELLS).contains(&rows) {
        return Err(TerminalError::InvalidArgument(format!(
            "{cols}×{rows} is not a valid terminal size"
        )));
    }
    Ok(PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    })
}

/// A poisoned lock only means another thread panicked mid-update; the data is still usable.
fn lock<T: ?Sized>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;
    use std::time::Instant;

    use genslate_testing::TempTree;

    use super::*;
    use crate::profiles::{ProfileIcon, ProfileSource, ShellKind};

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    #[test]
    fn validates_ids_and_sizes() {
        assert!(validate_id("tab-1_a").is_ok());
        for bad in ["", "a b", "../x", "é", &"x".repeat(129)] {
            assert!(validate_id(bad).is_err(), "{bad}");
        }
        assert!(pty_size(80, 24).is_ok());
        assert!(pty_size(0, 24).is_err());
        assert!(pty_size(80, 5000).is_err());
    }

    #[test]
    fn cwd_falls_back_to_the_profile_then_home() -> TestResult {
        let tree = TempTree::new()?.dir("profile")?.dir("home")?;
        let home = Some(tree.join("home"));
        let profile = tree.join("profile");
        let profile = profile.to_str();
        assert_eq!(
            resolve_cwd(Some(tree.path()), profile, home.clone())?,
            tree.path()
        );
        assert_eq!(
            resolve_cwd(Some(&tree.join("gone")), profile, home.clone())?,
            tree.join("profile")
        );
        assert_eq!(
            resolve_cwd(None, Some("relative"), home.clone())?,
            tree.join("home")
        );
        assert!(resolve_cwd(Some(&tree.join("gone")), None, None).is_err());
        Ok(())
    }

    #[test]
    fn unknown_sessions() {
        let manager = SessionManager::new();
        assert_eq!(
            manager.write("nope", b"x").err().map(|e| e.kind()),
            Some("unknown-session")
        );
        assert!(manager.resize("nope", 80, 24).is_err());
        manager.kill("nope");
        assert!(
            manager
                .info(&["nope".to_owned()], &mut ProcessProbe::new())
                .is_empty()
        );
    }

    #[cfg(unix)]
    fn sh_profile(args: &[&str]) -> Profile {
        Profile {
            id: "sh".to_owned(),
            name: "sh".to_owned(),
            command: "/bin/sh".to_owned(),
            args: args.iter().map(|arg| (*arg).to_owned()).collect(),
            cwd: None,
            icon: ProfileIcon::Terminal,
            color: None,
            kind: ShellKind::Sh,
            source: ProfileSource::Detected,
            env: BTreeMap::from([("GENSLATE_TEST_VAR".to_owned(), "from-profile".to_owned())]),
        }
    }

    /// Collects output and events from a session.
    #[cfg(unix)]
    struct Recorder {
        output: Arc<Mutex<Vec<u8>>>,
        events: mpsc::Receiver<(String, SessionEvent)>,
    }

    #[cfg(unix)]
    fn recorder() -> (Recorder, OutputSink, EventSink) {
        let output = Arc::new(Mutex::new(Vec::new()));
        let sink = Arc::clone(&output);
        let (tx, rx) = mpsc::channel();
        let tx = Mutex::new(tx);
        (
            Recorder { output, events: rx },
            Box::new(move |chunk: &[u8]| lock(&sink).extend_from_slice(chunk)),
            Arc::new(move |id: &str, event| {
                let _ = lock(&tx).send((id.to_owned(), event));
            }),
        )
    }

    #[cfg(unix)]
    impl Recorder {
        fn exit_code(&self) -> Result<Option<i32>, Box<dyn std::error::Error>> {
            let deadline = Instant::now() + Duration::from_secs(10);
            while Instant::now() < deadline {
                if let (_, SessionEvent::Exit { code }) =
                    self.events.recv_timeout(Duration::from_secs(10))?
                {
                    return Ok(code);
                }
            }
            Err("no exit".into())
        }
        fn text(&self) -> String {
            String::from_utf8_lossy(&lock(&self.output)).into_owned()
        }
    }

    #[cfg(unix)]
    #[test]
    fn runs_a_shell_and_reports_its_exit() -> TestResult {
        let tree = TempTree::new()?;
        let manager = SessionManager::new();
        let (recorder, output, events) = recorder();
        let info = manager.spawn(
            SpawnRequest {
                id: "t1".to_owned(),
                profile: sh_profile(&[
                    "-c",
                    "printf 'hi %s %s %s' \"$TERM_PROGRAM\" \"$GENSLATE_TEST_VAR\" \"$(pwd)\"; exit 3",
                ]),
                cwd: Some(tree.path().to_path_buf()),
                cols: 80,
                rows: 24,
                integration: true,
                cache_dir: tree.join("cache"),
                env: Vec::new(),
            },
            output,
            events,
        )?;
        assert_eq!(info.profile_id, "sh");
        assert_eq!(info.shell_name, "sh");
        assert!(info.pid.is_some());
        assert_eq!(recorder.exit_code()?, Some(3));
        let text = recorder.text();
        let cwd = dunce::canonicalize(tree.path())?;
        assert!(
            text.contains(&format!("hi GENSLATE from-profile {}", cwd.display())),
            "{text:?}"
        );
        let state = manager.info(&["t1".to_owned()], &mut ProcessProbe::new());
        assert_eq!(state.len(), 1);
        assert!(!state[0].alive);
        assert_eq!(state[0].running, None);
        manager.write("t1", b"ignored after exit")?;
        manager.kill("t1");
        assert!(manager.ids().is_empty());
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn input_resize_and_kill() -> TestResult {
        let tree = TempTree::new()?;
        let manager = SessionManager::new();
        let (recorder, output, events) = recorder();
        manager.spawn(
            SpawnRequest {
                id: "t2".to_owned(),
                profile: sh_profile(&[]),
                cwd: Some(tree.path().to_path_buf()),
                cols: 100,
                rows: 30,
                integration: false,
                cache_dir: tree.join("cache"),
                env: vec![("PS1".to_owned(), "$ ".to_owned())],
            },
            output,
            events,
        )?;
        assert!(
            manager
                .spawn(
                    SpawnRequest {
                        id: "t2".to_owned(),
                        profile: sh_profile(&[]),
                        cwd: None,
                        cols: 80,
                        rows: 24,
                        integration: false,
                        cache_dir: tree.join("cache"),
                        env: Vec::new(),
                    },
                    Box::new(|_| {}),
                    Arc::new(|_, _| {}),
                )
                .is_err(),
            "the id is taken"
        );
        manager.resize("t2", 120, 40)?;
        manager.write("t2", b"stty size; echo marker-$((6*7))\n")?;
        let deadline = Instant::now() + Duration::from_secs(10);
        while !recorder.text().contains("marker-42") && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(20));
        }
        let text = recorder.text();
        assert!(text.contains("marker-42"), "{text:?}");
        assert!(text.contains("40 120"), "resized: {text:?}");
        let state = manager.info(
            &["t2".to_owned(), "other".to_owned()],
            &mut ProcessProbe::new(),
        );
        assert_eq!(state.len(), 1);
        assert!(state[0].alive);
        manager.kill("t2");
        assert!(recorder.exit_code().is_ok());
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn bash_integration_reports_commands() -> TestResult {
        if !Path::new("/bin/bash").is_file() {
            return Ok(());
        }
        let tree = TempTree::new()?.dir("home")?;
        let manager = SessionManager::new();
        let (recorder, output, events) = recorder();
        let mut profile = sh_profile(&[]);
        profile.command = "/bin/bash".to_owned();
        profile.kind = ShellKind::Bash;
        manager.spawn(
            SpawnRequest {
                id: "bash".to_owned(),
                profile,
                cwd: Some(tree.path().to_path_buf()),
                cols: 80,
                rows: 24,
                integration: true,
                cache_dir: tree.join("cache"),
                // An empty home: no user startup files.
                env: vec![(
                    "HOME".to_owned(),
                    tree.join("home").to_string_lossy().into_owned(),
                )],
            },
            output,
            events,
        )?;
        manager.write("bash", b"echo one; false\n")?;
        let (id, event) = recorder.events.recv_timeout(Duration::from_secs(10))?;
        assert_eq!(id, "bash");
        let SessionEvent::Command(finished) = event else {
            return Err(format!("unexpected {event:?}").into());
        };
        assert_eq!(finished.command, "echo one; false");
        assert_eq!(finished.exit_code, Some(1));
        assert_eq!(finished.output_tail, "one");
        let cwd = dunce::canonicalize(tree.path())?;
        assert_eq!(finished.cwd.as_deref().map(Path::new), Some(cwd.as_path()));
        let state = manager.info(&["bash".to_owned()], &mut ProcessProbe::new());
        assert_eq!(state[0].last_command.as_deref(), Some("echo one; false"));

        // Programs never see the nonce, and their fake reports are not recorded.
        manager.write(
            "bash",
            b"echo \"[${GENSLATE_NONCE-hidden}]\"; printf '\\e]633;E;rm -rf ~\\a'\n",
        )?;
        let (_, event) = recorder.events.recv_timeout(Duration::from_secs(10))?;
        let SessionEvent::Command(finished) = event else {
            return Err(format!("unexpected {event:?}").into());
        };
        assert_eq!(finished.output_tail, "[hidden]");
        assert!(finished.command.starts_with("echo"), "{}", finished.command);
        manager.kill_all();
        assert!(manager.ids().is_empty());
        Ok(())
    }
}
