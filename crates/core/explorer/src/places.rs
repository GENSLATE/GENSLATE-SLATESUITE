//! The sidebar's fixed places: the user's standard folders and the mounted drives.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::Serialize;
use sysinfo::Disks;

use crate::entry::path_string;

/// A standard folder (Home, Documents, …).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Place {
    /// `home`, `desktop`, `documents`, `downloads`, `pictures`, `music`, `videos`.
    pub id: &'static str,
    pub label: &'static str,
    pub path: String,
}

/// A mounted drive.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    /// `C:` on Windows, the mount point elsewhere.
    pub label: String,
    /// The volume's own name, if it has one.
    pub name: Option<String>,
    /// Where to browse to.
    pub path: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub removable: bool,
}

/// The standard folders that exist on this machine, Home first.
pub fn standard_places() -> Vec<Place> {
    let candidates: [(&'static str, &'static str, Option<PathBuf>); 7] = [
        ("home", "Home", dirs::home_dir()),
        ("desktop", "Desktop", dirs::desktop_dir()),
        ("documents", "Documents", dirs::document_dir()),
        ("downloads", "Downloads", dirs::download_dir()),
        ("pictures", "Pictures", dirs::picture_dir()),
        ("music", "Music", dirs::audio_dir()),
        ("videos", "Videos", dirs::video_dir()),
    ];
    let mut seen = HashSet::new();
    candidates
        .into_iter()
        .filter_map(|(id, label, path)| {
            let path = path.filter(|path| path.is_dir())?;
            // XDG may point several folders at Home when they are not set up.
            if !seen.insert(path.clone()) {
                return None;
            }
            Some(Place {
                id,
                label,
                path: path_string(&path).ok()?,
            })
        })
        .collect()
}

/// Mounted drives worth showing (system and virtual mounts are left out), sorted by label.
pub fn volumes() -> Vec<Volume> {
    let disks = Disks::new_with_refreshed_list();
    let mut seen = HashSet::new();
    let mut volumes: Vec<Volume> = disks
        .list()
        .iter()
        .filter(|disk| disk.total_space() > 0 && is_user_mount(disk.mount_point()))
        .filter_map(|disk| {
            let mount = disk.mount_point();
            if !seen.insert(mount.to_path_buf()) {
                return None;
            }
            let path = path_string(mount).ok()?;
            let label = if cfg!(windows) {
                path.trim_end_matches(['\\', '/']).to_owned()
            } else {
                path.clone()
            };
            let name = disk.name().to_string_lossy().trim().to_owned();
            Some(Volume {
                label,
                name: (!name.is_empty()).then_some(name),
                path,
                total_bytes: disk.total_space(),
                available_bytes: disk.available_space(),
                removable: disk.is_removable(),
            })
        })
        .collect();
    volumes.sort_by(|a, b| a.label.cmp(&b.label));
    volumes
}

/// Leaves out the mounts an OS file manager hides (boot, snaps, container layers, …).
fn is_user_mount(mount: &Path) -> bool {
    const HIDDEN: &[&str] = &[
        "/boot", "/snap", "/proc", "/sys", "/dev", "/run", "/var", "/tmp", "/etc", "/usr",
        "/System", "/private",
    ];
    if cfg!(windows) {
        return true;
    }
    let text = mount.to_string_lossy();
    if text == "/" {
        return true;
    }
    // Removable drives on Linux mount under /run/media.
    if text.starts_with("/run/media/") {
        return true;
    }
    !HIDDEN
        .iter()
        .any(|prefix| text == *prefix || text.starts_with(&format!("{prefix}/")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hides_system_mounts() {
        if cfg!(windows) {
            return;
        }
        assert!(is_user_mount(Path::new("/")));
        assert!(is_user_mount(Path::new("/media/usb")));
        assert!(is_user_mount(Path::new("/Volumes/USB")));
        assert!(is_user_mount(Path::new("/run/media/me/USB")));
        assert!(!is_user_mount(Path::new("/boot/efi")));
        assert!(!is_user_mount(Path::new("/snap/core/1")));
        assert!(!is_user_mount(Path::new("/System/Volumes/Data")));
        assert!(!is_user_mount(Path::new("/run/user/1000")));
    }

    #[test]
    fn standard_places_exist_and_are_unique() {
        let places = standard_places();
        let unique: HashSet<_> = places.iter().map(|place| &place.path).collect();
        assert_eq!(unique.len(), places.len());
        assert!(places.iter().all(|place| Path::new(&place.path).is_dir()));
    }
}
