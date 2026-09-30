//! Which files belong in the library, and how each format is read.

use std::path::Path;

use serde::{Deserialize, Serialize};

/// Photo or video.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MediaKind {
    Image,
    Video,
}

impl MediaKind {
    /// The name stored in the database.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::Video => "video",
        }
    }

    /// Parses [`as_str`](Self::as_str).
    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "image" => Some(Self::Image),
            "video" => Some(Self::Video),
            _ => None,
        }
    }
}

/// How a file's pixels are decoded.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Format {
    /// JPEG, PNG, GIF, WebP, BMP, TIFF, ICO (the `image` crate).
    Raster,
    /// SVG (`resvg`).
    Svg,
    /// JPEG XL (`jxl-oxide`).
    JpegXl,
    /// HEIC, HEIF and AVIF: listed with their metadata, no thumbnail yet.
    Heif,
    /// Camera RAW: listed with their metadata, no thumbnail yet.
    Raw,
    /// Played by the webview; the thumbnail is a frame it grabs.
    Video,
}

impl Format {
    /// The format of `path`, from its extension, or `None` when it isn't a photo or video.
    pub fn of(path: &Path) -> Option<Self> {
        let extension = path.extension()?.to_str()?.to_ascii_lowercase();
        Some(match extension.as_str() {
            "jpg" | "jpeg" | "jpe" | "jfif" | "png" | "apng" | "gif" | "webp" | "bmp" | "tif"
            | "tiff" | "ico" => Self::Raster,
            "svg" => Self::Svg,
            "jxl" => Self::JpegXl,
            "heic" | "heif" | "hif" | "avif" => Self::Heif,
            "dng" | "cr2" | "cr3" | "nef" | "nrw" | "arw" | "srf" | "sr2" | "raf" | "orf"
            | "rw2" | "pef" | "srw" | "x3f" | "3fr" | "iiq" => Self::Raw,
            "mp4" | "m4v" | "mov" | "webm" | "mkv" | "3gp" | "avi" => Self::Video,
            _ => return None,
        })
    }

    pub fn kind(self) -> MediaKind {
        match self {
            Self::Video => MediaKind::Video,
            _ => MediaKind::Image,
        }
    }

    /// Gallery can make a thumbnail and decode the full image (for edits and exports).
    pub fn decodable(self) -> bool {
        matches!(self, Self::Raster | Self::Svg | Self::JpegXl)
    }
}

/// The MIME type served for `path` (by extension), for the webview's `<img>` and `<video>`.
pub fn mime(path: &Path) -> &'static str {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    match extension.as_str() {
        "jpg" | "jpeg" | "jpe" | "jfif" => "image/jpeg",
        "png" => "image/png",
        "apng" => "image/apng",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "tif" | "tiff" => "image/tiff",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        "jxl" => "image/jxl",
        "heic" | "hif" => "image/heic",
        "heif" => "image/heif",
        "avif" => "image/avif",
        "mp4" | "m4v" => "video/mp4",
        "mov" => "video/quicktime",
        "webm" => "video/webm",
        "mkv" => "video/x-matroska",
        "3gp" => "video/3gpp",
        "avi" => "video/x-msvideo",
        _ => "application/octet-stream",
    }
}

/// `true` for images the webview shows as they are (no conversion needed in the viewer).
pub fn webview_can_show(path: &Path) -> bool {
    matches!(
        mime(path),
        "image/jpeg"
            | "image/png"
            | "image/apng"
            | "image/gif"
            | "image/webp"
            | "image/bmp"
            | "image/x-icon"
            | "image/svg+xml"
            | "image/avif"
    )
}

/// A likely screenshot or screen recording, by name ("Screenshot 2026-…", "Screen Shot …",
/// "Bildschirmfoto …") or by sitting in a `Screenshots` folder.
pub fn looks_like_screenshot(path: &Path) -> bool {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_lowercase();
    let in_folder = path
        .parent()
        .and_then(|parent| parent.file_name())
        .and_then(|name| name.to_str())
        .is_some_and(|name| {
            let name = name.to_lowercase();
            name == "screenshots" || name == "screen recordings"
        });
    in_folder
        || [
            "screenshot",
            "screen shot",
            "screen recording",
            "bildschirmfoto",
            "capture d’écran",
            "capture d'écran",
        ]
        .iter()
        .any(|prefix| name.starts_with(prefix))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_by_extension() {
        assert_eq!(Format::of(Path::new("/a/IMG_1.JPG")), Some(Format::Raster));
        assert_eq!(Format::of(Path::new("/a/b.svg")), Some(Format::Svg));
        assert_eq!(Format::of(Path::new("/a/b.jxl")), Some(Format::JpegXl));
        assert_eq!(Format::of(Path::new("/a/b.HEIC")), Some(Format::Heif));
        assert_eq!(Format::of(Path::new("/a/b.nef")), Some(Format::Raw));
        assert_eq!(Format::of(Path::new("/a/b.mov")), Some(Format::Video));
        assert_eq!(Format::of(Path::new("/a/b.txt")), None);
        assert_eq!(Format::of(Path::new("/a/noext")), None);
        assert_eq!(Format::Video.kind(), MediaKind::Video);
        assert!(Format::Raster.decodable());
        assert!(!Format::Heif.decodable());
    }

    #[test]
    fn mimes() {
        assert_eq!(mime(Path::new("a.JPEG")), "image/jpeg");
        assert_eq!(mime(Path::new("a.mov")), "video/quicktime");
        assert_eq!(mime(Path::new("a")), "application/octet-stream");
        assert!(webview_can_show(Path::new("a.webp")));
        assert!(!webview_can_show(Path::new("a.tiff")));
    }

    #[test]
    fn screenshots() {
        assert!(looks_like_screenshot(Path::new(
            "/p/Screenshot 2026-09-01 at 10.00.png"
        )));
        assert!(looks_like_screenshot(Path::new("/p/Screenshots/x.png")));
        assert!(!looks_like_screenshot(Path::new("/p/beach.jpg")));
    }

    #[test]
    fn kinds_round_trip() {
        for kind in [MediaKind::Image, MediaKind::Video] {
            assert_eq!(MediaKind::parse(kind.as_str()), Some(kind));
        }
        assert_eq!(MediaKind::parse("audio"), None);
    }
}
