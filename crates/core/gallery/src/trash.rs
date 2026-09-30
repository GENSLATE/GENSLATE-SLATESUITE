//! Moving files to the OS trash and putting them back.

use std::path::PathBuf;

use crate::GalleryError;
use crate::names::exists;

/// Items trashed from Gallery can be put back (not on macOS, which has no API for it).
pub const CAN_RESTORE: bool = cfg!(any(windows, all(unix, not(target_os = "macos"))));

/// Moves `paths` to the OS trash. Nothing is moved when one of them is missing.
pub fn move_to_trash(paths: &[PathBuf]) -> Result<(), GalleryError> {
    if let Some(missing) = paths.iter().find(|path| !exists(path)) {
        return Err(GalleryError::NotFound(missing.clone()));
    }
    if paths.is_empty() {
        return Ok(());
    }
    trash::delete_all(paths)?;
    Ok(())
}

/// Puts files trashed from `originals` back where they were (the newest deletion of each).
/// Returns how many came back.
pub fn restore(originals: &[PathBuf]) -> Result<usize, GalleryError> {
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
        if let Some(taken) = newest.keys().find(|original| exists(original)) {
            return Err(GalleryError::AlreadyExists(
                taken
                    .file_name()
                    .map(|name| name.to_string_lossy().into_owned())
                    .unwrap_or_default(),
            ));
        }
        let count = newest.len();
        trash::os_limited::restore_all(newest.into_values())?;
        Ok(count)
    }
    #[cfg(not(any(windows, all(unix, not(target_os = "macos")))))]
    {
        let _ = originals;
        Err(GalleryError::Unsupported(
            "Putting items back isn't supported on this system. Open the Trash in Finder to restore them.",
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn refuses_missing_files() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        assert!(matches!(
            move_to_trash(&[tree.join("missing.jpg")]),
            Err(GalleryError::NotFound(_))
        ));
        move_to_trash(&[])?;
        Ok(())
    }
}
