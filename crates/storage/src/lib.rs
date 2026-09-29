//! Shared SQLite storage for every GENSLATE app.
//!
//! Every app keeps its own databases in its data folder (`AppPaths::data_dir` from
//! `genslate-paths`, i.e. `other/databases/genslate/<app>/`), for example the terminal's
//! `history.sqlite`. Suite-wide databases that several apps read and write, like the AI memory
//! ([`ai_memory`]), live in the shared folder (`AppPaths::shared_data_dir`,
//! `other/databases/genslate/shared/`). Both folders move with the portable install, so the
//! databases never land in OS user folders.
//!
//! - [`Database`]: a tuned connection (WAL, `synchronous=NORMAL`, foreign keys, a 5 s busy
//!   timeout, immediate write transactions) migrated to the latest schema on open.
//! - [`fts`]: turns free user text into a safe FTS5 `MATCH` expression.
//! - [`ai_memory`]: conversations, messages and long-term memories shared by the suite.
//!
//! The bundled SQLite is compiled with FTS5. `rusqlite` and the migration types are
//! re-exported so app crates don't need their own dependency on them.
#![forbid(unsafe_code)]

pub mod ai_memory;
mod database;
mod error;
pub mod fts;

pub use database::{BUSY_TIMEOUT, Database, now_ms};
pub use error::StorageError;
pub use rusqlite;
pub use rusqlite_migration::{M, Migrations};
