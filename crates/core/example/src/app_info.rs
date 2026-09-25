//! [`AppInfo`]: build metadata shown in the UI (About, status bar).

use serde::Serialize;

/// Serialised to the frontend as camelCase; mirrors `AppInfo` in `@genslate/tauri-bridge`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub tauri_version: String,
    /// `std::env::consts::OS` (`macos`, `windows`, `linux`).
    pub os: String,
    /// `std::env::consts::ARCH` (`aarch64`, `x86_64`).
    pub arch: String,
    /// Debug build.
    pub debug: bool,
}

impl AppInfo {
    /// Fills OS, architecture and build profile from the running binary.
    pub fn new(
        name: impl Into<String>,
        version: impl Into<String>,
        tauri_version: impl Into<String>,
    ) -> Self {
        Self {
            name: name.into(),
            version: version.into(),
            tauri_version: tauri_version.into(),
            os: std::env::consts::OS.to_owned(),
            arch: std::env::consts::ARCH.to_owned(),
            debug: cfg!(debug_assertions),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fills_platform_fields() {
        let info = AppInfo::new("GENSLATE Example", "0.1.0", "2.11.6");
        assert_eq!(info.os, std::env::consts::OS);
        assert_eq!(info.arch, std::env::consts::ARCH);
        assert_eq!(info.debug, cfg!(debug_assertions));
    }

    #[test]
    fn serialises_camel_case() -> Result<(), serde_json::Error> {
        let json = serde_json::to_value(AppInfo::new("A", "1.0.0", "2.0.0"))?;
        assert_eq!(json["tauriVersion"], "2.0.0");
        assert!(json.get("tauri_version").is_none());
        let keys: Vec<&str> = json
            .as_object()
            .map(|o| o.keys().map(String::as_str).collect())
            .unwrap_or_default();
        assert_eq!(keys.len(), 6);
        Ok(())
    }
}
