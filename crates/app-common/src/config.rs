//! The config sections every GENSLATE app shares and the TOML loader.
//!
//! Each app core composes these sections into its own `Config` (with its own sections next to
//! them) and loads it with [`load`]. Every field is optional; a missing file means defaults.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

/// Which Nord theme the window starts with.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThemePreference {
    /// Follow the OS light/dark setting.
    #[default]
    System,
    /// Polar Night (dark).
    PolarNight,
    /// Snow Storm (light).
    SnowStorm,
}

impl ThemePreference {
    /// The design-token theme id, or `None` to follow the system.
    pub const fn theme_id(self) -> Option<&'static str> {
        match self {
            Self::System => None,
            Self::PolarNight => Some("polar-night"),
            Self::SnowStorm => Some("snow-storm"),
        }
    }
}

/// Minimum log level written to stdout and the log folder.
#[derive(
    Debug, Clone, Copy, Default, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize,
)]
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

impl From<LogLevel> for log::LevelFilter {
    fn from(level: LogLevel) -> Self {
        match level {
            LogLevel::Off => Self::Off,
            LogLevel::Error => Self::Error,
            LogLevel::Warn => Self::Warn,
            LogLevel::Info => Self::Info,
            LogLevel::Debug => Self::Debug,
            LogLevel::Trace => Self::Trace,
        }
    }
}

/// `[appearance]`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Appearance {
    pub theme: ThemePreference,
}

/// `[window]`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Window {
    /// Restore size and position between launches (window-state plugin).
    pub remember_state: bool,
}

impl Default for Window {
    fn default() -> Self {
        Self {
            remember_state: true,
        }
    }
}

/// `[logging]`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Logging {
    pub level: LogLevel,
}

/// Why a config could not be loaded.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum ConfigError {
    #[error("could not read {path}: {source}")]
    Read {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("invalid config{}: {source}", path.as_ref().map(|p| format!(" in {}", p.display())).unwrap_or_default())]
    Parse {
        path: Option<PathBuf>,
        #[source]
        source: toml::de::Error,
    },
}

/// Parses TOML text into a config.
pub fn parse<T: DeserializeOwned>(text: &str) -> Result<T, ConfigError> {
    toml::from_str(text).map_err(|source| ConfigError::Parse { path: None, source })
}

/// Loads the config at `path`, returning defaults when the file does not exist.
pub fn load<T: DeserializeOwned + Default>(path: &Path) -> Result<T, ConfigError> {
    match fs::read_to_string(path) {
        Ok(text) => toml::from_str(&text).map_err(|source| ConfigError::Parse {
            path: Some(path.to_path_buf()),
            source,
        }),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(T::default()),
        Err(source) => Err(ConfigError::Read {
            path: path.to_path_buf(),
            source,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    /// A config shaped like an app's: the shared sections plus nothing else.
    #[derive(Debug, Default, PartialEq, Eq, Deserialize)]
    #[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
    struct AppConfig {
        appearance: Appearance,
        window: Window,
        logging: Logging,
    }

    #[test]
    fn empty_file_is_default() -> Result<(), ConfigError> {
        let config: AppConfig = parse("")?;
        assert_eq!(config, AppConfig::default());
        assert_eq!(config.appearance.theme, ThemePreference::System);
        assert!(config.window.remember_state);
        assert_eq!(config.logging.level, LogLevel::Info);
        Ok(())
    }

    #[test]
    fn parses_every_section() -> Result<(), ConfigError> {
        let config: AppConfig = parse(
            r#"
            [appearance]
            theme = "snow-storm"
            [window]
            remember-state = false
            [logging]
            level = "debug"
            "#,
        )?;
        assert_eq!(config.appearance.theme.theme_id(), Some("snow-storm"));
        assert!(!config.window.remember_state);
        assert_eq!(config.logging.level, LogLevel::Debug);
        Ok(())
    }

    #[test]
    fn rejects_unknown_keys_and_values() {
        assert!(matches!(
            parse::<AppConfig>("[appearance]\ncolour = 1"),
            Err(ConfigError::Parse { .. })
        ));
        assert!(parse::<AppConfig>("[appearance]\ntheme = \"solarized\"").is_err());
        assert!(parse::<AppConfig>("[unknown]\nkey = 1").is_err());
    }

    #[test]
    fn load_missing_file_is_default() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        assert_eq!(
            load::<AppConfig>(&tree.join("missing.toml"))?,
            AppConfig::default()
        );
        Ok(())
    }

    #[test]
    fn load_reports_the_path_on_parse_errors() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("bad.toml", "[logging]\nlevel = 3")?;
        let error = load::<AppConfig>(&tree.join("bad.toml"))
            .err()
            .ok_or("expected an error")?;
        assert!(error.to_string().contains("bad.toml"), "{error}");
        Ok(())
    }

    #[test]
    fn log_levels_map_one_to_one() {
        assert_eq!(log::LevelFilter::from(LogLevel::Off), log::LevelFilter::Off);
        assert_eq!(
            log::LevelFilter::from(LogLevel::Info),
            log::LevelFilter::Info
        );
        assert_eq!(
            log::LevelFilter::from(LogLevel::Trace),
            log::LevelFilter::Trace
        );
    }
}
