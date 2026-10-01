//! The app catalog: GENSLATE apps plus user-installed PortableApps.com and portapps.io apps,
//! with the user's overrides (favorites, hidden, names, args) applied.

mod genslate;
mod icon;
mod model;
mod portableapps;
mod portapps;

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::Serialize;

pub use genslate::GenslateRoots;
pub use icon::{IconData, IconSource, load_icon};
pub use model::{AppEntry, AppId, AppStatus, HostOs, Source, title_case};

use crate::metadata::TabSettings;

/// Everything the catalog scans.
#[derive(Debug, Clone)]
pub struct CatalogRoots {
    /// `programs/` (suite and dev); `None` for standalone installs.
    pub programs: Option<PathBuf>,
    /// `other/config/slatesuite/metadata/`
    pub metadata: PathBuf,
    /// `other/resources/icons/genslate/`
    pub icons: PathBuf,
    /// Dev only: `<repo>/target/debug`.
    pub dev_target: Option<PathBuf>,
    pub host: HostOs,
}

/// One launcher tab.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabInfo {
    pub source: Source,
    pub label: &'static str,
    /// Visible apps in the tab.
    pub count: usize,
}

/// All scanned apps plus the tab settings they were scanned with.
#[derive(Debug, Clone, Default)]
pub struct Catalog {
    apps: Vec<AppEntry>,
    tabs: BTreeMap<Source, TabSettings>,
}

/// The launcher's own key: never listed.
const SELF_KEY: &str = "launcher";

impl Catalog {
    /// Scans every source. Missing folders simply yield no apps.
    pub fn scan(roots: &CatalogRoots) -> Self {
        let tabs: BTreeMap<Source, TabSettings> = Source::ALL
            .into_iter()
            .map(|source| {
                let path = roots.metadata.join(source.settings_file());
                let settings = TabSettings::load(&path).unwrap_or_else(|error| {
                    log::warn!("{error} — using default tab settings");
                    TabSettings::default()
                });
                (source, settings)
            })
            .collect();

        let programs = roots.programs.as_deref();
        let mut apps = genslate::scan(&GenslateRoots {
            programs: programs.map_or_else(PathBuf::new, |dir| dir.join(Source::Genslate.folder())),
            metadata: roots.metadata.clone(),
            icons: roots.icons.clone(),
            dev_target: roots.dev_target.clone(),
            exclude: vec![SELF_KEY.to_owned()],
            host: roots.host,
        });
        // PortableApps.com and portapps.io ship Windows programs.
        if let (Some(programs), HostOs::Windows) = (programs, roots.host) {
            apps.extend(portableapps::scan(
                &programs.join(Source::PortableApps.folder()),
            ));
            apps.extend(portapps::scan(&programs.join(Source::Portapps.folder())));
        }
        for app in &mut apps {
            if let Some(settings) = tabs.get(&app.id.source) {
                apply_override(app, settings);
            }
        }
        apps.sort_by(|a, b| {
            (a.id.source, a.name.to_lowercase()).cmp(&(b.id.source, b.name.to_lowercase()))
        });
        Self { apps, tabs }
    }

    /// Every app (hidden ones included; the UI filters them).
    pub fn apps(&self) -> &[AppEntry] {
        &self.apps
    }

    /// Apps of one source.
    pub fn by_source(&self, source: Source) -> impl Iterator<Item = &AppEntry> {
        self.apps.iter().filter(move |app| app.id.source == source)
    }

    /// Looks an app up by id.
    pub fn find(&self, id: &AppId) -> Option<&AppEntry> {
        self.apps.iter().find(|app| &app.id == id)
    }

    /// The tabs to show: GENSLATE always; third-party tabs only when enabled and non-empty.
    pub fn tabs(&self) -> Vec<TabInfo> {
        let mut tabs: Vec<(u32, TabInfo)> = Source::ALL
            .into_iter()
            .enumerate()
            .filter_map(|(index, source)| {
                let settings = self.tabs.get(&source).cloned().unwrap_or_default();
                let count = self.by_source(source).filter(|app| !app.hidden).count();
                let show = source == Source::Genslate || (settings.enabled && count > 0);
                let order = settings
                    .order
                    .unwrap_or(u32::try_from(index).unwrap_or(u32::MAX));
                show.then_some((
                    order,
                    TabInfo {
                        source,
                        label: source.label(),
                        count,
                    },
                ))
            })
            .collect();
        tabs.sort_by_key(|(order, _)| *order);
        tabs.into_iter().map(|(_, tab)| tab).collect()
    }

    /// Marks apps whose program is among `running` (executable paths of live processes) as
    /// [`AppStatus::Running`], and running→ready for ones that stopped. Returns whether
    /// anything changed.
    pub fn update_running(&mut self, running: &[PathBuf]) -> bool {
        let running: Vec<String> = running.iter().map(|path| normalize(path)).collect();
        let mut changed = false;
        for app in &mut self.apps {
            let Some(program) = &app.program else {
                continue;
            };
            let program = normalize(program);
            // A macOS `.app` is a folder: its process runs `…/X.app/Contents/MacOS/x`.
            let is_running = running
                .iter()
                .any(|exe| exe == &program || exe.starts_with(&format!("{program}/")));
            let next = match (app.status, is_running) {
                (AppStatus::Ready, true) => AppStatus::Running,
                (AppStatus::Running, false) => AppStatus::Ready,
                (status, _) => status,
            };
            changed |= next != app.status;
            app.status = next;
        }
        changed
    }
}

fn apply_override(app: &mut AppEntry, settings: &TabSettings) {
    let Some(overrides) = settings.apps.get(&app.id.key) else {
        return;
    };
    app.favorite = overrides.favorite;
    app.hidden = overrides.hidden;
    if let Some(name) = overrides
        .name
        .as_ref()
        .filter(|name| !name.trim().is_empty())
    {
        name.trim().clone_into(&mut app.name);
    }
    if let Some(category) = overrides.category.as_ref().filter(|c| !c.trim().is_empty()) {
        category.trim().clone_into(&mut app.category);
    }
    if let Some(args) = &overrides.args {
        app.args.clone_from(args);
    }
}

/// Comparable path text: forward slashes; case-insensitive on Windows and macOS.
fn normalize(path: &Path) -> String {
    let text = dunce::simplified(path).to_string_lossy().replace('\\', "/");
    if cfg!(any(windows, target_os = "macos")) {
        text.to_lowercase()
    } else {
        text
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    fn roots(tree: &TempTree, host: HostOs) -> CatalogRoots {
        CatalogRoots {
            programs: Some(tree.join("programs")),
            metadata: tree.join("metadata"),
            icons: tree.join("icons"),
            dev_target: None,
            host,
        }
    }

    fn suite() -> std::io::Result<TempTree> {
        TempTree::new()?
            .file("metadata/explorer.toml", "[app]\nname = \"Explorer\"\n")?
            .file("metadata/launcher.toml", "[app]\nname = \"Launcher\"\n")?
            .file(
                "metadata/genslate.toml",
                "[apps.explorer]\nfavorite = true\nname = \"Files\"\nargs = [\"--new\"]\n",
            )?
            .file("metadata/portapps.toml", "enabled = false\n")?
            .file("programs/genslate/explorer/genslate-explorer.exe", "")?
            .file("programs/genslate/launcher/genslate-launcher.exe", "")?
            .file(
                "programs/portableapps.com/ToolPortable/ToolPortable.exe",
                "",
            )?
            .file(
                "programs/portapps.io/x-portable/portapp.json",
                r#"{"id":"x-portable"}"#,
            )?
            .file("programs/portapps.io/x-portable/x-portable.exe", "")
    }

    #[test]
    fn applies_overrides_and_skips_the_launcher() -> Result<(), Box<dyn std::error::Error>> {
        let tree = suite()?;
        let catalog = Catalog::scan(&roots(&tree, HostOs::Windows));
        let explorer = catalog
            .find(&AppId::new(Source::Genslate, "explorer"))
            .ok_or("explorer")?;
        assert!(explorer.favorite);
        assert_eq!(explorer.name, "Files");
        assert_eq!(explorer.args, ["--new"]);
        assert!(
            catalog
                .find(&AppId::new(Source::Genslate, "launcher"))
                .is_none()
        );
        Ok(())
    }

    #[test]
    fn tabs_hide_empty_and_disabled_sources() -> Result<(), Box<dyn std::error::Error>> {
        let tree = suite()?;
        let tabs = Catalog::scan(&roots(&tree, HostOs::Windows)).tabs();
        let sources: Vec<Source> = tabs.iter().map(|tab| tab.source).collect();
        assert_eq!(sources, [Source::Genslate, Source::PortableApps]);
        assert_eq!(tabs[1].count, 1);

        let linux = Catalog::scan(&roots(&tree, HostOs::Linux)).tabs();
        assert_eq!(linux.len(), 1, "third-party tabs are Windows-only");
        Ok(())
    }

    #[test]
    fn tracks_running_programs() -> Result<(), Box<dyn std::error::Error>> {
        let tree = suite()?;
        let mut catalog = Catalog::scan(&roots(&tree, HostOs::Windows));
        let exe = tree.join("programs/genslate/explorer/genslate-explorer.exe");
        let id = AppId::new(Source::Genslate, "explorer");
        assert!(catalog.update_running(&[exe]));
        assert_eq!(
            catalog.find(&id).map(|a| a.status),
            Some(AppStatus::Running)
        );
        assert!(catalog.update_running(&[]));
        assert_eq!(catalog.find(&id).map(|a| a.status), Some(AppStatus::Ready));
        assert!(!catalog.update_running(&[]));
        Ok(())
    }
}
