//! What the preview pane and the Properties dialog show: the start of a text file, a folder's
//! total size, and full metadata for one item.

use std::fs::{self, File};
use std::io::Read;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

use ignore::{WalkBuilder, WalkState};
use serde::Serialize;

use crate::ExplorerError;
use crate::entry::{Entry, millis, path_string, require_absolute};

/// The start of a text file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextPreview {
    pub text: String,
    /// The file is longer than what was read.
    pub truncated: bool,
    /// The file looks binary (a NUL byte, or not UTF-8): `text` is empty.
    pub binary: bool,
}

/// Reads up to `limit` bytes of `path` as text.
pub fn read_text(path: &Path, limit: usize) -> Result<TextPreview, ExplorerError> {
    let path = require_absolute(path)?;
    let file = File::open(&path).map_err(ExplorerError::io("could not open", &path))?;
    let mut bytes = Vec::with_capacity(limit.min(64 * 1024));
    file.take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(ExplorerError::io("could not read", &path))?;
    let truncated = bytes.len() > limit;
    bytes.truncate(limit);
    if bytes.contains(&0) {
        return Ok(TextPreview {
            text: String::new(),
            truncated,
            binary: true,
        });
    }
    let text = match String::from_utf8(bytes) {
        Ok(text) => text,
        // The cut may have split a character: keep the valid prefix.
        Err(error) if truncated && error.utf8_error().error_len().is_none() => {
            let valid = error.utf8_error().valid_up_to();
            let mut bytes = error.into_bytes();
            bytes.truncate(valid);
            String::from_utf8(bytes).unwrap_or_default()
        }
        Err(_) => {
            return Ok(TextPreview {
                text: String::new(),
                truncated,
                binary: true,
            });
        }
    };
    Ok(TextPreview {
        text,
        truncated,
        binary: false,
    })
}

/// A folder's size, counted recursively.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderSize {
    pub bytes: u64,
    pub files: u64,
    pub folders: u64,
    pub cancelled: bool,
}

/// Adds up everything under `dir` in parallel (links are counted, not followed; nothing is
/// filtered out, hidden and git-ignored files included).
pub fn folder_size(dir: &Path, cancel: &AtomicBool) -> Result<FolderSize, ExplorerError> {
    let dir = require_absolute(dir)?;
    let (bytes, files, folders) = (AtomicU64::new(0), AtomicU64::new(0), AtomicU64::new(0));
    let cancelled = AtomicBool::new(false);
    WalkBuilder::new(&dir)
        .standard_filters(false)
        .hidden(false)
        .follow_links(false)
        .build_parallel()
        .run(|| {
            Box::new(|result| {
                if cancel.load(Ordering::Relaxed) {
                    cancelled.store(true, Ordering::Relaxed);
                    return WalkState::Quit;
                }
                // Unreadable entries are skipped; the folder itself is not counted.
                let Ok(entry) = result else {
                    return WalkState::Continue;
                };
                if entry.depth() == 0 {
                    return WalkState::Continue;
                }
                if entry.file_type().is_some_and(|kind| kind.is_dir()) {
                    folders.fetch_add(1, Ordering::Relaxed);
                } else if let Ok(meta) = entry.metadata() {
                    files.fetch_add(1, Ordering::Relaxed);
                    bytes.fetch_add(meta.len(), Ordering::Relaxed);
                }
                WalkState::Continue
            })
        });
    Ok(FolderSize {
        bytes: bytes.into_inner(),
        files: files.into_inner(),
        folders: folders.into_inner(),
        cancelled: cancelled.into_inner(),
    })
}

/// Everything the Properties dialog shows.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Properties {
    pub entry: Entry,
    pub accessed: Option<i64>,
    /// `rwxr-xr-x` on Unix; `Read-only` / `Read & write` on Windows.
    pub permissions: String,
    /// Where a symlink points.
    pub link_target: Option<String>,
    /// Direct children (folders only).
    pub children: Option<u64>,
}

/// Full metadata for `path`.
pub fn properties(path: &Path) -> Result<Properties, ExplorerError> {
    let path = require_absolute(path)?;
    let entry = Entry::read(&path)?;
    let meta = fs::metadata(&path)
        .or_else(|_| fs::symlink_metadata(&path))
        .map_err(ExplorerError::io("could not read", &path))?;
    let link_target = if entry.symlink {
        fs::read_link(&path)
            .ok()
            .and_then(|target| path_string(&target).ok())
    } else {
        None
    };
    let children = if entry.is_dir {
        fs::read_dir(&path).ok().map(|items| items.count() as u64)
    } else {
        None
    };
    Ok(Properties {
        accessed: meta.accessed().ok().and_then(millis),
        permissions: permissions(&meta),
        link_target,
        children,
        entry,
    })
}

#[cfg(unix)]
fn permissions(meta: &fs::Metadata) -> String {
    use std::os::unix::fs::PermissionsExt;
    let mode = meta.permissions().mode();
    let bits = [
        (0o400, 'r'),
        (0o200, 'w'),
        (0o100, 'x'),
        (0o040, 'r'),
        (0o020, 'w'),
        (0o010, 'x'),
        (0o004, 'r'),
        (0o002, 'w'),
        (0o001, 'x'),
    ];
    bits.iter()
        .map(|&(bit, c)| if mode & bit == 0 { '-' } else { c })
        .collect()
}

#[cfg(not(unix))]
fn permissions(meta: &fs::Metadata) -> String {
    if meta.permissions().readonly() {
        "Read-only".to_owned()
    } else {
        "Read & write".to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn reads_text_with_a_limit() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a.txt", "hello world")?;
        let full = read_text(&tree.join("a.txt"), 1024)?;
        assert_eq!(full.text, "hello world");
        assert!(!full.truncated);
        let cut = read_text(&tree.join("a.txt"), 5)?;
        assert_eq!(cut.text, "hello");
        assert!(cut.truncated);
        Ok(())
    }

    #[test]
    fn keeps_whole_characters_when_cutting() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("u.txt", "aé")?;
        // "é" is two bytes: a 2-byte cut splits it.
        let cut = read_text(&tree.join("u.txt"), 2)?;
        assert_eq!(cut.text, "a");
        assert!(!cut.binary);
        Ok(())
    }

    #[test]
    fn detects_binary_files() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("b.bin", [0_u8, 159, 146, 150])?;
        let preview = read_text(&tree.join("b.bin"), 1024)?;
        assert!(preview.binary);
        assert!(preview.text.is_empty());
        Ok(())
    }

    #[test]
    fn sums_folder_sizes() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("x/a.txt", "abc")?
            .file("x/y/b.txt", "de")?;
        let size = folder_size(&tree.join("x"), &AtomicBool::new(false))?;
        assert_eq!(
            size,
            FolderSize {
                bytes: 5,
                files: 2,
                folders: 1,
                cancelled: false
            }
        );
        let cancelled = folder_size(&tree.join("x"), &AtomicBool::new(true))?;
        assert!(cancelled.cancelled);
        Ok(())
    }

    #[test]
    fn reports_properties() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("x/a.txt", "abc")?;
        let folder = properties(&tree.join("x"))?;
        assert_eq!(folder.children, Some(1));
        let file = properties(&tree.join("x/a.txt"))?;
        assert_eq!(file.entry.size, Some(3));
        assert!(!file.permissions.is_empty());
        Ok(())
    }
}
