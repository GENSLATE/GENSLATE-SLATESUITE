//! The catalog's data model: sources (launcher tabs), app ids, entries and statuses.

use std::fmt;
use std::path::PathBuf;
use std::str::FromStr;

use serde::{Deserialize, Serialize};

use super::icon::IconSource;

/// Where an app comes from. Each source is a launcher tab and a folder under `programs/`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Source {
    /// GENSLATE apps — `programs/genslate/`.
    Genslate,
    /// PortableApps.com Format apps — `programs/portableapps.com/`.
    PortableApps,
    /// portapps.io apps — `programs/portapps.io/`.
    Portapps,
}

impl Source {
    /// Every source, in default tab order.
    pub const ALL: [Self; 3] = [Self::Genslate, Self::PortableApps, Self::Portapps];

    /// Stable id used in [`AppId`]s, IPC and slash commands.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Genslate => "genslate",
            Self::PortableApps => "portableapps",
            Self::Portapps => "portapps",
        }
    }

    /// Folder name under `programs/`.
    pub const fn folder(self) -> &'static str {
        match self {
            Self::Genslate => "genslate",
            Self::PortableApps => "portableapps.com",
            Self::Portapps => "portapps.io",
        }
    }

    /// Tab settings + overrides file in `other/config/slatesuite/metadata/`.
    pub const fn settings_file(self) -> &'static str {
        match self {
            Self::Genslate => "genslate.toml",
            Self::PortableApps => "portableapps.toml",
            Self::Portapps => "portapps.toml",
        }
    }

    /// Tab label.
    pub const fn label(self) -> &'static str {
        match self {
            Self::Genslate => "GENSLATE",
            Self::PortableApps => "PortableApps.com",
            Self::Portapps => "portapps.io",
        }
    }
}

impl FromStr for Source {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::ALL
            .into_iter()
            .find(|source| source.as_str().eq_ignore_ascii_case(value))
            .ok_or_else(|| format!("unknown source {value:?}"))
    }
}

/// `<source>/<key>`: `genslate/explorer`, `portableapps/FirefoxPortable`,
/// `portableapps/LibreOfficePortable#2` (second menu entry of one package).
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(into = "String", try_from = "String")]
pub struct AppId {
    pub source: Source,
    pub key: String,
}

impl AppId {
    pub fn new(source: Source, key: impl Into<String>) -> Self {
        Self {
            source,
            key: key.into(),
        }
    }
}

impl fmt::Display for AppId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.source.as_str(), self.key)
    }
}

impl FromStr for AppId {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let (source, key) = value
            .split_once('/')
            .ok_or_else(|| format!("{value:?} is not <source>/<key>"))?;
        if key.is_empty() || key.contains(['/', '\\']) || key == "." || key == ".." {
            return Err(format!("{value:?} has an invalid key"));
        }
        Ok(Self::new(source.parse()?, key))
    }
}

impl From<AppId> for String {
    fn from(id: AppId) -> Self {
        id.to_string()
    }
}

impl TryFrom<String> for AppId {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        value.parse()
    }
}

/// State shown next to GENSLATE apps (third-party apps are always `Ready`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AppStatus {
    /// Installed and launchable.
    Ready,
    /// Launched and still running.
    Running,
    /// Known (metadata or reserved) but not in `programs/`.
    NotInstalled,
    /// The program folder exists but its executable is missing.
    MissingExe,
    /// The metadata file could not be read.
    BrokenManifest,
}

impl AppStatus {
    /// Whether the app can be started.
    pub const fn is_launchable(self) -> bool {
        matches!(self, Self::Ready | Self::Running)
    }
}

/// One launchable entry.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppEntry {
    pub id: AppId,
    pub name: String,
    pub description: String,
    pub category: String,
    /// Nord colour token of the icon tile (`nord9`), GENSLATE apps only.
    pub color: Option<String>,
    pub keywords: Vec<String>,
    pub version: Option<String>,
    pub publisher: Option<String>,
    pub status: AppStatus,
    pub favorite: bool,
    pub hidden: bool,
    /// Extra launch arguments from the user's overrides.
    pub args: Vec<String>,
    pub has_icon: bool,
    /// The executable (or `.app` bundle) — never sent to the UI.
    #[serde(skip)]
    pub program: Option<PathBuf>,
    /// The app's folder — never sent to the UI.
    #[serde(skip)]
    pub dir: Option<PathBuf>,
    #[serde(skip)]
    pub icon: Option<IconSource>,
}

impl AppEntry {
    /// A minimal entry; scanners fill in the rest.
    pub fn new(id: AppId, name: impl Into<String>) -> Self {
        Self {
            id,
            name: name.into(),
            description: String::new(),
            category: String::new(),
            color: None,
            keywords: Vec::new(),
            version: None,
            publisher: None,
            status: AppStatus::Ready,
            favorite: false,
            hidden: false,
            args: Vec::new(),
            has_icon: false,
            program: None,
            dir: None,
            icon: None,
        }
    }
}

/// The OS the catalog is scanned for (decides executable names).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HostOs {
    Windows,
    Macos,
    Linux,
}

impl HostOs {
    /// The OS this binary was built for.
    pub const fn current() -> Self {
        if cfg!(target_os = "windows") {
            Self::Windows
        } else if cfg!(target_os = "macos") {
            Self::Macos
        } else {
            Self::Linux
        }
    }
}

/// `"explorer"` → `"Explorer"`, `"ai-studio"` → `"Ai Studio"`.
pub fn title_case(key: &str) -> String {
    key.split(['-', '_', ' '])
        .filter(|word| !word.is_empty())
        .map(|word| {
            let mut chars = word.chars();
            chars.next().map_or_else(String::new, |first| {
                first.to_uppercase().chain(chars).collect::<String>()
            })
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_ids_round_trip() -> Result<(), String> {
        let id: AppId = "portableapps/FirefoxPortable#2".parse()?;
        assert_eq!(id.source, Source::PortableApps);
        assert_eq!(id.key, "FirefoxPortable#2");
        assert_eq!(id.to_string(), "portableapps/FirefoxPortable#2");
        Ok(())
    }

    #[test]
    fn app_ids_reject_traversal() {
        for bad in [
            "genslate",
            "genslate/",
            "genslate/..",
            "genslate/a/b",
            "nope/x",
            "genslate/a\\b",
        ] {
            assert!(bad.parse::<AppId>().is_err(), "{bad}");
        }
    }

    #[test]
    fn app_ids_serialise_as_strings() -> Result<(), serde_json::Error> {
        let id = AppId::new(Source::Genslate, "explorer");
        assert_eq!(serde_json::to_string(&id)?, "\"genslate/explorer\"");
        let back: AppId = serde_json::from_str("\"portapps/phyrox-portable\"")?;
        assert_eq!(back.source, Source::Portapps);
        Ok(())
    }

    #[test]
    fn title_cases_keys() {
        assert_eq!(title_case("explorer"), "Explorer");
        assert_eq!(title_case("ai-studio"), "Ai Studio");
    }
}
