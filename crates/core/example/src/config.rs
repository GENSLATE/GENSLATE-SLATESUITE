//! The example app's TOML config. Every field is optional; missing files mean defaults.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

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

/// The whole config file.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Config {
    pub appearance: Appearance,
    pub window: Window,
    pub logging: Logging,
}

/// Why the config could not be loaded.
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

impl Config {
    /// Parses TOML text.
    pub fn from_toml_str(text: &str) -> Result<Self, ConfigError> {
        toml::from_str(text).map_err(|source| ConfigError::Parse { path: None, source })
    }

    /// Loads `path`, returning defaults when the file does not exist.
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        match fs::read_to_string(path) {
            Ok(text) => toml::from_str(&text).map_err(|source| ConfigError::Parse {
                path: Some(path.to_path_buf()),
                source,
            }),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(Self::default()),
            Err(source) => Err(ConfigError::Read {
                path: path.to_path_buf(),
                source,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn empty_file_is_default() -> Result<(), ConfigError> {
        let config = Config::from_toml_str("")?;
        assert_eq!(config, Config::default());
        assert_eq!(config.appearance.theme, ThemePreference::System);
        assert!(config.window.remember_state);
        assert_eq!(config.logging.level, LogLevel::Info);
        Ok(())
    }

    #[test]
    fn parses_every_section() -> Result<(), ConfigError> {
        let config = Config::from_toml_str(
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
            Config::from_toml_str("[appearance]\ncolour = 1"),
            Err(ConfigError::Parse { .. })
        ));
        assert!(Config::from_toml_str("[appearance]\ntheme = \"solarized\"").is_err());
    }

    #[test]
    fn load_missing_file_is_default() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        assert_eq!(Config::load(&tree.join("missing.toml"))?, Config::default());
        Ok(())
    }

    #[test]
    fn load_reports_the_path_on_parse_errors() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("bad.toml", "[logging]\nlevel = 3")?;
        let error = Config::load(&tree.join("bad.toml"))
            .err()
            .ok_or("expected an error")?;
        assert!(error.to_string().contains("bad.toml"), "{error}");
        Ok(())
    }

    #[test]
    fn repo_example_config_parses() -> Result<(), Box<dyn std::error::Error>> {
        let path =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../other/config/apps/example.toml");
        Config::load(&path)?;
        Ok(())
    }
}
