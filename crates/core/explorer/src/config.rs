//! GENSLATE Explorer's TOML config: the shared sections (`genslate-app-common`) plus
//! `[explorer]`. Every field is optional; a missing file means defaults. The Settings dialog
//! writes single keys back with [`write_setting`], keeping the file's comments.

use std::fs;
use std::io;
use std::path::Path;

use genslate_app_common::config::{self, Appearance, ConfigError, Logging, Window};
use serde::{Deserialize, Serialize};

use crate::ExplorerError;

/// The whole config file.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Config {
    pub appearance: Appearance,
    pub window: Window,
    pub logging: Logging,
    pub explorer: Explorer,
}

/// How the file views look.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ViewMode {
    #[default]
    Details,
    Icons,
    Tiles,
}

/// The column the file views sort by.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SortKey {
    #[default]
    Name,
    Modified,
    Kind,
    Size,
}

/// `[explorer]`.
#[expect(
    clippy::struct_excessive_bools,
    reason = "a config section: each flag is an independent user preference"
)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Explorer {
    /// View for new tabs.
    pub view: ViewMode,
    pub sort_by: SortKey,
    pub sort_descending: bool,
    /// Folders above files, whatever the sort.
    pub folders_first: bool,
    pub show_hidden: bool,
    /// Ask before moving items to the trash (deleting for good always asks).
    pub confirm_trash: bool,
    /// Where the first tab opens: a place id (`home`, `documents`, …) or an absolute path.
    pub start_folder: String,
    /// Reopen the last session's tabs.
    pub restore_tabs: bool,
    /// Show the preview pane.
    pub preview_pane: bool,
}

impl Default for Explorer {
    fn default() -> Self {
        Self {
            view: ViewMode::default(),
            sort_by: SortKey::default(),
            sort_descending: false,
            folders_first: true,
            show_hidden: false,
            confirm_trash: false,
            start_folder: "home".to_owned(),
            restore_tabs: true,
            preview_pane: true,
        }
    }
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

/// A value the Settings dialog can write.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(untagged)]
pub enum SettingValue {
    Bool(bool),
    Text(String),
}

/// Sets `[explorer] key = value` in the file at `path` (created if missing), keeping comments
/// and every other key. The result must still be a valid config, or nothing is written.
pub fn write_setting(
    path: &Path,
    key: &str,
    value: &SettingValue,
) -> Result<Config, ExplorerError> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == io::ErrorKind::NotFound => String::new(),
        Err(error) => return Err(ExplorerError::io("could not read", path)(error)),
    };
    let mut document: toml_edit::DocumentMut = text
        .parse()
        .map_err(|error: toml_edit::TomlError| ExplorerError::Config(error.to_string()))?;
    let section = document
        .entry("explorer")
        .or_insert_with(|| toml_edit::Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .ok_or_else(|| ExplorerError::Config("[explorer] is not a table".to_owned()))?;
    section[key] = match value {
        SettingValue::Bool(flag) => toml_edit::value(*flag),
        SettingValue::Text(text) => toml_edit::value(text.as_str()),
    };
    let updated = document.to_string();
    let config = Config::from_toml_str(&updated)
        .map_err(|error| ExplorerError::Config(format!("“{key}” can't be set to that: {error}")))?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(ExplorerError::io("could not create", parent))?;
    }
    fs::write(path, updated).map_err(ExplorerError::io("could not write", path))?;
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn empty_file_is_default() -> Result<(), ConfigError> {
        let config = Config::from_toml_str("")?;
        assert_eq!(config, Config::default());
        assert!(config.explorer.folders_first);
        assert_eq!(config.explorer.start_folder, "home");
        Ok(())
    }

    #[test]
    fn parses_the_explorer_section() -> Result<(), ConfigError> {
        let config = Config::from_toml_str(
            "[explorer]\nview = \"icons\"\nsort-by = \"size\"\nshow-hidden = true\n",
        )?;
        assert_eq!(config.explorer.view, ViewMode::Icons);
        assert_eq!(config.explorer.sort_by, SortKey::Size);
        assert!(config.explorer.show_hidden);
        Ok(())
    }

    #[test]
    fn rejects_unknown_sections() {
        assert!(Config::from_toml_str("[unknown]\nkey = 1").is_err());
        assert!(Config::from_toml_str("[explorer]\nview = \"list\"").is_err());
    }

    #[test]
    fn writes_settings_keeping_comments() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file(
            "config.toml",
            "# mine\n[explorer]\n# the view\nview = \"details\"\n",
        )?;
        let path = tree.join("config.toml");
        let config = write_setting(&path, "view", &SettingValue::Text("tiles".to_owned()))?;
        assert_eq!(config.explorer.view, ViewMode::Tiles);
        write_setting(&path, "show-hidden", &SettingValue::Bool(true))?;
        let text = tree.read("config.toml")?;
        assert!(text.contains("# the view"), "{text}");
        assert!(text.contains("view = \"tiles\""), "{text}");
        assert!(text.contains("show-hidden = true"), "{text}");
        Ok(())
    }

    #[test]
    fn refuses_invalid_settings() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let path = tree.join("config.toml");
        assert!(write_setting(&path, "view", &SettingValue::Text("huge".to_owned())).is_err());
        assert!(write_setting(&path, "nope", &SettingValue::Bool(true)).is_err());
        assert!(!path.exists(), "nothing is written for an invalid setting");
        write_setting(&path, "show-hidden", &SettingValue::Bool(true))?;
        assert!(path.exists(), "the file is created on first write");
        Ok(())
    }

    #[test]
    fn repo_config_parses() -> Result<(), ConfigError> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../other/config/slatesuite/apps/explorer.config.toml");
        Config::load(&path)?;
        Ok(())
    }
}
