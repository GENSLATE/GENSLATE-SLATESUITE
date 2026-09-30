//! Decoding, resizing and the thumbnail cache.
//!
//! Every decodable format ([`Format::decodable`]) becomes an upright [`DynamicImage`]
//! (EXIF orientation applied); [`fit`] shrinks it with `fast_image_resize` (SIMD) and
//! [`ThumbnailCache`] keeps the small JPEG or PNG results on disk, keyed by the file's path,
//! size and modification time, so a changed file gets a fresh thumbnail and the cache is
//! always safe to delete.

use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Cursor, Write};
use std::path::{Path, PathBuf};

use fast_image_resize::images::Image;
use fast_image_resize::{IntoImageView, PixelType, ResizeAlg, ResizeOptions, Resizer};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::{
    DynamicImage, ExtendedColorType, ImageDecoder, ImageEncoder, ImageReader, RgbImage, RgbaImage,
};

use crate::GalleryError;
use crate::kind::Format;
use crate::metadata::round_u32;

/// The long edge of grid thumbnails.
pub const THUMB_EDGE: u32 = 512;
/// The long edge of the viewer's stand-in for formats the webview can't show (TIFF, JPEG XL).
pub const DISPLAY_EDGE: u32 = 2560;
/// JPEG quality of cached thumbnails.
const THUMB_QUALITY: u8 = 82;
/// Bump to invalidate every cached thumbnail when the rendering changes.
const CACHE_VERSION: &str = "1";

/// Decodes `path` upright.
pub fn decode(path: &Path, format: Format) -> Result<DynamicImage, GalleryError> {
    match format {
        Format::Raster => decode_raster(path),
        Format::Svg => decode_svg(path, DISPLAY_EDGE),
        Format::JpegXl => decode_jxl(path),
        Format::Heif | Format::Raw | Format::Video => Err(GalleryError::Unsupported(
            "Gallery can't decode this format yet.",
        )),
    }
}

fn decode_raster(path: &Path) -> Result<DynamicImage, GalleryError> {
    let reader = ImageReader::open(path)
        .map_err(GalleryError::io("could not open", path))?
        .with_guessed_format()
        .map_err(GalleryError::io("could not read", path))?;
    let mut decoder = reader
        .into_decoder()
        .map_err(|error| GalleryError::decode(path)(&error))?;
    let orientation = decoder.orientation().ok();
    let mut image =
        DynamicImage::from_decoder(decoder).map_err(|error| GalleryError::decode(path)(&error))?;
    if let Some(orientation) = orientation {
        image.apply_orientation(orientation);
    }
    Ok(image)
}

fn decode_jxl(path: &Path) -> Result<DynamicImage, GalleryError> {
    let file = File::open(path).map_err(GalleryError::io("could not open", path))?;
    let decoder = jxl_oxide::integration::JxlDecoder::new(BufReader::new(file))
        .map_err(|error| GalleryError::decode(path)(&error))?;
    DynamicImage::from_decoder(decoder).map_err(|error| GalleryError::decode(path)(&error))
}

/// Renders an SVG so its long edge is `edge` pixels.
fn decode_svg(path: &Path, edge: u32) -> Result<DynamicImage, GalleryError> {
    use resvg::{tiny_skia, usvg};

    let data = fs::read(path).map_err(GalleryError::io("could not read", path))?;
    let tree = usvg::Tree::from_data(&data, &usvg::Options::default())
        .map_err(|error| GalleryError::decode(path)(&error))?;
    let size = tree.size();
    let long = size.width().max(size.height()).max(1.0);
    #[expect(
        clippy::cast_precision_loss,
        reason = "edge is a pixel size far below f32's exact range"
    )]
    let scale = edge as f32 / long;
    let width = round_u32(size.width() * scale).max(1);
    let height = round_u32(size.height() * scale).max(1);
    let mut pixmap = tiny_skia::Pixmap::new(width, height)
        .ok_or_else(|| GalleryError::decode(path)(&"the drawing has no size"))?;
    resvg::render(
        &tree,
        tiny_skia::Transform::from_scale(scale, scale),
        &mut pixmap.as_mut(),
    );
    RgbaImage::from_raw(width, height, pixmap.take_demultiplied())
        .map(DynamicImage::ImageRgba8)
        .ok_or_else(|| GalleryError::decode(path)(&"the drawing could not be rendered"))
}

/// `image` shrunk (never enlarged) so its long edge is at most `edge`.
pub fn fit(image: &DynamicImage, edge: u32) -> Result<DynamicImage, GalleryError> {
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
        .ok_or_else(|| GalleryError::Encode("unsupported pixel type".to_owned()))?;
    let mut target = Image::new(target_width, target_height, pixel_type);
    let options = ResizeOptions::new().resize_alg(ResizeAlg::Convolution(
        fast_image_resize::FilterType::Lanczos3,
    ));
    Resizer::new()
        .resize(&source, &mut target, &options)
        .map_err(|error| GalleryError::Encode(error.to_string()))?;
    let buffer = target.into_vec();
    let resized = match pixel_type {
        PixelType::U8x4 => {
            RgbaImage::from_raw(target_width, target_height, buffer).map(DynamicImage::ImageRgba8)
        }
        _ => RgbImage::from_raw(target_width, target_height, buffer).map(DynamicImage::ImageRgb8),
    };
    resized.ok_or_else(|| GalleryError::Encode("the resized image is incomplete".to_owned()))
}

/// The size of `width` × `height` shrunk to fit `edge` (at least 1 × 1).
pub fn fit_size(width: u32, height: u32, edge: u32) -> (u32, u32) {
    let long = width.max(height);
    if long <= edge || long == 0 {
        return (width.max(1), height.max(1));
    }
    let scale = f64::from(edge) / f64::from(long);
    let scaled = |side: u32| round_f64(f64::from(side) * scale).max(1);
    (scaled(width), scaled(height))
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "clamped to the u32 range first"
)]
pub(crate) fn round_f64(value: f64) -> u32 {
    value.round().clamp(0.0, f64::from(u32::MAX)) as u32
}

/// An encoded small image.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Encoded {
    pub bytes: Vec<u8>,
    pub mime: &'static str,
}

/// JPEG for opaque images, PNG when there is transparency to keep.
pub fn encode_small(image: &DynamicImage) -> Result<Encoded, GalleryError> {
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
            .map_err(|error| GalleryError::Encode(error.to_string()))?;
        return Ok(Encoded {
            bytes,
            mime: "image/png",
        });
    }
    let rgb = image.to_rgb8();
    JpegEncoder::new_with_quality(Cursor::new(&mut bytes), THUMB_QUALITY)
        .encode_image(&rgb)
        .map_err(|error| GalleryError::Encode(error.to_string()))?;
    Ok(Encoded {
        bytes,
        mime: "image/jpeg",
    })
}

fn has_transparency(image: &DynamicImage) -> bool {
    image.color().has_alpha() && image.to_rgba8().pixels().any(|pixel| pixel.0[3] < 255)
}

/// Decodes `path` and encodes it with its long edge at most `edge`.
pub fn render(path: &Path, format: Format, edge: u32) -> Result<Encoded, GalleryError> {
    let image = match format {
        // Render SVGs straight at the target size (sharp, and no huge intermediate).
        Format::Svg => decode_svg(path, edge)?,
        _ => decode(path, format)?,
    };
    encode_small(&fit(&image, edge)?)
}

/// Small renders on disk (`<cache dir>/thumbs/<xx>/<hash>.<jpg|png>`).
#[derive(Debug, Clone)]
pub struct ThumbnailCache {
    dir: PathBuf,
}

/// What identifies one render of one file version.
#[derive(Debug, Clone, Copy)]
pub struct ThumbnailKey<'a> {
    pub path: &'a Path,
    pub size: u64,
    pub modified_ms: i64,
    pub edge: u32,
}

impl ThumbnailCache {
    /// A cache in `dir` (created on first write).
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

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
        for (extension, mime) in [("jpg", "image/jpeg"), ("png", "image/png")] {
            let path = self.dir.join(&folder).join(format!("{hash}.{extension}"));
            if let Ok(bytes) = fs::read(&path) {
                return Some(Encoded { bytes, mime });
            }
        }
        None
    }

    /// Stores `encoded` for `key` (written to a temporary file, then renamed, so readers never
    /// see half a file).
    pub fn put(&self, key: &ThumbnailKey<'_>, encoded: &Encoded) -> Result<(), GalleryError> {
        let (folder, hash) = Self::stem(key);
        let folder = self.dir.join(folder);
        fs::create_dir_all(&folder).map_err(GalleryError::io("could not create", &folder))?;
        let extension = if encoded.mime == "image/png" {
            "png"
        } else {
            "jpg"
        };
        let target = folder.join(format!("{hash}.{extension}"));
        let temporary = folder.join(format!("{hash}.{}.tmp", std::process::id()));
        let written = File::create(&temporary).and_then(|file| {
            let mut writer = BufWriter::new(file);
            writer.write_all(&encoded.bytes)?;
            writer.flush()
        });
        if let Err(error) = written {
            let _ = fs::remove_file(&temporary);
            return Err(GalleryError::io("could not write", &temporary)(error));
        }
        fs::rename(&temporary, &target).map_err(GalleryError::io("could not write", &target))
    }

    /// The cached render, else renders it now and stores it.
    pub fn get_or_render(
        &self,
        key: &ThumbnailKey<'_>,
        format: Format,
    ) -> Result<Encoded, GalleryError> {
        if let Some(cached) = self.get(key) {
            return Ok(cached);
        }
        let encoded = render(key.path, format, key.edge)?;
        if let Err(error) = self.put(key, &encoded) {
            log::warn!("thumbnail cache: {error}");
        }
        Ok(encoded)
    }

    /// Deletes every cached render.
    pub fn clear(&self) -> Result<(), GalleryError> {
        match fs::remove_dir_all(&self.dir) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(GalleryError::io("could not clear", &self.dir)(error)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::{ExifFixture, jpeg, jpeg_with_exif};
    use genslate_testing::TempTree;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    #[test]
    fn fit_keeps_the_aspect_and_never_enlarges() {
        assert_eq!(fit_size(4000, 3000, 512), (512, 384));
        assert_eq!(fit_size(3000, 4000, 512), (384, 512));
        assert_eq!(fit_size(100, 50, 512), (100, 50));
        assert_eq!(fit_size(10_000, 1, 512), (512, 1));
        assert_eq!(fit_size(0, 0, 512), (1, 1));
    }

    #[test]
    fn renders_jpeg_thumbnails_upright() -> TestResult {
        let rotated = jpeg_with_exif(
            800,
            600,
            &ExifFixture {
                make: "Canon",
                model: "Canon EOS R6",
                taken: "2026:01:01 10:00:00",
                orientation: 6,
                gps: None,
            },
        )?;
        let tree = TempTree::new()?.file("r.jpg", rotated)?;
        let encoded = render(&tree.join("r.jpg"), Format::Raster, 256)?;
        assert_eq!(encoded.mime, "image/jpeg");
        let image = image::load_from_memory(&encoded.bytes)?;
        assert_eq!((image.width(), image.height()), (192, 256), "portrait");
        Ok(())
    }

    #[test]
    fn transparent_images_become_png() -> TestResult {
        let svg = r#"<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="10" height="10" fill="red"/></svg>"#;
        let tree = TempTree::new()?.file("a.svg", svg)?;
        let encoded = render(&tree.join("a.svg"), Format::Svg, 100)?;
        assert_eq!(encoded.mime, "image/png");
        let image = image::load_from_memory(&encoded.bytes)?;
        assert_eq!((image.width(), image.height()), (100, 50));
        Ok(())
    }

    #[test]
    fn unsupported_formats_are_reported() -> TestResult {
        let tree = TempTree::new()?.file("a.heic", "x")?;
        let error = render(&tree.join("a.heic"), Format::Heif, 100)
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "unsupported");
        let tree = tree.file("bad.png", "not a png")?;
        let error = render(&tree.join("bad.png"), Format::Raster, 100)
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "decode");
        Ok(())
    }

    #[test]
    fn cache_stores_by_file_version() -> TestResult {
        let tree = TempTree::new()?.file("a.jpg", jpeg(300, 200, 40)?)?;
        let cache = ThumbnailCache::new(tree.join("cache"));
        let path = tree.join("a.jpg");
        let key = ThumbnailKey {
            path: &path,
            size: 1,
            modified_ms: 1,
            edge: 64,
        };
        assert!(cache.get(&key).is_none());
        let first = cache.get_or_render(&key, Format::Raster)?;
        assert_eq!(cache.get(&key), Some(first.clone()));
        let newer = ThumbnailKey {
            modified_ms: 2,
            ..key
        };
        assert!(cache.get(&newer).is_none(), "a new version misses");
        cache.clear()?;
        assert!(cache.get(&key).is_none());
        cache.clear()?;
        Ok(())
    }
}
