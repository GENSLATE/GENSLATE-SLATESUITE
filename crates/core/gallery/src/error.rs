//! [`GalleryError`]: every failure the gallery core can report.

use std::io;
use std::path::PathBuf;

use genslate_storage::StorageError;

/// Errors from scanning, the library database, thumbnails, edits, exports and watching.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum GalleryError {
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
    #[error("“{0}” already exists")]
    AlreadyExists(String),
    /// A value from the UI was rejected.
    #[error("{0}")]
    InvalidArgument(String),
    #[error("no photo or video with id {0} in the library")]
    UnknownMedia(i64),
    #[error("no album with id {0}")]
    UnknownAlbum(i64),
    /// The file is not a format Gallery can decode.
    #[error("{} can't be opened as an image: {message}", path.display())]
    Decode { path: PathBuf, message: String },
    /// An image could not be written.
    #[error("could not save the image: {0}")]
    Encode(String),
    #[error("config.toml: {0}")]
    Config(String),
    #[error("{0}")]
    Unsupported(&'static str),
    #[error(transparent)]
    Storage(#[from] StorageError),
    #[error("the trash could not be used: {0}")]
    Trash(#[from] trash::Error),
    #[error("folder watching failed: {0}")]
    Watch(#[from] notify_debouncer_full::notify::Error),
}

impl GalleryError {
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
            Self::InvalidArgument(_) => "invalid-argument",
            Self::UnknownMedia(_) => "unknown-media",
            Self::UnknownAlbum(_) => "unknown-album",
            Self::Decode { .. } => "decode",
            Self::Encode(_) => "encode",
            Self::Config(_) => "config",
            Self::Unsupported(_) => "unsupported",
            Self::Storage(error) => error.kind(),
            Self::Trash(_) => "trash",
            Self::Watch(_) => "watch",
        }
    }

    /// Wraps an I/O error with what was being done and where.
    pub fn io(action: &'static str, path: impl Into<PathBuf>) -> impl FnOnce(io::Error) -> Self {
        let path = path.into();
        move |source| Self::Io {
            action,
            path,
            source,
        }
    }

    /// Wraps a decoder error for `path`.
    pub(crate) fn decode(path: impl Into<PathBuf>) -> impl FnOnce(&dyn std::fmt::Display) -> Self {
        let path = path.into();
        move |error| Self::Decode {
            path,
            message: error.to_string(),
        }
    }
}

impl From<genslate_storage::rusqlite::Error> for GalleryError {
    fn from(error: genslate_storage::rusqlite::Error) -> Self {
        Self::Storage(StorageError::from(error))
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
        let error = GalleryError::io("could not read", "/x/y")(io::Error::from(
            io::ErrorKind::PermissionDenied,
        ));
        assert_eq!(error.kind(), "permission-denied");
        assert!(error.to_string().contains("permission denied"), "{error}");
        let decode = GalleryError::decode("/x/a.png")(&"bad header");
        assert_eq!(decode.kind(), "decode");
        assert!(decode.to_string().contains("bad header"), "{decode}");
    }

    #[test]
    fn sql_errors_are_storage_errors() {
        let error = GalleryError::from(genslate_storage::rusqlite::Error::QueryReturnedNoRows);
        assert_eq!(error.kind(), "database");
    }
}
