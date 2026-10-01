//! GENSLATE Gallery's TOML config: the shared sections (`genslate-app-common`) plus
//! `[gallery]`. Every field is optional; a missing file means defaults. The Settings dialog
//! writes single keys back with [`write_setting`], keeping the file's comments.
//!
//! The library folders themselves live in the library database, not here.

use std::fs;
use std::io;
use std::path::Path;

use genslate_app_common::config::{self, Appearance, ConfigError, Logging, Window};
use serde::{Deserialize, Serialize};

use crate::GalleryError;
use crate::library::SortKey;

/// The whole config file.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Config {
    pub appearance: Appearance,
    pub window: Window,
    pub logging: Logging,
    pub gallery: Gallery,
}

/// How a collection is laid out.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ViewMode {
    /// Justified rows grouped by date.
    #[default]
    Timeline,
    /// Square tiles.
    Grid,
    /// A list with columns.
    Details,
}

/// How the timeline groups photos.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GroupBy {
    Day,
    #[default]
    Month,
    Year,
}

/// How big thumbnails are drawn.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThumbnailSize {
    Small,
    #[default]
    Medium,
    Large,
}

/// `[gallery]`.
#[expect(
    clippy::struct_excessive_bools,
    reason = "a config section: each flag is an independent user preference"
)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Gallery {
    pub view: ViewMode,
    pub group_by: GroupBy,
    pub sort_by: SortKey,
    pub sort_descending: bool,
    pub thumbnail_size: ThumbnailSize,
    /// List videos next to photos (the Videos collection always shows them).
    pub show_videos: bool,
    /// Scan hidden files and folders.
    pub include_hidden: bool,
    /// Ask before moving items to the Trash.
    pub confirm_trash: bool,
    /// Seconds per photo in a slideshow.
    pub slideshow_seconds: u32,
    /// Show the info panel next to the grid.
    pub info_panel: bool,
    /// Offer the Pictures folder when the library is empty.
    pub suggest_pictures: bool,
}

impl Default for Gallery {
    fn default() -> Self {
        Self {
            view: ViewMode::default(),
            group_by: GroupBy::default(),
            sort_by: SortKey::default(),
            sort_descending: true,
            thumbnail_size: ThumbnailSize::default(),
            show_videos: true,
            include_hidden: false,
            confirm_trash: true,
            slideshow_seconds: 4,
            info_panel: true,
            suggest_pictures: true,
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
    Number(i64),
    Text(String),
}

/// Sets `[gallery] key = value` in the file at `path` (created if missing), keeping comments
/// and every other key. The result must still be a valid config, or nothing is written.
pub fn write_setting(path: &Path, key: &str, value: &SettingValue) -> Result<Config, GalleryError> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == io::ErrorKind::NotFound => String::new(),
        Err(error) => return Err(GalleryError::io("could not read", path)(error)),
    };
    let mut document: toml_edit::DocumentMut = text
        .parse()
        .map_err(|error: toml_edit::TomlError| GalleryError::Config(error.to_string()))?;
    let section = document
        .entry("gallery")
        .or_insert_with(|| toml_edit::Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .ok_or_else(|| GalleryError::Config("[gallery] is not a table".to_owned()))?;
    section[key] = match value {
        SettingValue::Bool(flag) => toml_edit::value(*flag),
        SettingValue::Number(number) => toml_edit::value(*number),
        SettingValue::Text(text) => toml_edit::value(text.as_str()),
    };
    let updated = document.to_string();
    let config = Config::from_toml_str(&updated)
        .map_err(|error| GalleryError::Config(format!("“{key}” can't be set to that: {error}")))?;
    if !(1..=60).contains(&config.gallery.slideshow_seconds) {
        return Err(GalleryError::Config(
            "slideshow-seconds goes from 1 to 60".to_owned(),
        ));
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(GalleryError::io("could not create", parent))?;
    }
    fs::write(path, updated).map_err(GalleryError::io("could not write", path))?;
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
        assert!(config.gallery.show_videos);
        assert_eq!(config.gallery.slideshow_seconds, 4);
        assert_eq!(config.gallery.group_by, GroupBy::Month);
        Ok(())
    }

    #[test]
    fn parses_the_gallery_section() -> Result<(), ConfigError> {
        let config = Config::from_toml_str(
            "[gallery]\nview = \"grid\"\ngroup-by = \"year\"\nsort-by = \"added\"\nthumbnail-size = \"large\"\n",
        )?;
        assert_eq!(config.gallery.view, ViewMode::Grid);
        assert_eq!(config.gallery.group_by, GroupBy::Year);
        assert_eq!(config.gallery.sort_by, SortKey::Added);
        assert_eq!(config.gallery.thumbnail_size, ThumbnailSize::Large);
        Ok(())
    }

    #[test]
    fn rejects_unknown_sections() {
        assert!(Config::from_toml_str("[unknown]\nkey = 1").is_err());
        assert!(Config::from_toml_str("[gallery]\nview = \"list\"").is_err());
    }

    #[test]
    fn writes_settings_keeping_comments() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file(
            "config.toml",
            "# mine\n[gallery]\n# the view\nview = \"timeline\"\n",
        )?;
        let path = tree.join("config.toml");
        let config = write_setting(&path, "view", &SettingValue::Text("grid".to_owned()))?;
        assert_eq!(config.gallery.view, ViewMode::Grid);
        write_setting(&path, "show-videos", &SettingValue::Bool(false))?;
        write_setting(&path, "slideshow-seconds", &SettingValue::Number(8))?;
        let text = tree.read("config.toml")?;
        assert!(text.contains("# the view"), "{text}");
        assert!(text.contains("view = \"grid\""), "{text}");
        assert!(text.contains("show-videos = false"), "{text}");
        assert!(text.contains("slideshow-seconds = 8"), "{text}");
        Ok(())
    }

    #[test]
    fn refuses_invalid_settings() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let path = tree.join("config.toml");
        assert!(write_setting(&path, "view", &SettingValue::Text("huge".to_owned())).is_err());
        assert!(write_setting(&path, "nope", &SettingValue::Bool(true)).is_err());
        assert!(write_setting(&path, "slideshow-seconds", &SettingValue::Number(0)).is_err());
        assert!(!path.exists(), "nothing is written for an invalid setting");
        write_setting(&path, "show-videos", &SettingValue::Bool(true))?;
        assert!(path.exists(), "the file is created on first write");
        Ok(())
    }

    #[test]
    fn repo_config_parses() -> Result<(), ConfigError> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../other/config/slatesuite/apps/gallery.config.toml");
        Config::load(&path)?;
        Ok(())
    }
}
