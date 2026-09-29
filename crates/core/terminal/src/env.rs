//! The environment every shell starts with.
//!
//! Shells inherit the app's environment minus what only makes sense for the app itself: the
//! variables `bun run dev`, cargo, moon and Tauri set while developing, the `AppImage` runtime's
//! own variables, another terminal's identity (VS Code, Windows Terminal) and GENSLATE's
//! internal ones. Then the terminal identifies itself (`TERM`, `TERM_PROGRAM`, …).

use std::ffi::OsStr;

/// Variable name prefixes that are never passed to shells (compared case-insensitively).
const LEAKED_PREFIXES: [&str; 9] = [
    "TAURI_",
    "npm_",
    "MOON_",
    "VSCODE_",
    "CARGO_PKG_",
    "CARGO_MANIFEST_",
    "CARGO_BIN_",
    "CARGO_CRATE_",
    "GENSLATE_",
];

/// Exact variable names that are never passed to shells (compared case-insensitively).
const LEAKED_NAMES: [&str; 11] = [
    "CARGO",
    "CARGO_PRIMARY_PACKAGE",
    "INIT_CWD",
    "WT_SESSION",
    "WT_PROFILE_ID",
    "TERM_PROGRAM_VERSION",
    "TERM_SESSION_ID",
    "APPIMAGE",
    "APPDIR",
    "ARGV0",
    "OWD",
];

/// `true` for an inherited variable that must not reach a shell.
pub fn is_leaked(name: &str) -> bool {
    LEAKED_NAMES
        .iter()
        .any(|leaked| leaked.eq_ignore_ascii_case(name))
        || LEAKED_PREFIXES.iter().any(|prefix| {
            name.get(..prefix.len())
                .is_some_and(|start| start.eq_ignore_ascii_case(prefix))
        })
}

/// The inherited variable names to remove before spawning (see [`is_leaked`]).
pub fn leaked_names<'a>(names: impl IntoIterator<Item = &'a OsStr>) -> Vec<String> {
    names
        .into_iter()
        .filter_map(OsStr::to_str)
        .filter(|name| is_leaked(name))
        .map(str::to_owned)
        .collect()
}

/// The variables the terminal sets on every spawn.
pub fn terminal_vars() -> Vec<(&'static str, &'static str)> {
    vec![
        ("TERM", "xterm-256color"),
        ("COLORTERM", "truecolor"),
        ("TERM_PROGRAM", "GENSLATE"),
        ("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION")),
        ("GENSLATE_TERMINAL", "1"),
    ]
}

/// A UTF-8 locale for macOS apps started from Finder, which get no `LANG` (shells would fall
/// back to ASCII and garble non-English text). `None` when the user already has a locale.
pub fn macos_locale(get: impl Fn(&str) -> Option<String>) -> Option<(&'static str, &'static str)> {
    let has_locale = ["LC_ALL", "LC_CTYPE", "LANG"]
        .iter()
        .any(|name| get(name).is_some_and(|value| !value.is_empty()));
    (!has_locale).then_some(("LANG", "en_US.UTF-8"))
}

#[cfg(test)]
mod tests {
    use std::ffi::OsString;

    use super::*;

    #[test]
    fn drops_dev_and_foreign_terminal_variables() {
        for leaked in [
            "TAURI_ENV_DEBUG",
            "npm_lifecycle_event",
            "NPM_CONFIG_USER_AGENT",
            "MOON_PROJECT_ID",
            "VSCODE_INJECTION",
            "CARGO_PKG_VERSION",
            "CARGO_MANIFEST_DIR",
            "CARGO",
            "INIT_CWD",
            "WT_SESSION",
            "GENSLATE_REPO_ROOT",
            "GENSLATE_USER_ZDOTDIR",
            "APPIMAGE",
            "TERM_PROGRAM_VERSION",
        ] {
            assert!(is_leaked(leaked), "{leaked}");
        }
        for kept in [
            "PATH",
            "HOME",
            "CARGO_HOME",
            "RUSTUP_HOME",
            "BUN_INSTALL",
            "LANG",
            "TERM_PROGRAM",
            "WSLENV",
            "NPM",
            "é",
        ] {
            assert!(!is_leaked(kept), "{kept}");
        }
    }

    #[test]
    fn lists_only_the_leaked_names() {
        let names: Vec<OsString> = ["PATH", "TAURI_ENV_PLATFORM", "HOME", "npm_config_cache"]
            .into_iter()
            .map(OsString::from)
            .collect();
        assert_eq!(
            leaked_names(names.iter().map(OsString::as_os_str)),
            ["TAURI_ENV_PLATFORM", "npm_config_cache"]
        );
    }

    #[test]
    fn identifies_the_terminal() {
        let vars = terminal_vars();
        assert!(vars.contains(&("TERM", "xterm-256color")));
        assert!(vars.contains(&("COLORTERM", "truecolor")));
        assert!(vars.contains(&("TERM_PROGRAM", "GENSLATE")));
        assert!(vars.contains(&("GENSLATE_TERMINAL", "1")));
        assert!(vars.contains(&("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION"))));
    }

    #[test]
    fn sets_a_locale_only_when_missing() {
        assert_eq!(macos_locale(|_| None), Some(("LANG", "en_US.UTF-8")));
        assert_eq!(
            macos_locale(|name| (name == "LC_CTYPE").then(|| "UTF-8".to_owned())),
            None
        );
    }
}
