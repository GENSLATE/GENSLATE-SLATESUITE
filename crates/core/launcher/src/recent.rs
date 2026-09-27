//! Recently launched apps, kept in `other/databases/genslate/launcher/recent.toml` (data, not
//! settings — so editing config never races with launch bookkeeping).

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::LauncherError;
use crate::catalog::AppId;
use crate::config::load_toml;
use crate::metadata::write_atomic;

/// How many launches are remembered.
const CAPACITY: usize = 50;

/// The launch history, newest first.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct RecentLaunches {
    launch: Vec<Launch>,
}

/// One launch.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Launch {
    pub id: AppId,
    /// Unix seconds.
    pub at: u64,
}

impl RecentLaunches {
    /// Reads the history; a missing or broken file is an empty history.
    pub fn load(path: &Path) -> Self {
        load_toml(path).unwrap_or_else(|error: LauncherError| {
            log::warn!("{error} — starting a new launch history");
            Self::default()
        })
    }

    /// Records a launch and saves the history.
    pub fn record(&mut self, id: AppId, at: u64, path: &Path) -> Result<(), LauncherError> {
        self.launch.retain(|launch| launch.id != id);
        self.launch.insert(0, Launch { id, at });
        self.launch.truncate(CAPACITY);
        let text = toml::to_string(self).map_err(|error| LauncherError::Parse {
            path: path.to_path_buf(),
            message: error.to_string(),
        })?;
        write_atomic(path, &text)
    }

    /// The `limit` most recent distinct apps.
    pub fn latest(&self, limit: usize) -> Vec<AppId> {
        self.launch
            .iter()
            .take(limit)
            .map(|launch| launch.id.clone())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::Source;
    use genslate_testing::TempTree;

    #[test]
    fn keeps_distinct_ids_newest_first_and_persists() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let path = tree.join("launcher/recent.toml");
        let explorer = AppId::new(Source::Genslate, "explorer");
        let firefox = AppId::new(Source::PortableApps, "FirefoxPortable");
        let mut recent = RecentLaunches::load(&path);
        recent.record(explorer.clone(), 1, &path)?;
        recent.record(firefox.clone(), 2, &path)?;
        recent.record(explorer.clone(), 3, &path)?;
        assert_eq!(recent.latest(5), [explorer.clone(), firefox.clone()]);
        assert_eq!(RecentLaunches::load(&path).latest(1), [explorer]);
        Ok(())
    }

    #[test]
    fn broken_history_starts_over() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("recent.toml", "launch = 5")?;
        assert!(
            RecentLaunches::load(&tree.join("recent.toml"))
                .latest(5)
                .is_empty()
        );
        Ok(())
    }
}
