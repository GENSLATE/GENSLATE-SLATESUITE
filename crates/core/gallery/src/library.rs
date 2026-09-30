//! The library database (`<data dir>/library.sqlite`, see `genslate-storage`): library
//! folders, every photo and video in them with its metadata, favorites and ratings, albums,
//! tags, the Trash list and a full-text index for search.
//!
//! Files are never touched here: removing a folder or forgetting an item only removes rows.

use std::collections::BTreeMap;
use std::path::{MAIN_SEPARATOR, Path};
use std::sync::{Mutex, MutexGuard, PoisonError};

use chrono::{DateTime, Local};
use genslate_storage::rusqlite::types::Value;
use genslate_storage::rusqlite::{
    self, Connection, OptionalExtension, Row, params, params_from_iter,
};
use genslate_storage::{Database, M, Migrations, fts, now_ms};
use serde::{Deserialize, Serialize};

use crate::GalleryError;
use crate::kind::{Format, MediaKind};
use crate::metadata::Metadata;
use crate::places::Place;

/// File name of the library database inside the app's data folder.
pub const FILE_NAME: &str = "library.sqlite";
/// "Recently added" covers this many days.
pub const RECENT_DAYS: i64 = 30;
const DAY_MS: i64 = 24 * 60 * 60 * 1000;
/// The longest album or tag name.
const MAX_NAME: usize = 120;

const MIGRATIONS: &[M<'static>] = &[M::up(
    "
    CREATE TABLE roots (
        path TEXT PRIMARY KEY,
        added_at INTEGER NOT NULL
    );

    CREATE TABLE media (
        id INTEGER PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        folder TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        size INTEGER NOT NULL,
        modified_at INTEGER NOT NULL,
        added_at INTEGER NOT NULL,
        taken_at INTEGER NULL,
        date INTEGER GENERATED ALWAYS AS (COALESCE(taken_at, modified_at)) VIRTUAL,
        width INTEGER NULL,
        height INTEGER NULL,
        orientation INTEGER NOT NULL DEFAULT 1,
        duration_ms INTEGER NULL,
        camera TEXT NULL,
        lens TEXT NULL,
        f_number REAL NULL,
        exposure TEXT NULL,
        iso INTEGER NULL,
        focal_mm REAL NULL,
        flash INTEGER NULL,
        latitude REAL NULL,
        longitude REAL NULL,
        city TEXT NULL,
        region TEXT NULL,
        country TEXT NULL,
        screenshot INTEGER NOT NULL DEFAULT 0,
        favorite INTEGER NOT NULL DEFAULT 0,
        rating INTEGER NOT NULL DEFAULT 0,
        edited_at INTEGER NULL,
        trashed_at INTEGER NULL,
        content_hash TEXT NULL,
        phash TEXT NULL
    );
    CREATE INDEX media_by_date ON media (date DESC);
    CREATE INDEX media_by_folder ON media (folder);
    CREATE INDEX media_by_place ON media (country, city);
    CREATE INDEX media_by_size ON media (size);

    CREATE TABLE albums (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    CREATE TABLE album_items (
        album_id INTEGER NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
        media_id INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (album_id, media_id)
    );
    CREATE INDEX album_items_by_media ON album_items (media_id);

    CREATE TABLE tags (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );
    CREATE TABLE media_tags (
        media_id INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
        PRIMARY KEY (media_id, tag_id)
    );
    CREATE INDEX media_tags_by_tag ON media_tags (tag_id);

    CREATE VIRTUAL TABLE media_fts USING fts5 (text, tokenize = 'unicode61 remove_diacritics 2');
    CREATE TRIGGER media_fts_delete AFTER DELETE ON media BEGIN
        DELETE FROM media_fts WHERE rowid = old.id;
    END;
    ",
)];

/// The columns [`MediaItem`] reads, in order.
const ITEM_COLUMNS: &str = "m.id, m.path, m.name, m.kind, m.width, m.height, m.date, m.taken_at, \
     m.size, m.favorite, m.rating, m.duration_ms, m.trashed_at";

/// How the viewer shows a file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Preview {
    /// The webview shows the file itself.
    Original,
    /// Gallery renders a large stand-in (TIFF, JPEG XL).
    Render,
    /// Only the metadata can be shown (HEIC, RAW for now).
    None,
}

/// One photo or video in a list (what the grid and timeline need).
#[expect(
    clippy::struct_excessive_bools,
    reason = "a flat IPC payload: each flag is an independent property"
)]
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub kind: MediaKind,
    pub width: Option<u32>,
    pub height: Option<u32>,
    /// Date taken, else the file's modification time (ms since the epoch).
    pub date: i64,
    /// `false` when [`date`](Self::date) is only the file's modification time.
    pub dated: bool,
    pub size: u64,
    pub favorite: bool,
    pub rating: u8,
    pub duration_ms: Option<u64>,
    /// Gallery can make a thumbnail (every decodable image, and videos through the webview).
    pub thumbnail: bool,
    pub preview: Preview,
    pub trashed: bool,
}

/// An album as the side panel and menus show it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Album {
    pub id: i64,
    pub name: String,
    pub count: u64,
    /// The newest item, shown as the album's cover.
    pub cover: Option<i64>,
    pub created_at: i64,
}

/// A reference to an album (in a photo's details).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlbumRef {
    pub id: i64,
    pub name: String,
}

/// Everything the info panel shows about one photo or video.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDetails {
    #[serde(flatten)]
    pub item: MediaItem,
    pub folder: String,
    pub modified_at: i64,
    pub added_at: i64,
    pub taken_at: Option<i64>,
    pub orientation: u8,
    pub camera: Option<String>,
    pub lens: Option<String>,
    pub f_number: Option<f64>,
    pub exposure: Option<String>,
    pub iso: Option<u32>,
    pub focal_mm: Option<f64>,
    pub flash: Option<bool>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub place: Option<Place>,
    pub screenshot: bool,
    pub edited_at: Option<i64>,
    pub tags: Vec<String>,
    pub albums: Vec<AlbumRef>,
}

/// Which items a view lists.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum Collection {
    All,
    Favorites,
    Videos,
    Screenshots,
    Recent,
    Edited,
    Trash,
    Album {
        id: i64,
    },
    /// Everything in this folder and its subfolders.
    Folder {
        path: String,
    },
    Tag {
        name: String,
    },
    /// A country, or one city in it.
    Place {
        country: String,
        city: Option<String>,
    },
}

/// What lists sort by.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SortKey {
    /// Date taken (else modified).
    #[default]
    Taken,
    Added,
    Name,
    Size,
}

/// A list request from the UI.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Query {
    pub collection: Collection,
    /// Free text: file and folder names, camera, lens, place, tags, albums, month and year.
    /// `tag:name` words filter by tag.
    pub search: String,
    pub sort: SortKey,
    pub descending: bool,
    pub kind: Option<MediaKind>,
    pub favorites_only: bool,
    pub min_rating: u8,
    /// Inclusive date range (ms).
    pub from: Option<i64>,
    pub to: Option<i64>,
    /// Include videos outside the Videos collection.
    pub include_videos: bool,
}

impl Default for Query {
    fn default() -> Self {
        Self {
            collection: Collection::All,
            search: String::new(),
            sort: SortKey::Taken,
            descending: true,
            kind: None,
            favorites_only: false,
            min_rating: 0,
            from: None,
            to: None,
            include_videos: true,
        }
    }
}

/// A folder in the side panel's tree, with how many items it holds (subfolders included).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderNode {
    pub path: String,
    pub name: String,
    pub count: u64,
    pub children: Vec<FolderNode>,
}

/// A tag with how many items carry it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagCount {
    pub name: String,
    pub count: u64,
}

/// A city with how many items were taken there.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaceCount {
    pub city: String,
    pub region: String,
    pub country: String,
    pub count: u64,
    pub cover: Option<i64>,
}

/// Counts for the smart collections.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub all: u64,
    pub photos: u64,
    pub videos: u64,
    pub favorites: u64,
    pub screenshots: u64,
    pub recent: u64,
    pub edited: u64,
    pub trash: u64,
    /// Total bytes of everything outside the Trash.
    pub bytes: u64,
}

/// Everything the side panel lists.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub counts: Counts,
    pub roots: Vec<String>,
    pub folders: Vec<FolderNode>,
    pub albums: Vec<Album>,
    pub tags: Vec<TagCount>,
    pub places: Vec<PlaceCount>,
}

/// What the scanner stores for one file.
#[derive(Debug, Clone, PartialEq)]
pub struct NewMedia<'a> {
    pub path: &'a str,
    pub format: Format,
    pub size: u64,
    pub modified_ms: i64,
    pub metadata: &'a Metadata,
    pub place: Option<&'a Place>,
    pub screenshot: bool,
}

/// What the library knows about a file (to skip unchanged ones when scanning).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KnownFile {
    pub id: i64,
    pub size: u64,
    pub modified_ms: i64,
    pub trashed: bool,
}

/// A file to hash for the duplicate finder.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HashCandidate {
    pub id: i64,
    pub path: String,
    pub size: u64,
    pub modified_ms: i64,
    pub kind: MediaKind,
    pub content_hash: Option<String>,
    pub phash: Option<String>,
}

/// The library database. Thread-safe (one connection behind a mutex).
#[derive(Debug)]
pub struct Library {
    db: Mutex<Database>,
}

impl Library {
    /// Opens (or creates) the library at `path`, normally `<data dir>/`[`FILE_NAME`].
    pub fn open(path: &Path) -> Result<Self, GalleryError> {
        Ok(Self {
            db: Mutex::new(Database::open(path, &migrations())?),
        })
    }

    /// A private in-memory library (for tests and the browser mock's data).
    pub fn open_in_memory() -> Result<Self, GalleryError> {
        Ok(Self {
            db: Mutex::new(Database::open_in_memory(&migrations())?),
        })
    }

    fn db(&self) -> MutexGuard<'_, Database> {
        self.db.lock().unwrap_or_else(PoisonError::into_inner)
    }

    // ── Library folders ──────────────────────────────────────────────────────────────────

    /// The library folders, in the order they were added.
    pub fn roots(&self) -> Result<Vec<String>, GalleryError> {
        let db = self.db();
        let mut statement = db
            .conn()
            .prepare("SELECT path FROM roots ORDER BY added_at, path")?;
        let rows = statement.query_map([], |row| row.get(0))?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// Adds a library folder. Returns `false` when it (or a folder containing it) is already
    /// in the library; folders inside it are replaced by it.
    pub fn add_root(&self, path: &str) -> Result<bool, GalleryError> {
        let roots = self.roots()?;
        if roots
            .iter()
            .any(|root| root == path || is_inside(path, root))
        {
            return Ok(false);
        }
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            for inner in roots.iter().filter(|root| is_inside(root, path)) {
                tx.execute("DELETE FROM roots WHERE path = ?1", [inner])?;
            }
            tx.execute(
                "INSERT INTO roots (path, added_at) VALUES (?1, ?2)",
                params![path, now_ms()],
            )?;
            Ok(())
        })?;
        Ok(true)
    }

    /// Removes a library folder and forgets everything in it (the files stay on disk).
    pub fn remove_root(&self, path: &str) -> Result<u64, GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<u64, GalleryError> {
            tx.execute("DELETE FROM roots WHERE path = ?1", [path])?;
            let (low, high) = prefix_range(path);
            let removed = tx.execute(
                "DELETE FROM media WHERE path >= ?1 AND path < ?2",
                params![low, high],
            )?;
            Ok(removed as u64)
        })
    }

    /// The library folder `path` is in, if any.
    pub fn root_of(&self, path: &str) -> Result<Option<String>, GalleryError> {
        Ok(self
            .roots()?
            .into_iter()
            .find(|root| root == path || is_inside(path, root)))
    }

    // ── Scanning ─────────────────────────────────────────────────────────────────────────

    /// Every file the library knows inside `folder` (at any depth).
    pub fn known_files(&self, folder: &str) -> Result<BTreeMap<String, KnownFile>, GalleryError> {
        let db = self.db();
        let (low, high) = prefix_range(folder);
        let mut statement = db.conn().prepare(
            "SELECT path, id, size, modified_at, trashed_at IS NOT NULL
             FROM media WHERE path >= ?1 AND path < ?2",
        )?;
        let rows = statement.query_map(params![low, high], |row| {
            Ok((
                row.get::<_, String>(0)?,
                KnownFile {
                    id: row.get(1)?,
                    size: to_u64(row.get(2)?),
                    modified_ms: row.get(3)?,
                    trashed: row.get(4)?,
                },
            ))
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// Stores or updates files found by a scan (one transaction). Favorites, ratings, tags
    /// and albums of known files are kept.
    pub fn upsert_many(&self, items: &[NewMedia<'_>]) -> Result<Vec<i64>, GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<Vec<i64>, GalleryError> {
            let mut ids = Vec::with_capacity(items.len());
            for item in items {
                let id = upsert(tx, item)?;
                refresh_search(tx, id)?;
                ids.push(id);
            }
            Ok(ids)
        })
    }

    /// Stores or updates one file.
    pub fn upsert(&self, item: &NewMedia<'_>) -> Result<i64, GalleryError> {
        self.upsert_many(std::slice::from_ref(item))?
            .first()
            .copied()
            .ok_or_else(|| GalleryError::InvalidArgument("nothing was stored".to_owned()))
    }

    /// Forgets files that are gone from disk (Trash entries are kept).
    pub fn remove_missing(&self, paths: &[String]) -> Result<u64, GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<u64, GalleryError> {
            let mut removed = 0;
            for path in paths {
                removed += tx.execute(
                    "DELETE FROM media WHERE path = ?1 AND trashed_at IS NULL",
                    [path],
                )? as u64;
            }
            Ok(removed)
        })
    }

    // ── Reading ──────────────────────────────────────────────────────────────────────────

    /// The items a view lists.
    pub fn query(&self, query: &Query) -> Result<Vec<MediaItem>, GalleryError> {
        let db = self.db();
        let (sql, values) = build_query(query);
        let mut statement = db.conn().prepare(&sql)?;
        let rows = statement.query_map(params_from_iter(values), item_from_row)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// One item's full details.
    pub fn details(&self, id: i64) -> Result<MediaDetails, GalleryError> {
        let db = self.db();
        details(db.conn(), id)
    }

    /// One item's list entry.
    pub fn item(&self, id: i64) -> Result<MediaItem, GalleryError> {
        let db = self.db();
        db.conn()
            .query_row(
                &format!("SELECT {ITEM_COLUMNS} FROM media m WHERE m.id = ?1"),
                [id],
                item_from_row,
            )
            .optional()?
            .ok_or(GalleryError::UnknownMedia(id))
    }

    /// The path, size and modification time of an item (for serving and thumbnails).
    pub fn file_of(&self, id: i64) -> Result<(String, u64, i64), GalleryError> {
        let db = self.db();
        db.conn()
            .query_row(
                "SELECT path, size, modified_at FROM media WHERE id = ?1",
                [id],
                |row| Ok((row.get(0)?, to_u64(row.get(1)?), row.get(2)?)),
            )
            .optional()?
            .ok_or(GalleryError::UnknownMedia(id))
    }

    /// The paths of `ids` (unknown ids are skipped).
    pub fn paths_of(&self, ids: &[i64]) -> Result<Vec<(i64, String)>, GalleryError> {
        let db = self.db();
        let mut statement = db.conn().prepare("SELECT path FROM media WHERE id = ?1")?;
        let mut out = Vec::with_capacity(ids.len());
        for id in ids {
            if let Some(path) = statement
                .query_row([id], |row| row.get::<_, String>(0))
                .optional()?
            {
                out.push((*id, path));
            }
        }
        Ok(out)
    }

    /// The id of the item at `path`, if it is in the library.
    pub fn id_of(&self, path: &str) -> Result<Option<i64>, GalleryError> {
        let db = self.db();
        Ok(db
            .conn()
            .query_row("SELECT id FROM media WHERE path = ?1", [path], |row| {
                row.get(0)
            })
            .optional()?)
    }

    /// Counts, folders, albums, tags and places for the side panel.
    pub fn summary(&self) -> Result<Summary, GalleryError> {
        let roots = self.roots()?;
        let db = self.db();
        let conn = db.conn();
        let recent_since = now_ms() - RECENT_DAYS * DAY_MS;
        let counts = conn.query_row(
            "SELECT
                count(*) FILTER (WHERE trashed_at IS NULL),
                count(*) FILTER (WHERE trashed_at IS NULL AND kind = 'image'),
                count(*) FILTER (WHERE trashed_at IS NULL AND kind = 'video'),
                count(*) FILTER (WHERE trashed_at IS NULL AND favorite = 1),
                count(*) FILTER (WHERE trashed_at IS NULL AND screenshot = 1),
                count(*) FILTER (WHERE trashed_at IS NULL AND added_at >= ?1),
                count(*) FILTER (WHERE trashed_at IS NULL AND edited_at IS NOT NULL),
                count(*) FILTER (WHERE trashed_at IS NOT NULL),
                COALESCE(sum(size) FILTER (WHERE trashed_at IS NULL), 0)
             FROM media",
            [recent_since],
            |row| {
                Ok(Counts {
                    all: to_u64(row.get(0)?),
                    photos: to_u64(row.get(1)?),
                    videos: to_u64(row.get(2)?),
                    favorites: to_u64(row.get(3)?),
                    screenshots: to_u64(row.get(4)?),
                    recent: to_u64(row.get(5)?),
                    edited: to_u64(row.get(6)?),
                    trash: to_u64(row.get(7)?),
                    bytes: to_u64(row.get(8)?),
                })
            },
        )?;

        let mut statement = conn.prepare(
            "SELECT folder, count(*) FROM media WHERE trashed_at IS NULL GROUP BY folder",
        )?;
        let folder_counts: Vec<(String, u64)> = statement
            .query_map([], |row| Ok((row.get(0)?, to_u64(row.get(1)?))))?
            .collect::<Result<_, _>>()?;
        let folders = roots
            .iter()
            .map(|root| folder_tree(root, &folder_counts))
            .collect();

        Ok(Summary {
            counts,
            folders,
            roots,
            albums: albums(conn)?,
            tags: tags(conn)?,
            places: places(conn)?,
        })
    }

    /// Every album, newest first.
    pub fn albums(&self) -> Result<Vec<Album>, GalleryError> {
        albums(self.db().conn())
    }

    // ── Favorites, ratings, tags ─────────────────────────────────────────────────────────

    pub fn set_favorite(&self, ids: &[i64], favorite: bool) -> Result<(), GalleryError> {
        self.update_each(
            ids,
            "UPDATE media SET favorite = ?2 WHERE id = ?1",
            favorite,
        )
    }

    /// Sets the star rating (0 clears it, at most 5).
    pub fn set_rating(&self, ids: &[i64], rating: u8) -> Result<(), GalleryError> {
        if rating > 5 {
            return Err(GalleryError::InvalidArgument(
                "ratings go from 0 to 5 stars".to_owned(),
            ));
        }
        self.update_each(ids, "UPDATE media SET rating = ?2 WHERE id = ?1", rating)
    }

    fn update_each(
        &self,
        ids: &[i64],
        sql: &str,
        value: impl rusqlite::ToSql,
    ) -> Result<(), GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            let mut statement = tx.prepare(sql)?;
            for id in ids {
                statement.execute(params![id, value])?;
            }
            Ok(())
        })
    }

    /// Adds the tag `name` to `ids` (created if new). Returns the tag's stored spelling.
    pub fn add_tag(&self, ids: &[i64], name: &str) -> Result<String, GalleryError> {
        let name = clean_name(name, "tag")?;
        let mut db = self.db();
        db.transaction(|tx| -> Result<String, GalleryError> {
            tx.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", [&name])?;
            let (tag_id, stored): (i64, String) = tx.query_row(
                "SELECT id, name FROM tags WHERE name = ?1",
                [&name],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            for id in ids {
                tx.execute(
                    "INSERT OR IGNORE INTO media_tags (media_id, tag_id)
                     SELECT id, ?2 FROM media WHERE id = ?1",
                    params![id, tag_id],
                )?;
                refresh_search(tx, *id)?;
            }
            Ok(stored)
        })
    }

    /// Removes the tag `name` from `ids`; a tag nothing carries any more is deleted.
    pub fn remove_tag(&self, ids: &[i64], name: &str) -> Result<(), GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            for id in ids {
                tx.execute(
                    "DELETE FROM media_tags WHERE media_id = ?1
                     AND tag_id = (SELECT id FROM tags WHERE name = ?2)",
                    params![id, name],
                )?;
                refresh_search(tx, *id)?;
            }
            tx.execute(
                "DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM media_tags)",
                [],
            )?;
            Ok(())
        })
    }

    // ── Albums ───────────────────────────────────────────────────────────────────────────

    pub fn create_album(&self, name: &str) -> Result<Album, GalleryError> {
        let name = clean_name(name, "album")?;
        let db = self.db();
        let created_at = now_ms();
        db.conn().execute(
            "INSERT INTO albums (name, created_at) VALUES (?1, ?2)",
            params![name, created_at],
        )?;
        Ok(Album {
            id: db.conn().last_insert_rowid(),
            name,
            count: 0,
            cover: None,
            created_at,
        })
    }

    pub fn rename_album(&self, id: i64, name: &str) -> Result<(), GalleryError> {
        let name = clean_name(name, "album")?;
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            if tx.execute(
                "UPDATE albums SET name = ?2 WHERE id = ?1",
                params![id, name],
            )? == 0
            {
                return Err(GalleryError::UnknownAlbum(id));
            }
            refresh_album_members(tx, id)
        })
    }

    /// Deletes an album (its photos stay in the library).
    pub fn delete_album(&self, id: i64) -> Result<(), GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            let members = album_members(tx, id)?;
            if tx.execute("DELETE FROM albums WHERE id = ?1", [id])? == 0 {
                return Err(GalleryError::UnknownAlbum(id));
            }
            for member in members {
                refresh_search(tx, member)?;
            }
            Ok(())
        })
    }

    /// Adds `ids` to an album; returns how many were new to it.
    pub fn add_to_album(&self, album: i64, ids: &[i64]) -> Result<u64, GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<u64, GalleryError> {
            ensure_album(tx, album)?;
            let now = now_ms();
            let mut added = 0;
            for id in ids {
                added += tx.execute(
                    "INSERT OR IGNORE INTO album_items (album_id, media_id, added_at)
                     SELECT ?1, id, ?3 FROM media WHERE id = ?2",
                    params![album, id, now],
                )? as u64;
                refresh_search(tx, *id)?;
            }
            Ok(added)
        })
    }

    pub fn remove_from_album(&self, album: i64, ids: &[i64]) -> Result<(), GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            ensure_album(tx, album)?;
            for id in ids {
                tx.execute(
                    "DELETE FROM album_items WHERE album_id = ?1 AND media_id = ?2",
                    params![album, id],
                )?;
                refresh_search(tx, *id)?;
            }
            Ok(())
        })
    }

    // ── File changes made by Gallery ─────────────────────────────────────────────────────

    /// Records that a file was renamed or moved (keeping its favorites, tags and albums).
    pub fn relocate(&self, id: i64, new_path: &str) -> Result<(), GalleryError> {
        let (folder, name) = split_path(new_path);
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            let changed = tx.execute(
                "UPDATE media SET path = ?2, folder = ?3, name = ?4 WHERE id = ?1",
                params![id, new_path, folder, name],
            )?;
            if changed == 0 {
                return Err(GalleryError::UnknownMedia(id));
            }
            refresh_search(tx, id)
        })
    }

    /// Marks an item as a copy saved by the editor.
    pub fn mark_edited(&self, id: i64) -> Result<(), GalleryError> {
        self.update_each(
            &[id],
            "UPDATE media SET edited_at = ?2 WHERE id = ?1",
            now_ms(),
        )
    }

    /// Lists items in the Trash (after their files went to the OS trash).
    pub fn mark_trashed(&self, ids: &[i64]) -> Result<(), GalleryError> {
        self.update_each(
            ids,
            "UPDATE media SET trashed_at = ?2 WHERE id = ?1",
            now_ms(),
        )
    }

    /// Takes items off the Trash list (after their files were put back).
    pub fn unmark_trashed(&self, ids: &[i64]) -> Result<(), GalleryError> {
        self.update_each(
            ids,
            "UPDATE media SET trashed_at = NULL WHERE id = ?1 AND ?2",
            true,
        )
    }

    /// Removes items from the library for good (rows only).
    pub fn forget(&self, ids: &[i64]) -> Result<(), GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            for id in ids {
                tx.execute("DELETE FROM media WHERE id = ?1", [id])?;
            }
            Ok(())
        })
    }

    // ── Duplicates ───────────────────────────────────────────────────────────────────────

    /// Every item outside the Trash, with the hashes computed so far.
    pub fn hash_candidates(&self) -> Result<Vec<HashCandidate>, GalleryError> {
        let db = self.db();
        let mut statement = db.conn().prepare(
            "SELECT id, path, size, modified_at, kind, content_hash, phash
             FROM media WHERE trashed_at IS NULL ORDER BY size, id",
        )?;
        let rows = statement.query_map([], |row| {
            Ok(HashCandidate {
                id: row.get(0)?,
                path: row.get(1)?,
                size: to_u64(row.get(2)?),
                modified_ms: row.get(3)?,
                kind: kind_from(&row.get::<_, String>(4)?),
                content_hash: row.get(5)?,
                phash: row.get(6)?,
            })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// Stores computed hashes.
    pub fn set_hashes(
        &self,
        hashes: &[(i64, Option<String>, Option<String>)],
    ) -> Result<(), GalleryError> {
        let mut db = self.db();
        db.transaction(|tx| -> Result<(), GalleryError> {
            let mut statement = tx.prepare(
                "UPDATE media SET content_hash = COALESCE(?2, content_hash),
                                  phash = COALESCE(?3, phash)
                 WHERE id = ?1",
            )?;
            for (id, content, perceptual) in hashes {
                statement.execute(params![id, content, perceptual])?;
            }
            Ok(())
        })
    }
}

fn migrations() -> Migrations<'static> {
    Migrations::from_slice(MIGRATIONS)
}

/// Inserts or updates one scanned file; returns its id.
fn upsert(conn: &Connection, item: &NewMedia<'_>) -> Result<i64, GalleryError> {
    let (folder, name) = split_path(item.path);
    let metadata = item.metadata;
    let (latitude, longitude) = metadata.gps.unzip();
    let place = item.place;
    conn.execute(
        "INSERT INTO media (
            path, folder, name, kind, size, modified_at, added_at, taken_at, width, height,
            orientation, duration_ms, camera, lens, f_number, exposure, iso, focal_mm, flash,
            latitude, longitude, city, region, country, screenshot
         ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18,
            ?19, ?20, ?21, ?22, ?23, ?24, ?25
         )
         ON CONFLICT (path) DO UPDATE SET
            kind = excluded.kind, size = excluded.size, modified_at = excluded.modified_at,
            taken_at = excluded.taken_at, width = excluded.width, height = excluded.height,
            orientation = excluded.orientation, duration_ms = excluded.duration_ms,
            camera = excluded.camera, lens = excluded.lens, f_number = excluded.f_number,
            exposure = excluded.exposure, iso = excluded.iso, focal_mm = excluded.focal_mm,
            flash = excluded.flash, latitude = excluded.latitude, longitude = excluded.longitude,
            city = excluded.city, region = excluded.region, country = excluded.country,
            screenshot = excluded.screenshot, trashed_at = NULL,
            content_hash = NULL, phash = NULL",
        params![
            item.path,
            folder,
            name,
            item.format.kind().as_str(),
            to_i64(item.size),
            item.modified_ms,
            now_ms(),
            metadata.taken_at,
            metadata.width,
            metadata.height,
            metadata.orientation,
            metadata.duration_ms.map(to_i64),
            metadata.camera,
            metadata.lens,
            metadata.f_number,
            metadata.exposure,
            metadata.iso,
            metadata.focal_mm,
            metadata.flash,
            latitude,
            longitude,
            place.map(|place| &place.city),
            place.map(|place| &place.region),
            place.map(|place| &place.country),
            item.screenshot,
        ],
    )?;
    Ok(
        conn.query_row("SELECT id FROM media WHERE path = ?1", [item.path], |row| {
            row.get(0)
        })?,
    )
}

/// Rebuilds one item's search text: names, folder, camera, lens, place, date words, tags and
/// albums.
fn refresh_search(conn: &Connection, id: i64) -> Result<(), GalleryError> {
    let row = conn
        .query_row(
            "SELECT name, folder, camera, lens, city, region, country, date, kind,
                (SELECT group_concat(t.name, ' ') FROM media_tags mt JOIN tags t ON t.id = mt.tag_id
                 WHERE mt.media_id = m.id),
                (SELECT group_concat(a.name, ' ') FROM album_items ai JOIN albums a ON a.id = ai.album_id
                 WHERE ai.media_id = m.id)
             FROM media m WHERE id = ?1",
            [id],
            |row| {
                let mut words: Vec<String> = Vec::new();
                for index in [0, 2, 3, 4, 5, 6, 8, 9, 10] {
                    if let Some(text) = row.get::<_, Option<String>>(index)? {
                        words.push(text);
                    }
                }
                let folder: String = row.get(1)?;
                words.push(
                    Path::new(&folder)
                        .file_name()
                        .map(|name| name.to_string_lossy().into_owned())
                        .unwrap_or_default(),
                );
                let date: i64 = row.get(7)?;
                if let Some(time) = DateTime::from_timestamp_millis(date) {
                    words.push(time.with_timezone(&Local).format("%B %Y").to_string());
                }
                Ok(words.join(" "))
            },
        )
        .optional()?;
    conn.execute("DELETE FROM media_fts WHERE rowid = ?1", [id])?;
    if let Some(text) = row {
        conn.execute(
            "INSERT INTO media_fts (rowid, text) VALUES (?1, ?2)",
            params![id, text],
        )?;
    }
    Ok(())
}

fn album_members(conn: &Connection, album: i64) -> Result<Vec<i64>, GalleryError> {
    let mut statement = conn.prepare("SELECT media_id FROM album_items WHERE album_id = ?1")?;
    let rows = statement.query_map([album], |row| row.get(0))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn refresh_album_members(conn: &Connection, album: i64) -> Result<(), GalleryError> {
    for member in album_members(conn, album)? {
        refresh_search(conn, member)?;
    }
    Ok(())
}

fn ensure_album(conn: &Connection, album: i64) -> Result<(), GalleryError> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM albums WHERE id = ?1)",
        [album],
        |row| row.get(0),
    )?;
    if exists {
        Ok(())
    } else {
        Err(GalleryError::UnknownAlbum(album))
    }
}

/// SQL conditions and their numbered parameters, built up piece by piece.
#[derive(Debug, Default)]
struct Filter {
    joins: String,
    conditions: Vec<String>,
    values: Vec<Value>,
}

impl Filter {
    /// Adds a parameter and returns its placeholder (`?3`).
    fn param(&mut self, value: Value) -> String {
        self.values.push(value);
        format!("?{}", self.values.len())
    }

    fn text(&mut self, text: &str) -> String {
        self.param(Value::Text(text.to_owned()))
    }

    fn with_tag(&mut self, name: &str) {
        let tag = self.text(name);
        self.conditions.push(format!(
            "m.id IN (SELECT mt.media_id FROM media_tags mt JOIN tags t ON t.id = mt.tag_id \
             WHERE t.name = {tag})"
        ));
    }

    /// Narrows to one collection.
    fn collection(&mut self, collection: &Collection) {
        let condition = match collection {
            Collection::All => return,
            Collection::Trash => "m.trashed_at IS NOT NULL".to_owned(),
            Collection::Favorites => "m.favorite = 1".to_owned(),
            Collection::Videos => "m.kind = 'video'".to_owned(),
            Collection::Screenshots => "m.screenshot = 1".to_owned(),
            Collection::Edited => "m.edited_at IS NOT NULL".to_owned(),
            Collection::Recent => {
                let since = self.param(Value::Integer(now_ms() - RECENT_DAYS * DAY_MS));
                format!("m.added_at >= {since}")
            }
            Collection::Album { id } => {
                let album = self.param(Value::Integer(*id));
                self.joins =
                    format!(" JOIN album_items ai ON ai.media_id = m.id AND ai.album_id = {album}");
                return;
            }
            Collection::Folder { path } => {
                let (low, high) = prefix_range(path);
                let exact = self.text(path);
                let low = self.text(&low);
                let high = self.text(&high);
                format!("(m.folder = {exact} OR (m.folder >= {low} AND m.folder < {high}))")
            }
            Collection::Tag { name } => {
                self.with_tag(name);
                return;
            }
            Collection::Place { country, city } => {
                let country = self.text(country);
                match city {
                    Some(city) => {
                        let city = self.text(city);
                        format!("m.country = {country} AND m.city = {city}")
                    }
                    None => format!("m.country = {country}"),
                }
            }
        };
        self.conditions.push(condition);
    }

    /// Narrows by the query's filters and search text.
    fn refine(&mut self, query: &Query) {
        if !query.include_videos && query.collection != Collection::Videos {
            self.conditions.push("m.kind = 'image'".to_owned());
        }
        if let Some(kind) = query.kind {
            let kind = self.text(kind.as_str());
            self.conditions.push(format!("m.kind = {kind}"));
        }
        if query.favorites_only {
            self.conditions.push("m.favorite = 1".to_owned());
        }
        if query.min_rating > 0 {
            let rating = self.param(Value::Integer(i64::from(query.min_rating)));
            self.conditions.push(format!("m.rating >= {rating}"));
        }
        if let Some(from) = query.from {
            let from = self.param(Value::Integer(from));
            self.conditions.push(format!("m.date >= {from}"));
        }
        if let Some(to) = query.to {
            let to = self.param(Value::Integer(to));
            self.conditions.push(format!("m.date <= {to}"));
        }
        let (tags, text) = split_search(&query.search);
        for tag in tags {
            self.with_tag(&tag);
        }
        if let Some(expression) = fts::match_query(&text) {
            let expression = self.text(&expression);
            self.conditions.push(format!(
                "m.id IN (SELECT rowid FROM media_fts WHERE media_fts MATCH {expression})"
            ));
        }
    }
}

/// The SQL and parameters for a [`Query`].
fn build_query(query: &Query) -> (String, Vec<Value>) {
    let trash = query.collection == Collection::Trash;
    let mut filter = Filter::default();
    if !trash {
        filter.conditions.push("m.trashed_at IS NULL".to_owned());
    }
    filter.collection(&query.collection);
    filter.refine(query);

    let direction = if query.descending { "DESC" } else { "ASC" };
    let order = match (query.sort, trash) {
        (_, true) => format!("m.trashed_at {direction}"),
        (SortKey::Taken, false) => format!("m.date {direction}"),
        (SortKey::Added, false) => format!("m.added_at {direction}"),
        (SortKey::Name, false) => format!("m.name COLLATE NOCASE {direction}"),
        (SortKey::Size, false) => format!("m.size {direction}"),
    };
    let sql = format!(
        "SELECT {ITEM_COLUMNS} FROM media m{} WHERE {} ORDER BY {order}, m.id {direction}",
        filter.joins,
        filter.conditions.join(" AND ")
    );
    (sql, filter.values)
}

/// `tag:x` words, and the rest of the text.
fn split_search(text: &str) -> (Vec<String>, String) {
    let mut tags = Vec::new();
    let mut rest = Vec::new();
    for word in text.split_whitespace() {
        match word.strip_prefix("tag:").or_else(|| word.strip_prefix('#')) {
            Some(tag) if !tag.is_empty() => tags.push(tag.to_owned()),
            _ => rest.push(word),
        }
    }
    (tags, rest.join(" "))
}

fn item_from_row(row: &Row<'_>) -> rusqlite::Result<MediaItem> {
    let path: String = row.get(1)?;
    let format = Format::of(Path::new(&path));
    let kind = kind_from(&row.get::<_, String>(3)?);
    let preview = match format {
        Some(Format::Raster) if crate::kind::webview_can_show(Path::new(&path)) => {
            Preview::Original
        }
        Some(Format::Svg | Format::Video) => Preview::Original,
        Some(Format::Raster | Format::JpegXl) => Preview::Render,
        _ => Preview::None,
    };
    Ok(MediaItem {
        id: row.get(0)?,
        name: row.get(2)?,
        kind,
        width: row.get(4)?,
        height: row.get(5)?,
        date: row.get(6)?,
        dated: row.get::<_, Option<i64>>(7)?.is_some(),
        size: to_u64(row.get(8)?),
        favorite: row.get(9)?,
        rating: row.get(10)?,
        duration_ms: row.get::<_, Option<i64>>(11)?.map(to_u64),
        thumbnail: format.is_some_and(|format| format.decodable() || format == Format::Video),
        preview,
        trashed: row.get::<_, Option<i64>>(12)?.is_some(),
        path,
    })
}

fn details(conn: &Connection, id: i64) -> Result<MediaDetails, GalleryError> {
    let item = conn
        .query_row(
            &format!("SELECT {ITEM_COLUMNS} FROM media m WHERE m.id = ?1"),
            [id],
            item_from_row,
        )
        .optional()?
        .ok_or(GalleryError::UnknownMedia(id))?;
    let mut details = conn.query_row(
        "SELECT folder, modified_at, added_at, taken_at, orientation, camera, lens, f_number,
                exposure, iso, focal_mm, flash, latitude, longitude, city, region, country,
                screenshot, edited_at
         FROM media WHERE id = ?1",
        [id],
        |row| {
            let city: Option<String> = row.get(14)?;
            let region: Option<String> = row.get(15)?;
            let country: Option<String> = row.get(16)?;
            Ok(MediaDetails {
                item: item.clone(),
                folder: row.get(0)?,
                modified_at: row.get(1)?,
                added_at: row.get(2)?,
                taken_at: row.get(3)?,
                orientation: row.get(4)?,
                camera: row.get(5)?,
                lens: row.get(6)?,
                f_number: row.get(7)?,
                exposure: row.get(8)?,
                iso: row.get(9)?,
                focal_mm: row.get(10)?,
                flash: row.get(11)?,
                latitude: row.get(12)?,
                longitude: row.get(13)?,
                place: match (city, country) {
                    (Some(city), Some(country)) => Some(Place {
                        city,
                        region: region.unwrap_or_default(),
                        country,
                    }),
                    _ => None,
                },
                screenshot: row.get(17)?,
                edited_at: row.get(18)?,
                tags: Vec::new(),
                albums: Vec::new(),
            })
        },
    )?;
    let mut statement = conn.prepare(
        "SELECT t.name FROM media_tags mt JOIN tags t ON t.id = mt.tag_id
         WHERE mt.media_id = ?1 ORDER BY t.name COLLATE NOCASE",
    )?;
    details.tags = statement
        .query_map([id], |row| row.get(0))?
        .collect::<Result<_, _>>()?;
    let mut statement = conn.prepare(
        "SELECT a.id, a.name FROM album_items ai JOIN albums a ON a.id = ai.album_id
         WHERE ai.media_id = ?1 ORDER BY a.name COLLATE NOCASE",
    )?;
    details.albums = statement
        .query_map([id], |row| {
            Ok(AlbumRef {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(details)
}

fn albums(conn: &Connection) -> Result<Vec<Album>, GalleryError> {
    let mut statement = conn.prepare(
        "SELECT a.id, a.name, a.created_at,
            (SELECT count(*) FROM album_items ai JOIN media m ON m.id = ai.media_id
             WHERE ai.album_id = a.id AND m.trashed_at IS NULL),
            (SELECT m.id FROM album_items ai JOIN media m ON m.id = ai.media_id
             WHERE ai.album_id = a.id AND m.trashed_at IS NULL ORDER BY m.date DESC LIMIT 1)
         FROM albums a ORDER BY a.created_at DESC, a.id DESC",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Album {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            count: to_u64(row.get(3)?),
            cover: row.get(4)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn tags(conn: &Connection) -> Result<Vec<TagCount>, GalleryError> {
    let mut statement = conn.prepare(
        "SELECT t.name, count(*) FROM tags t
         JOIN media_tags mt ON mt.tag_id = t.id JOIN media m ON m.id = mt.media_id
         WHERE m.trashed_at IS NULL GROUP BY t.id ORDER BY count(*) DESC, t.name COLLATE NOCASE",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(TagCount {
            name: row.get(0)?,
            count: to_u64(row.get(1)?),
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn places(conn: &Connection) -> Result<Vec<PlaceCount>, GalleryError> {
    let mut statement = conn.prepare(
        "SELECT city, COALESCE(max(region), ''), country, count(*),
            (SELECT p.id FROM media p WHERE p.city = m.city AND p.country = m.country
             AND p.trashed_at IS NULL ORDER BY p.date DESC LIMIT 1)
         FROM media m WHERE trashed_at IS NULL AND city IS NOT NULL AND country IS NOT NULL
         GROUP BY country, city ORDER BY count(*) DESC, city",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(PlaceCount {
            city: row.get(0)?,
            region: row.get(1)?,
            country: row.get(2)?,
            count: to_u64(row.get(3)?),
            cover: row.get(4)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// The folder tree under `root` from per-folder counts.
fn folder_tree(root: &str, counts: &[(String, u64)]) -> FolderNode {
    let mut node = FolderNode {
        path: root.to_owned(),
        name: display_name(root),
        count: 0,
        children: Vec::new(),
    };
    for (folder, count) in counts {
        if folder != root && !is_inside(folder, root) {
            continue;
        }
        let relative = folder[root.len()..].trim_start_matches(['/', '\\']);
        let mut current = &mut node;
        current.count += count;
        let mut path = root.to_owned();
        for part in relative.split(['/', '\\']).filter(|part| !part.is_empty()) {
            path = format!("{path}{}{part}", separator_of(root));
            let index =
                if let Some(index) = current.children.iter().position(|child| child.name == part) {
                    index
                } else {
                    current.children.push(FolderNode {
                        path: path.clone(),
                        name: part.to_owned(),
                        count: 0,
                        children: Vec::new(),
                    });
                    current.children.len() - 1
                };
            current = &mut current.children[index];
            current.count += count;
        }
    }
    sort_tree(&mut node);
    node
}

fn sort_tree(node: &mut FolderNode) {
    node.children.sort_by_key(|child| child.name.to_lowercase());
    for child in &mut node.children {
        sort_tree(child);
    }
}

/// The last path component ("Pictures"), or the path itself for a drive root.
fn display_name(path: &str) -> String {
    Path::new(path).file_name().map_or_else(
        || path.to_owned(),
        |name| name.to_string_lossy().into_owned(),
    )
}

/// The separator `path` uses (`\` for Windows paths, else `/`).
fn separator_of(path: &str) -> char {
    if path.contains('\\') && !path.contains('/') {
        '\\'
    } else {
        MAIN_SEPARATOR
    }
}

/// `true` when `path` is strictly inside `folder`.
pub fn is_inside(path: &str, folder: &str) -> bool {
    let folder = folder.trim_end_matches(['/', '\\']);
    path.len() > folder.len()
        && path.starts_with(folder)
        && path[folder.len()..].starts_with(['/', '\\'])
}

/// The string range `[low, high)` holding every path strictly inside `folder`: `folder` plus
/// its separator, up to the next character after the separator.
fn prefix_range(folder: &str) -> (String, String) {
    let separator = separator_of(folder);
    let folder = folder.trim_end_matches(['/', '\\']);
    let next = char::from_u32(separator as u32 + 1).unwrap_or(separator);
    (format!("{folder}{separator}"), format!("{folder}{next}"))
}

/// `(folder, name)` of a file path.
fn split_path(path: &str) -> (String, String) {
    let path = Path::new(path);
    let folder = path
        .parent()
        .map(|parent| parent.to_string_lossy().into_owned())
        .unwrap_or_default();
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();
    (folder, name)
}

/// Trims an album or tag name and checks it.
fn clean_name(name: &str, what: &str) -> Result<String, GalleryError> {
    let name = name.trim().trim_start_matches('#').trim();
    if name.is_empty() {
        return Err(GalleryError::InvalidArgument(format!(
            "the {what} needs a name"
        )));
    }
    if name.chars().count() > MAX_NAME || name.chars().any(char::is_control) {
        return Err(GalleryError::InvalidArgument(format!(
            "that {what} name is too long or has invisible characters"
        )));
    }
    Ok(name.to_owned())
}

fn kind_from(text: &str) -> MediaKind {
    MediaKind::parse(text).unwrap_or(MediaKind::Image)
}

fn to_u64(value: i64) -> u64 {
    u64::try_from(value).unwrap_or(0)
}

fn to_i64(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn metadata(taken_at: Option<i64>, camera: Option<&str>) -> Metadata {
        Metadata {
            width: Some(4000),
            height: Some(3000),
            orientation: 1,
            taken_at,
            camera: camera.map(str::to_owned),
            ..Metadata::default()
        }
    }

    fn add(
        library: &Library,
        path: &str,
        taken_at: Option<i64>,
        place: Option<&Place>,
    ) -> Result<i64, GalleryError> {
        let metadata = metadata(taken_at, Some("Canon EOS R6"));
        let format = Format::of(Path::new(path)).unwrap_or(Format::Raster);
        library.upsert(&NewMedia {
            path,
            format,
            size: 1000,
            modified_ms: 1_000,
            metadata: &metadata,
            place,
            screenshot: crate::kind::looks_like_screenshot(Path::new(path)),
        })
    }

    fn lisbon() -> Place {
        Place {
            city: "Lisbon".to_owned(),
            region: "Lisbon".to_owned(),
            country: "PT".to_owned(),
        }
    }

    fn names(items: &[MediaItem]) -> Vec<&str> {
        items.iter().map(|item| item.name.as_str()).collect()
    }

    fn sample() -> Result<Library, GalleryError> {
        let library = Library::open_in_memory()?;
        library.add_root("/p")?;
        add(&library, "/p/a.jpg", Some(3_000), Some(&lisbon()))?;
        add(&library, "/p/trip/b.jpg", Some(2_000), None)?;
        add(&library, "/p/trip/day2/c.mp4", Some(1_500), None)?;
        add(&library, "/p/Screenshot 1.png", None, None)?;
        Ok(library)
    }

    #[test]
    fn lists_newest_first_and_keeps_user_data_on_rescan() -> TestResult {
        let library = sample()?;
        let all = library.query(&Query::default())?;
        assert_eq!(names(&all), ["a.jpg", "b.jpg", "c.mp4", "Screenshot 1.png"]);
        let a = all[0].id;
        library.set_favorite(&[a], true)?;
        library.set_rating(&[a], 4)?;
        assert!(library.set_rating(&[a], 6).is_err());
        add(&library, "/p/a.jpg", Some(3_000), Some(&lisbon()))?;
        let item = library.item(a)?;
        assert!(item.favorite, "rescans keep favorites");
        assert_eq!(item.rating, 4);
        assert!(item.dated);
        assert_eq!(item.preview, Preview::Original);
        Ok(())
    }

    #[test]
    fn collections() -> TestResult {
        let library = sample()?;
        let list = |collection| {
            library.query(&Query {
                collection,
                ..Query::default()
            })
        };
        assert_eq!(names(&list(Collection::Videos)?), ["c.mp4"]);
        assert_eq!(names(&list(Collection::Screenshots)?), ["Screenshot 1.png"]);
        assert_eq!(
            names(&list(Collection::Folder {
                path: "/p/trip".to_owned()
            })?),
            ["b.jpg", "c.mp4"]
        );
        assert_eq!(
            names(&list(Collection::Place {
                country: "PT".to_owned(),
                city: Some("Lisbon".to_owned())
            })?),
            ["a.jpg"]
        );
        assert_eq!(list(Collection::Recent)?.len(), 4);
        let photos_only = library.query(&Query {
            include_videos: false,
            ..Query::default()
        })?;
        assert_eq!(photos_only.len(), 3);
        Ok(())
    }

    #[test]
    fn search_covers_names_places_tags_and_albums() -> TestResult {
        let library = sample()?;
        let search = |text: &str| {
            library.query(&Query {
                search: text.to_owned(),
                ..Query::default()
            })
        };
        assert_eq!(names(&search("lisb")?), ["a.jpg"]);
        assert_eq!(names(&search("trip")?), ["b.jpg"], "folder name");
        assert_eq!(search("canon")?.len(), 4);
        let b = library.id_of("/p/trip/b.jpg")?.ok_or("b")?;
        library.add_tag(&[b], "Family")?;
        assert_eq!(names(&search("family")?), ["b.jpg"]);
        assert_eq!(names(&search("tag:family")?), ["b.jpg"]);
        assert_eq!(names(&search("#Family canon")?), ["b.jpg"]);
        let album = library.create_album("Summer trip")?;
        library.add_to_album(album.id, &[b])?;
        assert_eq!(names(&search("summer")?), ["b.jpg"]);
        library.rename_album(album.id, "Holidays")?;
        assert!(search("summer")?.is_empty());
        assert_eq!(names(&search("holidays")?), ["b.jpg"]);
        assert!(
            search("\"*(")?.len() == 4,
            "punctuation only lists everything"
        );
        Ok(())
    }

    #[test]
    fn albums_and_tags() -> TestResult {
        let library = sample()?;
        let ids: Vec<i64> = library
            .query(&Query::default())?
            .iter()
            .map(|item| item.id)
            .collect();
        let album = library.create_album("  Trip 2026  ")?;
        assert_eq!(album.name, "Trip 2026");
        assert_eq!(library.add_to_album(album.id, &ids[..2])?, 2);
        assert_eq!(
            library.add_to_album(album.id, &ids[..2])?,
            0,
            "no duplicates"
        );
        let albums = library.albums()?;
        assert_eq!(albums[0].count, 2);
        assert_eq!(albums[0].cover, Some(ids[0]), "the newest is the cover");
        let in_album = library.query(&Query {
            collection: Collection::Album { id: album.id },
            ..Query::default()
        })?;
        assert_eq!(in_album.len(), 2);
        library.remove_from_album(album.id, &ids[..1])?;
        assert_eq!(library.albums()?[0].count, 1);
        assert!(library.add_to_album(999, &ids).is_err());
        assert!(library.create_album("   ").is_err());

        let stored = library.add_tag(&ids, "beach")?;
        assert_eq!(stored, "beach");
        library.add_tag(&ids[..1], "BEACH")?;
        let details = library.details(ids[0])?;
        assert_eq!(details.tags, ["beach"], "tags are case-insensitive");
        assert_eq!(details.albums.len(), 0);
        library.remove_tag(&ids, "beach")?;
        assert!(
            library.summary()?.tags.is_empty(),
            "unused tags are deleted"
        );
        library.delete_album(album.id)?;
        assert!(library.albums()?.is_empty());
        assert_eq!(library.query(&Query::default())?.len(), 4, "photos stay");
        Ok(())
    }

    #[test]
    fn summary_counts_folders_and_places() -> TestResult {
        let library = sample()?;
        let summary = library.summary()?;
        assert_eq!(summary.counts.all, 4);
        assert_eq!(summary.counts.videos, 1);
        assert_eq!(summary.counts.photos, 3);
        assert_eq!(summary.counts.screenshots, 1);
        assert_eq!(summary.counts.bytes, 4000);
        assert_eq!(summary.roots, ["/p"]);
        let root = &summary.folders[0];
        assert_eq!((root.name.as_str(), root.count), ("p", 4));
        let trip = &root.children[0];
        assert_eq!((trip.path.as_str(), trip.count), ("/p/trip", 2));
        assert_eq!(trip.children[0].path, "/p/trip/day2");
        assert_eq!(summary.places.len(), 1);
        assert_eq!(summary.places[0].city, "Lisbon");
        Ok(())
    }

    #[test]
    fn trash_keeps_entries_until_forgotten() -> TestResult {
        let library = sample()?;
        let a = library.id_of("/p/a.jpg")?.ok_or("a")?;
        library.mark_trashed(&[a])?;
        assert_eq!(library.query(&Query::default())?.len(), 3);
        let trash = library.query(&Query {
            collection: Collection::Trash,
            ..Query::default()
        })?;
        assert_eq!(names(&trash), ["a.jpg"]);
        assert!(trash[0].trashed);
        library.remove_missing(&["/p/a.jpg".to_owned()])?;
        assert_eq!(
            library.summary()?.counts.trash,
            1,
            "scans keep Trash entries"
        );
        library.unmark_trashed(&[a])?;
        assert_eq!(library.query(&Query::default())?.len(), 4);
        library.forget(&[a])?;
        assert!(library.item(a).is_err());
        Ok(())
    }

    #[test]
    fn roots_merge_and_remove_their_items() -> TestResult {
        let library = sample()?;
        assert!(!library.add_root("/p/trip")?, "already inside /p");
        assert!(library.add_root("/q/inner")?);
        assert!(library.add_root("/q")?, "replaces /q/inner");
        assert_eq!(library.roots()?, ["/p", "/q"]);
        assert_eq!(library.root_of("/p/trip/b.jpg")?, Some("/p".to_owned()));
        assert_eq!(library.remove_root("/p")?, 4);
        assert!(library.query(&Query::default())?.is_empty());
        assert!(!library.add_root("/q")?);
        Ok(())
    }

    #[test]
    fn relocate_keeps_the_item() -> TestResult {
        let library = sample()?;
        let a = library.id_of("/p/a.jpg")?.ok_or("a")?;
        library.set_favorite(&[a], true)?;
        library.relocate(a, "/p/trip/renamed.jpg")?;
        let details = library.details(a)?;
        assert_eq!(details.item.name, "renamed.jpg");
        assert_eq!(details.folder, "/p/trip");
        assert!(details.item.favorite);
        assert_eq!(library.known_files("/p/trip")?.len(), 3);
        assert!(library.relocate(999, "/x").is_err());
        Ok(())
    }

    #[test]
    fn paths_inside_folders() {
        assert!(is_inside("/p/a.jpg", "/p"));
        assert!(is_inside("/p/a.jpg", "/p/"));
        assert!(!is_inside("/pa/a.jpg", "/p"));
        assert!(!is_inside("/p", "/p"));
        assert!(is_inside("C:\\Pics\\a.jpg", "C:\\Pics"));
        assert_eq!(
            prefix_range("C:\\Pics"),
            ("C:\\Pics\\".to_owned(), "C:\\Pics]".to_owned())
        );
    }
}
