//! Undo for the last file operations. Each finished operation records how to reverse it; the
//! shell keeps a short stack of these and [`revert`]s the newest on Undo.
//!
//! Undo is careful: it only reverses what is still as the operation left it (a moved file that
//! was since deleted is reported, not recreated), and it never deletes for good — undoing a
//! copy or a new item moves it to the trash.

use std::fs;
use std::path::PathBuf;

use serde::Serialize;

use crate::ExplorerError;
use crate::names::exists;
use crate::ops;

/// How to reverse one finished operation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum UndoAction {
    /// Renamed `from` → `to`.
    Rename { from: PathBuf, to: PathBuf },
    /// Moved each `(from, to)`.
    Move { items: Vec<(PathBuf, PathBuf)> },
    /// Copies (or new items) created at these paths.
    Create { paths: Vec<PathBuf> },
    /// Items moved to the trash from these paths.
    Trash { paths: Vec<PathBuf> },
}

impl UndoAction {
    /// What Undo will do, for the menu and toasts ("Undo Rename").
    pub fn label(&self) -> &'static str {
        match self {
            Self::Rename { .. } => "Rename",
            Self::Move { .. } => "Move",
            Self::Create { .. } => "New item",
            Self::Trash { .. } => "Move to Trash",
        }
    }
}

/// Reverses `action`.
pub fn revert(action: &UndoAction) -> Result<(), ExplorerError> {
    match action {
        UndoAction::Rename { from, to } => {
            if exists(from) {
                return Err(ExplorerError::AlreadyExists(file_name(from)));
            }
            fs::rename(to, from).map_err(ExplorerError::io("could not undo the rename of", to))
        }
        UndoAction::Move { items } => {
            for (from, to) in items.iter().rev() {
                if exists(from) {
                    return Err(ExplorerError::AlreadyExists(file_name(from)));
                }
                if !exists(to) {
                    return Err(ExplorerError::NotFound(to.clone()));
                }
                fs::rename(to, from).map_err(ExplorerError::io("could not move back", to))?;
            }
            Ok(())
        }
        UndoAction::Create { paths } => {
            let present: Vec<PathBuf> = paths.iter().filter(|path| exists(path)).cloned().collect();
            if present.is_empty() {
                return Ok(());
            }
            ops::trash(&present)
        }
        UndoAction::Trash { paths } => ops::restore_from_trash(paths).map(|_| ()),
    }
}

fn file_name(path: &std::path::Path) -> String {
    crate::entry::display_name(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn reverts_a_rename() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("b.txt", "x")?;
        revert(&UndoAction::Rename {
            from: tree.join("a.txt"),
            to: tree.join("b.txt"),
        })?;
        assert_eq!(tree.read("a.txt")?, "x");
        assert!(!tree.join("b.txt").exists());
        Ok(())
    }

    #[test]
    fn reverts_a_move_unless_something_took_the_old_place() -> Result<(), Box<dyn std::error::Error>>
    {
        let tree = TempTree::new()?.file("dst/a.txt", "a")?.dir("src")?;
        let action = UndoAction::Move {
            items: vec![(tree.join("src/a.txt"), tree.join("dst/a.txt"))],
        };
        revert(&action)?;
        assert_eq!(tree.read("src/a.txt")?, "a");

        let tree = TempTree::new()?
            .file("dst/a.txt", "a")?
            .file("src/a.txt", "new")?;
        let blocked = UndoAction::Move {
            items: vec![(tree.join("src/a.txt"), tree.join("dst/a.txt"))],
        };
        assert!(matches!(
            revert(&blocked),
            Err(ExplorerError::AlreadyExists(_))
        ));
        assert_eq!(tree.read("src/a.txt")?, "new");
        Ok(())
    }

    #[test]
    fn nothing_to_undo_when_created_items_are_gone() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        revert(&UndoAction::Create {
            paths: vec![tree.join("gone")],
        })?;
        Ok(())
    }

    #[test]
    fn labels() {
        let action = UndoAction::Create { paths: Vec::new() };
        assert_eq!(action.label(), "New item");
    }
}
