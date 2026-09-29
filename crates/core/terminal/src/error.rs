//! [`TerminalError`]: every failure the terminal core can report.

use std::io;
use std::path::PathBuf;

use genslate_storage::StorageError;

/// Errors from sessions, history, snippets, listings, git and watching.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum TerminalError {
    /// A file system call failed on `path`.
    #[error("{action} {}: {}", path.display(), describe(source))]
    Io {
        /// What was being done, as a verb phrase ("could not read").
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
    /// A value from the UI was rejected.
    #[error("{0}")]
    InvalidArgument(String),
    #[error("config.toml: {0}")]
    Config(String),
    #[error("snippets.toml: {0}")]
    Snippets(String),
    #[error("no shell profile with id “{0}”")]
    UnknownProfile(String),
    #[error("no terminal session with id “{0}”")]
    UnknownSession(String),
    #[error("a terminal session with id “{0}” is already running")]
    SessionExists(String),
    /// The pseudo terminal could not be opened, spawned into, resized or written to.
    #[error("{action}: {message}")]
    Pty {
        action: &'static str,
        message: String,
    },
    #[error(transparent)]
    Storage(#[from] StorageError),
    #[error("git: {0}")]
    Git(String),
    #[error("file watching failed: {0}")]
    Watch(#[from] notify::Error),
}

impl TerminalError {
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
            Self::InvalidArgument(_) => "invalid-argument",
            Self::Config(_) => "config",
            Self::Snippets(_) => "snippets",
            Self::UnknownProfile(_) => "unknown-profile",
            Self::UnknownSession(_) => "unknown-session",
            Self::SessionExists(_) => "session-exists",
            Self::Pty { .. } => "pty",
            Self::Storage(error) => error.kind(),
            Self::Git(_) => "git",
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

    /// Wraps a PTY error (portable-pty reports `anyhow` errors) with what was being done.
    pub(crate) fn pty(action: &'static str) -> impl FnOnce(&dyn std::fmt::Display) -> Self {
        move |error| Self::Pty {
            action,
            message: error.to_string(),
        }
    }
}

/// Short, human wording for the common I/O failures (the OS text is often cryptic).
fn describe(error: &io::Error) -> String {
    match error.kind() {
        io::ErrorKind::PermissionDenied => "permission denied".to_owned(),
        io::ErrorKind::NotFound => "it does not exist".to_owned(),
        io::ErrorKind::StorageFull => "the drive is full".to_owned(),
        _ => error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn io_errors_have_readable_messages_and_kinds() {
        let error = TerminalError::io("could not read", "/x/y")(io::Error::from(
            io::ErrorKind::PermissionDenied,
        ));
        assert_eq!(error.kind(), "permission-denied");
        assert!(error.to_string().contains("permission denied"), "{error}");
        let pty = TerminalError::pty("could not start the shell")(&"boom");
        assert_eq!(pty.kind(), "pty");
        assert_eq!(pty.to_string(), "could not start the shell: boom");
    }
}
