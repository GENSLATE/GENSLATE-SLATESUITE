//! PortableApps.com Format apps in `programs/portableapps.com/`.
//!
//! Each package is `<Name>Portable/` with `App/AppInfo/appinfo.ini` (`[Details]`, `[Version]`,
//! `[Control] Start=`, `Icons=N`, `StartN=`/`NameN=`) and icons `App/AppInfo/appicon*_{16,32,75,128,256}.png`
//! / `appicon*.ico`. Spec: <https://portableapps.com/development/portableapps.com_format>.

use std::fs;
use std::path::{Path, PathBuf};

use ini::Ini;

use super::genslate::{is_relative_inside, list};
use super::icon::IconSource;
use super::model::{AppEntry, AppId, Source};

/// Folders the PortableApps.com platform keeps next to apps; they are not apps.
const NOT_APPS: [&str; 2] = ["PortableApps.com", "CommonFiles"];

/// Scans `dir` (`programs/portableapps.com/`).
pub fn scan(dir: &Path) -> Vec<AppEntry> {
    list(dir)
        .into_iter()
        .filter(|path| path.is_dir())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| !NOT_APPS.iter().any(|skip| name.starts_with(skip)))
        })
        .flat_map(|package| package_entries(&package))
        .collect()
}

fn package_entries(package: &Path) -> Vec<AppEntry> {
    let Some(folder) = package.file_name().and_then(|name| name.to_str()) else {
        return Vec::new();
    };
    let info_dir = package.join("App").join("AppInfo");
    let ini = fs::read(info_dir.join("appinfo.ini"))
        .ok()
        .and_then(|bytes| Ini::load_from_str_noescape(&decode_text(&bytes)).ok());
    let Some(ini) = ini else {
        // No (readable) appinfo.ini: still list `<Folder>/<Folder>.exe` if it's there.
        let exe = package.join(format!("{folder}.exe"));
        return if exe.is_file() {
            let mut app = AppEntry::new(
                AppId::new(Source::PortableApps, folder),
                pretty_name(folder),
            );
            "Other".clone_into(&mut app.category);
            app.program = Some(exe);
            app.dir = Some(package.to_path_buf());
            vec![app]
        } else {
            Vec::new()
        };
    };

    let get = |section: &str, key: &str| {
        ini.get_from(Some(section), key)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
    };
    let name = get("Details", "Name").unwrap_or_else(|| pretty_name(folder));
    let start = get("Control", "Start")
        .filter(|start| is_relative_inside(split_start(start).0))
        .unwrap_or_else(|| format!("{folder}.exe"));
    let icons: u32 = get("Control", "Icons")
        .and_then(|count| count.parse().ok())
        .unwrap_or(1);

    let base = |id: AppId, name: String, start: &str, icon_suffix: &str| {
        let mut app = AppEntry::new(id, name);
        app.description = get("Details", "Description").unwrap_or_default();
        app.category = get("Details", "Category").unwrap_or_else(|| "Other".to_owned());
        app.publisher = get("Details", "Publisher");
        app.version = get("Version", "DisplayVersion").or_else(|| get("Version", "PackageVersion"));
        let (path, args) = split_start(start);
        let program = package.join(path);
        app.program = program.is_file().then_some(program);
        app.args = args;
        app.dir = Some(package.to_path_buf());
        app.icon = find_icon(&info_dir, icon_suffix);
        app.has_icon = app.icon.is_some();
        app
    };

    let mut entries = vec![base(
        AppId::new(Source::PortableApps, folder),
        name,
        &start,
        "",
    )];
    // Extra menu entries: Start2/Name2 … (Start1/Name1 repeat the main entry when present).
    for index in 2..=icons.min(32) {
        let (Some(extra_start), Some(extra_name)) = (
            get("Control", &format!("Start{index}")),
            get("Control", &format!("Name{index}")),
        ) else {
            continue;
        };
        if !is_relative_inside(split_start(&extra_start).0) {
            continue;
        }
        let id = AppId::new(Source::PortableApps, format!("{folder}#{index}"));
        entries.push(base(id, extra_name, &extra_start, &index.to_string()));
    }
    entries
}

/// `Start=App.exe -flag` → (`App.exe`, [`-flag`]). Paths with spaces before `.exe` stay intact.
fn split_start(start: &str) -> (&str, Vec<String>) {
    let lower = start.to_ascii_lowercase();
    match lower.find(".exe ") {
        Some(end) => {
            let (path, rest) = start.split_at(end + 4);
            (
                path.trim(),
                rest.split_whitespace().map(str::to_owned).collect(),
            )
        }
        None => (start.trim(), Vec::new()),
    }
}

/// Best icon for `appicon{suffix}`: the 75/128/32 px PNGs, then the `.ico`.
fn find_icon(info_dir: &Path, suffix: &str) -> Option<IconSource> {
    ["75", "128", "32", "256", "16"]
        .iter()
        .map(|size| info_dir.join(format!("appicon{suffix}_{size}.png")))
        .find(|path| path.is_file())
        .map(IconSource::Image)
        .or_else(|| {
            let ico: PathBuf = info_dir.join(format!("appicon{suffix}.ico"));
            ico.is_file().then_some(IconSource::Ico(ico))
        })
}

/// appinfo.ini is UTF-8 (optionally with a BOM) or UTF-16LE with a BOM.
fn decode_text(bytes: &[u8]) -> String {
    match bytes {
        [0xFF, 0xFE, rest @ ..] => utf16(rest, u16::from_le_bytes),
        [0xFE, 0xFF, rest @ ..] => utf16(rest, u16::from_be_bytes),
        [0xEF, 0xBB, 0xBF, rest @ ..] => String::from_utf8_lossy(rest).into_owned(),
        _ => String::from_utf8_lossy(bytes).into_owned(),
    }
}

fn utf16(bytes: &[u8], read: fn([u8; 2]) -> u16) -> String {
    let units: Vec<u16> = bytes
        .as_chunks::<2>()
        .0
        .iter()
        .map(|pair| read(*pair))
        .collect();
    String::from_utf16_lossy(&units)
}

/// `FirefoxPortable` → `Firefox`.
fn pretty_name(folder: &str) -> String {
    folder.strip_suffix("Portable").unwrap_or(folder).to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::icon::IconSource;
    use genslate_testing::TempTree;

    const APPINFO: &str = "[Format]\nType=PortableApps.comFormat\nVersion=3.9\n\n[Details]\nName=Mozilla Firefox, Portable Edition\nAppID=FirefoxPortable\nPublisher=Mozilla & PortableApps.com\nCategory=Internet\nDescription=Web browser\n\n[Version]\nPackageVersion=130.0.0.0\nDisplayVersion=130.0 Rev 2\n\n[Control]\nIcons=2\nStart=FirefoxPortable.exe\nStart2=FirefoxPortable.exe -private\nName2=Firefox (Private)\n";

    #[test]
    fn parses_appinfo_with_extra_entries() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("FirefoxPortable/FirefoxPortable.exe", "")?
            .file("FirefoxPortable/App/AppInfo/appinfo.ini", APPINFO)?
            .file("FirefoxPortable/App/AppInfo/appicon_75.png", "png")?
            .file("PortableApps.com/PortableAppsPlatform.exe", "")?
            .dir("CommonFiles/Java")?;
        let apps = scan(tree.path());
        assert_eq!(apps.len(), 2);
        let firefox = &apps[0];
        assert_eq!(firefox.id.to_string(), "portableapps/FirefoxPortable");
        assert_eq!(firefox.name, "Mozilla Firefox, Portable Edition");
        assert_eq!(firefox.category, "Internet");
        assert_eq!(firefox.version.as_deref(), Some("130.0 Rev 2"));
        assert!(firefox.program.is_some());
        assert!(matches!(firefox.icon, Some(IconSource::Image(_))));
        assert_eq!(apps[1].id.key, "FirefoxPortable#2");
        assert_eq!(apps[1].name, "Firefox (Private)");
        assert_eq!(apps[1].args, ["-private"]);
        assert!(apps[1].program.is_some());
        Ok(())
    }

    #[test]
    fn reads_utf16_appinfo() -> Result<(), Box<dyn std::error::Error>> {
        let mut bytes = vec![0xFF, 0xFE];
        for unit in "[Details]\r\nName=Ünïcode App\r\nCategory=Office\r\n".encode_utf16() {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }
        let tree = TempTree::new()?.file("UniPortable/App/AppInfo/appinfo.ini", bytes)?;
        let apps = scan(tree.path());
        assert_eq!(apps.first().map(|a| a.name.as_str()), Some("Ünïcode App"));
        assert_eq!(
            apps.first().and_then(|a| a.program.as_ref()),
            None,
            "exe missing"
        );
        Ok(())
    }

    #[test]
    fn folders_without_appinfo_need_a_matching_exe() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("ToolPortable/ToolPortable.exe", "")?
            .file("Random/readme.txt", "")?;
        let apps = scan(tree.path());
        assert_eq!(apps.len(), 1);
        assert_eq!(apps[0].name, "Tool");
        Ok(())
    }

    #[test]
    fn start_paths_cannot_escape() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file(
                "EvilPortable/App/AppInfo/appinfo.ini",
                "[Control]\nStart=..\\..\\evil.exe\n",
            )?
            .file("EvilPortable/EvilPortable.exe", "")?;
        let apps = scan(tree.path());
        let program = apps
            .first()
            .and_then(|a| a.program.clone())
            .ok_or("program")?;
        assert!(program.ends_with("EvilPortable.exe"));
        Ok(())
    }
}
