//! Shell profiles: the shells installed on this machine plus the user's `[[profiles]]`.
//!
//! Detection goes through the [`ShellEnv`] trait (PATH lookup, file checks, environment
//! variables, running a helper program, reading the registry) so the Windows, macOS and Linux
//! rules are all unit-tested on any OS with a fake environment. Only a profile's id ever
//! crosses IPC to spawn a shell, so the webview can't start an arbitrary program.
//!
//! Order: Windows lists PowerShell 7, Windows PowerShell, Command Prompt, each WSL distro, Git
//! Bash, Nushell and the Visual Studio developer shells; macOS and Linux list the login shell
//! (`$SHELL`) first, then zsh, bash, fish, Nushell and sh. Config profiles come last.

use std::collections::{BTreeMap, HashSet};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::config::{CustomProfile, TerminalSettings};

/// The OS the app runs on (`TerminalContext.platform`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Windows,
    Macos,
    Linux,
}

impl Platform {
    /// The OS this binary was built for (other Unixes count as Linux).
    pub const fn current() -> Self {
        if cfg!(windows) {
            Self::Windows
        } else if cfg!(target_os = "macos") {
            Self::Macos
        } else {
            Self::Linux
        }
    }
}

/// The icon the UI shows for a profile.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileIcon {
    Powershell,
    Cmd,
    Linux,
    Ubuntu,
    Debian,
    Bash,
    Zsh,
    Fish,
    Nu,
    Git,
    Vs,
    Terminal,
}

/// A Nord accent a profile can be tinted with.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NordColor {
    Frost,
    AuroraRed,
    AuroraOrange,
    AuroraYellow,
    AuroraGreen,
    AuroraPurple,
}

/// Which shell a profile runs: decides the shell integration and login flags.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShellKind {
    /// PowerShell 7+ (`pwsh`).
    Pwsh,
    /// Windows PowerShell 5.1 (`powershell.exe`).
    Powershell,
    Cmd,
    Bash,
    Zsh,
    Fish,
    Nu,
    Sh,
    Wsl,
    Other,
}

impl ShellKind {
    /// Guesses the kind from a program path or name (`/usr/bin/zsh`, `pwsh.exe`).
    pub fn of_program(program: &str) -> Self {
        let name = program
            .rsplit(['/', '\\'])
            .next()
            .unwrap_or(program)
            .to_ascii_lowercase();
        let stem = name.strip_suffix(".exe").unwrap_or(&name);
        match stem {
            "pwsh" | "pwsh-preview" => Self::Pwsh,
            "powershell" => Self::Powershell,
            "cmd" => Self::Cmd,
            "bash" => Self::Bash,
            "zsh" => Self::Zsh,
            "fish" => Self::Fish,
            "nu" => Self::Nu,
            "sh" | "dash" | "ash" => Self::Sh,
            "wsl" => Self::Wsl,
            _ => Self::Other,
        }
    }

    /// Id of a detected profile of this kind (`None` for kinds that need more context).
    const fn detected_id(self) -> Option<&'static str> {
        match self {
            Self::Pwsh => Some("pwsh"),
            Self::Powershell => Some("powershell"),
            Self::Cmd => Some("cmd"),
            Self::Bash => Some("bash"),
            Self::Zsh => Some("zsh"),
            Self::Fish => Some("fish"),
            Self::Nu => Some("nu"),
            Self::Sh => Some("sh"),
            Self::Wsl | Self::Other => None,
        }
    }

    const fn display_name(self) -> Option<&'static str> {
        match self {
            Self::Pwsh => Some("PowerShell"),
            Self::Powershell => Some("Windows PowerShell"),
            Self::Cmd => Some("Command Prompt"),
            Self::Bash => Some("bash"),
            Self::Zsh => Some("zsh"),
            Self::Fish => Some("fish"),
            Self::Nu => Some("Nushell"),
            Self::Sh => Some("sh"),
            Self::Wsl | Self::Other => None,
        }
    }

    const fn icon(self) -> ProfileIcon {
        match self {
            Self::Pwsh | Self::Powershell => ProfileIcon::Powershell,
            Self::Cmd => ProfileIcon::Cmd,
            Self::Bash => ProfileIcon::Bash,
            Self::Zsh => ProfileIcon::Zsh,
            Self::Fish => ProfileIcon::Fish,
            Self::Nu => ProfileIcon::Nu,
            Self::Wsl => ProfileIcon::Linux,
            Self::Sh | Self::Other => ProfileIcon::Terminal,
        }
    }
}

/// Where a profile comes from.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileSource {
    Detected,
    Config,
}

/// A shell the user can open a tab with.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    /// Stable id (`pwsh`, `wsl-ubuntu`, `zsh`, `custom-dev-server`, …).
    pub id: String,
    pub name: String,
    /// The resolved program path (`wsl.exe` for WSL distros).
    pub command: String,
    pub args: Vec<String>,
    /// The profile's own starting folder.
    pub cwd: Option<String>,
    pub icon: ProfileIcon,
    pub color: Option<NordColor>,
    pub kind: ShellKind,
    pub source: ProfileSource,
    /// Extra environment variables (config profiles); not sent to the UI.
    #[serde(skip)]
    pub env: BTreeMap<String, String>,
}

impl Profile {
    fn detected(
        id: impl Into<String>,
        name: impl Into<String>,
        command: String,
        kind: ShellKind,
    ) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            command,
            args: Vec::new(),
            cwd: None,
            icon: kind.icon(),
            color: None,
            kind,
            source: ProfileSource::Detected,
            env: BTreeMap::new(),
        }
    }

    fn with_args(mut self, args: &[&str]) -> Self {
        self.args = args.iter().map(|arg| (*arg).to_owned()).collect();
        self
    }

    fn with_icon(mut self, icon: ProfileIcon) -> Self {
        self.icon = icon;
        self
    }
}

/// What profile detection needs from the machine. [`SystemShellEnv`] is the real one; tests
/// use a fake.
pub trait ShellEnv {
    /// An environment variable (`None` when unset or not Unicode).
    fn var(&self, name: &str) -> Option<String>;
    /// The user's home folder.
    fn home(&self) -> Option<PathBuf>;
    /// Finds `program` on `PATH` (never relative to the working folder).
    fn which(&self, program: &str) -> Option<PathBuf>;
    /// `true` when `path` is an existing file.
    fn is_file(&self, path: &Path) -> bool;
    /// A text file's contents (`/etc/shells`).
    fn read_to_string(&self, path: &Path) -> Option<String>;
    /// `path` with symlinks resolved (itself when that fails).
    fn canonicalize(&self, path: &Path) -> PathBuf;
    /// Runs `program` with `args` and returns its standard output, or `None` when it can't
    /// start, fails or takes too long.
    fn run(&self, program: &Path, args: &[&str]) -> Option<Vec<u8>>;
    /// A string value under `HKEY_LOCAL_MACHINE\<key>` (Windows; `None` elsewhere).
    fn registry_string(&self, key: &str, value: &str) -> Option<String>;
}

/// The real machine.
#[derive(Debug, Clone, Copy, Default)]
pub struct SystemShellEnv;

/// How long a helper program (`wsl.exe`, `vswhere.exe`) may take before detection gives up.
const RUN_TIMEOUT: Duration = Duration::from_secs(4);

impl ShellEnv for SystemShellEnv {
    fn var(&self, name: &str) -> Option<String> {
        std::env::var(name).ok().filter(|value| !value.is_empty())
    }

    fn home(&self) -> Option<PathBuf> {
        dirs::home_dir()
    }

    fn which(&self, program: &str) -> Option<PathBuf> {
        which::which_global(program).ok()
    }

    fn is_file(&self, path: &Path) -> bool {
        path.is_file()
    }

    fn read_to_string(&self, path: &Path) -> Option<String> {
        std::fs::read_to_string(path).ok()
    }

    fn canonicalize(&self, path: &Path) -> PathBuf {
        dunce::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
    }

    fn run(&self, program: &Path, args: &[&str]) -> Option<Vec<u8>> {
        run_with_timeout(program, args, RUN_TIMEOUT)
    }

    #[cfg(windows)]
    fn registry_string(&self, key: &str, value: &str) -> Option<String> {
        winreg::HKLM
            .open_subkey(key)
            .ok()?
            .get_value::<String, _>(value)
            .ok()
    }

    #[cfg(not(windows))]
    fn registry_string(&self, _key: &str, _value: &str) -> Option<String> {
        None
    }
}

/// Runs a helper program without a console window, killing it after `timeout`.
fn run_with_timeout(program: &Path, args: &[&str], timeout: Duration) -> Option<Vec<u8>> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        /// `CREATE_NO_WINDOW`: a GUI app starting a console program would flash a window.
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = command.spawn().ok()?;
    let mut stdout = child.stdout.take()?;
    let reader = thread::spawn(move || {
        let mut output = Vec::new();
        stdout.read_to_end(&mut output).map(|_| output)
    });
    let deadline = Instant::now() + timeout;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(20)),
            _ => {
                log::debug!("{} did not answer in time", program.display());
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
        }
    };
    let output = reader.join().ok()?.ok()?;
    status.success().then_some(output)
}

/// Every profile for this machine: detected shells first, then the config's `[[profiles]]`.
/// Never empty (falls back to `cmd.exe` / `/bin/sh`).
pub fn detect(env: &dyn ShellEnv, platform: Platform, custom: &[CustomProfile]) -> Vec<Profile> {
    let mut profiles = match platform {
        Platform::Windows => detect_windows(env),
        Platform::Macos | Platform::Linux => detect_unix(env, platform == Platform::Macos),
    };
    if profiles.is_empty() {
        profiles.push(fallback(env, platform));
    }
    let mut taken: HashSet<String> = profiles.iter().map(|profile| profile.id.clone()).collect();
    for profile in custom {
        match resolve_custom(env, profile, &mut taken) {
            Some(resolved) => profiles.push(resolved),
            None => log::warn!(
                "profile “{}”: “{}” was not found, skipping it",
                profile.name,
                profile.command
            ),
        }
    }
    profiles
}

/// The profile new tabs open with: the configured one if it exists, else the first.
pub fn default_profile_id(settings: &TerminalSettings, profiles: &[Profile]) -> String {
    let wanted = settings.default_profile.trim();
    if !wanted.is_empty() && profiles.iter().any(|profile| profile.id == wanted) {
        return wanted.to_owned();
    }
    profiles
        .first()
        .map(|profile| profile.id.clone())
        .unwrap_or_default()
}

fn fallback(env: &dyn ShellEnv, platform: Platform) -> Profile {
    if platform == Platform::Windows {
        let system_root = env
            .var("SystemRoot")
            .unwrap_or_else(|| r"C:\Windows".to_owned());
        let command = env
            .var("ComSpec")
            .unwrap_or_else(|| win_join(&system_root, r"System32\cmd.exe"));
        Profile::detected("cmd", "Command Prompt", command, ShellKind::Cmd)
    } else {
        Profile::detected("sh", "sh", "/bin/sh".to_owned(), ShellKind::Sh)
    }
}

/// `base\rest` with Windows separators (built as text so tests behave the same on every OS).
fn win_join(base: &str, rest: &str) -> String {
    format!("{}\\{rest}", base.trim_end_matches(['\\', '/']))
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn detect_windows(env: &dyn ShellEnv) -> Vec<Profile> {
    let system_root = env
        .var("SystemRoot")
        .unwrap_or_else(|| r"C:\Windows".to_owned());
    let program_files = env
        .var("ProgramFiles")
        .unwrap_or_else(|| r"C:\Program Files".to_owned());
    let existing = |path: String| env.is_file(Path::new(&path)).then_some(path);
    let mut profiles = Vec::new();

    let pwsh = env
        .which("pwsh.exe")
        .map(|path| path_string(&path))
        .or_else(|| existing(win_join(&program_files, r"PowerShell\7\pwsh.exe")));
    if let Some(command) = pwsh {
        profiles.push(Profile::detected(
            "pwsh",
            "PowerShell",
            command,
            ShellKind::Pwsh,
        ));
    }
    let windows_powershell = existing(win_join(
        &system_root,
        r"System32\WindowsPowerShell\v1.0\powershell.exe",
    ));
    if let Some(command) = &windows_powershell {
        profiles.push(Profile::detected(
            "powershell",
            "Windows PowerShell",
            command.clone(),
            ShellKind::Powershell,
        ));
    }
    let cmd = env
        .var("ComSpec")
        .and_then(existing)
        .or_else(|| existing(win_join(&system_root, r"System32\cmd.exe")));
    if let Some(command) = cmd {
        profiles.push(Profile::detected(
            "cmd",
            "Command Prompt",
            command,
            ShellKind::Cmd,
        ));
    }
    if let Some(wsl) = existing(win_join(&system_root, r"System32\wsl.exe")) {
        profiles.extend(wsl_profiles(env, &wsl));
    }
    if let Some(bash) = git_bash(env, &program_files) {
        profiles.push(
            Profile::detected("git-bash", "Git Bash", bash, ShellKind::Bash)
                .with_args(&["--login", "-i"])
                .with_icon(ProfileIcon::Git),
        );
    }
    if let Some(nu) = env.which("nu.exe").or_else(|| env.which("nu")) {
        profiles.push(Profile::detected(
            "nu",
            "Nushell",
            path_string(&nu),
            ShellKind::Nu,
        ));
    }
    if let Some(powershell) = &windows_powershell {
        profiles.extend(vs_dev_shells(env, powershell));
    }
    profiles
}

fn wsl_profiles(env: &dyn ShellEnv, wsl: &str) -> Vec<Profile> {
    let Some(output) = env.run(Path::new(wsl), &["--list", "--quiet"]) else {
        return Vec::new();
    };
    let mut seen = HashSet::new();
    decode_wsl_list(&output)
        .into_iter()
        .filter_map(|distro| {
            let id = format!("wsl-{}", slug(&distro));
            if !seen.insert(id.clone()) {
                return None;
            }
            let lower = distro.to_lowercase();
            let icon = if lower.contains("ubuntu") {
                ProfileIcon::Ubuntu
            } else if lower.contains("debian") {
                ProfileIcon::Debian
            } else {
                ProfileIcon::Linux
            };
            let mut profile = Profile::detected(id, distro.clone(), wsl.to_owned(), ShellKind::Wsl)
                .with_icon(icon);
            profile.args = vec!["-d".to_owned(), distro];
            Some(profile)
        })
        .collect()
}

/// Distro names from `wsl.exe --list --quiet`, which writes UTF-16LE (with or without a BOM,
/// `\r\n` line ends). Docker Desktop's internal distros are skipped.
pub fn decode_wsl_list(output: &[u8]) -> Vec<String> {
    let looks_utf16 = output.len() >= 2
        && (output.starts_with(&[0xFF, 0xFE]) || output.iter().skip(1).step_by(2).all(|&b| b == 0));
    let text = if looks_utf16 {
        let units = output
            .as_chunks::<2>()
            .0
            .iter()
            .map(|pair| u16::from_le_bytes(*pair));
        char::decode_utf16(units)
            .map(|unit| unit.unwrap_or(char::REPLACEMENT_CHARACTER))
            .collect::<String>()
    } else {
        String::from_utf8_lossy(output).into_owned()
    };
    text.lines()
        .map(|line| line.trim_matches(|c: char| c.is_whitespace() || c == '\u{feff}' || c == '\0'))
        .filter(|name| !name.is_empty() && !name.to_lowercase().starts_with("docker-desktop"))
        .map(str::to_owned)
        .collect()
}

fn git_bash(env: &dyn ShellEnv, program_files: &str) -> Option<String> {
    let from_registry = env
        .registry_string(r"SOFTWARE\GitForWindows", "InstallPath")
        .map(|install| win_join(&install, r"bin\bash.exe"));
    from_registry
        .into_iter()
        .chain([win_join(program_files, r"Git\bin\bash.exe")])
        .find(|path| env.is_file(Path::new(path)))
}

/// One "Developer PowerShell for VS <year>" per Visual Studio instance `vswhere.exe` reports.
fn vs_dev_shells(env: &dyn ShellEnv, powershell: &str) -> Vec<Profile> {
    let Some(program_files_x86) = env.var("ProgramFiles(x86)") else {
        return Vec::new();
    };
    let vswhere = win_join(
        &program_files_x86,
        r"Microsoft Visual Studio\Installer\vswhere.exe",
    );
    if !env.is_file(Path::new(&vswhere)) {
        return Vec::new();
    }
    let Some(output) = env.run(Path::new(&vswhere), &["-format", "json", "-utf8"]) else {
        return Vec::new();
    };
    let Ok(serde_json::Value::Array(instances)) = serde_json::from_slice(&output) else {
        return Vec::new();
    };
    let arch = if cfg!(target_arch = "aarch64") {
        "arm64"
    } else {
        "x64"
    };
    let mut seen = HashSet::new();
    instances
        .iter()
        .filter_map(|instance| {
            let text = |key: &str| instance.get(key).and_then(serde_json::Value::as_str);
            let install = text("installationPath")?;
            let instance_id = text("instanceId")?;
            let major = text("installationVersion")?.split('.').next()?.to_owned();
            let year = instance
                .get("catalog")
                .and_then(|catalog| catalog.get("productLineVersion"))
                .and_then(serde_json::Value::as_str)
                .unwrap_or(&major)
                .to_owned();
            let dll = win_join(install, r"Common7\Tools\Microsoft.VisualStudio.DevShell.dll");
            if !env.is_file(Path::new(&dll)) {
                return None;
            }
            let mut id = format!("vs-dev-{}", slug(&major));
            let mut name = format!("Developer PowerShell for VS {year}");
            if !seen.insert(id.clone()) {
                id = format!("{id}-{}", slug(instance_id));
                name = format!("{name} ({})", text("displayName").unwrap_or(instance_id));
            }
            let script = format!(
                "&{{Import-Module {}; Enter-VsDevShell {} -SkipAutomaticLocation -DevCmdArguments '-arch={arch} -host_arch={arch}'}}",
                powershell_quote(&dll),
                powershell_quote(instance_id)
            );
            let mut profile =
                Profile::detected(id, name, powershell.to_owned(), ShellKind::Powershell)
                    .with_icon(ProfileIcon::Vs);
            profile.args = vec!["-NoExit".to_owned(), "-Command".to_owned(), script];
            Some(profile)
        })
        .collect()
}

/// A PowerShell single-quoted string literal.
pub(crate) fn powershell_quote(text: &str) -> String {
    format!("'{}'", text.replace('\'', "''"))
}

/// The shells Unix detection looks for after the login shell, in order.
const UNIX_SHELLS: [&str; 5] = ["zsh", "bash", "fish", "nu", "sh"];

fn detect_unix(env: &dyn ShellEnv, macos: bool) -> Vec<Profile> {
    let listed: Vec<PathBuf> = env
        .read_to_string(Path::new("/etc/shells"))
        .unwrap_or_default()
        .lines()
        .map(str::trim)
        .filter(|line| line.starts_with('/'))
        .map(PathBuf::from)
        .collect();
    let login = env
        .var("SHELL")
        .map(PathBuf::from)
        .filter(|path| path.is_absolute() && env.is_file(path));
    let found = UNIX_SHELLS.iter().filter_map(|name| {
        env.which(name).or_else(|| {
            listed
                .iter()
                .find(|path| {
                    path.file_name().is_some_and(|file| file == *name) && env.is_file(path)
                })
                .cloned()
        })
    });

    let mut profiles: Vec<Profile> = Vec::new();
    let mut seen_paths = HashSet::new();
    for path in login.into_iter().chain(found) {
        let kind = ShellKind::of_program(&path_string(&path));
        let id = kind.detected_id().map_or_else(
            || {
                slug(
                    &path
                        .file_name()
                        .map(|name| name.to_string_lossy())
                        .unwrap_or_default(),
                )
            },
            str::to_owned,
        );
        if id.is_empty()
            || !seen_paths.insert(env.canonicalize(&path))
            || profiles.iter().any(|profile| profile.id == id)
        {
            continue;
        }
        let name = kind.display_name().map_or_else(
            || {
                path.file_name()
                    .map(|name| name.to_string_lossy().into_owned())
                    .unwrap_or_default()
            },
            str::to_owned,
        );
        let mut profile = Profile::detected(id, name, path_string(&path), kind);
        // macOS terminals start login shells (`/etc/zprofile` sets up PATH via path_helper).
        if macos && matches!(kind, ShellKind::Zsh | ShellKind::Bash | ShellKind::Fish) {
            profile.args = vec!["-l".to_owned()];
        }
        profiles.push(profile);
    }
    profiles
}

fn resolve_custom(
    env: &dyn ShellEnv,
    custom: &CustomProfile,
    taken: &mut HashSet<String>,
) -> Option<Profile> {
    let home = env.home();
    let command = expand_home(custom.command.trim(), home.as_deref());
    let program = Path::new(&command);
    let resolved = if program.is_absolute() {
        env.is_file(program).then(|| program.to_path_buf())
    } else if command.contains(['/', '\\']) || command.is_empty() {
        None
    } else {
        env.which(&command)
    }?;
    let base = format!("custom-{}", slug(&custom.name));
    let mut id = base.clone();
    let mut counter = 2;
    while !taken.insert(id.clone()) {
        id = format!("{base}-{counter}");
        counter += 1;
    }
    let command = path_string(&resolved);
    Some(Profile {
        id,
        name: custom.name.clone(),
        kind: ShellKind::of_program(&command),
        command,
        args: custom.args.clone(),
        cwd: custom
            .cwd
            .as_deref()
            .map(|cwd| expand_home(cwd.trim(), home.as_deref())),
        icon: custom.icon,
        color: custom.color,
        source: ProfileSource::Config,
        env: custom.env.clone(),
    })
}

/// Expands a leading `~` (alone or followed by a separator) to `home`.
pub fn expand_home(path: &str, home: Option<&Path>) -> String {
    let Some(home) = home else {
        return path.to_owned();
    };
    if path == "~" {
        return path_string(home);
    }
    match path.strip_prefix("~/").or_else(|| path.strip_prefix("~\\")) {
        Some(rest) => path_string(&home.join(rest)),
        None => path.to_owned(),
    }
}

/// Lower-case kebab-case (`Dev server` → `dev-server`, `Ubuntu-22.04` → `ubuntu-22-04`).
pub fn slug(text: &str) -> String {
    let mut slug = String::new();
    for c in text.chars() {
        if c.is_alphanumeric() {
            slug.extend(c.to_lowercase());
        } else if !slug.is_empty() && !slug.ends_with('-') {
            slug.push('-');
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        "profile".to_owned()
    } else {
        slug
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    /// A scripted machine.
    #[derive(Default)]
    struct FakeEnv {
        vars: HashMap<String, String>,
        on_path: HashMap<String, PathBuf>,
        files: HashSet<PathBuf>,
        texts: HashMap<PathBuf, String>,
        links: HashMap<PathBuf, PathBuf>,
        outputs: HashMap<String, Vec<u8>>,
        registry: HashMap<(String, String), String>,
        home: Option<PathBuf>,
    }

    impl FakeEnv {
        fn var(mut self, name: &str, value: &str) -> Self {
            self.vars.insert(name.to_owned(), value.to_owned());
            self
        }
        fn file(mut self, path: &str) -> Self {
            self.files.insert(PathBuf::from(path));
            self
        }
        fn on_path(mut self, name: &str, path: &str) -> Self {
            self.on_path.insert(name.to_owned(), PathBuf::from(path));
            self.file(path)
        }
        fn output(mut self, program: &str, bytes: Vec<u8>) -> Self {
            self.outputs.insert(program.to_owned(), bytes);
            self
        }
    }

    impl ShellEnv for FakeEnv {
        fn var(&self, name: &str) -> Option<String> {
            self.vars.get(name).cloned()
        }
        fn home(&self) -> Option<PathBuf> {
            self.home.clone()
        }
        fn which(&self, program: &str) -> Option<PathBuf> {
            self.on_path.get(program).cloned()
        }
        fn is_file(&self, path: &Path) -> bool {
            self.files.contains(path)
        }
        fn read_to_string(&self, path: &Path) -> Option<String> {
            self.texts.get(path).cloned()
        }
        fn canonicalize(&self, path: &Path) -> PathBuf {
            self.links
                .get(path)
                .cloned()
                .unwrap_or_else(|| path.to_path_buf())
        }
        fn run(&self, program: &Path, _args: &[&str]) -> Option<Vec<u8>> {
            self.outputs.get(&path_string(program)).cloned()
        }
        fn registry_string(&self, key: &str, value: &str) -> Option<String> {
            self.registry
                .get(&(key.to_owned(), value.to_owned()))
                .cloned()
        }
    }

    fn utf16(text: &str, bom: bool) -> Vec<u8> {
        let mut bytes = if bom { vec![0xFF, 0xFE] } else { Vec::new() };
        for unit in text.encode_utf16() {
            bytes.extend(unit.to_le_bytes());
        }
        bytes
    }

    fn ids(profiles: &[Profile]) -> Vec<&str> {
        profiles.iter().map(|profile| profile.id.as_str()).collect()
    }

    fn windows() -> FakeEnv {
        FakeEnv {
            home: Some(PathBuf::from(r"C:\Users\me")),
            ..FakeEnv::default()
        }
        .var("SystemRoot", r"C:\Windows")
        .var("ProgramFiles", r"C:\Program Files")
        .var("ComSpec", r"C:\Windows\system32\cmd.exe")
        .file(r"C:\Windows\system32\cmd.exe")
        .file(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe")
    }

    #[test]
    fn decodes_wsl_output_in_every_encoding() {
        let raw = "Ubuntu-22.04\r\nDebian\r\ndocker-desktop\r\ndocker-desktop-data\r\n\r\n";
        let expected = ["Ubuntu-22.04", "Debian"];
        assert_eq!(decode_wsl_list(&utf16(raw, true)), expected);
        assert_eq!(decode_wsl_list(&utf16(raw, false)), expected);
        assert_eq!(decode_wsl_list(raw.as_bytes()), expected);
        assert!(decode_wsl_list(&[]).is_empty());
        let with_nul = utf16("Arch\0\r\n", false);
        assert_eq!(decode_wsl_list(&with_nul), ["Arch"]);
    }

    #[test]
    fn windows_detects_everything_in_order() {
        let env = windows()
            .file(r"C:\Program Files\PowerShell\7\pwsh.exe")
            .file(r"C:\Windows\System32\wsl.exe")
            .output(
                r"C:\Windows\System32\wsl.exe",
                utf16("Ubuntu\r\nDebian\r\nkali-linux\r\ndocker-desktop\r\n", true),
            )
            .file(r"C:\Program Files\Git\bin\bash.exe")
            .on_path("nu.exe", r"C:\Users\me\.cargo\bin\nu.exe");
        let profiles = detect(&env, Platform::Windows, &[]);
        assert_eq!(
            ids(&profiles),
            [
                "pwsh",
                "powershell",
                "cmd",
                "wsl-ubuntu",
                "wsl-debian",
                "wsl-kali-linux",
                "git-bash",
                "nu"
            ]
        );
        let pwsh = &profiles[0];
        assert_eq!(pwsh.command, r"C:\Program Files\PowerShell\7\pwsh.exe");
        assert_eq!(pwsh.kind, ShellKind::Pwsh);
        assert_eq!(pwsh.icon, ProfileIcon::Powershell);
        assert_eq!(profiles[2].command, r"C:\Windows\system32\cmd.exe");
        let ubuntu = &profiles[3];
        assert_eq!(ubuntu.name, "Ubuntu");
        assert_eq!(ubuntu.args, ["-d", "Ubuntu"]);
        assert_eq!(ubuntu.icon, ProfileIcon::Ubuntu);
        assert_eq!(ubuntu.kind, ShellKind::Wsl);
        assert_eq!(profiles[4].icon, ProfileIcon::Debian);
        assert_eq!(profiles[5].icon, ProfileIcon::Linux);
        let git = &profiles[6];
        assert_eq!(git.args, ["--login", "-i"]);
        assert_eq!(git.icon, ProfileIcon::Git);
        assert_eq!(git.kind, ShellKind::Bash);
        assert!(
            profiles
                .iter()
                .all(|profile| profile.source == ProfileSource::Detected)
        );
    }

    #[test]
    fn windows_prefers_pwsh_on_path_and_git_from_the_registry() {
        let mut env = windows()
            .on_path(
                "pwsh.exe",
                r"C:\Users\me\AppData\Local\Microsoft\WindowsApps\pwsh.exe",
            )
            .file(r"D:\Tools\Git\bin\bash.exe");
        env.registry.insert(
            (
                r"SOFTWARE\GitForWindows".to_owned(),
                "InstallPath".to_owned(),
            ),
            r"D:\Tools\Git".to_owned(),
        );
        let profiles = detect(&env, Platform::Windows, &[]);
        assert_eq!(
            profiles[0].command,
            r"C:\Users\me\AppData\Local\Microsoft\WindowsApps\pwsh.exe"
        );
        let git = profiles.iter().find(|profile| profile.id == "git-bash");
        assert_eq!(
            git.map(|git| git.command.as_str()),
            Some(r"D:\Tools\Git\bin\bash.exe")
        );
        assert!(
            !ids(&profiles).iter().any(|id| id.starts_with("wsl-")),
            "no wsl.exe"
        );
    }

    #[test]
    fn windows_lists_visual_studio_developer_shells() {
        let vswhere = r"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe";
        let json = r#"[
            {"instanceId": "abc123", "installationPath": "C:\\VS\\2022\\Community",
             "installationVersion": "17.9.34622.214", "displayName": "Visual Studio Community 2022",
             "catalog": {"productLineVersion": "2022"}},
            {"instanceId": "def456", "installationPath": "C:\\VS\\2022\\BuildTools",
             "installationVersion": "17.8.1.0", "displayName": "Build Tools 2022",
             "catalog": {"productLineVersion": "2022"}},
            {"instanceId": "old", "installationPath": "C:\\VS\\2019",
             "installationVersion": "16.11.0.0", "catalog": {"productLineVersion": "2019"}}
        ]"#;
        let env = windows()
            .var("ProgramFiles(x86)", r"C:\Program Files (x86)")
            .file(vswhere)
            .output(vswhere, json.as_bytes().to_vec())
            .file(r"C:\VS\2022\Community\Common7\Tools\Microsoft.VisualStudio.DevShell.dll")
            .file(r"C:\VS\2022\BuildTools\Common7\Tools\Microsoft.VisualStudio.DevShell.dll");
        let profiles = detect(&env, Platform::Windows, &[]);
        let vs: Vec<&Profile> = profiles
            .iter()
            .filter(|p| p.icon == ProfileIcon::Vs)
            .collect();
        assert_eq!(vs.len(), 2, "the 2019 instance has no DevShell.dll");
        assert_eq!(vs[0].id, "vs-dev-17");
        assert_eq!(vs[0].name, "Developer PowerShell for VS 2022");
        assert_eq!(vs[1].id, "vs-dev-17-def456");
        assert!(vs[1].name.contains("Build Tools 2022"), "{}", vs[1].name);
        assert_eq!(vs[0].kind, ShellKind::Powershell);
        assert_eq!(vs[0].args[..2], ["-NoExit", "-Command"]);
        assert!(
            vs[0].args[2].contains("Enter-VsDevShell 'abc123'"),
            "{}",
            vs[0].args[2]
        );
        assert!(
            vs[0].args[2].contains(r"Import-Module 'C:\VS\2022\Community\Common7\Tools\Microsoft.VisualStudio.DevShell.dll'"),
            "{}",
            vs[0].args[2]
        );
    }

    #[test]
    fn broken_helpers_are_skipped() {
        let env = windows()
            .file(r"C:\Windows\System32\wsl.exe")
            .var("ProgramFiles(x86)", r"C:\Program Files (x86)")
            .file(r"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe")
            .output(
                r"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe",
                b"not json".to_vec(),
            );
        assert_eq!(
            ids(&detect(&env, Platform::Windows, &[])),
            ["powershell", "cmd"]
        );
    }

    fn linux() -> FakeEnv {
        let mut env = FakeEnv {
            home: Some(PathBuf::from("/home/me")),
            ..FakeEnv::default()
        }
        .on_path("bash", "/usr/bin/bash")
        .on_path("sh", "/usr/bin/sh")
        .on_path("zsh", "/usr/bin/zsh")
        .file("/bin/bash")
        .file("/usr/local/bin/fish")
        .file("/usr/bin/tmux");
        env.texts.insert(
            PathBuf::from("/etc/shells"),
            "# comment\n/bin/sh\n/bin/bash\n/usr/bin/bash\n/usr/local/bin/fish\n/usr/bin/tmux\n"
                .to_owned(),
        );
        env.links
            .insert(PathBuf::from("/bin/bash"), PathBuf::from("/usr/bin/bash"));
        env
    }

    // The fake Unix environments below use `/bin/…` paths, which are not absolute on a Windows
    // host, so the tests that depend on `Path::is_absolute` only run where those paths are real.
    #[cfg(unix)]
    #[test]
    fn unix_puts_the_login_shell_first_and_dedupes() {
        let env = linux().var("SHELL", "/bin/bash");
        let profiles = detect(&env, Platform::Linux, &[]);
        assert_eq!(ids(&profiles), ["bash", "zsh", "fish", "sh"]);
        assert_eq!(
            profiles[0].command, "/bin/bash",
            "the login shell's own path"
        );
        assert_eq!(
            profiles[2].command, "/usr/local/bin/fish",
            "found through /etc/shells"
        );
        assert!(
            profiles.iter().all(|profile| profile.args.is_empty()),
            "no login flag on Linux"
        );
        assert_eq!(profiles[1].icon, ProfileIcon::Zsh);
        assert_eq!(profiles[3].kind, ShellKind::Sh);
    }

    #[test]
    fn macos_starts_login_shells() {
        let env = linux().var("SHELL", "/usr/bin/zsh");
        let profiles = detect(&env, Platform::Macos, &[]);
        assert_eq!(ids(&profiles), ["zsh", "bash", "fish", "sh"]);
        assert_eq!(profiles[0].args, ["-l"]);
        assert_eq!(profiles[1].args, ["-l"]);
        assert!(profiles[3].args.is_empty(), "sh stays as is");
    }

    #[cfg(unix)]
    #[test]
    fn unusual_login_shells_are_kept() {
        let env = linux()
            .var("SHELL", "/opt/xonsh/bin/xonsh")
            .file("/opt/xonsh/bin/xonsh");
        let profiles = detect(&env, Platform::Linux, &[]);
        assert_eq!(profiles[0].id, "xonsh");
        assert_eq!(profiles[0].name, "xonsh");
        assert_eq!(profiles[0].kind, ShellKind::Other);
        assert_eq!(profiles[0].icon, ProfileIcon::Terminal);
    }

    #[test]
    fn falls_back_when_nothing_is_found() {
        let unix = detect(&FakeEnv::default(), Platform::Linux, &[]);
        assert_eq!(ids(&unix), ["sh"]);
        assert_eq!(unix[0].command, "/bin/sh");
        let windows = detect(&FakeEnv::default(), Platform::Windows, &[]);
        assert_eq!(windows[0].command, r"C:\Windows\System32\cmd.exe");
    }

    #[test]
    fn config_profiles_are_resolved_and_appended() {
        let env = linux().on_path("pwsh", "/opt/microsoft/powershell/7/pwsh");
        let custom = vec![
            CustomProfile {
                name: "Dev server".to_owned(),
                command: "pwsh".to_owned(),
                args: vec!["-NoLogo".to_owned()],
                cwd: Some("~/Projects".to_owned()),
                env: BTreeMap::from([("NODE_ENV".to_owned(), "development".to_owned())]),
                icon: ProfileIcon::Terminal,
                color: Some(NordColor::AuroraGreen),
            },
            CustomProfile {
                name: "Dev server".to_owned(),
                command: "~/../../usr/bin/zsh".to_owned(),
                args: Vec::new(),
                cwd: None,
                env: BTreeMap::new(),
                icon: ProfileIcon::Zsh,
                color: None,
            },
            CustomProfile {
                name: "Missing".to_owned(),
                command: "nothing-here".to_owned(),
                args: Vec::new(),
                cwd: None,
                env: BTreeMap::new(),
                icon: ProfileIcon::Terminal,
                color: None,
            },
        ];
        let profiles = detect(&env, Platform::Linux, &custom);
        let config: Vec<&Profile> = profiles
            .iter()
            .filter(|profile| profile.source == ProfileSource::Config)
            .collect();
        assert_eq!(
            config.len(),
            1,
            "the missing and the unresolvable ones are skipped"
        );
        let dev = config[0];
        assert_eq!(dev.id, "custom-dev-server");
        assert_eq!(dev.command, "/opt/microsoft/powershell/7/pwsh");
        assert_eq!(dev.kind, ShellKind::Pwsh);
        // `Path` equality ignores the separator the host joined with (`/` vs `\`).
        assert_eq!(
            dev.cwd.as_deref().map(Path::new),
            Some(Path::new("/home/me/Projects"))
        );
        assert_eq!(
            dev.env.get("NODE_ENV").map(String::as_str),
            Some("development")
        );
        assert_eq!(dev.color, Some(NordColor::AuroraGreen));
    }

    #[cfg(unix)]
    #[test]
    fn duplicate_config_names_get_a_counter() {
        let env = linux();
        let make = |name: &str| CustomProfile {
            name: name.to_owned(),
            command: "/usr/bin/zsh".to_owned(),
            args: Vec::new(),
            cwd: None,
            env: BTreeMap::new(),
            icon: ProfileIcon::Zsh,
            color: None,
        };
        let profiles = detect(
            &env,
            Platform::Linux,
            &[make("Work"), make("work"), make("WORK!")],
        );
        let custom: Vec<&str> = profiles
            .iter()
            .filter(|p| p.source == ProfileSource::Config)
            .map(|p| p.id.as_str())
            .collect();
        assert_eq!(custom, ["custom-work", "custom-work-2", "custom-work-3"]);
    }

    #[test]
    fn default_profile_prefers_the_setting() {
        let profiles = detect(&linux(), Platform::Linux, &[]);
        let mut settings = TerminalSettings::default();
        assert_eq!(default_profile_id(&settings, &profiles), "zsh");
        settings.default_profile = "sh".to_owned();
        assert_eq!(default_profile_id(&settings, &profiles), "sh");
        settings.default_profile = "gone".to_owned();
        assert_eq!(default_profile_id(&settings, &profiles), "zsh");
        assert_eq!(default_profile_id(&settings, &[]), "");
    }

    #[test]
    fn kinds_come_from_program_names() {
        assert_eq!(ShellKind::of_program(r"C:\x\PWSH.EXE"), ShellKind::Pwsh);
        assert_eq!(
            ShellKind::of_program("powershell.exe"),
            ShellKind::Powershell
        );
        assert_eq!(ShellKind::of_program("/bin/dash"), ShellKind::Sh);
        assert_eq!(ShellKind::of_program("wsl.exe"), ShellKind::Wsl);
        assert_eq!(ShellKind::of_program("/usr/bin/tmux"), ShellKind::Other);
    }

    #[test]
    fn slugs_and_home_expansion() {
        assert_eq!(slug("Ubuntu-22.04"), "ubuntu-22-04");
        assert_eq!(slug("  Dev   server! "), "dev-server");
        assert_eq!(slug("!!!"), "profile");
        let home = Path::new("/home/me");
        assert_eq!(expand_home("~", Some(home)), "/home/me");
        assert_eq!(
            Path::new(&expand_home("~/a/b", Some(home))),
            Path::new("/home/me/a/b")
        );
        assert_eq!(expand_home("~other", Some(home)), "~other");
        assert_eq!(expand_home("~/a", None), "~/a");
    }

    #[test]
    fn profiles_serialize_for_the_ui() -> Result<(), serde_json::Error> {
        let mut profile =
            Profile::detected("wsl-ubuntu", "Ubuntu", "wsl.exe".to_owned(), ShellKind::Wsl)
                .with_icon(ProfileIcon::Ubuntu);
        profile.color = Some(NordColor::AuroraOrange);
        profile.env.insert("SECRET".to_owned(), "x".to_owned());
        let json = serde_json::to_value(&profile)?;
        assert_eq!(json["icon"], "ubuntu");
        assert_eq!(json["color"], "aurora-orange");
        assert_eq!(json["kind"], "wsl");
        assert_eq!(json["source"], "detected");
        assert!(json.get("env").is_none());
        assert_eq!(serde_json::to_value(Platform::Macos)?, "macos");
        Ok(())
    }

    #[test]
    fn the_real_machine_has_a_shell() {
        let profiles = detect(&SystemShellEnv, Platform::current(), &[]);
        assert!(!profiles.is_empty());
    }
}
