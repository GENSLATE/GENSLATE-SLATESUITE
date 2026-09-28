//! Single-step file operations: create, rename, trash, delete. Copy and move (which take
//! time and report progress) live in [`crate::transfer`].

use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};

use crate::ExplorerError;
use crate::entry::{require_absolute, require_dir};
use crate::names::{exists, unique_path, validate_name};

/// Creates a folder named `name` in `parent`. With `pick_free_name`, an existing name becomes
/// `name (2)`; otherwise it is an error.
pub fn create_folder(
    parent: &Path,
    name: &str,
    pick_free_name: bool,
) -> Result<PathBuf, ExplorerError> {
    let path = target(parent, name, pick_free_name)?;
    fs::create_dir(&path).map_err(ExplorerError::io("could not create", &path))?;
    Ok(path)
}

/// Creates an empty file named `name` in `parent` (never overwrites).
pub fn create_file(
    parent: &Path,
    name: &str,
    pick_free_name: bool,
) -> Result<PathBuf, ExplorerError> {
    let path = target(parent, name, pick_free_name)?;
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(ExplorerError::io("could not create", &path))?;
    Ok(path)
}

/// Renames `path` to `new_name` in the same folder. A change of case only is allowed on
/// case-insensitive file systems (where the "existing" target is the same file).
pub fn rename(path: &Path, new_name: &str) -> Result<PathBuf, ExplorerError> {
    let path = require_absolute(path)?;
    if !exists(&path) {
        return Err(ExplorerError::NotFound(path));
    }
    let name = validate_name(new_name)?;
    let parent = path
        .parent()
        .ok_or_else(|| ExplorerError::InvalidName("A drive can't be renamed here.".to_owned()))?;
    let target = parent.join(name);
    if target == path {
        return Ok(target);
    }
    let case_only = path
        .file_name()
        .and_then(|old| old.to_str())
        .is_some_and(|old| old.eq_ignore_ascii_case(name));
    if exists(&target) && !case_only {
        return Err(ExplorerError::AlreadyExists(name.to_owned()));
    }
    fs::rename(&path, &target).map_err(ExplorerError::io("could not rename", &path))?;
    Ok(target)
}

/// Moves `paths` to the OS trash (Recycle Bin on Windows).
pub fn trash(paths: &[PathBuf]) -> Result<(), ExplorerError> {
    let paths = paths
        .iter()
        .map(|path| require_absolute(path))
        .collect::<Result<Vec<_>, _>>()?;
    if let Some(missing) = paths.iter().find(|path| !exists(path)) {
        return Err(ExplorerError::NotFound(missing.clone()));
    }
    trash::delete_all(&paths)?;
    Ok(())
}

/// Puts items trashed from `originals` back where they were (the most recent deletion of each).
/// Windows and Linux only: macOS has no API for it.
pub fn restore_from_trash(originals: &[PathBuf]) -> Result<usize, ExplorerError> {
    #[cfg(any(windows, all(unix, not(target_os = "macos"))))]
    {
        use std::collections::HashMap;
        let mut newest: HashMap<PathBuf, trash::TrashItem> = HashMap::new();
        for item in trash::os_limited::list()? {
            let original = item.original_path();
            if !originals.contains(&original) {
                continue;
            }
            match newest.get(&original) {
                Some(kept) if kept.time_deleted >= item.time_deleted => {}
                _ => {
                    newest.insert(original, item);
                }
            }
        }
        let count = newest.len();
        if count == 0 {
            return Err(ExplorerError::Trash(
                "the items are no longer in the trash".to_owned(),
            ));
        }
        trash::os_limited::restore_all(newest.into_values())?;
        Ok(count)
    }
    #[cfg(not(any(windows, all(unix, not(target_os = "macos")))))]
    {
        let _ = originals;
        Err(ExplorerError::Unsupported(
            "Restoring from the trash isn't supported on this system. Open the Trash to put the items back.",
        ))
    }
}

/// Deletes `paths` for good (folders with everything inside). Symlinks are removed, never
/// followed.
pub fn delete_permanently(paths: &[PathBuf]) -> Result<(), ExplorerError> {
    for path in paths {
        let path = require_absolute(path)?;
        let meta =
            fs::symlink_metadata(&path).map_err(|_| ExplorerError::NotFound(path.clone()))?;
        let result = if meta.is_dir() {
            fs::remove_dir_all(&path)
        } else {
            fs::remove_file(&path)
        };
        result.map_err(ExplorerError::io("could not delete", &path))?;
    }
    Ok(())
}

fn target(parent: &Path, name: &str, pick_free_name: bool) -> Result<PathBuf, ExplorerError> {
    let parent = require_dir(parent)?;
    let name = validate_name(name)?;
    if pick_free_name {
        return Ok(unique_path(&parent, name));
    }
    let path = parent.join(name);
    if exists(&path) {
        return Err(ExplorerError::AlreadyExists(name.to_owned()));
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn creates_folders_and_files() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let folder = create_folder(tree.path(), "New folder", false)?;
        assert!(folder.is_dir());
        let again = create_folder(tree.path(), "New folder", true)?;
        assert!(again.ends_with("New folder (2)"));
        assert!(matches!(
            create_folder(tree.path(), "New folder", false),
            Err(ExplorerError::AlreadyExists(_))
        ));
        let file = create_file(tree.path(), "notes.txt", false)?;
        assert!(file.is_file());
        assert!(create_file(tree.path(), "bad/name", false).is_err());
        Ok(())
    }

    #[test]
    fn renames_in_place() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a.txt", "a")?.file("b.txt", "b")?;
        let renamed = rename(&tree.join("a.txt"), "c.txt")?;
        assert!(renamed.ends_with("c.txt"));
        assert_eq!(tree.read("c.txt")?, "a");
        assert!(matches!(
            rename(&tree.join("c.txt"), "b.txt"),
            Err(ExplorerError::AlreadyExists(_))
        ));
        assert!(matches!(
            rename(&tree.join("gone.txt"), "x.txt"),
            Err(ExplorerError::NotFound(_))
        ));
        let case = rename(&tree.join("c.txt"), "C.txt")?;
        assert!(case.ends_with("C.txt"));
        Ok(())
    }

    #[test]
    fn deletes_permanently() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("folder/inner/deep.txt", "x")?
            .file("file.txt", "y")?;
        delete_permanently(&[tree.join("folder"), tree.join("file.txt")])?;
        assert!(!tree.join("folder").exists());
        assert!(!tree.join("file.txt").exists());
        assert!(delete_permanently(&[tree.join("folder")]).is_err());
        Ok(())
    }

    #[test]
    fn trash_refuses_missing_items() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        assert!(matches!(
            trash(&[tree.join("missing.txt")]),
            Err(ExplorerError::NotFound(_))
        ));
        Ok(())
    }
}
