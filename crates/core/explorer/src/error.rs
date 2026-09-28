//! [`ExplorerError`]: every failure the explorer core can report.

use std::io;
use std::path::PathBuf;

/// Errors from listing, file operations, search and watching.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum ExplorerError {
    /// A file system call failed on `path`.
    #[error("{action} {}: {}", path.display(), describe(source))]
    Io {
        /// What was being done, as a verb phrase ("could not open").
        action: &'static str,
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("{} does not exist", .0.display())]
    NotFound(PathBuf),
    #[error("{} is not a folder", .0.display())]
    NotAFolder(PathBuf),
    #[error("{} is not an absolute path", .0.display())]
    NotAbsolute(PathBuf),
    #[error("“{0}” already exists here")]
    AlreadyExists(String),
    #[error("{0}")]
    InvalidName(String),
    #[error("can't put {} inside itself", .0.display())]
    IntoItself(PathBuf),
    #[error("moving to the trash failed: {0}")]
    Trash(String),
    #[error("{0}")]
    Unsupported(&'static str),
    #[error("config.toml: {0}")]
    Config(String),
    #[error("file watching failed: {0}")]
    Watch(#[from] notify::Error),
}

impl ExplorerError {
    /// Stable machine-readable kind (sent to the UI next to the message).
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Io { source, .. } => match source.kind() {
                io::ErrorKind::PermissionDenied => "permission-denied",
                io::ErrorKind::NotFound => "not-found",
                io::ErrorKind::AlreadyExists => "already-exists",
                io::ErrorKind::StorageFull => "storage-full",
                _ => "io",
            },
            Self::NotFound(_) => "not-found",
            Self::NotAFolder(_) => "not-a-folder",
            Self::NotAbsolute(_) => "not-absolute",
            Self::AlreadyExists(_) => "already-exists",
            Self::InvalidName(_) => "invalid-name",
            Self::IntoItself(_) => "into-itself",
            Self::Trash(_) => "trash",
            Self::Unsupported(_) => "unsupported",
            Self::Config(_) => "config",
            Self::Watch(_) => "watch",
        }
    }

    /// Wraps an I/O error with what was being done and where.
    pub(crate) fn io(
        action: &'static str,
        path: impl Into<PathBuf>,
    ) -> impl FnOnce(io::Error) -> Self {
        let path = path.into();
        move |source| Self::Io {
            action,
            path,
            source,
        }
    }
}

impl From<trash::Error> for ExplorerError {
    fn from(error: trash::Error) -> Self {
        Self::Trash(error.to_string())
    }
}

/// Short, human wording for the common I/O failures (the OS text is often cryptic).
fn describe(error: &io::Error) -> String {
    match error.kind() {
        io::ErrorKind::PermissionDenied => "permission denied".to_owned(),
        io::ErrorKind::NotFound => "it no longer exists".to_owned(),
        io::ErrorKind::StorageFull => "the drive is full".to_owned(),
        _ => error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn io_errors_have_readable_messages_and_kinds() {
        let error = ExplorerError::io("could not open", "/x/y")(io::Error::from(
            io::ErrorKind::PermissionDenied,
        ));
        assert_eq!(error.kind(), "permission-denied");
        assert!(error.to_string().contains("permission denied"), "{error}");
    }
}
