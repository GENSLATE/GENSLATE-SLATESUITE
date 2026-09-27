//! [`LauncherError`]: every failure the launcher core can report.

use std::path::PathBuf;

/// Errors from config, catalog, launching and the command registry.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum LauncherError {
    #[error("could not read {path}: {source}")]
    Read {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    #[error("could not write {path}: {source}")]
    Write {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    #[error("{path} is invalid: {message}")]
    Parse { path: PathBuf, message: String },
    #[error("there is no app {0:?}")]
    UnknownApp(String),
    #[error("{0} is not installed")]
    NotInstalled(String),
    #[error("{0} is not inside an allowed programs folder")]
    OutsideRoot(PathBuf),
    #[error("could not start {path}: {source}")]
    Spawn {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    #[error("there is no command {0:?}")]
    UnknownAction(String),
    #[error("/{action}: {message}")]
    InvalidParams { action: String, message: String },
    #[error("file watching failed: {0}")]
    Watch(#[from] notify::Error),
}

impl LauncherError {
    /// Stable machine-readable kind (sent to the UI next to the message).
    pub const fn kind(&self) -> &'static str {
        match self {
            Self::Read { .. } => "read",
            Self::Write { .. } => "write",
            Self::Parse { .. } => "parse",
            Self::UnknownApp(_) => "unknown-app",
            Self::NotInstalled(_) => "not-installed",
            Self::OutsideRoot(_) => "outside-root",
            Self::Spawn { .. } => "spawn",
            Self::UnknownAction(_) => "unknown-action",
            Self::InvalidParams { .. } => "invalid-params",
            Self::Watch(_) => "watch",
        }
    }
}

pub(crate) fn read_error(path: &std::path::Path) -> impl FnOnce(std::io::Error) -> LauncherError {
    let path = path.to_path_buf();
    move |source| LauncherError::Read { path, source }
}

pub(crate) fn write_error(path: &std::path::Path) -> impl FnOnce(std::io::Error) -> LauncherError {
    let path = path.to_path_buf();
    move |source| LauncherError::Write { path, source }
}
