//! [`StorageError`]: every failure the storage layer reports.

use std::io;
use std::path::PathBuf;

/// Errors from opening, migrating and querying a database.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum StorageError {
    /// A file system call failed (creating the database folder).
    #[error("{action} {}: {source}", path.display())]
    Io {
        /// What was being done, as a verb phrase ("could not create").
        action: &'static str,
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    /// SQLite could not open or configure the database file.
    #[error("could not open the database {}: {source}", path.display())]
    Open {
        path: PathBuf,
        #[source]
        source: rusqlite::Error,
    },
    /// The schema could not be brought up to date.
    #[error("could not migrate the database {}: {source}", path.display())]
    Migrate {
        path: PathBuf,
        #[source]
        source: rusqlite_migration::Error,
    },
    /// A query failed.
    #[error("database query failed: {0}")]
    Sql(#[from] rusqlite::Error),
}

impl StorageError {
    /// Stable machine-readable kind (sent to UIs next to the message).
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Io { .. } => "io",
            Self::Open { .. } => "database-open",
            Self::Migrate { .. } => "database-migrate",
            Self::Sql(error) => match error.sqlite_error_code() {
                Some(rusqlite::ErrorCode::DatabaseBusy | rusqlite::ErrorCode::DatabaseLocked) => {
                    "database-busy"
                }
                _ => "database",
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kinds_and_messages_name_the_path() {
        let error = StorageError::Io {
            action: "could not create",
            path: PathBuf::from("/x/db"),
            source: io::Error::from(io::ErrorKind::PermissionDenied),
        };
        assert_eq!(error.kind(), "io");
        assert!(error.to_string().contains("/x/db"), "{error}");
        let sql = StorageError::from(rusqlite::Error::QueryReturnedNoRows);
        assert_eq!(sql.kind(), "database");
    }
}
