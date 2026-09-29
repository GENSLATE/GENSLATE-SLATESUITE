//! [`AppError`]: every error the app can surface, serialisable for IPC.

use genslate_core_terminal::{StorageError, TerminalError};
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
    #[error(transparent)]
    Terminal(#[from] TerminalError),
    #[error(transparent)]
    Paths(#[from] genslate_paths::PathsError),
    #[error("could not open it: {0}")]
    Opener(#[from] tauri_plugin_opener::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl From<StorageError> for AppError {
    fn from(error: StorageError) -> Self {
        Self::Terminal(error.into())
    }
}

impl AppError {
    /// Stable machine-readable kind for the frontend.
    pub fn kind(&self) -> &'static str {
        match self {
            Self::MissingConfig(_) => "missing-config",
            Self::MissingWindow(_) => "missing-window",
            Self::InvalidArgument(_) => "invalid-argument",
            Self::Terminal(error) => error.kind(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_kind_and_message() -> Result<(), serde_json::Error> {
        let error = AppError::from(TerminalError::UnknownSession("tab-1".to_owned()));
        let json = serde_json::to_value(&error)?;
        assert_eq!(json["kind"], "unknown-session");
        assert_eq!(json["message"], "no terminal session with id “tab-1”");
        Ok(())
    }
}
