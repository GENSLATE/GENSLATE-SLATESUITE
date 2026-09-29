//! [`Database`]: a tuned SQLite connection, migrated on open.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, Transaction, TransactionBehavior};
use rusqlite_migration::Migrations;

use crate::StorageError;

/// How long a statement waits for another connection's write lock before failing with
/// `database-busy`.
pub const BUSY_TIMEOUT: Duration = Duration::from_secs(5);

/// One connection to an app database.
///
/// Opening sets the pragmas every GENSLATE database uses:
/// - `journal_mode=WAL`: readers never block the writer and vice versa, so two windows (or
///   two apps on a shared database) can use the file at the same time;
/// - `synchronous=NORMAL`: durable across app crashes, the safe choice with WAL;
/// - `foreign_keys=ON`: `ON DELETE CASCADE` and references are enforced;
/// - `secure_delete=ON`: deleted rows (cleared history, forgotten memories) are overwritten
///   with zeros instead of lingering in free pages;
/// - `busy_timeout` of [`BUSY_TIMEOUT`];
/// - write transactions start `IMMEDIATE`, so a transaction never fails half-way when it
///   upgrades from a read to a write lock.
///
/// On Unix a new file is readable by its owner only (`0600`, and `0700` for folders it
/// creates): databases hold command lines and conversations.
///
/// `rusqlite::Connection` is `Send` but not `Sync`: share a `Database` behind a `Mutex`.
#[derive(Debug)]
pub struct Database {
    conn: Connection,
    path: Option<PathBuf>,
}

impl Database {
    /// Opens (or creates) the database file at `path`, creating its folder, and migrates it to
    /// the latest schema.
    pub fn open(path: &Path, migrations: &Migrations<'_>) -> Result<Self, StorageError> {
        if let Some(parent) = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
        {
            create_private_dir(parent).map_err(|source| StorageError::Io {
                action: "could not create",
                path: parent.to_path_buf(),
                source,
            })?;
        }
        create_private_file(path).map_err(|source| StorageError::Io {
            action: "could not create",
            path: path.to_path_buf(),
            source,
        })?;
        let open_error = |source| StorageError::Open {
            path: path.to_path_buf(),
            source,
        };
        let mut conn = Connection::open(path).map_err(open_error)?;
        configure(&mut conn).map_err(open_error)?;
        migrate(&mut conn, migrations, path)?;
        Ok(Self {
            conn,
            path: Some(path.to_path_buf()),
        })
    }

    /// Opens a private in-memory database (for tests), migrated to the latest schema.
    pub fn open_in_memory(migrations: &Migrations<'_>) -> Result<Self, StorageError> {
        let memory = Path::new(":memory:");
        let open_error = |source| StorageError::Open {
            path: memory.to_path_buf(),
            source,
        };
        let mut conn = Connection::open_in_memory().map_err(open_error)?;
        configure(&mut conn).map_err(open_error)?;
        migrate(&mut conn, migrations, memory)?;
        Ok(Self { conn, path: None })
    }

    /// The database file, or `None` in memory.
    pub fn path(&self) -> Option<&Path> {
        self.path.as_deref()
    }

    /// The connection, for queries.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    /// The connection, for transactions and other `&mut` APIs.
    pub fn conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    /// Runs `work` in an immediate transaction: committed when it returns `Ok`, rolled back
    /// otherwise.
    pub fn transaction<T, E>(
        &mut self,
        work: impl FnOnce(&Transaction<'_>) -> Result<T, E>,
    ) -> Result<T, E>
    where
        E: From<rusqlite::Error>,
    {
        let tx = self.conn.transaction()?;
        let value = work(&tx)?;
        tx.commit()?;
        Ok(value)
    }
}

/// Creates `dir` and its missing parents; on Unix the new folders are owner-only.
fn create_private_dir(dir: &Path) -> std::io::Result<()> {
    let mut builder = fs::DirBuilder::new();
    builder.recursive(true);
    #[cfg(unix)]
    std::os::unix::fs::DirBuilderExt::mode(&mut builder, 0o700);
    builder.create(dir)
}

/// Creates `path` if it is missing (SQLite accepts an empty file), so it never exists with
/// looser permissions; on Unix it is owner-only. SQLite gives its `-wal` and `-shm` files the
/// same permissions.
fn create_private_file(path: &Path) -> std::io::Result<()> {
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(false);
    #[cfg(unix)]
    std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
    options.open(path).map(drop)
}

/// Applies the connection pragmas (see [`Database`]).
fn configure(conn: &mut Connection) -> rusqlite::Result<()> {
    conn.busy_timeout(BUSY_TIMEOUT)?;
    // `journal_mode` answers with the mode now in use ("memory" for in-memory databases).
    let _mode: String =
        conn.pragma_update_and_check(None, "journal_mode", "WAL", |row| row.get(0))?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", true)?;
    conn.pragma_update(None, "secure_delete", true)?;
    conn.set_transaction_behavior(TransactionBehavior::Immediate);
    Ok(())
}

/// Migrates to the latest schema. When two connections open a new file at the same time, the
/// loser's migration fails (the tables already exist); a second attempt then sees the
/// winner's `user_version` and has nothing left to do.
fn migrate(
    conn: &mut Connection,
    migrations: &Migrations<'_>,
    path: &Path,
) -> Result<(), StorageError> {
    let migrate_error = |source| StorageError::Migrate {
        path: path.to_path_buf(),
        source,
    };
    if migrations.to_latest(conn).is_ok() {
        return Ok(());
    }
    migrations.to_latest(conn).map_err(migrate_error)
}

/// Milliseconds since the Unix epoch (0 if the clock is before 1970).
pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| {
            i64::try_from(elapsed.as_millis()).unwrap_or(i64::MAX)
        })
}

#[cfg(test)]
mod tests {
    use std::sync::mpsc;
    use std::thread;
    use std::time::Instant;

    use genslate_testing::TempTree;
    use rusqlite_migration::M;

    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn migrations() -> Migrations<'static> {
        Migrations::new(vec![
            M::up("CREATE TABLE notes (id INTEGER PRIMARY KEY, text TEXT NOT NULL);"),
            M::up(
                "CREATE TABLE tags (id INTEGER PRIMARY KEY, \
                 note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE, name TEXT);",
            ),
        ])
    }

    fn count(db: &Database, table: &str) -> rusqlite::Result<i64> {
        db.conn()
            .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                row.get(0)
            })
    }

    #[test]
    fn opens_on_disk_with_wal_and_foreign_keys() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("nested/folder/app.sqlite");
        let db = Database::open(&path, &migrations())?;
        assert!(path.is_file());
        assert_eq!(db.path(), Some(path.as_path()));
        let mode: String = db
            .conn()
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))?;
        assert_eq!(mode, "wal");
        let keys: bool = db
            .conn()
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))?;
        assert!(keys);
        let synchronous: i64 = db
            .conn()
            .query_row("PRAGMA synchronous", [], |row| row.get(0))?;
        assert_eq!(synchronous, 1, "NORMAL");
        Ok(())
    }

    #[test]
    fn deleted_rows_are_overwritten() -> TestResult {
        let db = Database::open_in_memory(&migrations())?;
        let secure: i64 = db
            .conn()
            .query_row("PRAGMA secure_delete", [], |row| row.get(0))?;
        assert_eq!(secure, 1);
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn new_files_are_owner_only() -> TestResult {
        use std::os::unix::fs::PermissionsExt;

        let tree = TempTree::new()?;
        let path = tree.join("private/app.sqlite");
        let _db = Database::open(&path, &migrations())?;
        let mode = |path: &Path| -> std::io::Result<u32> {
            Ok(fs::metadata(path)?.permissions().mode() & 0o777)
        };
        assert_eq!(mode(&path)?, 0o600);
        assert_eq!(mode(&tree.join("private"))?, 0o700);
        Ok(())
    }

    #[test]
    fn reopening_keeps_data_and_schema() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("app.sqlite");
        {
            let db = Database::open(&path, &migrations())?;
            db.conn()
                .execute("INSERT INTO notes (text) VALUES ('kept')", [])?;
        }
        let db = Database::open(&path, &migrations())?;
        assert_eq!(count(&db, "notes")?, 1);
        Ok(())
    }

    #[test]
    fn in_memory_is_migrated_and_enforces_foreign_keys() -> TestResult {
        let mut db = Database::open_in_memory(&migrations())?;
        assert_eq!(db.path(), None);
        db.transaction(|tx| -> Result<(), StorageError> {
            tx.execute("INSERT INTO notes (id, text) VALUES (1, 'a')", [])?;
            tx.execute("INSERT INTO tags (note_id, name) VALUES (1, 't')", [])?;
            Ok(())
        })?;
        assert!(
            db.conn()
                .execute("INSERT INTO tags (note_id, name) VALUES (99, 'x')", [])
                .is_err(),
            "dangling reference refused"
        );
        db.conn().execute("DELETE FROM notes WHERE id = 1", [])?;
        assert_eq!(count(&db, "tags")?, 0, "cascade");
        Ok(())
    }

    #[test]
    fn failed_transactions_roll_back() -> TestResult {
        let mut db = Database::open_in_memory(&migrations())?;
        let result = db.transaction(|tx| -> Result<(), StorageError> {
            tx.execute("INSERT INTO notes (text) VALUES ('gone')", [])?;
            tx.execute("INSERT INTO nowhere VALUES (1)", [])?;
            Ok(())
        });
        assert!(result.is_err());
        assert_eq!(count(&db, "notes")?, 0);
        Ok(())
    }

    #[test]
    fn a_second_connection_waits_for_the_writer() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("shared.sqlite");
        let first = Database::open(&path, &migrations())?;
        let second = Database::open(&path, &migrations())?;

        let (started_tx, started_rx) = mpsc::channel();
        let writer = thread::spawn(move || -> Result<(), StorageError> {
            let mut first = first;
            first.transaction(|tx| -> Result<(), StorageError> {
                tx.execute("INSERT INTO notes (text) VALUES ('first')", [])?;
                let _ = started_tx.send(());
                thread::sleep(Duration::from_millis(300));
                Ok(())
            })
        });
        started_rx.recv_timeout(Duration::from_secs(5))?;
        // WAL: reading is not blocked by the open write transaction (and sees the old state).
        assert_eq!(count(&second, "notes")?, 0);
        // Writing waits for the lock (busy timeout) instead of failing.
        let started = Instant::now();
        second
            .conn()
            .execute("INSERT INTO notes (text) VALUES ('second')", [])?;
        assert!(started.elapsed() >= Duration::from_millis(100));
        writer.join().map_err(|_| "writer panicked")??;
        assert_eq!(count(&second, "notes")?, 2);
        Ok(())
    }

    #[test]
    fn concurrent_first_opens_both_succeed() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("race.sqlite");
        let handles: Vec<_> = (0..4)
            .map(|_| {
                let path = path.clone();
                thread::spawn(move || Database::open(&path, &migrations()).map(|_| ()))
            })
            .collect();
        for handle in handles {
            handle.join().map_err(|_| "opener panicked")??;
        }
        Ok(())
    }

    #[test]
    fn open_reports_the_path() -> TestResult {
        let tree = TempTree::new()?.file("blocker", "not a folder")?;
        let error = Database::open(&tree.join("blocker/app.sqlite"), &migrations())
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "io");
        assert!(error.to_string().contains("blocker"), "{error}");
        Ok(())
    }

    #[test]
    fn now_is_after_2020() {
        assert!(now_ms() > 1_577_836_800_000);
    }
}
