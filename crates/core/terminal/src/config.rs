//! GENSLATE Terminal's TOML config: the shared sections (`genslate-app-common`) plus
//! `[terminal]` and custom `[[profiles]]`. Every field is optional; a missing file means
//! defaults. Out-of-range numbers are parse errors (with the key and position), so a config
//! that loads is always usable. The Settings dialog writes single keys back with
//! [`write_setting`], keeping the file's comments.

use std::collections::BTreeMap;
use std::fmt::Display;
use std::fs;
use std::io;
use std::ops::RangeInclusive;
use std::path::Path;

use genslate_app_common::config::{self, Appearance, ConfigError, Logging, Window};
use serde::{Deserialize, Deserializer, Serialize};

use crate::TerminalError;
use crate::profiles::{NordColor, ProfileIcon};

/// Valid `font-size` values (px).
pub const FONT_SIZE: RangeInclusive<u16> = 8..=32;
/// Valid `line-height` values (multiples of the font size).
pub const LINE_HEIGHT: RangeInclusive<f64> = 1.0..=2.0;
/// Valid `scrollback` values (lines).
pub const SCROLLBACK: RangeInclusive<u32> = 0..=200_000;

/// The whole config file.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Config {
    pub appearance: Appearance,
    pub window: Window,
    pub logging: Logging,
    pub terminal: TerminalSettings,
    /// `[[profiles]]`: shells the user added by hand.
    pub profiles: Vec<CustomProfile>,
}

/// The cursor's shape.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CursorStyle {
    #[default]
    Block,
    Bar,
    Underline,
}

/// What a right-click in the terminal does.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RightClick {
    /// Opens the context menu.
    #[default]
    Menu,
    /// Pastes the clipboard (like Windows consoles).
    Paste,
}

/// How the terminal bell shows.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Bell {
    /// A short flash of the tab.
    #[default]
    Visual,
    None,
}

/// `[terminal]`. Serialized with the TOML's kebab-case keys (the UI uses the same keys).
#[expect(
    clippy::struct_excessive_bools,
    reason = "a config section: each flag is an independent user preference"
)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct TerminalSettings {
    /// Profile id new tabs open with; empty = the first detected profile.
    pub default_profile: String,
    /// CSS font family; empty = the design system's monospace stack.
    pub font_family: String,
    /// In px, within [`FONT_SIZE`].
    #[serde(deserialize_with = "font_size")]
    pub font_size: u16,
    /// Multiple of the font size, within [`LINE_HEIGHT`].
    #[serde(deserialize_with = "line_height")]
    pub line_height: f64,
    pub cursor_style: CursorStyle,
    pub cursor_blink: bool,
    /// Lines kept above the screen, within [`SCROLLBACK`].
    #[serde(deserialize_with = "scrollback")]
    pub scrollback: u32,
    /// Copy the selection to the clipboard as soon as it is made.
    pub copy_on_select: bool,
    pub right_click: RightClick,
    /// Ask before pasting several lines or text that ends with a newline.
    pub paste_warning: bool,
    pub bell: Bell,
    /// Load the shell integration scripts (prompt marks, command tracking, current folder).
    pub shell_integration: bool,
    /// Reopen the last session's tabs.
    pub restore_session: bool,
    /// Notify when a command that ran over 10 s ends in a background tab.
    pub notify_when_done: bool,
    /// Ask before closing a tab with a running program.
    pub confirm_close: bool,
    /// Record commands in the history database.
    pub history: bool,
}

impl Default for TerminalSettings {
    fn default() -> Self {
        Self {
            default_profile: String::new(),
            font_family: String::new(),
            font_size: 13,
            line_height: 1.2,
            cursor_style: CursorStyle::default(),
            cursor_blink: true,
            scrollback: 10_000,
            copy_on_select: false,
            right_click: RightClick::default(),
            paste_warning: true,
            bell: Bell::default(),
            shell_integration: true,
            restore_session: true,
            notify_when_done: true,
            confirm_close: true,
            history: true,
        }
    }
}

/// `[[profiles]]`: a shell the user added. Resolved into a
/// [`Profile`](crate::profiles::Profile) with the id `custom-<kebab name>`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "kebab-case")]
pub struct CustomProfile {
    pub name: String,
    /// A program path, or a name looked up on `PATH`.
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    /// Starting folder; `~` expands to the home folder.
    #[serde(default)]
    pub cwd: Option<String>,
    /// Extra environment variables.
    #[serde(default)]
    pub env: BTreeMap<String, String>,
    #[serde(default = "terminal_icon")]
    pub icon: ProfileIcon,
    #[serde(default)]
    pub color: Option<NordColor>,
}

const fn terminal_icon() -> ProfileIcon {
    ProfileIcon::Terminal
}

impl Config {
    /// Parses TOML text.
    pub fn from_toml_str(text: &str) -> Result<Self, ConfigError> {
        config::parse(text)
    }

    /// Loads `path`, returning defaults when the file does not exist.
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        config::load(path)
    }
}

fn font_size<'de, D: Deserializer<'de>>(deserializer: D) -> Result<u16, D::Error> {
    in_range(u16::deserialize(deserializer)?, &FONT_SIZE, "font-size")
}

fn line_height<'de, D: Deserializer<'de>>(deserializer: D) -> Result<f64, D::Error> {
    in_range(f64::deserialize(deserializer)?, &LINE_HEIGHT, "line-height")
}

fn scrollback<'de, D: Deserializer<'de>>(deserializer: D) -> Result<u32, D::Error> {
    in_range(u32::deserialize(deserializer)?, &SCROLLBACK, "scrollback")
}

fn in_range<T: PartialOrd + Display, E: serde::de::Error>(
    value: T,
    range: &RangeInclusive<T>,
    key: &str,
) -> Result<T, E> {
    if range.contains(&value) {
        Ok(value)
    } else {
        Err(E::custom(format!(
            "{key} must be between {} and {}, not {value}",
            range.start(),
            range.end()
        )))
    }
}

/// A value the Settings dialog can write (JSON `boolean | number | string`).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(untagged)]
pub enum SettingValue {
    Bool(bool),
    Number(f64),
    Text(String),
}

/// Sets `[terminal] key = value` in the file at `path` (created if missing), keeping comments
/// and every other key. The result must still be a valid config, or nothing is written.
/// Whole numbers are written as TOML integers (`font-size = 14`, not `14.0`).
pub fn write_setting(
    path: &Path,
    key: &str,
    value: &SettingValue,
) -> Result<Config, TerminalError> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == io::ErrorKind::NotFound => String::new(),
        Err(error) => return Err(TerminalError::io("could not read", path)(error)),
    };
    let mut document: toml_edit::DocumentMut = text
        .parse()
        .map_err(|error: toml_edit::TomlError| TerminalError::Config(error.to_string()))?;
    let section = document
        .entry("terminal")
        .or_insert_with(|| toml_edit::Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .ok_or_else(|| TerminalError::Config("[terminal] is not a table".to_owned()))?;
    section[key] = toml_value(value)?;
    let updated = document.to_string();
    let config = Config::from_toml_str(&updated)
        .map_err(|error| TerminalError::Config(format!("“{key}” can't be set to that: {error}")))?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(TerminalError::io("could not create", parent))?;
    }
    fs::write(path, updated).map_err(TerminalError::io("could not write", path))?;
    Ok(config)
}

fn toml_value(value: &SettingValue) -> Result<toml_edit::Item, TerminalError> {
    /// Integers beyond this lose precision as `f64`; no setting needs them.
    const MAX_EXACT: f64 = 9_007_199_254_740_992.0;
    Ok(match value {
        SettingValue::Bool(flag) => toml_edit::value(*flag),
        SettingValue::Text(text) => toml_edit::value(text.as_str()),
        SettingValue::Number(number) if !number.is_finite() => {
            return Err(TerminalError::InvalidArgument(format!(
                "{number} is not a number a setting can take"
            )));
        }
        SettingValue::Number(number) if number.fract() == 0.0 && number.abs() <= MAX_EXACT => {
            #[expect(
                clippy::cast_possible_truncation,
                reason = "a whole number within ±2^53 converts exactly"
            )]
            let integer = *number as i64;
            toml_edit::value(integer)
        }
        SettingValue::Number(number) => toml_edit::value(*number),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    #[test]
    fn empty_file_is_default() -> Result<(), ConfigError> {
        let config = Config::from_toml_str("")?;
        assert_eq!(config, Config::default());
        let terminal = &config.terminal;
        assert_eq!(terminal.font_size, 13);
        assert!((terminal.line_height - 1.2).abs() < f64::EPSILON);
        assert_eq!(terminal.scrollback, 10_000);
        assert!(terminal.cursor_blink && terminal.shell_integration && terminal.history);
        assert!(!terminal.copy_on_select);
        assert_eq!(terminal.right_click, RightClick::Menu);
        assert!(config.profiles.is_empty());
        Ok(())
    }

    #[test]
    fn parses_the_terminal_section_and_profiles() -> Result<(), ConfigError> {
        let config = Config::from_toml_str(
            r#"
            [terminal]
            default-profile = "pwsh"
            font-size = 15
            line-height = 1.5
            cursor-style = "bar"
            right-click = "paste"
            bell = "none"
            scrollback = 0

            [[profiles]]
            name = "Dev server"
            command = "pwsh"
            args = ["-NoLogo"]
            cwd = "~/Projects"
            env = { NODE_ENV = "development" }
            icon = "terminal"
            color = "aurora-green"

            [[profiles]]
            name = "Plain"
            command = "/bin/sh"
            "#,
        )?;
        let terminal = &config.terminal;
        assert_eq!(terminal.default_profile, "pwsh");
        assert_eq!(terminal.font_size, 15);
        assert_eq!(terminal.cursor_style, CursorStyle::Bar);
        assert_eq!(terminal.bell, Bell::None);
        assert_eq!(terminal.scrollback, 0);
        assert_eq!(config.profiles.len(), 2);
        let dev = &config.profiles[0];
        assert_eq!(
            dev.env.get("NODE_ENV").map(String::as_str),
            Some("development")
        );
        assert_eq!(dev.color, Some(NordColor::AuroraGreen));
        assert_eq!(config.profiles[1].icon, ProfileIcon::Terminal);
        assert!(config.profiles[1].args.is_empty());
        Ok(())
    }

    #[test]
    fn integers_are_accepted_for_line_height() -> Result<(), ConfigError> {
        let config = Config::from_toml_str("[terminal]\nline-height = 2\n")?;
        assert!((config.terminal.line_height - 2.0).abs() < f64::EPSILON);
        Ok(())
    }

    #[test]
    fn rejects_out_of_range_values_with_the_key() {
        for bad in [
            "font-size = 7",
            "font-size = 33",
            "line-height = 0.9",
            "line-height = 2.5",
            "scrollback = 200001",
            "scrollback = -1",
            "font-size = 13.5",
        ] {
            let result = Config::from_toml_str(&format!("[terminal]\n{bad}\n"));
            assert!(result.is_err(), "{bad} was accepted");
        }
        let message = Config::from_toml_str("[terminal]\nfont-size = 99\n")
            .err()
            .map(|error| error.to_string())
            .unwrap_or_default();
        assert!(
            message.contains("font-size must be between 8 and 32"),
            "{message}"
        );
    }

    #[test]
    fn rejects_unknown_keys_and_values() {
        assert!(Config::from_toml_str("[unknown]\nkey = 1").is_err());
        assert!(Config::from_toml_str("[terminal]\ncursor-style = \"box\"").is_err());
        assert!(Config::from_toml_str("[terminal]\nfont = \"x\"").is_err());
        assert!(
            Config::from_toml_str("[[profiles]]\nname = \"x\"").is_err(),
            "no command"
        );
        assert!(
            Config::from_toml_str("[[profiles]]\nname = \"x\"\ncommand = \"sh\"\ncolor = \"pink\"")
                .is_err()
        );
    }

    #[test]
    fn settings_serialize_with_kebab_keys() -> TestResult {
        let json = serde_json::to_value(TerminalSettings::default())?;
        assert_eq!(json["font-size"], 13);
        assert_eq!(json["cursor-style"], "block");
        assert_eq!(json["right-click"], "menu");
        assert_eq!(json["history"], true);
        Ok(())
    }

    #[test]
    fn writes_settings_keeping_comments() -> TestResult {
        let tree = TempTree::new()?.file(
            "config.toml",
            "# mine\n[terminal]\n# the size\nfont-size = 13\n",
        )?;
        let path = tree.join("config.toml");
        let config = write_setting(&path, "font-size", &SettingValue::Number(16.0))?;
        assert_eq!(config.terminal.font_size, 16);
        write_setting(&path, "line-height", &SettingValue::Number(1.4))?;
        write_setting(&path, "copy-on-select", &SettingValue::Bool(true))?;
        write_setting(
            &path,
            "cursor-style",
            &SettingValue::Text("underline".to_owned()),
        )?;
        let text = tree.read("config.toml")?;
        assert!(text.contains("# the size"), "{text}");
        assert!(
            text.contains("font-size = 16\n"),
            "written as an integer: {text}"
        );
        assert!(text.contains("line-height = 1.4"), "{text}");
        assert!(text.contains("copy-on-select = true"), "{text}");
        assert!(text.contains("cursor-style = \"underline\""), "{text}");
        assert_eq!(
            Config::load(&path)?.terminal.cursor_style,
            CursorStyle::Underline
        );
        Ok(())
    }

    #[test]
    fn refuses_invalid_settings() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("config.toml");
        for (key, value) in [
            ("font-size", SettingValue::Number(64.0)),
            ("font-size", SettingValue::Number(12.5)),
            ("font-size", SettingValue::Number(f64::NAN)),
            ("line-height", SettingValue::Number(3.0)),
            ("cursor-style", SettingValue::Text("huge".to_owned())),
            ("nope", SettingValue::Bool(true)),
            ("history", SettingValue::Text("yes".to_owned())),
        ] {
            assert!(
                write_setting(&path, key, &value).is_err(),
                "{key} = {value:?}"
            );
        }
        assert!(!path.exists(), "nothing is written for an invalid setting");
        write_setting(&path, "history", &SettingValue::Bool(false))?;
        assert!(path.exists(), "the file is created on first write");
        Ok(())
    }

    #[test]
    fn setting_values_come_from_json() -> TestResult {
        let values: Vec<SettingValue> = serde_json::from_str(r#"[true, 14, 1.25, "bar"]"#)?;
        assert_eq!(
            values,
            [
                SettingValue::Bool(true),
                SettingValue::Number(14.0),
                SettingValue::Number(1.25),
                SettingValue::Text("bar".to_owned())
            ]
        );
        Ok(())
    }

    #[test]
    fn repo_config_parses() -> Result<(), ConfigError> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../other/config/slatesuite/apps/terminal.config.toml");
        let config = Config::load(&path)?;
        assert_eq!(
            config.terminal,
            TerminalSettings::default(),
            "ships the defaults"
        );
        Ok(())
    }
}
