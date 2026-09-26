//! A fake GENSLATE checkout, for code that detects "running from the repo".

use std::io;

use crate::TempTree;

/// Files that identify the root of a GENSLATE checkout (see `genslate-paths`).
pub const REPO_MARKERS: [&str; 2] = [".config/moon/workspace.yml", "Cargo.toml"];

/// A temporary tree shaped like the repository root: the [`REPO_MARKERS`] plus the
/// `other/config/apps` and `other/logs/app-logs` folders.
pub fn fake_repo() -> io::Result<TempTree> {
    REPO_MARKERS
        .iter()
        .try_fold(TempTree::new()?, |tree, marker| tree.file(marker, ""))?
        .dir("other/config/apps")?
        .dir("other/logs/app-logs")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fake_repo_has_markers_and_folders() -> io::Result<()> {
        let repo = fake_repo()?;
        for marker in REPO_MARKERS {
            assert!(repo.join(marker).is_file(), "missing {marker}");
        }
        assert!(repo.join("other/config/apps").is_dir());
        assert!(repo.join("other/logs/app-logs").is_dir());
        Ok(())
    }
}
