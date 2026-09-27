//! GENSLATE Terminal's TOML config: the shared sections (`genslate-app-common`) plus this app's own.
//! Every field is optional; a missing file means defaults.

use std::path::Path;

use genslate_app_common::config::{self, Appearance, ConfigError, Logging, Window};
use serde::{Deserialize, Serialize};

/// The whole config file. Add this app's own sections next to the shared ones.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub struct Config {
    pub appearance: Appearance,
    pub window: Window,
    pub logging: Logging,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_file_is_default() -> Result<(), ConfigError> {
        assert_eq!(Config::from_toml_str("")?, Config::default());
        Ok(())
    }

    #[test]
    fn rejects_unknown_sections() {
        assert!(Config::from_toml_str("[unknown]\nkey = 1").is_err());
    }

    #[test]
    fn repo_config_parses() -> Result<(), ConfigError> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../other/config/genslate/terminal/config.toml");
        Config::load(&path)?;
        Ok(())
    }
}
