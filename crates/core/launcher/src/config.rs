//! The launcher's hand-editable settings: `launcher.config.toml` and
//! `launcher.keybindings.toml` in `other/config/slatesuite/apps/`.
//!
//! Every key is optional (missing = default) and unknown keys are rejected so typos surface.
//! TOML uses kebab-case keys; the UI receives camelCase JSON.

use std::fs;
use std::io::ErrorKind;
use std::path::Path;

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

use crate::LauncherError;
use crate::error::read_error;

/// `config.toml`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
pub struct LauncherConfig {
    pub appearance: Appearance,
    pub behavior: Behavior,
    pub status: StatusConfig,
    pub logging: Logging,
}

/// `[appearance]`
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
pub struct Appearance {
    pub theme: ThemePreference,
    pub size: SizePreset,
}

/// `[behavior]`
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
#[allow(
    clippy::struct_excessive_bools,
    reason = "independent on/off settings, as written in the TOML"
)]
pub struct Behavior {
    /// Hide when another window gets focus (ignored while pinned).
    pub hide_on_blur: bool,
    /// Hide after launching an app (ignored while pinned).
    pub hide_on_launch: bool,
    /// Start pinned: always on top, never auto-hides.
    pub pinned: bool,
    /// Start with the operating system.
    pub autostart: bool,
}

impl Default for Behavior {
    fn default() -> Self {
        Self {
            hide_on_blur: true,
            hide_on_launch: true,
            pinned: false,
            autostart: false,
        }
    }
}

/// `[status]`
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
pub struct StatusConfig {
    /// What the right side of the status bar shows first.
    pub mode: StatusMode,
}

/// `[logging]`
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
pub struct Logging {
    pub level: LogLevel,
}

/// `"system" | "polar-night" | "snow-storm"`
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThemePreference {
    #[default]
    System,
    PolarNight,
    SnowStorm,
}

/// Window height: `"s"` 580, `"m"` 660, `"l"` 760 logical pixels.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SizePreset {
    S,
    #[default]
    M,
    L,
}

/// `"temps" | "usage"`
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StatusMode {
    #[default]
    Temps,
    Usage,
}

/// `"off" | "error" | "warn" | "info" | "debug" | "trace"`
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Off,
    Error,
    Warn,
    #[default]
    Info,
    Debug,
    Trace,
}

/// `keybindings.toml`. Shortcut strings use `Ctrl`/`Alt`/`Shift`/`Super` for the global
/// hotkey (OS-level) and the design system's `mod+k` syntax for in-launcher keys.
/// An empty string disables a binding.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
pub struct Keybindings {
    pub global: GlobalKeys,
    pub launcher: LauncherKeys,
}

/// `[global]` — work anywhere in the OS.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
pub struct GlobalKeys {
    /// Show / hide the launcher.
    pub toggle: String,
}

impl Default for GlobalKeys {
    fn default() -> Self {
        Self {
            toggle: "Ctrl+Alt+Space".to_owned(),
        }
    }
}

/// `[launcher]` — while the launcher has focus.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    default,
    deny_unknown_fields,
    rename_all(serialize = "camelCase", deserialize = "kebab-case")
)]
pub struct LauncherKeys {
    pub focus_search: String,
    pub toggle_tools: String,
    pub toggle_pin: String,
    pub toggle_favorite: String,
    pub tab_genslate: String,
    pub tab_portableapps: String,
    pub tab_portapps: String,
}

impl Default for LauncherKeys {
    fn default() -> Self {
        Self {
            focus_search: "mod+k".to_owned(),
            toggle_tools: "mod+t".to_owned(),
            toggle_pin: "mod+p".to_owned(),
            toggle_favorite: "mod+d".to_owned(),
            tab_genslate: "mod+1".to_owned(),
            tab_portableapps: "mod+2".to_owned(),
            tab_portapps: "mod+3".to_owned(),
        }
    }
}

impl LauncherConfig {
    /// Reads `path`; a missing or empty file is the default config.
    pub fn load(path: &Path) -> Result<Self, LauncherError> {
        load_toml(path)
    }
}

impl Keybindings {
    /// Reads `path`; a missing or empty file is the default keybindings.
    pub fn load(path: &Path) -> Result<Self, LauncherError> {
        load_toml(path)
    }
}

/// Parses a TOML settings file into `T`, defaulting when the file is missing.
pub(crate) fn load_toml<T: DeserializeOwned + Default>(path: &Path) -> Result<T, LauncherError> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(T::default()),
        Err(error) => return Err(read_error(path)(error)),
    };
    toml::from_str(&text).map_err(|error| LauncherError::Parse {
        path: path.to_path_buf(),
        message: error.message().to_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn missing_and_empty_files_are_defaults() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("empty.toml", "")?;
        assert_eq!(
            LauncherConfig::load(&tree.join("missing.toml"))?,
            LauncherConfig::default()
        );
        assert_eq!(
            LauncherConfig::load(&tree.join("empty.toml"))?,
            LauncherConfig::default()
        );
        assert_eq!(
            Keybindings::load(&tree.join("missing.toml"))?.global.toggle,
            "Ctrl+Alt+Space"
        );
        Ok(())
    }

    #[test]
    fn parses_kebab_case_keys() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file(
            "config.toml",
            "[appearance]\ntheme = \"snow-storm\"\nsize = \"l\"\n[behavior]\nhide-on-blur = false\n[status]\nmode = \"usage\"\n",
        )?;
        let config = LauncherConfig::load(&tree.join("config.toml"))?;
        assert_eq!(config.appearance.theme, ThemePreference::SnowStorm);
        assert_eq!(config.appearance.size, SizePreset::L);
        assert!(!config.behavior.hide_on_blur);
        assert!(
            config.behavior.hide_on_launch,
            "unset keys keep their default"
        );
        assert_eq!(config.status.mode, StatusMode::Usage);
        Ok(())
    }

    #[test]
    fn rejects_typos_with_the_path() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("config.toml", "[behavior]\nhide-on-blurr = false\n")?;
        let error = LauncherConfig::load(&tree.join("config.toml"))
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "parse");
        assert!(error.to_string().contains("config.toml"), "{error}");
        Ok(())
    }

    #[test]
    fn serialises_camel_case_for_the_ui() -> Result<(), serde_json::Error> {
        let json = serde_json::to_value(LauncherConfig::default())?;
        assert_eq!(json["behavior"]["hideOnBlur"], true);
        assert_eq!(json["appearance"]["theme"], "system");
        let keys = serde_json::to_value(Keybindings::default())?;
        assert_eq!(keys["launcher"]["focusSearch"], "mod+k");
        Ok(())
    }

    #[test]
    fn repo_launcher_files_parse() -> Result<(), Box<dyn std::error::Error>> {
        let dir =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../other/config/slatesuite/apps");
        LauncherConfig::load(&dir.join("launcher.config.toml"))?;
        Keybindings::load(&dir.join("launcher.keybindings.toml"))?;
        Ok(())
    }
}
