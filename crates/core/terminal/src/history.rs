//! Command history: every command the shell integration reports, in
//! `<data dir>/history.sqlite` (see `genslate-storage`).
//!
//! Search is fuzzy (fzf syntax, see [`fuzzy`](crate::fuzzy)) over the newest
//! [`SEARCH_WINDOW`] commands, one row per distinct command line (its newest run), ties
//! broken by recency. Commands typed with a leading space are not stored (like bash's
//! `HISTCONTROL=ignorespace`), so secrets can be kept out. The output tail of each command is
//! indexed with FTS5 for later AI features.

use std::collections::HashSet;
use std::path::Path;
use std::sync::{Mutex, MutexGuard, PoisonError};

use genslate_storage::rusqlite::{self, Row, params};
use genslate_storage::{Database, M, Migrations, StorageError, fts};
use serde::Serialize;

/// File name of the history database inside the app's data folder.
pub const FILE_NAME: &str = "history.sqlite";
/// How many of the newest commands a search looks through.
pub const SEARCH_WINDOW: usize = 5_000;
/// The most rows kept; older ones are pruned.
pub const MAX_ROWS: i64 = 50_000;
/// The longest command line stored (bytes); longer ones are cut.
const MAX_COMMAND: usize = 32 * 1024;

const MIGRATIONS: &[M<'static>] = &[M::up(
    "
    CREATE TABLE commands (
        id INTEGER PRIMARY KEY,
        command TEXT NOT NULL,
        cwd TEXT NULL,
        shell TEXT NOT NULL,
        exit_code INTEGER NULL,
        started_at INTEGER NOT NULL,
        duration_ms INTEGER NULL,
        output_tail TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX commands_by_time ON commands (started_at DESC);
    CREATE INDEX commands_by_cwd ON commands (cwd, started_at DESC);

    CREATE VIRTUAL TABLE commands_fts USING fts5 (
        command, output_tail, content = 'commands', content_rowid = 'id'
    );
    CREATE TRIGGER commands_fts_insert AFTER INSERT ON commands BEGIN
        INSERT INTO commands_fts (rowid, command, output_tail)
            VALUES (new.id, new.command, new.output_tail);
    END;
    CREATE TRIGGER commands_fts_delete AFTER DELETE ON commands BEGIN
        INSERT INTO commands_fts (commands_fts, rowid, command, output_tail)
            VALUES ('delete', old.id, old.command, old.output_tail);
    END;
    ",
)];

/// A stored command (the `HistoryEntry` the UI receives).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: i64,
    pub command: String,
    pub cwd: Option<String>,
    /// The profile name of the shell it ran in.
    pub shell: String,
    pub exit_code: Option<i32>,
    /// Ms since the Unix epoch.
    pub started_at: i64,
    pub duration_ms: Option<i64>,
}

/// What [`HistoryStore::record`] stores.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NewCommand<'a> {
    pub command: &'a str,
    pub cwd: Option<&'a str>,
    pub shell: &'a str,
    pub exit_code: Option<i32>,
    pub started_at: i64,
    pub duration_ms: Option<i64>,
    pub output_tail: &'a str,
}

/// The history database. Thread-safe (one connection behind a mutex).
#[derive(Debug)]
pub struct HistoryStore {
    db: Mutex<Database>,
}

impl HistoryStore {
    /// Opens (or creates) the history at `path`, normally `<data dir>/`[`FILE_NAME`].
    pub fn open(path: &Path) -> Result<Self, StorageError> {
        Ok(Self {
            db: Mutex::new(Database::open(path, &migrations())?),
        })
    }

    /// A private in-memory history (for tests).
    pub fn open_in_memory() -> Result<Self, StorageError> {
        Ok(Self {
            db: Mutex::new(Database::open_in_memory(&migrations())?),
        })
    }

    fn db(&self) -> MutexGuard<'_, Database> {
        self.db.lock().unwrap_or_else(PoisonError::into_inner)
    }

    /// Stores a finished command. Returns `None` (nothing stored) for empty commands and
    /// commands typed with a leading space.
    pub fn record(&self, new: NewCommand<'_>) -> Result<Option<HistoryEntry>, StorageError> {
        if new.command.starts_with(char::is_whitespace) || new.command.trim().is_empty() {
            return Ok(None);
        }
        let command = truncate(new.command.trim_end(), MAX_COMMAND);
        let db = self.db();
        db.conn().execute(
            "INSERT INTO commands (command, cwd, shell, exit_code, started_at, duration_ms, output_tail)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                command,
                new.cwd,
                new.shell,
                new.exit_code,
                new.started_at,
                new.duration_ms,
                new.output_tail
            ],
        )?;
        let id = db.conn().last_insert_rowid();
        if id % 256 == 0 {
            db.conn()
                .execute("DELETE FROM commands WHERE id <= ?1", [id - MAX_ROWS])?;
        }
        Ok(Some(HistoryEntry {
            id,
            command: command.to_owned(),
            cwd: new.cwd.map(str::to_owned),
            shell: new.shell.to_owned(),
            exit_code: new.exit_code,
            started_at: new.started_at,
            duration_ms: new.duration_ms,
        }))
    }

    /// Commands matching `query` (fuzzy; empty = all, newest first), one per distinct command
    /// line. `cwd` keeps only commands run in that folder; `failed_only` only those that
    /// exited with a non-zero code.
    pub fn search(
        &self,
        query: &str,
        cwd: Option<&str>,
        failed_only: bool,
        limit: usize,
    ) -> Result<Vec<HistoryEntry>, StorageError> {
        let newest = {
            let db = self.db();
            let mut statement = db.conn().prepare(
                "SELECT id, command, cwd, shell, exit_code, started_at, duration_ms FROM commands
                 WHERE (?1 IS NULL OR cwd = ?1)
                   AND (?2 = 0 OR (exit_code IS NOT NULL AND exit_code != 0))
                 ORDER BY started_at DESC, id DESC LIMIT ?3",
            )?;
            statement
                .query_map(
                    params![
                        cwd,
                        failed_only,
                        i64::try_from(SEARCH_WINDOW).unwrap_or(i64::MAX)
                    ],
                    entry_from_row,
                )?
                .collect::<Result<Vec<_>, _>>()?
        };
        let mut seen = HashSet::new();
        let distinct: Vec<HistoryEntry> = newest
            .into_iter()
            .filter(|entry| seen.insert(entry.command.clone()))
            .collect();
        Ok(crate::fuzzy::rank(query, &distinct, |entry| &entry.command)
            .into_iter()
            .take(limit)
            .map(|(_, entry)| entry.clone())
            .collect())
    }

    /// Commands whose line or output contains the words of `query` (FTS5, best first).
    pub fn search_output(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<HistoryEntry>, StorageError> {
        let Some(expression) = fts::match_query(query) else {
            return Ok(Vec::new());
        };
        let db = self.db();
        let mut statement = db.conn().prepare(
            "SELECT c.id, c.command, c.cwd, c.shell, c.exit_code, c.started_at, c.duration_ms
             FROM commands_fts JOIN commands AS c ON c.id = commands_fts.rowid
             WHERE commands_fts MATCH ?1
             ORDER BY bm25(commands_fts), c.started_at DESC LIMIT ?2",
        )?;
        let entries = statement
            .query_map(
                params![expression, i64::try_from(limit).unwrap_or(i64::MAX)],
                entry_from_row,
            )?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    /// The output tail stored with a command.
    pub fn output_tail(&self, id: i64) -> Result<Option<String>, StorageError> {
        let db = self.db();
        let mut statement = db
            .conn()
            .prepare("SELECT output_tail FROM commands WHERE id = ?1")?;
        let mut rows = statement.query_map([id], |row| row.get(0))?;
        Ok(rows.next().transpose()?)
    }

    /// Deletes one command; `false` if it did not exist.
    pub fn delete(&self, id: i64) -> Result<bool, StorageError> {
        Ok(self
            .db()
            .conn()
            .execute("DELETE FROM commands WHERE id = ?1", [id])?
            > 0)
    }

    /// Deletes every command.
    pub fn clear(&self) -> Result<(), StorageError> {
        let db = self.db();
        db.conn().execute_batch(
            "DELETE FROM commands; INSERT INTO commands_fts (commands_fts) VALUES ('rebuild');",
        )?;
        Ok(())
    }
}

fn migrations() -> Migrations<'static> {
    Migrations::from_slice(MIGRATIONS)
}

fn entry_from_row(row: &Row<'_>) -> rusqlite::Result<HistoryEntry> {
    Ok(HistoryEntry {
        id: row.get(0)?,
        command: row.get(1)?,
        cwd: row.get(2)?,
        shell: row.get(3)?,
        exit_code: row.get(4)?,
        started_at: row.get(5)?,
        duration_ms: row.get(6)?,
    })
}

/// `text` cut to at most `max` bytes at a character boundary.
fn truncate(text: &str, max: usize) -> &str {
    if text.len() <= max {
        return text;
    }
    let mut end = max;
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    &text[..end]
}

#[cfg(test)]
mod tests {
    use genslate_testing::TempTree;

    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn run<'a>(command: &'a str, cwd: &'a str, exit_code: i32, started_at: i64) -> NewCommand<'a> {
        NewCommand {
            command,
            cwd: Some(cwd),
            shell: "bash",
            exit_code: Some(exit_code),
            started_at,
            duration_ms: Some(5),
            output_tail: "",
        }
    }

    fn commands(entries: &[HistoryEntry]) -> Vec<&str> {
        entries.iter().map(|entry| entry.command.as_str()).collect()
    }

    fn sample() -> Result<HistoryStore, StorageError> {
        let store = HistoryStore::open_in_memory()?;
        store.record(run("git status", "/repo", 0, 1))?;
        store.record(run("cargo build", "/repo", 101, 2))?;
        store.record(run("git stash", "/other", 0, 3))?;
        store.record(run("ls", "/repo", 0, 4))?;
        store.record(run("git status", "/other", 0, 5))?;
        Ok(store)
    }

    #[test]
    fn records_and_returns_the_entry() -> TestResult {
        let store = HistoryStore::open_in_memory()?;
        let entry = store
            .record(NewCommand {
                output_tail: "Compiling…",
                ..run("cargo test  ", "/repo", 0, 42)
            })?
            .ok_or("not stored")?;
        assert_eq!(entry.command, "cargo test");
        assert_eq!(entry.started_at, 42);
        assert_eq!(entry.exit_code, Some(0));
        assert_eq!(store.output_tail(entry.id)?.as_deref(), Some("Compiling…"));
        assert_eq!(store.output_tail(999)?, None);
        let json = serde_json::to_value(&entry)?;
        assert_eq!(json["exitCode"], 0);
        assert_eq!(json["durationMs"], 5);
        assert!(json.get("outputTail").is_none());
        Ok(())
    }

    #[test]
    fn skips_empty_and_space_prefixed_commands() -> TestResult {
        let store = HistoryStore::open_in_memory()?;
        assert_eq!(store.record(run("   ", "/", 0, 1))?, None);
        assert_eq!(store.record(run(" export TOKEN=secret", "/", 0, 1))?, None);
        assert!(store.search("", None, false, 10)?.is_empty());
        Ok(())
    }

    #[test]
    fn empty_query_lists_distinct_commands_newest_first() -> TestResult {
        let store = sample()?;
        assert_eq!(
            commands(&store.search("", None, false, 10)?),
            ["git status", "ls", "git stash", "cargo build"]
        );
        let newest = &store.search("", None, false, 1)?[0];
        assert_eq!(
            newest.cwd.as_deref(),
            Some("/other"),
            "the newest run is kept"
        );
        Ok(())
    }

    #[test]
    fn fuzzy_search_ranks_then_breaks_ties_by_recency() -> TestResult {
        let store = sample()?;
        let found = store.search("gst", None, false, 10)?;
        assert!(
            commands(&found)
                .iter()
                .all(|command| command.starts_with("git st"))
        );
        assert_eq!(found.len(), 2);
        let exact = store.search("git status", None, false, 10)?;
        assert_eq!(exact[0].command, "git status");
        Ok(())
    }

    #[test]
    fn filters_by_folder_and_failure() -> TestResult {
        let store = sample()?;
        assert_eq!(
            commands(&store.search("", Some("/repo"), false, 10)?),
            ["ls", "cargo build", "git status"]
        );
        assert_eq!(
            commands(&store.search("", None, true, 10)?),
            ["cargo build"]
        );
        assert_eq!(store.search("", Some("/repo"), true, 10)?.len(), 1);
        assert!(store.search("zzz", None, false, 10)?.is_empty());
        Ok(())
    }

    #[test]
    fn deletes_and_clears() -> TestResult {
        let store = sample()?;
        let first = store.search("ls", None, false, 1)?;
        assert!(store.delete(first[0].id)?);
        assert!(!store.delete(first[0].id)?);
        assert!(!commands(&store.search("", None, false, 10)?).contains(&"ls"));
        store.clear()?;
        assert!(store.search("", None, false, 10)?.is_empty());
        assert!(store.search_output("git", 10)?.is_empty());
        Ok(())
    }

    #[test]
    fn output_is_full_text_searchable() -> TestResult {
        let store = HistoryStore::open_in_memory()?;
        let failing = store
            .record(NewCommand {
                output_tail: "error[E0308]: mismatched types\n  --> src/main.rs",
                ..run("cargo build", "/repo", 101, 1)
            })?
            .ok_or("not stored")?;
        store.record(NewCommand {
            output_tail: "all good",
            ..run("cargo test", "/repo", 0, 2)
        })?;
        let hits = store.search_output("mismatched typ", 10)?;
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, failing.id);
        assert_eq!(store.search_output("cargo", 10)?.len(), 2);
        store.delete(failing.id)?;
        assert!(store.search_output("mismatched", 10)?.is_empty());
        Ok(())
    }

    #[test]
    fn long_commands_are_cut_at_a_character_boundary() {
        let text = "é".repeat(10);
        assert_eq!(truncate(&text, 5), "éé");
        assert_eq!(truncate("abc", 10), "abc");
    }

    #[test]
    fn persists_on_disk() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("data").join(FILE_NAME);
        HistoryStore::open(&path)?.record(run("echo kept", "/", 0, 1))?;
        let reopened = HistoryStore::open(&path)?;
        assert_eq!(
            commands(&reopened.search("", None, false, 5)?),
            ["echo kept"]
        );
        Ok(())
    }
}
