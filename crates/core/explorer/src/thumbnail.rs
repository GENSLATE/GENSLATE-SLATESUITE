//! Small JPEG/PNG renders of pictures for the icon and tile views, cached on disk.
//!
//! Raster formats only (whatever the workspace `image` features decode: PNG, JPEG, GIF, WebP,
//! BMP, ICO, TIFF); SVG, HEIC, RAW and video are [`ExplorerError::Unsupported`]. Pictures are
//! decoded upright (EXIF orientation applied), shrunk with `fast_image_resize` (Lanczos3, never
//! enlarged) and encoded as JPEG, or PNG when there is transparency to keep. Sources over
//! [`MAX_SOURCE_BYTES`] or [`MAX_PIXELS`] are refused so a decompression bomb can't exhaust
//! memory.
//!
//! [`ThumbnailCache`] keys renders by path, size, modification time and edge, so a changed file
//! gets a fresh thumbnail and the cache is always safe to delete.
//!
//! This mirrors `genslate-core-gallery`'s `thumbnail` module on purpose: two apps is not yet the
//! third repetition that would justify a shared crate, and Gallery decodes more formats.

use std::fs::{self, File};
use std::io::{BufWriter, Cursor, Write};
use std::path::{Path, PathBuf};

use fast_image_resize::images::Image;
use fast_image_resize::{IntoImageView, PixelType, ResizeAlg, ResizeOptions, Resizer};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::{
    DynamicImage, ExtendedColorType, ImageDecoder, ImageEncoder, ImageReader, Limits, RgbImage,
    RgbaImage,
};

use crate::ExplorerError;
use crate::entry::millis;
use crate::kind::extension;

/// The smallest thumbnail edge served.
pub const MIN_EDGE: u32 = 64;
/// The largest thumbnail edge served.
pub const MAX_EDGE: u32 = 512;
/// Source files larger than this are not decoded.
pub const MAX_SOURCE_BYTES: u64 = 256 * 1024 * 1024;
/// Pictures with more pixels than this (100 megapixels) are not decoded.
pub const MAX_PIXELS: u64 = 100_000_000;
/// The most memory a decoder may allocate.
const MAX_ALLOC: u64 = 512 * 1024 * 1024;
/// JPEG quality of thumbnails.
const QUALITY: u8 = 82;
/// Bump to invalidate every cached thumbnail when the rendering changes.
const CACHE_VERSION: &str = "1";

/// `edge` clamped to [`MIN_EDGE`]`..=`[`MAX_EDGE`].
pub fn clamp_edge(edge: u32) -> u32 {
    edge.clamp(MIN_EDGE, MAX_EDGE)
}

/// `true` for the extensions this module can render.
pub fn is_supported(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .and_then(extension)
        .is_some_and(|ext| {
            matches!(
                ext.as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico" | "tif" | "tiff"
            )
        })
}

/// An encoded thumbnail.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Encoded {
    /// The JPEG or PNG file.
    pub bytes: Vec<u8>,
    /// `image/jpeg` or `image/png`.
    pub mime: &'static str,
}

/// Decodes `path` and encodes it with its long edge at most `edge`.
pub fn render(path: &Path, edge: u32) -> Result<Encoded, ExplorerError> {
    let image = decode(path)?;
    encode(&fit(&image, edge).map_err(image_error(path))?).map_err(image_error(path))
}

/// Decodes a raster picture upright, refusing oversized files and pictures.
fn decode(path: &Path) -> Result<DynamicImage, ExplorerError> {
    if !is_supported(path) {
        return Err(ExplorerError::Unsupported(
            "Thumbnails are only made for PNG, JPEG, GIF, WebP, BMP, ICO and TIFF pictures.",
        ));
    }
    let size = fs::metadata(path)
        .map_err(ExplorerError::io("could not read", path))?
        .len();
    if size > MAX_SOURCE_BYTES {
        return Err(ExplorerError::Unsupported(
            "The picture is too large for a thumbnail.",
        ));
    }
    let mut reader = ImageReader::open(path)
        .map_err(ExplorerError::io("could not open", path))?
        .with_guessed_format()
        .map_err(ExplorerError::io("could not read", path))?;
    let mut limits = Limits::default();
    limits.max_alloc = Some(MAX_ALLOC);
    reader.limits(limits);
    let mut decoder = reader.into_decoder().map_err(image_error(path))?;
    let (width, height) = decoder.dimensions();
    if u64::from(width) * u64::from(height) > MAX_PIXELS {
        return Err(ExplorerError::Unsupported(
            "The picture has too many pixels for a thumbnail.",
        ));
    }
    let orientation = decoder.orientation().ok();
    let mut image = DynamicImage::from_decoder(decoder).map_err(image_error(path))?;
    if let Some(orientation) = orientation {
        image.apply_orientation(orientation);
    }
    Ok(image)
}

/// `image` shrunk (never enlarged) so its long edge is at most `edge`.
pub fn fit(image: &DynamicImage, edge: u32) -> Result<DynamicImage, String> {
    let (width, height) = (image.width(), image.height());
    let (target_width, target_height) = fit_size(width, height, edge);
    if (target_width, target_height) == (width, height) {
        return Ok(image.clone());
    }
    // fast_image_resize handles 8-bit RGB and RGBA; everything else is converted first.
    let source = if image.color().has_alpha() {
        DynamicImage::ImageRgba8(image.to_rgba8())
    } else {
        DynamicImage::ImageRgb8(image.to_rgb8())
    };
    let pixel_type = source
        .pixel_type()
        .ok_or_else(|| "unsupported pixel type".to_owned())?;
    let mut target = Image::new(target_width, target_height, pixel_type);
    let options = ResizeOptions::new().resize_alg(ResizeAlg::Convolution(
        fast_image_resize::FilterType::Lanczos3,
    ));
    Resizer::new()
        .resize(&source, &mut target, &options)
        .map_err(|error| error.to_string())?;
    let buffer = target.into_vec();
    let resized = match pixel_type {
        PixelType::U8x4 => {
            RgbaImage::from_raw(target_width, target_height, buffer).map(DynamicImage::ImageRgba8)
        }
        _ => RgbImage::from_raw(target_width, target_height, buffer).map(DynamicImage::ImageRgb8),
    };
    resized.ok_or_else(|| "the resized picture is incomplete".to_owned())
}

/// The size of `width` × `height` shrunk to fit `edge` (at least 1 × 1).
pub fn fit_size(width: u32, height: u32, edge: u32) -> (u32, u32) {
    let long = width.max(height);
    if long <= edge || long == 0 {
        return (width.max(1), height.max(1));
    }
    let scale = f64::from(edge) / f64::from(long);
    let scaled = |side: u32| round_u32(f64::from(side) * scale).max(1);
    (scaled(width), scaled(height))
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "clamped to the u32 range first"
)]
fn round_u32(value: f64) -> u32 {
    value.round().clamp(0.0, f64::from(u32::MAX)) as u32
}

/// JPEG for opaque pictures, PNG when there is transparency to keep.
fn encode(image: &DynamicImage) -> Result<Encoded, String> {
    let mut bytes = Vec::new();
    if has_transparency(image) {
        let rgba = image.to_rgba8();
        PngEncoder::new(&mut bytes)
            .write_image(
                rgba.as_raw(),
                rgba.width(),
                rgba.height(),
                ExtendedColorType::Rgba8,
            )
            .map_err(|error| error.to_string())?;
        return Ok(Encoded {
            bytes,
            mime: "image/png",
        });
    }
    JpegEncoder::new_with_quality(Cursor::new(&mut bytes), QUALITY)
        .encode_image(&image.to_rgb8())
        .map_err(|error| error.to_string())?;
    Ok(Encoded {
        bytes,
        mime: "image/jpeg",
    })
}

fn has_transparency(image: &DynamicImage) -> bool {
    image.color().has_alpha() && image.to_rgba8().pixels().any(|pixel| pixel.0[3] < 255)
}

fn image_error<E: ToString>(path: &Path) -> impl FnOnce(E) -> ExplorerError {
    let path = path.to_path_buf();
    move |error| ExplorerError::Image {
        path,
        message: error.to_string(),
    }
}

/// What identifies one render of one version of a file.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ThumbnailKey<'a> {
    /// The picture.
    pub path: &'a Path,
    /// Its size in bytes.
    pub size: u64,
    /// Its modification time, in milliseconds since the Unix epoch.
    pub modified_ms: i64,
    /// The long edge of the render.
    pub edge: u32,
}

impl<'a> ThumbnailKey<'a> {
    /// The key for the current version of `path` (a file) at `edge`.
    pub fn read(path: &'a Path, edge: u32) -> Result<Self, ExplorerError> {
        let meta = fs::metadata(path).map_err(ExplorerError::io("could not read", path))?;
        if !meta.is_file() {
            return Err(ExplorerError::Unsupported("Only files have thumbnails."));
        }
        Ok(Self {
            path,
            size: meta.len(),
            modified_ms: meta.modified().ok().and_then(millis).unwrap_or(0),
            edge,
        })
    }
}

/// Thumbnails on disk: `<dir>/<xx>/<blake3 hash>.<jpg|png>`.
#[derive(Debug, Clone)]
pub struct ThumbnailCache {
    dir: PathBuf,
}

impl ThumbnailCache {
    /// A cache in `dir` (created on first write).
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    /// The cache folder.
    pub fn dir(&self) -> &Path {
        &self.dir
    }

    fn stem(key: &ThumbnailKey<'_>) -> (String, String) {
        let mut hasher = blake3::Hasher::new();
        hasher.update(CACHE_VERSION.as_bytes());
        hasher.update(key.path.as_os_str().as_encoded_bytes());
        hasher.update(&key.size.to_le_bytes());
        hasher.update(&key.modified_ms.to_le_bytes());
        hasher.update(&key.edge.to_le_bytes());
        let hash = hasher.finalize().to_hex().to_string();
        (hash[..2].to_owned(), hash)
    }

    /// The cached render, if there is one.
    pub fn get(&self, key: &ThumbnailKey<'_>) -> Option<Encoded> {
        let (folder, hash) = Self::stem(key);
        [("jpg", "image/jpeg"), ("png", "image/png")]
            .into_iter()
            .find_map(|(extension, mime)| {
                let path = self.dir.join(&folder).join(format!("{hash}.{extension}"));
                fs::read(path).ok().map(|bytes| Encoded { bytes, mime })
            })
    }

    /// Stores `encoded` for `key` (written to a temporary file, then renamed, so readers never
    /// see half a file).
    pub fn put(&self, key: &ThumbnailKey<'_>, encoded: &Encoded) -> Result<(), ExplorerError> {
        let (folder, hash) = Self::stem(key);
        let folder = self.dir.join(folder);
        fs::create_dir_all(&folder).map_err(ExplorerError::io("could not create", &folder))?;
        let extension = if encoded.mime == "image/png" {
            "png"
        } else {
            "jpg"
        };
        let target = folder.join(format!("{hash}.{extension}"));
        // The thread id keeps two workers rendering the same picture from sharing a file.
        let temporary = folder.join(format!(
            "{hash}.{}.{:?}.tmp",
            std::process::id(),
            std::thread::current().id()
        ));
        let written = File::create(&temporary).and_then(|file| {
            let mut writer = BufWriter::new(file);
            writer.write_all(&encoded.bytes)?;
            writer.flush()
        });
        if let Err(error) = written {
            // Best effort: a stray temporary file is harmless and cleared with the cache.
            let _ = fs::remove_file(&temporary);
            return Err(ExplorerError::io("could not write", &temporary)(error));
        }
        fs::rename(&temporary, &target).map_err(ExplorerError::io("could not write", &target))
    }

    /// The cached render, else renders it now and stores it (a failed store is only logged).
    pub fn get_or_render(&self, key: &ThumbnailKey<'_>) -> Result<Encoded, ExplorerError> {
        if let Some(cached) = self.get(key) {
            return Ok(cached);
        }
        let encoded = render(key.path, key.edge)?;
        if let Err(error) = self.put(key, &encoded) {
            log::warn!("thumbnail cache: {error}");
        }
        Ok(encoded)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;
    use image::{ImageFormat, Rgb, Rgba};

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn picture(width: u32, height: u32, format: ImageFormat) -> Result<Vec<u8>, image::ImageError> {
        let mut bytes = Vec::new();
        let image = if format == ImageFormat::Png {
            // Half transparent: the thumbnail must stay a PNG.
            DynamicImage::ImageRgba8(RgbaImage::from_fn(width, height, |x, _| {
                Rgba([200, 100, 50, if x < width / 2 { 0 } else { 255 }])
            }))
        } else {
            DynamicImage::ImageRgb8(RgbImage::from_pixel(width, height, Rgb([10, 120, 200])))
        };
        image.write_to(&mut Cursor::new(&mut bytes), format)?;
        Ok(bytes)
    }

    #[test]
    fn fit_keeps_the_aspect_and_never_enlarges() {
        assert_eq!(fit_size(4000, 3000, 512), (512, 384));
        assert_eq!(fit_size(3000, 4000, 512), (384, 512));
        assert_eq!(fit_size(100, 50, 512), (100, 50));
        assert_eq!(fit_size(10_000, 1, 512), (512, 1));
        assert_eq!(fit_size(0, 0, 512), (1, 1));
        assert_eq!(clamp_edge(1), MIN_EDGE);
        assert_eq!(clamp_edge(10_000), MAX_EDGE);
        assert_eq!(clamp_edge(256), 256);
    }

    #[test]
    fn renders_png_and_jpeg() -> TestResult {
        let tree = TempTree::new()?
            .file("a.png", picture(400, 200, ImageFormat::Png)?)?
            .file("b.jpg", picture(300, 600, ImageFormat::Jpeg)?)?
            .file("small.jpg", picture(40, 30, ImageFormat::Jpeg)?)?;
        let png = render(&tree.join("a.png"), 128)?;
        assert_eq!(png.mime, "image/png", "transparency is kept");
        let image = image::load_from_memory(&png.bytes)?;
        assert_eq!((image.width(), image.height()), (128, 64));

        let jpeg = render(&tree.join("b.jpg"), 128)?;
        assert_eq!(jpeg.mime, "image/jpeg");
        let image = image::load_from_memory(&jpeg.bytes)?;
        assert_eq!((image.width(), image.height()), (64, 128));

        let small = image::load_from_memory(&render(&tree.join("small.jpg"), 128)?.bytes)?;
        assert_eq!((small.width(), small.height()), (40, 30), "never enlarged");
        Ok(())
    }

    #[test]
    fn refuses_other_formats_and_broken_files() -> TestResult {
        let tree = TempTree::new()?
            .file("a.svg", "<svg/>")?
            .file("bad.png", "not a png")?;
        let error = render(&tree.join("a.svg"), 128)
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "unsupported");
        let error = render(&tree.join("bad.png"), 128)
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "image");
        Ok(())
    }

    #[test]
    fn cache_hits_return_the_same_bytes() -> TestResult {
        let tree = TempTree::new()?.file("a.jpg", picture(300, 200, ImageFormat::Jpeg)?)?;
        let cache = ThumbnailCache::new(tree.join("cache"));
        let path = tree.join("a.jpg");
        let key = ThumbnailKey::read(&path, 64)?;
        assert!(cache.get(&key).is_none());
        let first = cache.get_or_render(&key)?;
        assert_eq!(cache.get(&key), Some(first.clone()));
        assert_eq!(cache.get_or_render(&key)?, first);
        let newer = ThumbnailKey {
            modified_ms: key.modified_ms + 1,
            ..key
        };
        assert!(cache.get(&newer).is_none(), "a new version misses");
        Ok(())
    }
}
