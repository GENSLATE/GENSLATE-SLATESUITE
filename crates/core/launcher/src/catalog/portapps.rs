//! portapps.io apps in `programs/portapps.io/`: `<id>/portapp.json` (`id`, `name`, `version`,
//! `publisher`) next to `<id>.exe`. The icon is embedded in the exe.
//! See <https://portapps.io/doc/configuration/>.

use std::fs;
use std::path::Path;

use serde::Deserialize;

use super::genslate::list;
use super::icon::IconSource;
use super::model::{AppEntry, AppId, Source};

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct PortappJson {
    id: String,
    name: String,
    version: String,
    publisher: String,
}

/// Category for every portapp (portapp.json has none).
const CATEGORY: &str = "Apps";

/// Scans `dir` (`programs/portapps.io/`).
pub fn scan(dir: &Path) -> Vec<AppEntry> {
    list(dir)
        .into_iter()
        .filter(|path| path.is_dir())
        .filter_map(|package| entry(&package))
        .collect()
}

fn entry(package: &Path) -> Option<AppEntry> {
    let folder = package.file_name()?.to_str()?;
    let json: PortappJson = fs::read(package.join("portapp.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())?;
    let exe = exe_for(package, folder, &json.id)?;
    let mut app = AppEntry::new(
        AppId::new(Source::Portapps, folder),
        if json.name.trim().is_empty() {
            folder.trim_end_matches("-portable").to_owned()
        } else {
            json.name.trim().to_owned()
        },
    );
    CATEGORY.clone_into(&mut app.category);
    app.version = non_empty(json.version);
    app.publisher = non_empty(json.publisher);
    app.description = format!("{} (portapps.io)", app.name);
    app.icon = Some(IconSource::Executable(exe.clone()));
    app.has_icon = true;
    app.program = Some(exe);
    app.dir = Some(package.to_path_buf());
    Some(app)
}

/// `<id>.exe`, else `<folder>.exe`, else the only `*-portable.exe` in the folder.
fn exe_for(package: &Path, folder: &str, id: &str) -> Option<std::path::PathBuf> {
    let valid_id = !id.is_empty() && !id.contains(['/', '\\', '.']);
    let named = valid_id
        .then(|| package.join(format!("{id}.exe")))
        .into_iter()
        .chain([package.join(format!("{folder}.exe"))])
        .find(|path| path.is_file());
    named.or_else(|| {
        let mut candidates = list(package).into_iter().filter(|path| {
            path.is_file()
                && path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.to_ascii_lowercase().ends_with("-portable.exe"))
        });
        let first = candidates.next();
        candidates.next().is_none().then_some(first).flatten()
    })
}

fn non_empty(value: String) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn reads_portapp_json() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file(
                "phyrox-portable/portapp.json",
                r#"{"id":"phyrox-portable","guid":"x","name":"Phyrox","version":"128.0-1","publisher":"Portapps","portapps_version":"3.10"}"#,
            )?
            .file("phyrox-portable/phyrox-portable.exe", "")?
            .file("broken/portapp.json", "{")?
            .file("noexe/portapp.json", r#"{"id":"noexe"}"#)?;
        let apps = scan(tree.path());
        assert_eq!(apps.len(), 1);
        let phyrox = &apps[0];
        assert_eq!(phyrox.id.to_string(), "portapps/phyrox-portable");
        assert_eq!(phyrox.name, "Phyrox");
        assert_eq!(phyrox.version.as_deref(), Some("128.0-1"));
        assert!(matches!(phyrox.icon, Some(IconSource::Executable(_))));
        Ok(())
    }
}
