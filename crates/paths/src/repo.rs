//! Repository root detection.

use std::path::{Path, PathBuf};

/// Files that together identify the root of a GENSLATE checkout.
const MARKERS: [&str; 2] = [".config/moon/workspace.yml", "Cargo.toml"];

/// Walks up from `start` to the first folder containing the repo markers.
pub fn find_repo_root(start: &Path) -> Option<PathBuf> {
    start
        .ancestors()
        .find(|dir| MARKERS.iter().all(|marker| dir.join(marker).is_file()))
        .map(Path::to_path_buf)
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::{REPO_MARKERS, TempTree, fake_repo};

    #[test]
    fn markers_match_the_testing_fixture() {
        assert_eq!(MARKERS, REPO_MARKERS);
    }

    #[test]
    fn finds_root_from_a_nested_folder() -> std::io::Result<()> {
        let repo = fake_repo()?.dir("target/debug")?;
        assert_eq!(
            find_repo_root(&repo.join("target/debug")).as_deref(),
            Some(repo.path())
        );
        Ok(())
    }

    #[test]
    fn none_outside_a_checkout() -> std::io::Result<()> {
        let tree = TempTree::new()?.dir("a/b")?;
        assert_eq!(find_repo_root(&tree.join("a/b")), None);
        Ok(())
    }
}
