//! [`AppError`]: every error the launcher shell can surface, serialisable for IPC.

use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};

/// Errors from startup and commands, sent to the UI as `{ kind, message }`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum AppError {
    #[error("window `{0}` does not exist")]
    MissingWindow(&'static str),
    #[error("{0}")]
    InvalidArgument(String),
    #[error(transparent)]
    Launcher(#[from] genslate_core_launcher::LauncherError),
    #[error(transparent)]
    Paths(#[from] genslate_paths::PathsError),
    #[error(transparent)]
    Opener(#[from] tauri_plugin_opener::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl AppError {
    /// Stable machine-readable kind for the UI.
    pub const fn kind(&self) -> &'static str {
        match self {
            Self::MissingWindow(_) => "missing-window",
            Self::InvalidArgument(_) => "invalid-argument",
            Self::Launcher(error) => error.kind(),
            Self::Paths(_) => "paths",
            Self::Opener(_) => "open",
            Self::Tauri(_) => "tauri",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("kind", self.kind())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}
