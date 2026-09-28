//! [`Entry`] and [`list_dir`]: what the file views show for one folder.
//!
//! Paths cross IPC as UTF-8 strings. Names that are not valid Unicode can't round-trip, so
//! they are left out of listings (and logged) instead of being shown lossily and then failing.

use std::fs::{self, Metadata};
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::ExplorerError;
use crate::kind::{FileKind, extension};

/// One file or folder.
#[expect(
    clippy::struct_excessive_bools,
    reason = "a flat IPC payload: each flag is an independent file attribute"
)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub name: String,
    /// Absolute path.
    pub path: String,
    pub is_dir: bool,
    pub kind: FileKind,
    /// Lower-case extension without the dot (files only).
    pub extension: Option<String>,
    /// Bytes (files only).
    pub size: Option<u64>,
    /// Milliseconds since the Unix epoch.
    pub modified: Option<i64>,
    pub created: Option<i64>,
    pub hidden: bool,
    pub readonly: bool,
    pub symlink: bool,
}

/// A folder's contents.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Listing {
    pub path: String,
    pub name: String,
    /// `None` at a root (`/`, `C:\`).
    pub parent: Option<String>,
    pub entries: Vec<Entry>,
    /// Hidden entries left out because `show_hidden` was off.
    pub hidden_count: usize,
    /// Entries that could not be read (permission denied, non-Unicode names).
    pub skipped: usize,
}

/// Lists `dir`. Hidden files are counted but left out unless `show_hidden`.
pub fn list_dir(dir: &Path, show_hidden: bool) -> Result<Listing, ExplorerError> {
    let dir = require_dir(dir)?;
    let reader = fs::read_dir(&dir).map_err(ExplorerError::io("could not open", &dir))?;
    let mut entries = Vec::new();
    let mut hidden_count = 0;
    let mut skipped = 0;
    for item in reader {
        let Ok(item) = item else {
            skipped += 1;
            continue;
        };
        match Entry::read(&item.path()) {
            Ok(entry) if entry.hidden && !show_hidden => hidden_count += 1,
            Ok(entry) => entries.push(entry),
            Err(error) => {
                log::debug!("skipping {}: {error}", item.path().display());
                skipped += 1;
            }
        }
    }
    Ok(Listing {
        path: path_string(&dir)?,
        name: display_name(&dir),
        parent: dir.parent().map(path_string).transpose()?,
        entries,
        hidden_count,
        skipped,
    })
}

impl Entry {
    /// Reads one entry. Symlinks report their target's size and type (and `symlink: true`);
    /// a dangling link is a file of unknown size.
    pub fn read(path: &Path) -> Result<Self, ExplorerError> {
        let link = fs::symlink_metadata(path).map_err(ExplorerError::io("could not read", path))?;
        let symlink = link.file_type().is_symlink();
        let meta = if symlink {
            fs::metadata(path).unwrap_or(link)
        } else {
            link
        };
        let name = path
            .file_name()
            .map_or_else(|| path_string(path), |name| os_string(name, path))?;
        let is_dir = meta.is_dir();
        let (kind, ext) = if is_dir {
            (FileKind::Folder, None)
        } else {
            (FileKind::from_name(&name), extension(&name))
        };
        Ok(Self {
            hidden: is_hidden(&name, &meta),
            path: path_string(path)?,
            is_dir,
            kind,
            extension: ext,
            size: (!is_dir).then_some(meta.len()),
            modified: meta.modified().ok().and_then(millis),
            created: meta.created().ok().and_then(millis),
            readonly: meta.permissions().readonly(),
            symlink,
            name,
        })
    }
}

/// `path`, which must be absolute and name an existing folder, without `.`/`..` segments.
pub fn require_dir(path: &Path) -> Result<PathBuf, ExplorerError> {
    let path = require_absolute(path)?;
    match fs::metadata(&path) {
        Ok(meta) if meta.is_dir() => Ok(path),
        Ok(_) => Err(ExplorerError::NotAFolder(path)),
        Err(_) => Err(ExplorerError::NotFound(path)),
    }
}

/// `path` made lexically clean (no `.`/`..`). Relative paths are refused: the UI always sends
/// absolute paths, so a relative one is a bug or tampering.
pub fn require_absolute(path: &Path) -> Result<PathBuf, ExplorerError> {
    if !path.is_absolute() {
        return Err(ExplorerError::NotAbsolute(path.to_path_buf()));
    }
    let mut clean = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                clean.pop();
            }
            Component::CurDir => {}
            other => clean.push(other),
        }
    }
    Ok(dunce::simplified(&clean).to_path_buf())
}

/// A path as the UTF-8 string the UI uses.
pub fn path_string(path: &Path) -> Result<String, ExplorerError> {
    path.to_str().map(str::to_owned).ok_or_else(|| {
        ExplorerError::InvalidName(format!("{} is not valid Unicode", path.display()))
    })
}

/// The last segment, or the whole path at a root (`/`, `C:\`).
pub fn display_name(path: &Path) -> String {
    path.file_name().map_or_else(
        || path.to_string_lossy().into_owned(),
        |name| name.to_string_lossy().into_owned(),
    )
}

fn os_string(name: &std::ffi::OsStr, path: &Path) -> Result<String, ExplorerError> {
    name.to_str().map(str::to_owned).ok_or_else(|| {
        ExplorerError::InvalidName(format!("{} is not valid Unicode", path.display()))
    })
}

/// Milliseconds since the Unix epoch (negative before 1970).
pub fn millis(time: SystemTime) -> Option<i64> {
    match time.duration_since(UNIX_EPOCH) {
        Ok(after) => i64::try_from(after.as_millis()).ok(),
        Err(before) => i64::try_from(before.duration().as_millis())
            .ok()
            .map(|ms| -ms),
    }
}

/// Dotfiles everywhere; plus the hidden attribute on Windows.
fn is_hidden(name: &str, meta: &Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        if meta.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0 {
            return true;
        }
    }
    #[cfg(not(windows))]
    let _ = meta;
    name.starts_with('.')
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn lists_files_and_folders_with_metadata() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("notes.txt", "hello")?
            .dir("Photos")?
            .file(".secret", "x")?;
        let listing = list_dir(tree.path(), false)?;
        assert_eq!(listing.entries.len(), 2);
        assert_eq!(listing.hidden_count, 1);
        let notes = listing
            .entries
            .iter()
            .find(|entry| entry.name == "notes.txt")
            .ok_or("notes.txt missing")?;
        assert_eq!(notes.size, Some(5));
        assert_eq!(notes.kind, FileKind::Text);
        assert_eq!(notes.extension.as_deref(), Some("txt"));
        assert!(notes.modified.is_some());
        let photos = listing
            .entries
            .iter()
            .find(|entry| entry.name == "Photos")
            .ok_or("Photos missing")?;
        assert!(photos.is_dir);
        assert_eq!(photos.size, None);
        assert_eq!(photos.kind, FileKind::Folder);
        Ok(())
    }

    #[test]
    fn shows_hidden_files_on_request() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file(".secret", "x")?;
        let listing = list_dir(tree.path(), true)?;
        assert_eq!(listing.entries.len(), 1);
        assert!(listing.entries.iter().all(|entry| entry.hidden));
        assert_eq!(listing.hidden_count, 0);
        Ok(())
    }

    #[test]
    fn refuses_relative_paths_and_files() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a.txt", "")?;
        assert!(matches!(
            list_dir(Path::new("relative/dir"), false),
            Err(ExplorerError::NotAbsolute(_))
        ));
        assert!(matches!(
            list_dir(&tree.join("a.txt"), false),
            Err(ExplorerError::NotAFolder(_))
        ));
        assert!(matches!(
            list_dir(&tree.join("missing"), false),
            Err(ExplorerError::NotFound(_))
        ));
        Ok(())
    }

    #[test]
    fn cleans_dot_segments() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("a/b")?;
        let messy = tree.join("a/./b/../b");
        assert_eq!(require_dir(&messy)?, dunce::simplified(&tree.join("a/b")));
        Ok(())
    }

    #[test]
    fn parent_is_reported() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("child")?;
        let listing = list_dir(&tree.join("child"), false)?;
        assert_eq!(listing.name, "child");
        assert_eq!(
            listing.parent.as_deref(),
            Some(path_string(dunce::simplified(tree.path()))?.as_str())
        );
        Ok(())
    }

    #[test]
    fn millis_handles_both_sides_of_the_epoch() {
        use std::time::Duration;
        assert_eq!(millis(UNIX_EPOCH + Duration::from_millis(1500)), Some(1500));
        assert_eq!(millis(UNIX_EPOCH - Duration::from_millis(20)), Some(-20));
    }
}
