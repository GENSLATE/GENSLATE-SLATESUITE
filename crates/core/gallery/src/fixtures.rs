//! Test images: small JPEGs with hand-built EXIF, PNGs and gradients.

use std::io::Cursor;

use image::{ImageFormat, Rgb, RgbImage};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

/// Degrees, minutes, seconds.
pub type Dms = (u32, u32, u32);

/// The EXIF tags [`jpeg_with_exif`] writes.
#[derive(Debug, Clone, Copy)]
pub struct ExifFixture<'a> {
    pub make: &'a str,
    pub model: &'a str,
    /// `YYYY:MM:DD HH:MM:SS`.
    pub taken: &'a str,
    pub orientation: u16,
    /// Latitude, its ref, longitude, its ref.
    pub gps: Option<(Dms, char, Dms, char)>,
}

/// A `width` × `height` gradient.
pub fn gradient(width: u32, height: u32, tint: u8) -> RgbImage {
    RgbImage::from_fn(width, height, |x, y| {
        let r = u8::try_from(x * 255 / width.max(1)).unwrap_or(u8::MAX);
        let g = u8::try_from(y * 255 / height.max(1)).unwrap_or(u8::MAX);
        Rgb([r, g, tint])
    })
}

/// A JPEG of vertical stripes (looks nothing like a gradient).
pub fn stripes(width: u32, height: u32) -> Result<Vec<u8>> {
    let image = RgbImage::from_fn(width, height, |x, _| {
        if (x / 16) % 2 == 0 {
            Rgb([20, 20, 20])
        } else {
            Rgb([235, 235, 235])
        }
    });
    encode(&image, ImageFormat::Jpeg)
}

/// A PNG of a gradient.
pub fn png(width: u32, height: u32) -> Result<Vec<u8>> {
    encode(&gradient(width, height, 90), ImageFormat::Png)
}

/// A JPEG of a gradient.
pub fn jpeg(width: u32, height: u32, tint: u8) -> Result<Vec<u8>> {
    encode(&gradient(width, height, tint), ImageFormat::Jpeg)
}

fn encode(image: &RgbImage, format: ImageFormat) -> Result<Vec<u8>> {
    let mut bytes = Cursor::new(Vec::new());
    image.write_to(&mut bytes, format)?;
    Ok(bytes.into_inner())
}

/// A JPEG of a gradient with an APP1 EXIF segment holding `exif`.
pub fn jpeg_with_exif(width: u32, height: u32, exif: &ExifFixture<'_>) -> Result<Vec<u8>> {
    let plain = jpeg(width, height, 120)?;
    let tiff = tiff(exif);
    let mut segment = b"Exif\0\0".to_vec();
    segment.extend_from_slice(&tiff);
    let length = u16::try_from(segment.len() + 2)?;
    let mut out = plain[..2].to_vec(); // SOI
    out.extend_from_slice(&[0xFF, 0xE1]);
    out.extend_from_slice(&length.to_be_bytes());
    out.extend_from_slice(&segment);
    out.extend_from_slice(&plain[2..]);
    Ok(out)
}

/// One IFD entry: tag, type, count and either inline bytes (≤ 4) or out-of-line data.
struct Entry {
    tag: u16,
    kind: u16,
    count: u32,
    data: Vec<u8>,
}

const ASCII: u16 = 2;
const SHORT: u16 = 3;
const LONG: u16 = 4;
const RATIONAL: u16 = 5;

fn ascii(tag: u16, text: &str) -> Entry {
    let mut data = text.as_bytes().to_vec();
    data.push(0);
    Entry {
        tag,
        kind: ASCII,
        count: u32::try_from(data.len()).unwrap_or(0),
        data,
    }
}

fn short(tag: u16, value: u16) -> Entry {
    Entry {
        tag,
        kind: SHORT,
        count: 1,
        data: value.to_le_bytes().to_vec(),
    }
}

fn long(tag: u16, value: u32) -> Entry {
    Entry {
        tag,
        kind: LONG,
        count: 1,
        data: value.to_le_bytes().to_vec(),
    }
}

fn dms(tag: u16, (degrees, minutes, seconds): Dms) -> Entry {
    let mut data = Vec::new();
    for value in [degrees, minutes, seconds] {
        data.extend_from_slice(&value.to_le_bytes());
        data.extend_from_slice(&1_u32.to_le_bytes());
    }
    Entry {
        tag,
        kind: RATIONAL,
        count: 3,
        data,
    }
}

/// Size of an IFD with `entries` entries (count, entries, next-IFD offset).
fn ifd_len(entries: usize) -> usize {
    2 + entries * 12 + 4
}

/// Writes an IFD at `offset` (its out-of-line data right after it); returns the bytes.
fn write_ifd(entries: &[Entry], offset: usize) -> Vec<u8> {
    let mut head = Vec::new();
    let mut tail = Vec::new();
    let data_start = offset + ifd_len(entries.len());
    head.extend_from_slice(&u16::try_from(entries.len()).unwrap_or(0).to_le_bytes());
    for entry in entries {
        head.extend_from_slice(&entry.tag.to_le_bytes());
        head.extend_from_slice(&entry.kind.to_le_bytes());
        head.extend_from_slice(&entry.count.to_le_bytes());
        if entry.data.len() <= 4 {
            let mut inline = entry.data.clone();
            inline.resize(4, 0);
            head.extend_from_slice(&inline);
        } else {
            let at = u32::try_from(data_start + tail.len()).unwrap_or(0);
            head.extend_from_slice(&at.to_le_bytes());
            tail.extend_from_slice(&entry.data);
            if tail.len() % 2 == 1 {
                tail.push(0);
            }
        }
    }
    head.extend_from_slice(&0_u32.to_le_bytes());
    head.extend_from_slice(&tail);
    head
}

/// A little-endian TIFF with IFD0 (make, model, orientation), an EXIF IFD (date taken) and a
/// GPS IFD.
fn tiff(exif: &ExifFixture<'_>) -> Vec<u8> {
    let exif_ifd = vec![ascii(0x9003, exif.taken)];
    let gps_ifd: Vec<Entry> = exif
        .gps
        .map(|(latitude, lat_ref, longitude, lon_ref)| {
            vec![
                ascii(0x0001, &lat_ref.to_string()),
                dms(0x0002, latitude),
                ascii(0x0003, &lon_ref.to_string()),
                dms(0x0004, longitude),
            ]
        })
        .unwrap_or_default();

    // Lay out: header (8), IFD0, EXIF IFD, GPS IFD. IFD0 needs the others' offsets, which
    // depend on IFD0's size, so size it first with placeholder offsets.
    let ifd0 = |exif_at: u32, gps_at: Option<u32>| {
        let mut entries = vec![
            ascii(0x010F, exif.make),
            ascii(0x0110, exif.model),
            short(0x0112, exif.orientation),
            long(0x8769, exif_at),
        ];
        if let Some(gps_at) = gps_at {
            entries.push(long(0x8825, gps_at));
        }
        entries
    };
    let has_gps = !gps_ifd.is_empty();
    let ifd0_len = write_ifd(&ifd0(0, has_gps.then_some(0)), 8).len();
    let exif_at = 8 + ifd0_len;
    let exif_bytes = write_ifd(&exif_ifd, exif_at);
    let gps_at = exif_at + exif_bytes.len();
    let ifd0_bytes = write_ifd(
        &ifd0(
            u32::try_from(exif_at).unwrap_or(0),
            has_gps.then(|| u32::try_from(gps_at).unwrap_or(0)),
        ),
        8,
    );

    let mut out = b"II".to_vec();
    out.extend_from_slice(&42_u16.to_le_bytes());
    out.extend_from_slice(&8_u32.to_le_bytes());
    out.extend_from_slice(&ifd0_bytes);
    out.extend_from_slice(&exif_bytes);
    if has_gps {
        out.extend_from_slice(&write_ifd(&gps_ifd, gps_at));
    }
    out
}
