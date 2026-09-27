//! App icons for the UI, served by id (the UI never sends paths).
//!
//! - GENSLATE apps: `other/resources/icons/genslate/<app>.svg`, cropped to the icon plate.
//! - PortableApps.com: `appicon_*.png`, or the best image of `appicon.ico`.
//! - portapps.io: the icon embedded in the `.exe` (pure-Rust PE parsing), cached as PNG.

use std::fs;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use crate::LauncherError;
use crate::error::{read_error, write_error};

/// Where an app's icon comes from.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IconSource {
    /// A GENSLATE icon-family SVG (1024 grid, plate at 100..924).
    Svg(PathBuf),
    /// A PNG file.
    Image(PathBuf),
    /// A `.ico` file.
    Ico(PathBuf),
    /// The icon resource of a Windows executable.
    Executable(PathBuf),
}

/// Icon bytes and their MIME type.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IconData {
    pub bytes: Vec<u8>,
    pub mime: &'static str,
}

/// Loads an icon, using (and filling) `cache_dir` for icons that are expensive to extract.
pub fn load_icon(source: &IconSource, cache_dir: &Path) -> Result<IconData, LauncherError> {
    match source {
        IconSource::Svg(path) => {
            let svg = fs::read_to_string(path).map_err(read_error(path))?;
            Ok(IconData {
                bytes: crop_to_plate(&svg).into_bytes(),
                mime: "image/svg+xml",
            })
        }
        IconSource::Image(path) => Ok(IconData {
            bytes: fs::read(path).map_err(read_error(path))?,
            mime: "image/png",
        }),
        IconSource::Ico(path) => {
            let bytes = fs::read(path).map_err(read_error(path))?;
            Ok(png(
                best_ico_image(&bytes).map_err(|message| invalid(path, &message))?
            ))
        }
        IconSource::Executable(path) => cached_exe_icon(path, cache_dir),
    }
}

/// The GENSLATE icon SVGs sit on the macOS icon grid (plate 824 px at 100,100). List rows show
/// just the plate, so crop the viewBox and drop the fixed size and the grid's drop shadow.
fn crop_to_plate(svg: &str) -> String {
    svg.replacen(
        "viewBox=\"0 0 1024 1024\"",
        "viewBox=\"100 100 824 824\"",
        1,
    )
    .replacen(" width=\"1024\" height=\"1024\"", "", 1)
    .replace(" filter=\"url(#drop)\"", "")
}

fn cached_exe_icon(exe: &Path, cache_dir: &Path) -> Result<IconData, LauncherError> {
    let meta = fs::metadata(exe).map_err(read_error(exe))?;
    let mut hasher = DefaultHasher::new();
    exe.hash(&mut hasher);
    meta.len().hash(&mut hasher);
    meta.modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|age| age.as_secs())
        .hash(&mut hasher);
    let cached = cache_dir
        .join("icons")
        .join(format!("{:016x}.png", hasher.finish()));
    if let Ok(bytes) = fs::read(&cached) {
        return Ok(IconData {
            bytes,
            mime: "image/png",
        });
    }
    let bytes = fs::read(exe).map_err(read_error(exe))?;
    let ico = exe_icon_group(&bytes).map_err(|message| invalid(exe, &message))?;
    let data = png(best_ico_image(&ico).map_err(|message| invalid(exe, &message))?);
    if let Some(parent) = cached.parent() {
        fs::create_dir_all(parent).map_err(write_error(parent))?;
    }
    // The cache is an optimisation: failing to write it must not hide the icon.
    if let Err(error) = fs::write(&cached, &data.bytes) {
        log::debug!("icon cache write failed for {}: {error}", cached.display());
    }
    Ok(data)
}

/// Rebuilds the first icon group of a PE file as `.ico` bytes.
fn exe_icon_group(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let file = pelite::PeFile::from_bytes(bytes).map_err(|error| error.to_string())?;
    let resources = file.resources().map_err(|error| error.to_string())?;
    let (_, group) = resources
        .icons()
        .find_map(Result::ok)
        .ok_or_else(|| "no icon resource".to_owned())?;
    let mut ico = Vec::new();
    group.write(&mut ico).map_err(|error| error.to_string())?;
    Ok(ico)
}

/// Picks the largest image up to 128 px (sharp at 28–56 px, not huge), as PNG bytes.
fn best_ico_image(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let dir = ico::IconDir::read(Cursor::new(bytes)).map_err(|error| error.to_string())?;
    let entry = dir
        .entries()
        .iter()
        .max_by_key(|entry| {
            let width = entry.width();
            (width <= 128, width, entry.bits_per_pixel())
        })
        .ok_or_else(|| "empty icon".to_owned())?;
    let image = entry.decode().map_err(|error| error.to_string())?;
    let mut out = Vec::new();
    image
        .write_png(&mut out)
        .map_err(|error| error.to_string())?;
    Ok(out)
}

fn png(bytes: Vec<u8>) -> IconData {
    IconData {
        bytes,
        mime: "image/png",
    }
}

fn invalid(path: &Path, message: &str) -> LauncherError {
    LauncherError::Parse {
        path: path.to_path_buf(),
        message: format!("icon: {message}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    fn sample_ico() -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut dir = ico::IconDir::new(ico::ResourceType::Icon);
        for size in [16, 48, 256] {
            let image =
                ico::IconImage::from_rgba_data(size, size, vec![200; (size * size * 4) as usize]);
            dir.add_entry(ico::IconDirEntry::encode(&image)?);
        }
        let mut bytes = Vec::new();
        dir.write(&mut bytes)?;
        Ok(bytes)
    }

    #[test]
    fn crops_genslate_svgs_to_the_plate() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file(
            "x.svg",
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\"><rect filter=\"url(#drop)\"/></svg>",
        )?;
        let icon = load_icon(&IconSource::Svg(tree.join("x.svg")), tree.path())?;
        let text = String::from_utf8(icon.bytes)?;
        assert_eq!(icon.mime, "image/svg+xml");
        assert!(text.contains("viewBox=\"100 100 824 824\""));
        assert!(!text.contains("width=\"1024\"") && !text.contains("filter="));
        Ok(())
    }

    #[test]
    fn ico_files_become_png_of_the_best_size() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("app.ico", sample_ico()?)?;
        let icon = load_icon(&IconSource::Ico(tree.join("app.ico")), tree.path())?;
        assert_eq!(icon.mime, "image/png");
        let image = ico::IconImage::read_png(Cursor::new(icon.bytes))?;
        assert_eq!(image.width(), 48, "largest ≤ 128 px wins");
        Ok(())
    }

    #[test]
    fn non_pe_files_report_a_parse_error() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("fake.exe", "not a PE file")?;
        let error = load_icon(&IconSource::Executable(tree.join("fake.exe")), tree.path())
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "parse");
        Ok(())
    }

    #[cfg(windows)]
    #[test]
    fn extracts_and_caches_real_exe_icons() -> Result<(), Box<dyn std::error::Error>> {
        // Every Windows install has notepad.exe with an icon group.
        let root = std::env::var_os("SystemRoot").ok_or("SystemRoot")?;
        let notepad = Path::new(&root).join("System32").join("notepad.exe");
        if !notepad.is_file() {
            return Ok(());
        }
        let cache = TempTree::new()?;
        let first = load_icon(&IconSource::Executable(notepad.clone()), cache.path())?;
        assert_eq!(first.mime, "image/png");
        assert_eq!(fs::read_dir(cache.join("icons"))?.count(), 1);
        let second = load_icon(&IconSource::Executable(notepad), cache.path())?;
        assert_eq!(first, second);
        Ok(())
    }
}
