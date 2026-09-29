//! The suite-wide AI memory: chat conversations and long-term memories every GENSLATE app can
//! read and write.
//!
//! It lives in the shared data folder (`<shared dir>/ai-memory.sqlite`, see
//! `genslate-paths`' `shared_data_dir`) so an assistant in one app can recall what was learnt
//! in another. Messages and memories are indexed with FTS5 (external-content tables kept in
//! sync by triggers) and searched with [`fts::match_query`](crate::fts::match_query), ranked by
//! `bm25`.

use std::path::Path;

use rusqlite::{OptionalExtension, Row, params};
use rusqlite_migration::{M, Migrations};

use crate::{Database, StorageError, fts, now_ms};

/// File name of the AI memory database inside the shared data folder.
pub const FILE_NAME: &str = "ai-memory.sqlite";

/// Schema, oldest first. Never edit a released migration: append a new one.
const MIGRATIONS: &[M<'static>] = &[M::up(
    "
    CREATE TABLE conversations (
        id INTEGER PRIMARY KEY,
        app TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );
    CREATE INDEX conversations_by_app ON conversations (app, updated_at DESC);

    CREATE TABLE messages (
        id INTEGER PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    CREATE INDEX messages_by_conversation ON messages (conversation_id, id);

    CREATE TABLE memories (
        id INTEGER PRIMARY KEY,
        app TEXT NULL,
        topic TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER NULL
    );
    CREATE INDEX memories_by_app ON memories (app);

    CREATE VIRTUAL TABLE messages_fts USING fts5 (
        content, content = 'messages', content_rowid = 'id'
    );
    CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts (rowid, content) VALUES (new.id, new.content);
    END;
    CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts (messages_fts, rowid, content)
            VALUES ('delete', old.id, old.content);
    END;
    CREATE TRIGGER messages_fts_update AFTER UPDATE OF content ON messages BEGIN
        INSERT INTO messages_fts (messages_fts, rowid, content)
            VALUES ('delete', old.id, old.content);
        INSERT INTO messages_fts (rowid, content) VALUES (new.id, new.content);
    END;

    CREATE VIRTUAL TABLE memories_fts USING fts5 (
        topic, content, tags, content = 'memories', content_rowid = 'id'
    );
    CREATE TRIGGER memories_fts_insert AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts (rowid, topic, content, tags)
            VALUES (new.id, new.topic, new.content, new.tags);
    END;
    CREATE TRIGGER memories_fts_delete AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts (memories_fts, rowid, topic, content, tags)
            VALUES ('delete', old.id, old.topic, old.content, old.tags);
    END;
    CREATE TRIGGER memories_fts_update AFTER UPDATE OF topic, content, tags ON memories BEGIN
        INSERT INTO memories_fts (memories_fts, rowid, topic, content, tags)
            VALUES ('delete', old.id, old.topic, old.content, old.tags);
        INSERT INTO memories_fts (rowid, topic, content, tags)
            VALUES (new.id, new.topic, new.content, new.tags);
    END;
    ",
)];

/// Who wrote a message.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Role {
    System,
    User,
    Assistant,
    Tool,
}

impl Role {
    /// The stored name (`system`, `user`, `assistant`, `tool`).
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::System => "system",
            Self::User => "user",
            Self::Assistant => "assistant",
            Self::Tool => "tool",
        }
    }

    /// Parses a stored name.
    pub fn parse(name: &str) -> Option<Self> {
        match name {
            "system" => Some(Self::System),
            "user" => Some(Self::User),
            "assistant" => Some(Self::Assistant),
            "tool" => Some(Self::Tool),
            _ => None,
        }
    }
}

/// A chat conversation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Conversation {
    pub id: i64,
    /// The app it belongs to (kebab-case app name).
    pub app: String,
    pub title: String,
    /// Ms since the Unix epoch.
    pub created_at: i64,
    /// Ms since the Unix epoch; bumped by every new message.
    pub updated_at: i64,
}

/// One message of a conversation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Message {
    pub id: i64,
    pub conversation_id: i64,
    pub role: Role,
    pub content: String,
    /// Ms since the Unix epoch.
    pub created_at: i64,
}

/// A message found by [`MemoryStore::search_messages`], with its conversation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MessageHit {
    pub message: Message,
    pub app: String,
    pub conversation_title: String,
}

/// A long-term memory.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Memory {
    pub id: i64,
    /// The app it belongs to, or `None` for a memory every app sees.
    pub app: Option<String>,
    pub topic: String,
    pub content: String,
    pub tags: Vec<String>,
    /// Ms since the Unix epoch.
    pub created_at: i64,
    /// Ms since the Unix epoch.
    pub updated_at: i64,
    /// When [`MemoryStore::recall`] last returned it (ms since the Unix epoch).
    pub last_used_at: Option<i64>,
}

/// What [`MemoryStore::remember`] stores.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NewMemory<'a> {
    /// `None` = visible to every app.
    pub app: Option<&'a str>,
    pub topic: &'a str,
    pub content: &'a str,
    /// Free-form labels (commas are not allowed inside a tag; they separate tags).
    pub tags: &'a [&'a str],
}

/// The AI memory database.
#[derive(Debug)]
pub struct MemoryStore {
    db: Database,
}

impl MemoryStore {
    /// Opens (or creates) the memory database at `path`, normally
    /// `<shared data dir>/`[`FILE_NAME`].
    pub fn open(path: &Path) -> Result<Self, StorageError> {
        Ok(Self {
            db: Database::open(path, &migrations())?,
        })
    }

    /// A private in-memory store (for tests).
    pub fn open_in_memory() -> Result<Self, StorageError> {
        Ok(Self {
            db: Database::open_in_memory(&migrations())?,
        })
    }

    /// Starts a conversation for `app`.
    pub fn create_conversation(
        &self,
        app: &str,
        title: &str,
    ) -> Result<Conversation, StorageError> {
        let now = now_ms();
        self.db.conn().execute(
            "INSERT INTO conversations (app, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            params![app, title, now],
        )?;
        Ok(Conversation {
            id: self.db.conn().last_insert_rowid(),
            app: app.to_owned(),
            title: title.to_owned(),
            created_at: now,
            updated_at: now,
        })
    }

    /// Appends a message and bumps the conversation's `updated_at`.
    pub fn add_message(
        &mut self,
        conversation_id: i64,
        role: Role,
        content: &str,
    ) -> Result<Message, StorageError> {
        let now = now_ms();
        let id = self.db.transaction(|tx| -> Result<i64, StorageError> {
            tx.execute(
                "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![conversation_id, role.as_str(), content, now],
            )?;
            let id = tx.last_insert_rowid();
            tx.execute(
                "UPDATE conversations SET updated_at = ?2 WHERE id = ?1",
                params![conversation_id, now],
            )?;
            Ok(id)
        })?;
        Ok(Message {
            id,
            conversation_id,
            role,
            content: content.to_owned(),
            created_at: now,
        })
    }

    /// A conversation with its messages in order, or `None` if it does not exist.
    pub fn conversation(
        &self,
        id: i64,
    ) -> Result<Option<(Conversation, Vec<Message>)>, StorageError> {
        let conn = self.db.conn();
        let Some(conversation) = conn
            .query_row(
                "SELECT id, app, title, created_at, updated_at FROM conversations WHERE id = ?1",
                [id],
                conversation_from_row,
            )
            .optional()?
        else {
            return Ok(None);
        };
        let mut statement = conn.prepare(
            "SELECT id, conversation_id, role, content, created_at FROM messages
             WHERE conversation_id = ?1 ORDER BY id",
        )?;
        let messages = statement
            .query_map([id], message_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Some((conversation, messages)))
    }

    /// Conversations, most recently updated first; `app: None` lists every app's.
    pub fn list_conversations(
        &self,
        app: Option<&str>,
        limit: usize,
    ) -> Result<Vec<Conversation>, StorageError> {
        let mut statement = self.db.conn().prepare(
            "SELECT id, app, title, created_at, updated_at FROM conversations
             WHERE ?1 IS NULL OR app = ?1
             ORDER BY updated_at DESC, id DESC LIMIT ?2",
        )?;
        let rows = statement
            .query_map(params![app, sql_limit(limit)], conversation_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// Deletes a conversation and its messages; `false` if it did not exist.
    pub fn delete_conversation(&self, id: i64) -> Result<bool, StorageError> {
        let deleted = self
            .db
            .conn()
            .execute("DELETE FROM conversations WHERE id = ?1", [id])?;
        Ok(deleted > 0)
    }

    /// Stores a memory.
    pub fn remember(&self, memory: NewMemory<'_>) -> Result<Memory, StorageError> {
        let now = now_ms();
        let tags = normalize_tags(memory.tags);
        self.db.conn().execute(
            "INSERT INTO memories (app, topic, content, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
            params![
                memory.app,
                memory.topic,
                memory.content,
                join_tags(&tags),
                now
            ],
        )?;
        Ok(Memory {
            id: self.db.conn().last_insert_rowid(),
            app: memory.app.map(str::to_owned),
            topic: memory.topic.to_owned(),
            content: memory.content.to_owned(),
            tags,
            created_at: now,
            updated_at: now,
            last_used_at: None,
        })
    }

    /// Replaces a memory's topic, content and tags; `false` if it does not exist.
    pub fn update_memory(&self, id: i64, memory: NewMemory<'_>) -> Result<bool, StorageError> {
        let updated = self.db.conn().execute(
            "UPDATE memories SET app = ?2, topic = ?3, content = ?4, tags = ?5, updated_at = ?6
             WHERE id = ?1",
            params![
                id,
                memory.app,
                memory.topic,
                memory.content,
                join_tags(&normalize_tags(memory.tags)),
                now_ms()
            ],
        )?;
        Ok(updated > 0)
    }

    /// The memories that best match `query` (bm25 over topic, content and tags), best first,
    /// and marks them as used. With `app` set, only that app's memories and the ones shared by
    /// every app (`app IS NULL`) are searched; `None` searches all of them.
    pub fn recall(
        &mut self,
        query: &str,
        app: Option<&str>,
        limit: usize,
    ) -> Result<Vec<Memory>, StorageError> {
        let Some(expression) = fts::match_query(query) else {
            return Ok(Vec::new());
        };
        let now = now_ms();
        self.db
            .transaction(|tx| -> Result<Vec<Memory>, StorageError> {
                let mut memories = {
                    let mut statement = tx.prepare(
                    "SELECT m.id, m.app, m.topic, m.content, m.tags, m.created_at, m.updated_at,
                            m.last_used_at
                     FROM memories_fts JOIN memories AS m ON m.id = memories_fts.rowid
                     WHERE memories_fts MATCH ?1 AND (?2 IS NULL OR m.app IS NULL OR m.app = ?2)
                     ORDER BY bm25(memories_fts), m.updated_at DESC LIMIT ?3",
                )?;
                    statement
                        .query_map(params![expression, app, sql_limit(limit)], memory_from_row)?
                        .collect::<Result<Vec<_>, _>>()?
                };
                let mut touch =
                    tx.prepare("UPDATE memories SET last_used_at = ?2 WHERE id = ?1")?;
                for memory in &mut memories {
                    touch.execute(params![memory.id, now])?;
                    memory.last_used_at = Some(now);
                }
                Ok(memories)
            })
    }

    /// Deletes a memory; `false` if it did not exist.
    pub fn forget(&self, id: i64) -> Result<bool, StorageError> {
        let deleted = self
            .db
            .conn()
            .execute("DELETE FROM memories WHERE id = ?1", [id])?;
        Ok(deleted > 0)
    }

    /// Messages matching `query` (bm25), best first; `app` limits them to that app's
    /// conversations.
    pub fn search_messages(
        &self,
        query: &str,
        app: Option<&str>,
        limit: usize,
    ) -> Result<Vec<MessageHit>, StorageError> {
        let Some(expression) = fts::match_query(query) else {
            return Ok(Vec::new());
        };
        let mut statement = self.db.conn().prepare(
            "SELECT m.id, m.conversation_id, m.role, m.content, m.created_at, c.app, c.title
             FROM messages_fts
             JOIN messages AS m ON m.id = messages_fts.rowid
             JOIN conversations AS c ON c.id = m.conversation_id
             WHERE messages_fts MATCH ?1 AND (?2 IS NULL OR c.app = ?2)
             ORDER BY bm25(messages_fts), m.id DESC LIMIT ?3",
        )?;
        let hits = statement
            .query_map(params![expression, app, sql_limit(limit)], |row| {
                Ok(MessageHit {
                    message: message_from_row(row)?,
                    app: row.get(5)?,
                    conversation_title: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(hits)
    }
}

fn migrations() -> Migrations<'static> {
    Migrations::from_slice(MIGRATIONS)
}

/// `LIMIT` as SQLite wants it (an `i64`).
fn sql_limit(limit: usize) -> i64 {
    i64::try_from(limit).unwrap_or(i64::MAX)
}

fn normalize_tags(tags: &[&str]) -> Vec<String> {
    let mut normalized: Vec<String> = Vec::new();
    for tag in tags.iter().flat_map(|tag| tag.split(',')) {
        let tag = tag.trim();
        if !tag.is_empty() && !normalized.iter().any(|known| known == tag) {
            normalized.push(tag.to_owned());
        }
    }
    normalized
}

fn join_tags(tags: &[String]) -> String {
    tags.join(", ")
}

fn split_tags(stored: &str) -> Vec<String> {
    stored
        .split(',')
        .map(str::trim)
        .filter(|tag| !tag.is_empty())
        .map(str::to_owned)
        .collect()
}

fn conversation_from_row(row: &Row<'_>) -> rusqlite::Result<Conversation> {
    Ok(Conversation {
        id: row.get(0)?,
        app: row.get(1)?,
        title: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn message_from_row(row: &Row<'_>) -> rusqlite::Result<Message> {
    let role: String = row.get(2)?;
    Ok(Message {
        id: row.get(0)?,
        conversation_id: row.get(1)?,
        role: Role::parse(&role).ok_or_else(|| {
            rusqlite::Error::FromSqlConversionFailure(
                2,
                rusqlite::types::Type::Text,
                format!("unknown role `{role}`").into(),
            )
        })?,
        content: row.get(3)?,
        created_at: row.get(4)?,
    })
}

fn memory_from_row(row: &Row<'_>) -> rusqlite::Result<Memory> {
    let tags: String = row.get(4)?;
    Ok(Memory {
        id: row.get(0)?,
        app: row.get(1)?,
        topic: row.get(2)?,
        content: row.get(3)?,
        tags: split_tags(&tags),
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
        last_used_at: row.get(7)?,
    })
}

#[cfg(test)]
mod tests {
    use genslate_testing::TempTree;

    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn memory<'a>(app: Option<&'a str>, topic: &'a str, content: &'a str) -> NewMemory<'a> {
        NewMemory {
            app,
            topic,
            content,
            tags: &[],
        }
    }

    fn fts_rows(store: &MemoryStore, table: &str, query: &str) -> rusqlite::Result<i64> {
        store.db.conn().query_row(
            &format!("SELECT count(*) FROM {table} WHERE {table} MATCH ?1"),
            [query],
            |row| row.get(0),
        )
    }

    #[test]
    fn conversations_keep_messages_in_order() -> TestResult {
        let mut store = MemoryStore::open_in_memory()?;
        let chat = store.create_conversation("terminal", "Fix the build")?;
        store.add_message(chat.id, Role::System, "You help with shells.")?;
        store.add_message(chat.id, Role::User, "cargo fails")?;
        let reply = store.add_message(chat.id, Role::Assistant, "Run cargo clean")?;
        let (loaded, messages) = store.conversation(chat.id)?.ok_or("missing")?;
        assert_eq!(loaded.title, "Fix the build");
        assert!(loaded.updated_at >= chat.updated_at);
        assert_eq!(loaded.updated_at, reply.created_at);
        let roles: Vec<Role> = messages.iter().map(|message| message.role).collect();
        assert_eq!(roles, [Role::System, Role::User, Role::Assistant]);
        assert_eq!(store.conversation(9999)?, None);
        Ok(())
    }

    #[test]
    fn lists_conversations_by_app_newest_first() -> TestResult {
        let mut store = MemoryStore::open_in_memory()?;
        let old = store.create_conversation("terminal", "old")?;
        let other = store.create_conversation("editor", "other")?;
        let new = store.create_conversation("terminal", "new")?;
        let terminal = store.list_conversations(Some("terminal"), 10)?;
        let ids: Vec<i64> = terminal.iter().map(|chat| chat.id).collect();
        assert_eq!(ids, [new.id, old.id]);
        // A new message moves a conversation to the top.
        store.add_message(old.id, Role::User, "bump")?;
        std::thread::sleep(std::time::Duration::from_millis(2));
        store.add_message(old.id, Role::User, "bump again")?;
        assert_eq!(store.list_conversations(Some("terminal"), 1)?[0].id, old.id);
        assert_eq!(store.list_conversations(None, 10)?.len(), 3);
        assert!(
            store
                .list_conversations(None, 10)?
                .iter()
                .any(|chat| chat.id == other.id)
        );
        Ok(())
    }

    #[test]
    fn deleting_a_conversation_cascades_to_messages_and_the_index() -> TestResult {
        let mut store = MemoryStore::open_in_memory()?;
        let chat = store.create_conversation("terminal", "t")?;
        store.add_message(chat.id, Role::User, "kubernetes rollout")?;
        assert_eq!(fts_rows(&store, "messages_fts", "kubernetes")?, 1);
        assert!(store.delete_conversation(chat.id)?);
        assert!(!store.delete_conversation(chat.id)?);
        let left: i64 = store
            .db
            .conn()
            .query_row("SELECT count(*) FROM messages", [], |row| row.get(0))?;
        assert_eq!(left, 0);
        assert_eq!(fts_rows(&store, "messages_fts", "kubernetes")?, 0);
        Ok(())
    }

    #[test]
    fn rejects_messages_for_missing_conversations() -> TestResult {
        let mut store = MemoryStore::open_in_memory()?;
        assert!(store.add_message(42, Role::User, "orphan").is_err());
        Ok(())
    }

    #[test]
    fn searches_messages_by_app() -> TestResult {
        let mut store = MemoryStore::open_in_memory()?;
        let terminal = store.create_conversation("terminal", "shell")?;
        let editor = store.create_conversation("editor", "code")?;
        store.add_message(terminal.id, Role::User, "docker compose up fails")?;
        store.add_message(editor.id, Role::User, "docker file syntax")?;
        assert_eq!(store.search_messages("dock", None, 10)?.len(), 2);
        let hits = store.search_messages("docker", Some("terminal"), 10)?;
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].conversation_title, "shell");
        assert_eq!(hits[0].app, "terminal");
        assert!(store.search_messages("  ", None, 10)?.is_empty());
        Ok(())
    }

    #[test]
    fn recall_ranks_scopes_and_marks_memories_used() -> TestResult {
        let mut store = MemoryStore::open_in_memory()?;
        let shared = store.remember(NewMemory {
            app: None,
            topic: "User",
            content: "Prefers bun over npm",
            tags: &["tooling", " preferences ", "tooling"],
        })?;
        assert_eq!(shared.tags, ["tooling", "preferences"]);
        let terminal = store.remember(memory(
            Some("terminal"),
            "bun scripts",
            "bun run dev starts the app; bun is the package manager",
        ))?;
        store.remember(memory(Some("editor"), "bun", "bun formats files"))?;

        let hits = store.recall("bun", Some("terminal"), 10)?;
        let ids: Vec<i64> = hits.iter().map(|hit| hit.id).collect();
        assert_eq!(
            ids.len(),
            2,
            "terminal's and the shared one, not the editor's"
        );
        assert!(ids.contains(&shared.id) && ids.contains(&terminal.id));
        // bm25: the memory that mentions bun most (topic + content) ranks first.
        assert_eq!(ids[0], terminal.id);
        assert!(hits.iter().all(|hit| hit.last_used_at.is_some()));
        let stored: Option<i64> = store.db.conn().query_row(
            "SELECT last_used_at FROM memories WHERE id = ?1",
            [terminal.id],
            |row| row.get(0),
        )?;
        assert!(stored.is_some());

        assert_eq!(store.recall("bun", None, 10)?.len(), 3);
        assert_eq!(store.recall("tooling", Some("editor"), 10)?.len(), 1);
        assert_eq!(store.recall("bun", Some("terminal"), 1)?.len(), 1);
        assert!(store.recall("", None, 10)?.is_empty());
        Ok(())
    }

    #[test]
    fn index_follows_updates_and_deletes() -> TestResult {
        let mut store = MemoryStore::open_in_memory()?;
        let note = store.remember(memory(None, "editor", "uses vim keys"))?;
        assert_eq!(store.recall("vim", None, 5)?.len(), 1);
        assert!(store.update_memory(note.id, memory(None, "editor", "uses helix keys"))?);
        assert!(store.recall("vim", None, 5)?.is_empty());
        assert_eq!(store.recall("helix", None, 5)?.len(), 1);
        // Marking as used must not duplicate index rows.
        assert_eq!(fts_rows(&store, "memories_fts", "helix")?, 1);
        assert!(store.forget(note.id)?);
        assert!(!store.forget(note.id)?);
        assert!(store.recall("helix", None, 5)?.is_empty());
        assert_eq!(fts_rows(&store, "memories_fts", "helix")?, 0);
        Ok(())
    }

    #[test]
    fn two_connections_share_the_file() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("shared").join(FILE_NAME);
        let first = MemoryStore::open(&path)?;
        let mut second = MemoryStore::open(&path)?;
        first.remember(memory(None, "os", "Windows 11 with WSL"))?;
        let hits = second.recall("wsl", Some("terminal"), 5)?;
        assert_eq!(hits.len(), 1);
        let chat = second.create_conversation("aistudio", "hello")?;
        second.add_message(chat.id, Role::User, "hi")?;
        assert_eq!(first.conversation(chat.id)?.ok_or("missing")?.1.len(), 1);
        Ok(())
    }

    #[test]
    fn roles_round_trip() {
        for role in [Role::System, Role::User, Role::Assistant, Role::Tool] {
            assert_eq!(Role::parse(role.as_str()), Some(role));
        }
        assert_eq!(Role::parse("robot"), None);
    }
}
