//! Errors raised while resolving paths.

use std::path::PathBuf;

/// Why a set of app paths could not be resolved or created.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum PathsError {
    /// App names are lowercase kebab-case (`example`, `launcher`).
    #[error("invalid app name {0:?}: use lowercase letters, digits and '-'")]
    InvalidName(String),
    /// Neither the executable's folder nor an OS data directory is known.
    #[error("no writable location: the executable path and the OS data directory are unknown")]
    NoLocation,
    /// Creating a directory failed.
    #[error("could not create {path}: {source}")]
    CreateDir {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
}

impl PathsError {
    /// `true` when the location exists but may not be written (read-only media, ACLs).
    pub fn is_not_writable(&self) -> bool {
        use std::io::ErrorKind;
        matches!(
            self,
            Self::CreateDir { source, .. }
                if matches!(source.kind(), ErrorKind::PermissionDenied | ErrorKind::ReadOnlyFilesystem)
        )
    }
}
