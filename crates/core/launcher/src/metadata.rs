//! Files in `other/config/slatesuite/metadata/`:
//! - `<app>.toml` — how a GENSLATE app is shown (hand-written `[app]`, stamped `[build]`/`[exe]`).
//! - `genslate.toml`, `portableapps.toml`, `portapps.toml` — tab settings and the user's
//!   per-app overrides. The launcher edits these with `toml_edit`, so comments survive.

use std::collections::BTreeMap;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;

use serde::{Deserialize, Serialize};
use toml_edit::{Array, DocumentMut, Item, Table, value};

use crate::LauncherError;
use crate::catalog::Source;
use crate::config::load_toml;
use crate::error::{read_error, write_error};

/// `<app>.toml`. Unknown keys are allowed so newer metadata works with older launchers.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default, rename_all = "kebab-case")]
pub struct AppMetadata {
    pub app: AppInfo,
    pub build: BuildInfo,
    pub exe: ExePaths,
}

/// `[app]`
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default, rename_all = "kebab-case")]
pub struct AppInfo {
    pub name: Option<String>,
    pub description: String,
    pub category: Option<String>,
    /// Nord colour token of the icon tile (`nord7` … `nord15`).
    pub color: Option<String>,
    pub keywords: Vec<String>,
}

/// `[build]` (stamped at package time).
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default, rename_all = "kebab-case")]
pub struct BuildInfo {
    pub guid: Option<String>,
    pub version: Option<String>,
    pub build: Option<String>,
    pub identifier: Option<String>,
}

/// `[exe]` — launch path per OS, relative to `programs/genslate/<app>/`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default, rename_all = "kebab-case")]
pub struct ExePaths {
    pub windows: Option<String>,
    pub macos: Option<String>,
    pub linux: Option<String>,
}

impl AppMetadata {
    /// Reads `<app>.toml`; a missing file is empty metadata.
    pub fn load(path: &Path) -> Result<Self, LauncherError> {
        load_toml(path)
    }
}

/// A tab settings file (`genslate.toml`, …).
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct TabSettings {
    /// Show the tab (it is still hidden while its folder has no apps).
    pub enabled: bool,
    /// Tab position; lower comes first.
    pub order: Option<u32>,
    /// Per-app overrides keyed by the app key (`explorer`, `FirefoxPortable`).
    pub apps: BTreeMap<String, AppOverride>,
}

impl Default for TabSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            order: None,
            apps: BTreeMap::new(),
        }
    }
}

/// `[apps.<key>]`
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct AppOverride {
    pub favorite: bool,
    pub hidden: bool,
    pub name: Option<String>,
    pub category: Option<String>,
    pub args: Option<Vec<String>>,
}

impl TabSettings {
    /// Reads a tab settings file; a missing file is the default.
    pub fn load(path: &Path) -> Result<Self, LauncherError> {
        load_toml(path)
    }
}

/// A change to one app's overrides. `None` leaves a field as it is; `Some(None)` removes it.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct OverridePatch {
    pub favorite: Option<bool>,
    pub hidden: Option<bool>,
    #[allow(
        clippy::option_option,
        reason = "absent = keep, null = remove, value = set"
    )]
    pub name: Option<Option<String>>,
    #[allow(
        clippy::option_option,
        reason = "absent = keep, null = remove, value = set"
    )]
    pub category: Option<Option<String>>,
    #[allow(
        clippy::option_option,
        reason = "absent = keep, null = remove, value = set"
    )]
    pub args: Option<Option<Vec<String>>>,
}

/// Applies `change` to `[apps.<key>]` of `source`'s settings file in `metadata_dir`, keeping
/// every comment and unrelated key. Defaults (`false`, removed) are deleted so the file stays
/// minimal. Returns the new file contents.
pub fn write_override(
    metadata_dir: &Path,
    source: Source,
    key: &str,
    change: &OverridePatch,
) -> Result<String, LauncherError> {
    let path = metadata_dir.join(source.settings_file());
    let mut doc = read_document(&path)?;
    let apps = doc
        .entry("apps")
        .or_insert_with(|| {
            let mut table = Table::new();
            table.set_implicit(true);
            Item::Table(table)
        })
        .as_table_mut()
        .ok_or_else(|| parse_error(&path, "`apps` must be a table"))?;
    let entry = apps
        .entry(key)
        .or_insert_with(|| Item::Table(Table::new()))
        .as_table_mut()
        .ok_or_else(|| parse_error(&path, &format!("`apps.{key}` must be a table")))?;

    set_flag(entry, "favorite", change.favorite);
    set_flag(entry, "hidden", change.hidden);
    set_text(entry, "name", change.name.as_ref());
    set_text(entry, "category", change.category.as_ref());
    if let Some(args) = &change.args {
        match args {
            Some(args) if !args.is_empty() => {
                entry.insert("args", value(args.iter().collect::<Array>()));
            }
            _ => {
                entry.remove("args");
            }
        }
    }
    if entry.is_empty() {
        apps.remove(key);
    }
    let text = doc.to_string();
    write_atomic(&path, &text)?;
    Ok(text)
}

/// Sets `[table].key = value` in a TOML file (e.g. `appearance.theme`), keeping comments.
pub fn write_value(
    path: &Path,
    table: &str,
    key: &str,
    new: toml_edit::Value,
) -> Result<String, LauncherError> {
    let mut doc = read_document(path)?;
    let section = doc
        .entry(table)
        .or_insert_with(|| Item::Table(Table::new()))
        .as_table_mut()
        .ok_or_else(|| parse_error(path, &format!("`{table}` must be a table")))?;
    // Keep the decor (trailing comments) of an existing value.
    match section.get_mut(key).and_then(Item::as_value_mut) {
        Some(existing) => {
            let decor = existing.decor().clone();
            *existing = new;
            *existing.decor_mut() = decor;
        }
        None => {
            section.insert(key, Item::Value(new));
        }
    }
    let text = doc.to_string();
    write_atomic(path, &text)?;
    Ok(text)
}

/// Writes `text` to a sibling temp file and renames it over `path`, so readers (and the file
/// watcher) never see a half-written file.
pub fn write_atomic(path: &Path, text: &str) -> Result<(), LauncherError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(write_error(parent))?;
    }
    let temp = path.with_extension("toml.tmp");
    fs::write(&temp, text).map_err(write_error(&temp))?;
    fs::rename(&temp, path).map_err(write_error(path))
}

fn read_document(path: &Path) -> Result<DocumentMut, LauncherError> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == ErrorKind::NotFound => String::new(),
        Err(error) => return Err(read_error(path)(error)),
    };
    text.parse::<DocumentMut>()
        .map_err(|error| parse_error(path, error.message()))
}

fn set_flag(table: &mut Table, key: &str, flag: Option<bool>) {
    match flag {
        Some(true) => {
            table.insert(key, value(true));
        }
        Some(false) => {
            table.remove(key);
        }
        None => {}
    }
}

fn set_text(table: &mut Table, key: &str, text: Option<&Option<String>>) {
    match text {
        Some(Some(text)) if !text.trim().is_empty() => {
            table.insert(key, value(text.trim()));
        }
        Some(_) => {
            table.remove(key);
        }
        None => {}
    }
}

fn parse_error(path: &Path, message: &str) -> LauncherError {
    LauncherError::Parse {
        path: path.to_path_buf(),
        message: message.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    const SETTINGS: &str = "# GENSLATE tab — keep this comment\nenabled = true\n\n[apps.explorer]\n# my favourite\nfavorite = true\n";

    #[test]
    fn reads_metadata_and_settings() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file(
                "explorer.toml",
                "[app]\nname = \"Explorer\"\ndescription = \"Files\"\ncolor = \"nord8\"\nfuture-key = 1\n[exe]\nwindows = \"x.exe\"\n",
            )?
            .file("genslate.toml", SETTINGS)?;
        let meta = AppMetadata::load(&tree.join("explorer.toml"))?;
        assert_eq!(meta.app.name.as_deref(), Some("Explorer"));
        assert_eq!(meta.exe.windows.as_deref(), Some("x.exe"));
        let tab = TabSettings::load(&tree.join("genslate.toml"))?;
        assert!(tab.apps.get("explorer").is_some_and(|o| o.favorite));
        Ok(())
    }

    #[test]
    fn overrides_keep_comments_and_prune_defaults() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("genslate.toml", SETTINGS)?;
        let patch = OverridePatch {
            hidden: Some(true),
            name: Some(Some("Files".to_owned())),
            ..OverridePatch::default()
        };
        let text = write_override(tree.path(), Source::Genslate, "explorer", &patch)?;
        assert!(
            text.contains("# GENSLATE tab — keep this comment"),
            "{text}"
        );
        assert!(text.contains("# my favourite"), "{text}");
        let tab = TabSettings::load(&tree.join("genslate.toml"))?;
        let explorer = tab.apps.get("explorer").ok_or("missing override")?;
        assert!(explorer.favorite && explorer.hidden);
        assert_eq!(explorer.name.as_deref(), Some("Files"));

        let reset = OverridePatch {
            favorite: Some(false),
            hidden: Some(false),
            name: Some(None),
            ..OverridePatch::default()
        };
        write_override(tree.path(), Source::Genslate, "explorer", &reset)?;
        let tab = TabSettings::load(&tree.join("genslate.toml"))?;
        assert!(
            !tab.apps.contains_key("explorer"),
            "empty override tables are removed"
        );
        Ok(())
    }

    #[test]
    fn overrides_create_the_file() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let patch = OverridePatch {
            favorite: Some(true),
            args: Some(Some(vec!["--private".to_owned()])),
            ..OverridePatch::default()
        };
        write_override(tree.path(), Source::PortableApps, "FirefoxPortable", &patch)?;
        let tab = TabSettings::load(&tree.join("portableapps.toml"))?;
        let firefox = tab.apps.get("FirefoxPortable").ok_or("missing override")?;
        assert_eq!(firefox.args.as_deref(), Some(&["--private".to_owned()][..]));
        Ok(())
    }

    #[test]
    fn values_keep_their_trailing_comments() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file(
            "config.toml",
            "[appearance]\n# pick one\ntheme = \"system\" # or a Nord theme\n",
        )?;
        let text = write_value(
            &tree.join("config.toml"),
            "appearance",
            "theme",
            "snow-storm".into(),
        )?;
        assert!(
            text.contains("theme = \"snow-storm\" # or a Nord theme"),
            "{text}"
        );
        assert!(text.contains("# pick one"));
        Ok(())
    }

    #[test]
    fn repo_metadata_files_parse() -> Result<(), Box<dyn std::error::Error>> {
        let dir =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../other/config/slatesuite/metadata");
        for entry in fs::read_dir(&dir)? {
            let path = entry?.path();
            let is_tab = Source::ALL.iter().any(|source| {
                path.file_name()
                    .is_some_and(|name| name == source.settings_file())
            });
            if is_tab {
                TabSettings::load(&path)?;
            } else if path.extension().is_some_and(|ext| ext == "toml") {
                AppMetadata::load(&path)?;
            }
        }
        Ok(())
    }
}
