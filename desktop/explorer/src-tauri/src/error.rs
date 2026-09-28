//! [`AppError`]: every error the app can surface, serialisable for IPC.

use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};

/// Errors from startup and commands.
///
/// Sent to the frontend as `{ kind, message }` so `invoke()` rejections are typed.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum AppError {
    #[error("`{0}` is missing from tauri.conf.json")]
    MissingConfig(&'static str),
    #[error("window `{0}` does not exist")]
    MissingWindow(&'static str),
    #[error("{0}")]
    InvalidArgument(String),
    #[error("{0}")]
    Unsupported(&'static str),
    #[error(transparent)]
    Explorer(#[from] genslate_core_explorer::ExplorerError),
    #[error(transparent)]
    Paths(#[from] genslate_paths::PathsError),
    #[error("could not open it: {0}")]
    Opener(#[from] tauri_plugin_opener::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl AppError {
    /// Stable machine-readable kind for the frontend.
    pub fn kind(&self) -> &'static str {
        match self {
            Self::MissingConfig(_) => "missing-config",
            Self::MissingWindow(_) => "missing-window",
            Self::InvalidArgument(_) => "invalid-argument",
            Self::Unsupported(_) => "unsupported",
            Self::Explorer(error) => error.kind(),
            Self::Paths(_) => "paths",
            Self::Opener(_) => "open",
            Self::Tauri(_) => "tauri",
        }
    }
}

/// An [`AppError`] as event payloads carry it (events need `Clone`).
#[derive(Debug, Clone, Serialize)]
pub struct ErrorPayload {
    pub kind: &'static str,
    pub message: String,
}

impl AppError {
    /// The `{ kind, message }` the UI receives.
    pub fn payload(&self) -> ErrorPayload {
        ErrorPayload {
            kind: self.kind(),
            message: self.to_string(),
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
