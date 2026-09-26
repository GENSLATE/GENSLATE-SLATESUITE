//! Errors raised while resolving paths.

use std::path::PathBuf;

/// Why a set of app paths could not be resolved or created.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum PathsError {
    /// App names are lowercase kebab-case (`example`, `slate-explorer`).
    #[error("invalid app name {0:?}: use lowercase letters, digits and '-'")]
    InvalidName(String),
    /// The bundle identifier is empty or contains a path separator.
    #[error("invalid bundle identifier {0:?}")]
    InvalidIdentifier(String),
    /// The OS did not report a standard directory (e.g. no `$HOME`).
    #[error("the operating system did not report a {0} directory")]
    MissingOsDir(&'static str),
    /// Portable mode needs the executable's folder.
    #[error("portable mode is on but the executable directory is unknown")]
    MissingExecutableDir,
    /// Creating a directory failed.
    #[error("could not create {path}: {source}")]
    CreateDir {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
}
