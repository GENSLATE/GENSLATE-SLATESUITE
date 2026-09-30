//! What a photo or video says about itself: size, date taken, camera and exposure, location
//! and length. EXIF and video track data come from `nom-exif` (JPEG, PNG, WebP, TIFF, HEIC,
//! RAW, MP4, MOV, MKV), pixel sizes from the file header (`imagesize`), so nothing is decoded.
//!
//! Reading never fails: a file without metadata (or with broken metadata) just has fewer
//! fields.

use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use chrono::{DateTime, Local, NaiveDateTime};
use nom_exif::{EntryValue, Exif, ExifDateTime, ExifTag, MediaParser, MediaSource, TrackInfoTag};
use serde::Serialize;

use crate::kind::Format;

/// Everything read from one file.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    /// Width as shown (after the EXIF orientation is applied).
    pub width: Option<u32>,
    pub height: Option<u32>,
    /// EXIF orientation, 1–8 (1 = upright).
    pub orientation: u8,
    /// When the photo was taken or the video recorded, ms since the Unix epoch.
    pub taken_at: Option<i64>,
    /// "Canon EOS R6", "Apple iPhone 15 Pro".
    pub camera: Option<String>,
    pub lens: Option<String>,
    pub f_number: Option<f64>,
    /// "1/250 s", "2 s".
    pub exposure: Option<String>,
    pub iso: Option<u32>,
    pub focal_mm: Option<f64>,
    pub flash: Option<bool>,
    /// Latitude and longitude in decimal degrees.
    pub gps: Option<(f64, f64)>,
    pub duration_ms: Option<u64>,
}

/// Reads `path`'s metadata. `format` is [`Format::of`] the path.
pub fn read(path: &Path, format: Format) -> Metadata {
    let mut metadata = Metadata {
        orientation: 1,
        ..Metadata::default()
    };
    match format {
        Format::Video => read_track(path, &mut metadata),
        Format::Raster | Format::Heif | Format::Raw => read_exif(path, &mut metadata),
        Format::Svg | Format::JpegXl => {}
    }
    if metadata.width.is_none() || metadata.height.is_none() {
        let size = match format {
            Format::Svg => svg_size(path),
            Format::Video => None,
            _ => imagesize::size(path)
                .ok()
                .and_then(|size| Some((to_u32(size.width)?, to_u32(size.height)?))),
        };
        if let Some((width, height)) = size {
            let (width, height) = if swaps_sides(metadata.orientation) {
                (height, width)
            } else {
                (width, height)
            };
            metadata.width = Some(width);
            metadata.height = Some(height);
        }
    }
    metadata
}

/// Orientations 5–8 rotate by a quarter turn, so width and height trade places.
pub fn swaps_sides(orientation: u8) -> bool {
    (5..=8).contains(&orientation)
}

fn read_exif(path: &Path, metadata: &mut Metadata) {
    let Ok(source) = MediaSource::open(path) else {
        return;
    };
    let mut parser = MediaParser::new();
    let Ok(iter) = parser.parse_exif(source) else {
        return;
    };
    let exif: Exif = iter.into();
    let text = |tag| {
        exif.get(tag)
            .and_then(EntryValue::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(str::to_owned)
    };
    let integer = |tag| exif.get(tag).and_then(EntryValue::try_as_integer);
    let float = |tag| exif.get(tag).and_then(entry_float);

    metadata.orientation = integer(ExifTag::Orientation)
        .and_then(|value| u8::try_from(value).ok())
        .filter(|value| (1..=8).contains(value))
        .unwrap_or(1);
    metadata.taken_at = [ExifTag::DateTimeOriginal, ExifTag::CreateDate]
        .into_iter()
        .find_map(|tag| exif.get(tag).and_then(EntryValue::as_datetime))
        .and_then(exif_time_ms);
    metadata.camera = camera_name(text(ExifTag::Make), text(ExifTag::Model));
    metadata.lens = text(ExifTag::LensModel);
    metadata.f_number = float(ExifTag::FNumber).filter(|value| *value > 0.0);
    metadata.exposure = exif
        .get(ExifTag::ExposureTime)
        .and_then(EntryValue::as_urational)
        .and_then(|value| exposure_text(value.numerator(), value.denominator()));
    metadata.iso = integer(ExifTag::ISOSpeedRatings).and_then(|value| u32::try_from(value).ok());
    metadata.focal_mm = float(ExifTag::FocalLength).filter(|value| *value > 0.0);
    metadata.flash = integer(ExifTag::Flash).map(|value| value & 1 == 1);
    metadata.gps = exif.gps_info().and_then(|gps| {
        let latitude = gps.latitude_decimal()?;
        let longitude = gps.longitude_decimal()?;
        valid_coordinates(latitude, longitude)
    });
    let width = integer(ExifTag::ExifImageWidth).and_then(|value| u32::try_from(value).ok());
    let height = integer(ExifTag::ExifImageHeight).and_then(|value| u32::try_from(value).ok());
    if let (Some(width), Some(height)) = (width, height)
        && width > 0
        && height > 0
    {
        let swap = swaps_sides(metadata.orientation);
        metadata.width = Some(if swap { height } else { width });
        metadata.height = Some(if swap { width } else { height });
    }
}

fn read_track(path: &Path, metadata: &mut Metadata) {
    let Ok(source) = MediaSource::open(path) else {
        return;
    };
    let mut parser = MediaParser::new();
    let Ok(track) = parser.parse_track(source) else {
        return;
    };
    let integer = |tag| track.get(tag).and_then(EntryValue::try_as_integer);
    metadata.width = integer(TrackInfoTag::Width).and_then(|value| u32::try_from(value).ok());
    metadata.height = integer(TrackInfoTag::Height).and_then(|value| u32::try_from(value).ok());
    metadata.duration_ms =
        integer(TrackInfoTag::DurationMs).and_then(|value| u64::try_from(value).ok());
    metadata.taken_at = track
        .get(TrackInfoTag::CreateDate)
        .and_then(EntryValue::as_datetime)
        .and_then(exif_time_ms)
        // QuickTime writes 1904-01-01 when the date is unknown.
        .filter(|ms| *ms > 0);
    let text = |tag| {
        track
            .get(tag)
            .and_then(EntryValue::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(str::to_owned)
    };
    metadata.camera = camera_name(text(TrackInfoTag::Make), text(TrackInfoTag::Model));
    metadata.gps = track
        .gps_info()
        .and_then(|gps| valid_coordinates(gps.latitude_decimal()?, gps.longitude_decimal()?));
}

fn svg_size(path: &Path) -> Option<(u32, u32)> {
    let data = std::fs::read(path).ok()?;
    let tree = resvg::usvg::Tree::from_data(&data, &resvg::usvg::Options::default()).ok()?;
    let size = tree.size();
    Some((round_u32(size.width()), round_u32(size.height())))
}

/// A float from a rational or numeric entry.
fn entry_float(value: &EntryValue) -> Option<f64> {
    value
        .as_urational()
        .and_then(|rational| rational.to_f64())
        .or_else(|| value.as_irational().and_then(|rational| rational.to_f64()))
        .or_else(|| value.try_as_float())
}

/// An EXIF date as ms since the epoch. Dates without a time zone are local time on this
/// computer (what cameras record).
fn exif_time_ms(value: ExifDateTime) -> Option<i64> {
    match value {
        ExifDateTime::Aware(time) => Some(time.timestamp_millis()),
        ExifDateTime::Naive(time) => local_ms(time),
    }
}

fn local_ms(time: NaiveDateTime) -> Option<i64> {
    time.and_local_timezone(Local)
        .earliest()
        .map(|time: DateTime<Local>| time.timestamp_millis())
}

/// "Canon" + "Canon EOS R6" → "Canon EOS R6"; "Apple" + "iPhone 15 Pro" → "Apple iPhone 15 Pro".
fn camera_name(make: Option<String>, model: Option<String>) -> Option<String> {
    match (make, model) {
        (Some(make), Some(model)) => {
            let brand = make.split_whitespace().next().unwrap_or_default();
            if model.to_lowercase().starts_with(&brand.to_lowercase()) {
                Some(model)
            } else {
                Some(format!("{brand} {model}"))
            }
        }
        (None, Some(model)) => Some(model),
        (Some(make), None) => Some(make),
        (None, None) => None,
    }
}

/// `1/250 s` for fractions of a second, `2 s` / `2.5 s` otherwise.
fn exposure_text(numerator: u32, denominator: u32) -> Option<String> {
    if numerator == 0 || denominator == 0 {
        return None;
    }
    let seconds = f64::from(numerator) / f64::from(denominator);
    if seconds < 1.0 {
        let per = (f64::from(denominator) / f64::from(numerator)).round();
        return Some(format!("1/{per} s"));
    }
    let rounded = (seconds * 10.0).round() / 10.0;
    Some(format!("{rounded} s"))
}

fn valid_coordinates(latitude: f64, longitude: f64) -> Option<(f64, f64)> {
    let valid = latitude.is_finite()
        && longitude.is_finite()
        && latitude.abs() <= 90.0
        && longitude.abs() <= 180.0
        // Cameras without a fix often write 0, 0.
        && (latitude != 0.0 || longitude != 0.0);
    valid.then_some((latitude, longitude))
}

fn to_u32(value: usize) -> Option<u32> {
    u32::try_from(value).ok().filter(|value| *value > 0)
}

/// Rounds a non-negative pixel size to `u32` (negative and NaN become 0).
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "pixel sizes are non-negative; float casts saturate at u32::MAX"
)]
pub(crate) fn round_u32(value: f32) -> u32 {
    value.round().max(0.0) as u32
}

/// Reads just the orientation (for decoding files that are not in the library yet).
pub fn orientation(path: &Path) -> u8 {
    let Ok(file) = File::open(path) else {
        return 1;
    };
    let Ok(source) = MediaSource::seekable(BufReader::new(file)) else {
        return 1;
    };
    let Ok(iter) = MediaParser::new().parse_exif(source) else {
        return 1;
    };
    let exif: Exif = iter.into();
    exif.get(ExifTag::Orientation)
        .and_then(EntryValue::try_as_integer)
        .and_then(|value| u8::try_from(value).ok())
        .filter(|value| (1..=8).contains(value))
        .unwrap_or(1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::{ExifFixture, jpeg_with_exif, png};
    use genslate_testing::TempTree;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    #[test]
    fn reads_exif_from_a_jpeg() -> TestResult {
        let bytes = jpeg_with_exif(
            40,
            30,
            &ExifFixture {
                make: "Canon",
                model: "Canon EOS R6",
                taken: "2026:09:27 18:30:00",
                orientation: 6,
                gps: Some(((38, 42, 36), 'N', (9, 8, 24), 'W')),
            },
        )?;
        let tree = TempTree::new()?.file("IMG_1.jpg", bytes)?;
        let metadata = read(&tree.join("IMG_1.jpg"), Format::Raster);
        assert_eq!(metadata.camera.as_deref(), Some("Canon EOS R6"));
        assert_eq!(metadata.orientation, 6);
        // Rotated a quarter turn: the sides trade places.
        assert_eq!((metadata.width, metadata.height), (Some(30), Some(40)));
        let local = NaiveDateTime::parse_from_str("2026-09-27 18:30:00", "%Y-%m-%d %H:%M:%S")?;
        assert_eq!(metadata.taken_at, local_ms(local));
        let (latitude, longitude) = metadata.gps.ok_or("gps")?;
        assert!((latitude - 38.71).abs() < 0.01, "{latitude}");
        assert!((longitude + 9.14).abs() < 0.01, "{longitude}");
        assert_eq!(orientation(&tree.join("IMG_1.jpg")), 6);
        Ok(())
    }

    #[test]
    fn files_without_exif_still_have_a_size() -> TestResult {
        let tree = TempTree::new()?.file("plain.png", png(12, 7)?)?;
        let metadata = read(&tree.join("plain.png"), Format::Raster);
        assert_eq!((metadata.width, metadata.height), (Some(12), Some(7)));
        assert_eq!(metadata.orientation, 1);
        assert_eq!(metadata.taken_at, None);
        assert_eq!(metadata.camera, None);
        Ok(())
    }

    #[test]
    fn svg_sizes_come_from_the_document() -> TestResult {
        let tree = TempTree::new()?.file(
            "logo.svg",
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"/>"#,
        )?;
        let metadata = read(&tree.join("logo.svg"), Format::Svg);
        assert_eq!((metadata.width, metadata.height), (Some(64), Some(32)));
        Ok(())
    }

    #[test]
    fn broken_files_have_no_metadata() -> TestResult {
        let tree = TempTree::new()?.file("broken.jpg", "not a jpeg")?;
        let metadata = read(&tree.join("broken.jpg"), Format::Raster);
        assert_eq!(metadata.width, None);
        assert_eq!(
            read(&tree.join("missing.mp4"), Format::Video).duration_ms,
            None
        );
        Ok(())
    }

    #[test]
    fn camera_names_drop_the_repeated_brand() {
        let name = |make: &str, model: &str| {
            camera_name(Some(make.to_owned()), Some(model.to_owned())).unwrap_or_default()
        };
        assert_eq!(name("Canon", "Canon EOS R6"), "Canon EOS R6");
        assert_eq!(name("Apple", "iPhone 15 Pro"), "Apple iPhone 15 Pro");
        assert_eq!(
            name("NIKON CORPORATION", "NIKON Z 6_2"),
            "NIKON Z 6_2",
            "brand is the first word"
        );
    }

    #[test]
    fn exposure_texts() {
        assert_eq!(exposure_text(1, 250).as_deref(), Some("1/250 s"));
        assert_eq!(exposure_text(10, 2500).as_deref(), Some("1/250 s"));
        assert_eq!(exposure_text(5, 2).as_deref(), Some("2.5 s"));
        assert_eq!(exposure_text(0, 1), None);
    }

    #[test]
    fn rejects_null_island_and_out_of_range_coordinates() {
        assert_eq!(valid_coordinates(0.0, 0.0), None);
        assert_eq!(valid_coordinates(91.0, 1.0), None);
        assert_eq!(valid_coordinates(38.7, -9.1), Some((38.7, -9.1)));
    }
}
