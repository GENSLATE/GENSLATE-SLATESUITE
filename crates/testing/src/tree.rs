//! [`TempTree`]: a temporary directory with a fluent builder for files and folders.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use tempfile::TempDir;

/// A temporary directory that is deleted when dropped.
///
/// Relative paths passed to the builder methods are resolved against the tree root and
/// their parent folders are created on demand.
#[derive(Debug)]
pub struct TempTree {
    dir: TempDir,
}

impl TempTree {
    /// Creates an empty tree in the system temp directory.
    pub fn new() -> io::Result<Self> {
        Ok(Self {
            dir: tempfile::Builder::new()
                .prefix("genslate-test-")
                .tempdir()?,
        })
    }

    /// The tree root.
    pub fn path(&self) -> &Path {
        self.dir.path()
    }

    /// `root/relative`.
    pub fn join(&self, relative: impl AsRef<Path>) -> PathBuf {
        self.dir.path().join(relative)
    }

    /// Writes `contents` to `relative`, creating parent folders.
    pub fn file(self, relative: impl AsRef<Path>, contents: impl AsRef<[u8]>) -> io::Result<Self> {
        self.write(relative, contents)?;
        Ok(self)
    }

    /// Creates the folder `relative` (and its parents).
    pub fn dir(self, relative: impl AsRef<Path>) -> io::Result<Self> {
        fs::create_dir_all(self.join(relative))?;
        Ok(self)
    }

    /// Non-consuming variant of [`TempTree::file`]; returns the absolute path written.
    pub fn write(
        &self,
        relative: impl AsRef<Path>,
        contents: impl AsRef<[u8]>,
    ) -> io::Result<PathBuf> {
        let path = self.join(relative);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, contents)?;
        Ok(path)
    }

    /// Reads `relative` as UTF-8.
    pub fn read(&self, relative: impl AsRef<Path>) -> io::Result<String> {
        fs::read_to_string(self.join(relative))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_nested_files_and_dirs() -> io::Result<()> {
        let tree = TempTree::new()?
            .file("a/b/c.txt", "hello")?
            .dir("empty/dir")?;
        assert_eq!(tree.read("a/b/c.txt")?, "hello");
        assert!(tree.join("empty/dir").is_dir());
        Ok(())
    }

    #[test]
    fn write_returns_absolute_path() -> io::Result<()> {
        let tree = TempTree::new()?;
        let path = tree.write("x.toml", "k = 1")?;
        assert!(path.is_absolute());
        assert!(path.starts_with(tree.path()));
        Ok(())
    }

    #[test]
    fn is_removed_on_drop() -> io::Result<()> {
        let tree = TempTree::new()?;
        let root = tree.path().to_path_buf();
        assert!(root.is_dir());
        drop(tree);
        assert!(!root.exists());
        Ok(())
    }
}
