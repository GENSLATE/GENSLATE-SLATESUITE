//! Shell integration: small scripts that make shells report prompts, commands, exit codes and
//! the current folder with OSC 133 / 633 / 7 / 9;9 (see the [`tracker`](crate::tracker)).
//!
//! | Shell | How it is loaded |
//! |---|---|
//! | bash (incl. Git Bash) | `--rcfile <cache>/shell-integration/bash-integration.bash -i`; the script sources the user's usual files first (login files when the profile asked for `-l`/`--login`) |
//! | zsh | `ZDOTDIR=<cache>/shell-integration/zsh`: shim `.zshenv`/`.zprofile`/`.zshrc`/`.zlogin` that load the user's own files (from their `ZDOTDIR`) and restore `ZDOTDIR` |
//! | PowerShell 7 / 5.1 | `-NoExit -EncodedCommand <script>` after the profile (commands, unlike script files, are not blocked by the execution policy); a profile's own `-Command` runs first |
//! | Command Prompt | the `PROMPT` variable, wrapping the user's own `PROMPT` |
//! | fish, Nushell | nothing: both emit OSC 133 themselves in recent versions |
//!
//! Profiles with arguments the integration can't combine with (`-c`, `/k`, `-File`, a script)
//! start unchanged. The scripts are embedded in the binary and written to the cache folder only
//! when their contents changed.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::profiles::ShellKind;

const BASH: &str = include_str!("integration/bash-integration.bash");
const ZSH_ZSHENV: &str = include_str!("integration/zsh-zshenv.zsh");
const ZSH_ZPROFILE: &str = include_str!("integration/zsh-zprofile.zsh");
const ZSH_ZSHRC: &str = include_str!("integration/zsh-zshrc.zsh");
const ZSH_ZLOGIN: &str = include_str!("integration/zsh-zlogin.zsh");
const POWERSHELL: &str = include_str!("integration/powershell-integration.ps1");

/// Folder inside the app's cache folder that holds the scripts.
pub const SCRIPTS_DIR: &str = "shell-integration";

/// Carries the session's secret to the scripts, which read it, unset it and append it to each
/// `633;E` so the [`tracker`](crate::tracker) can tell their reports from program output.
pub const NONCE_VAR: &str = "GENSLATE_NONCE";

/// How to start a shell with the integration.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Integration {
    /// The complete argument list (replaces the profile's arguments).
    pub args: Vec<String>,
    /// Variables to add to the shell's environment.
    pub env: Vec<(String, String)>,
    /// The scripts report each command line with the nonce from [`NONCE_VAR`] (all but
    /// Command Prompt, which can only mark its prompt).
    pub reports_commands: bool,
}

/// Prepares the integration for a `kind` shell started with `args`: writes the scripts under
/// `<cache_dir>/shell-integration/` if needed and returns the arguments and variables to start
/// it with, or `None` when this shell or these arguments get no integration. `inherited` reads
/// the environment the shell would inherit (`ZDOTDIR`, `PROMPT`).
pub fn prepare(
    kind: ShellKind,
    args: &[String],
    cache_dir: &Path,
    inherited: impl Fn(&str) -> Option<String>,
) -> io::Result<Option<Integration>> {
    let dir = cache_dir.join(SCRIPTS_DIR);
    match kind {
        ShellKind::Bash => bash(args, &dir, cfg!(windows)),
        ShellKind::Zsh => zsh(args, &dir, &inherited),
        ShellKind::Pwsh | ShellKind::Powershell => Ok(powershell(args)),
        ShellKind::Cmd => Ok(cmd(args, &inherited)),
        ShellKind::Fish | ShellKind::Nu | ShellKind::Sh | ShellKind::Wsl | ShellKind::Other => {
            Ok(None)
        }
    }
}

fn bash(args: &[String], dir: &Path, windows: bool) -> io::Result<Option<Integration>> {
    if !args
        .iter()
        .all(|arg| matches!(arg.as_str(), "-l" | "--login" | "-i"))
    {
        return Ok(None);
    }
    let script = write_if_changed(&dir.join("bash-integration.bash"), BASH)?;
    let mut env = Vec::new();
    if args.iter().any(|arg| arg == "-l" || arg == "--login") {
        env.push(("GENSLATE_SHELL_LOGIN".to_owned(), "1".to_owned()));
    }
    Ok(Some(Integration {
        args: vec![
            "--rcfile".to_owned(),
            shell_path(&script, windows),
            "-i".to_owned(),
        ],
        env,
        reports_commands: true,
    }))
}

/// A script path as the shell reads it: Git Bash (MSYS) wants `C:/…`, not `C:\…`.
fn shell_path(path: &Path, windows: bool) -> String {
    let text = path.to_string_lossy();
    if windows {
        text.replace('\\', "/")
    } else {
        text.into_owned()
    }
}

fn zsh(
    args: &[String],
    dir: &Path,
    inherited: &impl Fn(&str) -> Option<String>,
) -> io::Result<Option<Integration>> {
    let compatible = args.iter().all(|arg| {
        arg.starts_with('-')
            && !matches!(
                arg.as_str(),
                "-c" | "-f" | "-d" | "--no-rcs" | "--no-globalrcs" | "-s"
            )
    });
    if !compatible {
        return Ok(None);
    }
    let shim = dir.join("zsh");
    for (name, contents) in [
        (".zshenv", ZSH_ZSHENV),
        (".zprofile", ZSH_ZPROFILE),
        (".zshrc", ZSH_ZSHRC),
        (".zlogin", ZSH_ZLOGIN),
    ] {
        write_if_changed(&shim.join(name), contents)?;
    }
    let mut env = vec![("ZDOTDIR".to_owned(), shim.to_string_lossy().into_owned())];
    if let Some(user) = inherited("ZDOTDIR").filter(|value| !value.is_empty()) {
        env.push(("GENSLATE_USER_ZDOTDIR".to_owned(), user));
    }
    Ok(Some(Integration {
        args: args.to_vec(),
        env,
        reports_commands: true,
    }))
}

fn powershell(args: &[String]) -> Option<Integration> {
    let is_switch = |arg: &str, names: &[&str]| {
        let lower = arg.to_ascii_lowercase();
        let name = lower.trim_start_matches(['-', '/']);
        (arg.starts_with('-') || arg.starts_with('/')) && names.contains(&name)
    };
    if args.iter().any(|arg| {
        is_switch(
            arg,
            &[
                "file",
                "f",
                "encodedcommand",
                "enc",
                "ec",
                "e",
                "commandwithargs",
                "cwa",
            ],
        )
    }) {
        return None;
    }
    // `-Command` takes the rest of the line: run it first, then the integration. Without
    // `-NoExit` the shell would run it and quit, so there is nothing to integrate with.
    let command_at = args
        .iter()
        .position(|arg| is_switch(arg, &["command", "c"]));
    let no_exit = args.iter().any(|arg| is_switch(arg, &["noexit"]));
    let (mut kept, script) = match command_at {
        Some(_) if !no_exit => return None,
        Some(at) => (
            args[..at].to_vec(),
            format!("{}\n{POWERSHELL}", args[at + 1..].join(" ")),
        ),
        None => (args.to_vec(), POWERSHELL.to_owned()),
    };
    if !no_exit {
        kept.push("-NoExit".to_owned());
    }
    kept.push("-EncodedCommand".to_owned());
    kept.push(encode_command(&script));
    Some(Integration {
        args: kept,
        env: Vec::new(),
        reports_commands: true,
    })
}

/// PowerShell's `-EncodedCommand` format: Base64 of the UTF-16LE text.
fn encode_command(script: &str) -> String {
    let bytes: Vec<u8> = script.encode_utf16().flat_map(u16::to_le_bytes).collect();
    base64(&bytes)
}

fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b = [
            chunk[0],
            chunk.get(1).copied().unwrap_or(0),
            chunk.get(2).copied().unwrap_or(0),
        ];
        let n = (u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]);
        for (i, shift) in [18, 12, 6, 0].into_iter().enumerate() {
            if i <= chunk.len() {
                out.push(char::from(ALPHABET[((n >> shift) & 63) as usize]));
            } else {
                out.push('=');
            }
        }
    }
    out
}

fn cmd(args: &[String], inherited: &impl Fn(&str) -> Option<String>) -> Option<Integration> {
    if args
        .iter()
        .any(|arg| matches!(arg.to_ascii_lowercase().as_str(), "/c" | "/k" | "/r"))
    {
        return None;
    }
    let user = inherited("PROMPT")
        .filter(|prompt| !prompt.is_empty())
        .unwrap_or_else(|| "$P$G".to_owned());
    // cmd can't report exit codes: D (without a code) closes the previous command.
    let prompt = format!("$e]133;D$e\\$e]133;A$e\\$e]9;9;$P$e\\{user}$e]133;B$e\\");
    Some(Integration {
        args: args.to_vec(),
        env: vec![("PROMPT".to_owned(), prompt)],
        reports_commands: false,
    })
}

/// Writes `contents` to `path` unless it already holds exactly that; returns the path.
fn write_if_changed(path: &Path, contents: &str) -> io::Result<PathBuf> {
    if fs::read(path).is_ok_and(|existing| existing == contents.as_bytes()) {
        return Ok(path.to_path_buf());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    // Written aside and renamed, so a shell starting in another window never reads half a
    // script.
    let mut temp_name = path.file_name().unwrap_or_default().to_os_string();
    temp_name.push(format!(".{}.tmp", std::process::id()));
    let temp = path.with_file_name(temp_name);
    fs::write(&temp, contents)?;
    if let Err(error) = fs::rename(&temp, path) {
        let _ = fs::remove_file(&temp);
        return Err(error);
    }
    Ok(path.to_path_buf())
}

#[cfg(test)]
mod tests {
    use genslate_testing::TempTree;

    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn strings(args: &[&str]) -> Vec<String> {
        args.iter().map(|arg| (*arg).to_owned()).collect()
    }

    fn none(_: &str) -> Option<String> {
        None
    }

    #[test]
    fn bash_gets_an_rcfile_and_keeps_login_mode() -> TestResult {
        let tree = TempTree::new()?;
        let plain = prepare(ShellKind::Bash, &[], tree.path(), none)?.ok_or("no integration")?;
        let script = tree.join("shell-integration/bash-integration.bash");
        assert_eq!(plain.args, ["--rcfile", &script.to_string_lossy(), "-i"]);
        assert!(plain.env.is_empty());
        assert_eq!(fs::read_to_string(&script)?, BASH);

        let login = prepare(
            ShellKind::Bash,
            &strings(&["--login", "-i"]),
            tree.path(),
            none,
        )?
        .ok_or("no integration")?;
        assert_eq!(
            login.env,
            [("GENSLATE_SHELL_LOGIN".to_owned(), "1".to_owned())]
        );
        assert!(
            prepare(
                ShellKind::Bash,
                &strings(&["-c", "echo"]),
                tree.path(),
                none
            )?
            .is_none(),
            "custom arguments start unchanged"
        );
        Ok(())
    }

    #[test]
    fn git_bash_reads_forward_slashes() {
        assert_eq!(
            shell_path(Path::new(r"C:\GENSLATE\cache\bash-integration.bash"), true),
            "C:/GENSLATE/cache/bash-integration.bash"
        );
        assert_eq!(shell_path(Path::new("/a/b"), false), "/a/b");
    }

    #[test]
    fn zsh_gets_a_zdotdir_shim() -> TestResult {
        let tree = TempTree::new()?;
        let integration = prepare(ShellKind::Zsh, &strings(&["-l"]), tree.path(), |name| {
            (name == "ZDOTDIR").then(|| "/home/me/.config/zsh".to_owned())
        })?
        .ok_or("no integration")?;
        assert_eq!(integration.args, ["-l"]);
        let shim = tree.join("shell-integration/zsh");
        assert_eq!(
            integration.env,
            [
                ("ZDOTDIR".to_owned(), shim.to_string_lossy().into_owned()),
                (
                    "GENSLATE_USER_ZDOTDIR".to_owned(),
                    "/home/me/.config/zsh".to_owned()
                )
            ]
        );
        for file in [".zshenv", ".zprofile", ".zshrc", ".zlogin"] {
            assert!(shim.join(file).is_file(), "{file}");
        }
        assert!(prepare(ShellKind::Zsh, &strings(&["-c", "ls"]), tree.path(), none)?.is_none());
        assert!(prepare(ShellKind::Zsh, &strings(&["script.zsh"]), tree.path(), none)?.is_none());
        Ok(())
    }

    #[test]
    fn scripts_are_rewritten_only_when_changed() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("x/script.sh");
        write_if_changed(&path, "one")?;
        let first = fs::metadata(&path)?.modified()?;
        std::thread::sleep(std::time::Duration::from_millis(20));
        write_if_changed(&path, "one")?;
        assert_eq!(fs::metadata(&path)?.modified()?, first);
        write_if_changed(&path, "two")?;
        assert_eq!(tree.read("x/script.sh")?, "two");
        Ok(())
    }

    fn decode(encoded: &str) -> Option<String> {
        const ALPHABET: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut bits = 0u32;
        let mut count = 0;
        let mut bytes = Vec::new();
        for c in encoded.chars().filter(|c| *c != '=') {
            bits = (bits << 6) | u32::try_from(ALPHABET.find(c)?).ok()?;
            count += 6;
            if count >= 8 {
                count -= 8;
                bytes.push(u8::try_from((bits >> count) & 0xFF).ok()?);
            }
        }
        let units: Vec<u16> = bytes
            .as_chunks::<2>()
            .0
            .iter()
            .map(|pair| u16::from_le_bytes(*pair))
            .collect();
        String::from_utf16(&units).ok()
    }

    #[test]
    fn base64_matches_the_standard() {
        assert_eq!(base64(b""), "");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foo"), "Zm9v");
        assert_eq!(base64(b"foobar"), "Zm9vYmFy");
        // PowerShell's own example: `dir "c:\program files" `.
        assert_eq!(
            encode_command("dir \"c:\\program files\" "),
            "ZABpAHIAIAAiAGMAOgBcAHAAcgBvAGcAcgBhAG0AIABmAGkAbABlAHMAIgAgAA=="
        );
    }

    #[test]
    fn powershell_runs_the_script_after_the_profile() -> TestResult {
        let tree = TempTree::new()?;
        let integration = prepare(ShellKind::Pwsh, &strings(&["-NoLogo"]), tree.path(), none)?
            .ok_or("no integration")?;
        assert_eq!(
            integration.args[..3],
            ["-NoLogo", "-NoExit", "-EncodedCommand"]
        );
        assert_eq!(decode(&integration.args[3]).as_deref(), Some(POWERSHELL));
        assert!(integration.env.is_empty());
        Ok(())
    }

    #[test]
    fn powershell_keeps_a_profile_command_first() -> TestResult {
        let tree = TempTree::new()?;
        let args = strings(&["-NoExit", "-Command", "&{Import-Module 'x.dll'}"]);
        let integration =
            prepare(ShellKind::Powershell, &args, tree.path(), none)?.ok_or("no integration")?;
        assert_eq!(integration.args[..2], ["-NoExit", "-EncodedCommand"]);
        let script = decode(&integration.args[2]).ok_or("not base64")?;
        assert!(
            script.starts_with("&{Import-Module 'x.dll'}\n# GENSLATE"),
            "{script}"
        );

        for incompatible in [
            strings(&["-Command", "Get-Date"]),
            strings(&["-File", "x.ps1"]),
            strings(&["-NoExit", "-EncodedCommand", "AAAA"]),
            strings(&["/f", "x.ps1"]),
        ] {
            assert!(
                prepare(ShellKind::Pwsh, &incompatible, tree.path(), none)?.is_none(),
                "{incompatible:?}"
            );
        }
        Ok(())
    }

    #[test]
    fn cmd_wraps_the_users_prompt() -> TestResult {
        let tree = TempTree::new()?;
        let default = prepare(ShellKind::Cmd, &[], tree.path(), none)?.ok_or("no integration")?;
        assert_eq!(
            default.env,
            [(
                "PROMPT".to_owned(),
                "$e]133;D$e\\$e]133;A$e\\$e]9;9;$P$e\\$P$G$e]133;B$e\\".to_owned()
            )]
        );
        let custom = prepare(ShellKind::Cmd, &[], tree.path(), |name| {
            (name == "PROMPT").then(|| "$T $P$G".to_owned())
        })?
        .ok_or("no integration")?;
        assert!(
            custom.env[0].1.contains("$e\\$T $P$G$e]133;B"),
            "{:?}",
            custom.env
        );
        assert!(
            prepare(
                ShellKind::Cmd,
                &strings(&["/K", "x.bat"]),
                tree.path(),
                none
            )?
            .is_none()
        );
        Ok(())
    }

    #[test]
    fn other_shells_are_left_alone() -> TestResult {
        let tree = TempTree::new()?;
        for kind in [
            ShellKind::Fish,
            ShellKind::Nu,
            ShellKind::Sh,
            ShellKind::Wsl,
            ShellKind::Other,
        ] {
            assert!(prepare(kind, &[], tree.path(), none)?.is_none(), "{kind:?}");
        }
        Ok(())
    }
}
