//! Fake GENSLATE layouts: a repo checkout and a launcher install folder (suite).

use std::io;

use crate::TempTree;

/// Files that identify the root of a GENSLATE checkout (see `genslate-paths`).
pub const REPO_MARKERS: [&str; 2] = [".config/moon/workspace.yml", "Cargo.toml"];

/// A temporary tree shaped like the repository root: the [`REPO_MARKERS`], `other/config/genslate`,
/// `other/logs/app-logs` and the launcher's dev install folder.
pub fn fake_repo() -> io::Result<TempTree> {
    REPO_MARKERS
        .iter()
        .try_fold(TempTree::new()?, |tree, marker| tree.file(marker, ""))?
        .dir("other/config/genslate")?
        .dir("other/logs/app-logs")?
        .dir("desktop/launcher/installDir/programs/genslate")?
        .dir("desktop/launcher/installDir/storage/users/shared")
}

/// A temporary launcher install folder with `programs/genslate/<app>/` for each of `apps`,
/// `other/config/` and `storage/users/shared/`.
pub fn fake_suite(apps: &[&str]) -> io::Result<TempTree> {
    apps.iter().try_fold(
        TempTree::new()?
            .dir("other/config/genslate")?
            .dir("other/config/appdata/metadata")?
            .dir("programs/portableapps.com")?
            .dir("programs/portapps.io")?
            .dir("storage/users/shared")?,
        |tree, app| tree.dir(format!("programs/genslate/{app}")),
    )
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
        assert!(repo.join("other/config/genslate").is_dir());
        assert!(repo.join("other/logs/app-logs").is_dir());
        Ok(())
    }

    #[test]
    fn fake_suite_has_programs_other_and_storage() -> io::Result<()> {
        let suite = fake_suite(&["launcher", "explorer"])?;
        assert!(suite.join("programs/genslate/launcher").is_dir());
        assert!(suite.join("programs/genslate/explorer").is_dir());
        assert!(suite.join("other/config").is_dir());
        assert!(suite.join("storage/users/shared").is_dir());
        Ok(())
    }
}
