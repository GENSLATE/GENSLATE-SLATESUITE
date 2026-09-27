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
    #[error(transparent)]
    Paths(#[from] genslate_paths::PathsError),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl AppError {
    /// Stable machine-readable kind for the frontend.
    pub const fn kind(&self) -> &'static str {
        match self {
            Self::MissingConfig(_) => "missing-config",
            Self::MissingWindow(_) => "missing-window",
            Self::Paths(_) => "paths",
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
