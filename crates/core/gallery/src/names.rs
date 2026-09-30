//! File names for renames, edited copies and exports.

use std::path::{Path, PathBuf};

use crate::GalleryError;

/// Characters Windows refuses in names (checked everywhere, so libraries stay portable).
const FORBIDDEN: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

/// Checks a new file name typed by the user.
pub fn validate(name: &str) -> Result<&str, GalleryError> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." {
        return Err(GalleryError::InvalidArgument(
            "the name can't be empty".to_owned(),
        ));
    }
    if trimmed
        .chars()
        .any(|c| FORBIDDEN.contains(&c) || c.is_control())
    {
        return Err(GalleryError::InvalidArgument(
            "a name can't contain < > : \" / \\ | ? * or invisible characters".to_owned(),
        ));
    }
    if trimmed.ends_with('.') {
        return Err(GalleryError::InvalidArgument(
            "a name can't end with a dot".to_owned(),
        ));
    }
    if trimmed.len() > 255 {
        return Err(GalleryError::InvalidArgument(
            "that name is too long".to_owned(),
        ));
    }
    Ok(trimmed)
}

/// `true` when `path` exists (or is a dangling link).
pub fn exists(path: &Path) -> bool {
    path.symlink_metadata().is_ok()
}

/// A free path in `folder` for `stem` + `extension`: `stem.ext`, else `stem 2.ext`,
/// `stem 3.ext`, …
pub fn free_path(folder: &Path, stem: &str, extension: &str) -> PathBuf {
    let name = |suffix: Option<u32>| {
        let stem = match suffix {
            Some(number) => format!("{stem} {number}"),
            None => stem.to_owned(),
        };
        if extension.is_empty() {
            stem
        } else {
            format!("{stem}.{extension}")
        }
    };
    let first = folder.join(name(None));
    if !exists(&first) {
        return first;
    }
    (2..u32::MAX)
        .map(|number| folder.join(name(Some(number))))
        .find(|path| !exists(path))
        .unwrap_or(first)
}

/// `(stem, extension)` of a file name.
pub fn split(path: &Path) -> (String, String) {
    let stem = path
        .file_stem()
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or_default();
    let extension = path
        .extension()
        .map(|extension| extension.to_string_lossy().into_owned())
        .unwrap_or_default();
    (stem, extension)
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn validates_names() {
        assert_eq!(validate("  beach.jpg ").ok(), Some("beach.jpg"));
        assert!(validate("").is_err());
        assert!(validate("..").is_err());
        assert!(validate("a/b.jpg").is_err());
        assert!(validate("a:b.jpg").is_err());
        assert!(validate("a.").is_err());
        assert!(validate(&"x".repeat(300)).is_err());
    }

    #[test]
    fn free_paths_count_up() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("a (edited).jpg", "x")?
            .file("a (edited) 2.jpg", "x")?;
        assert_eq!(free_path(tree.path(), "b", "jpg"), tree.join("b.jpg"));
        assert_eq!(
            free_path(tree.path(), "a (edited)", "jpg"),
            tree.join("a (edited) 3.jpg")
        );
        assert_eq!(free_path(tree.path(), "noext", ""), tree.join("noext"));
        assert_eq!(
            split(Path::new("/x/IMG_1.JPG")),
            ("IMG_1".to_owned(), "JPG".to_owned())
        );
        Ok(())
    }
}
