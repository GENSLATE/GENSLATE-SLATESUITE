//! Non-destructive edits: rotate, flip, straighten, crop and light / contrast / saturation /
//! warmth, applied to a decoded copy and saved next to the original as
//! `<name> (edited).<ext>`. The original file is never written.

use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};

use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use serde::Deserialize;

use crate::GalleryError;
use crate::kind::Format;
use crate::names;
use crate::thumbnail::{self, round_f64};

/// JPEG quality of saved edits.
const EDIT_QUALITY: u8 = 92;
/// The widest straighten angle, in degrees.
pub const MAX_STRAIGHTEN: f64 = 45.0;

/// A crop, as fractions of the (rotated and straightened) image.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Crop {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Everything the editor can change. The default changes nothing.
#[derive(Debug, Clone, Copy, Default, PartialEq, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Recipe {
    /// Clockwise quarter turns (0–3).
    pub quarter_turns: u8,
    pub flip_horizontal: bool,
    pub flip_vertical: bool,
    /// Degrees, −45 to 45; the image is zoomed so no empty corners show.
    pub straighten: f64,
    pub crop: Option<Crop>,
    /// −1 to 1: one stop darker to one stop brighter.
    pub light: f64,
    /// −1 to 1.
    pub contrast: f64,
    /// −1 (grey) to 1 (twice as vivid).
    pub saturation: f64,
    /// −1 (cooler) to 1 (warmer).
    pub warmth: f64,
}

impl Recipe {
    /// Checks the ranges.
    pub fn validate(&self) -> Result<(), GalleryError> {
        let unit = |value: f64| value.is_finite() && (-1.0..=1.0).contains(&value);
        let fraction = |value: f64| value.is_finite() && (0.0..=1.0).contains(&value);
        let crop_ok = self.crop.is_none_or(|crop| {
            fraction(crop.x)
                && fraction(crop.y)
                && crop.width > 0.0
                && crop.height > 0.0
                && crop.x + crop.width <= 1.000_1
                && crop.y + crop.height <= 1.000_1
        });
        let ok = self.quarter_turns < 4
            && self.straighten.is_finite()
            && self.straighten.abs() <= MAX_STRAIGHTEN
            && crop_ok
            && [self.light, self.contrast, self.saturation, self.warmth]
                .into_iter()
                .all(unit);
        if ok {
            Ok(())
        } else {
            Err(GalleryError::InvalidArgument(
                "an edit value is out of range".to_owned(),
            ))
        }
    }

    fn adjusts_colour(&self) -> bool {
        [self.light, self.contrast, self.saturation, self.warmth]
            .iter()
            .any(|value| *value != 0.0)
    }
}

/// Applies `recipe` to `image`.
pub fn apply(image: &DynamicImage, recipe: &Recipe) -> Result<DynamicImage, GalleryError> {
    recipe.validate()?;
    let mut image = match recipe.quarter_turns {
        1 => image.rotate90(),
        2 => image.rotate180(),
        3 => image.rotate270(),
        _ => image.clone(),
    };
    if recipe.flip_horizontal {
        image = image.fliph();
    }
    if recipe.flip_vertical {
        image = image.flipv();
    }
    if recipe.straighten != 0.0 {
        image = DynamicImage::ImageRgba8(straighten(&image.to_rgba8(), recipe.straighten));
    }
    if let Some(crop) = recipe.crop {
        let (width, height) = (f64::from(image.width()), f64::from(image.height()));
        let x = round_f64(crop.x * width);
        let y = round_f64(crop.y * height);
        let crop_width =
            round_f64(crop.width * width).clamp(1, image.width().saturating_sub(x).max(1));
        let crop_height =
            round_f64(crop.height * height).clamp(1, image.height().saturating_sub(y).max(1));
        image = image.crop_imm(x, y, crop_width, crop_height);
    }
    if recipe.adjusts_colour() {
        let had_alpha = image.color().has_alpha();
        let mut pixels = image.to_rgba8();
        for pixel in pixels.pixels_mut() {
            adjust(pixel, recipe);
        }
        image = if had_alpha {
            DynamicImage::ImageRgba8(pixels)
        } else {
            DynamicImage::ImageRgb8(DynamicImage::ImageRgba8(pixels).to_rgb8())
        };
    }
    Ok(image)
}

/// Light, contrast, saturation and warmth for one pixel.
fn adjust(pixel: &mut Rgba<u8>, recipe: &Recipe) {
    let gain = 2_f64.powf(recipe.light);
    let contrast = 1.0 + recipe.contrast;
    let saturation = 1.0 + recipe.saturation;
    let [red, green, blue, alpha] = pixel.0;
    let mut channels = [red, green, blue].map(|value| f64::from(value) / 255.0 * gain);
    channels = channels.map(|value| (value - 0.5) * contrast + 0.5);
    let luma = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    channels = channels.map(|value| luma + (value - luma) * saturation);
    channels[0] *= 1.0 + 0.12 * recipe.warmth;
    channels[2] *= 1.0 - 0.12 * recipe.warmth;
    let [red, green, blue] = channels.map(to_byte);
    pixel.0 = [red, green, blue, alpha];
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "clamped to 0–255 first"
)]
fn to_byte(value: f64) -> u8 {
    (value * 255.0).round().clamp(0.0, 255.0) as u8
}

/// Rotates by `degrees` (clockwise) about the centre, zoomed so the frame stays filled.
fn straighten(image: &RgbaImage, degrees: f64) -> RgbaImage {
    let (width, height) = (f64::from(image.width()), f64::from(image.height()));
    let angle = degrees.to_radians();
    let (sin, cos) = (angle.sin().abs(), angle.cos());
    // The zoom at which the rotated image still covers the whole frame.
    let scale = (cos + height / width * sin).max(width / height * sin + cos);
    let (center_x, center_y) = (width / 2.0, height / 2.0);
    let (sin_a, cos_a) = angle.sin_cos();
    RgbaImage::from_fn(image.width(), image.height(), |x, y| {
        let dx = (f64::from(x) + 0.5 - center_x) / scale;
        let dy = (f64::from(y) + 0.5 - center_y) / scale;
        // Inverse rotation maps the output pixel back into the source.
        let source_x = cos_a * dx + sin_a * dy + center_x - 0.5;
        let source_y = -sin_a * dx + cos_a * dy + center_y - 0.5;
        bilinear(image, source_x, source_y)
    })
}

fn bilinear(image: &RgbaImage, x: f64, y: f64) -> Rgba<u8> {
    let max_x = f64::from(image.width().saturating_sub(1));
    let max_y = f64::from(image.height().saturating_sub(1));
    let (x, y) = (x.clamp(0.0, max_x), y.clamp(0.0, max_y));
    let (x0, y0) = (x.floor(), y.floor());
    let (fx, fy) = (x - x0, y - y0);
    let at = |px: f64, py: f64| {
        let pixel = image.get_pixel(round_f64(px.min(max_x)), round_f64(py.min(max_y)));
        pixel.0.map(f64::from)
    };
    let (top_left, top_right) = (at(x0, y0), at(x0 + 1.0, y0));
    let (bottom_left, bottom_right) = (at(x0, y0 + 1.0), at(x0 + 1.0, y0 + 1.0));
    let mut out = [0_u8; 4];
    for channel in 0..4 {
        let top = top_left[channel] * (1.0 - fx) + top_right[channel] * fx;
        let bottom = bottom_left[channel] * (1.0 - fx) + bottom_right[channel] * fx;
        out[channel] = to_byte((top * (1.0 - fy) + bottom * fy) / 255.0);
    }
    Rgba(out)
}

/// Decodes `source`, applies `recipe` and saves the result next to it. Returns the new file.
pub fn save_copy(source: &Path, recipe: &Recipe) -> Result<PathBuf, GalleryError> {
    let format = Format::of(source)
        .filter(|format| format.decodable())
        .ok_or(GalleryError::Unsupported(
            "Gallery can't edit this format yet.",
        ))?;
    let image = apply(&thumbnail::decode(source, format)?, recipe)?;
    let folder = source
        .parent()
        .ok_or_else(|| GalleryError::NotFound(source.to_path_buf()))?;
    let (stem, extension) = names::split(source);
    let jpeg = matches!(
        extension.to_ascii_lowercase().as_str(),
        "jpg" | "jpeg" | "jpe" | "jfif"
    );
    let target = names::free_path(
        folder,
        &format!("{stem} (edited)"),
        if jpeg { &extension } else { "png" },
    );
    write(&image, &target, jpeg, EDIT_QUALITY)?;
    Ok(target)
}

/// Writes `image` as JPEG (`quality`) or PNG. A failed write leaves no partial file.
pub fn write(
    image: &DynamicImage,
    target: &Path,
    jpeg: bool,
    quality: u8,
) -> Result<(), GalleryError> {
    let result = File::create(target)
        .map_err(GalleryError::io("could not create", target))
        .and_then(|file| {
            let mut writer = BufWriter::new(file);
            if jpeg {
                JpegEncoder::new_with_quality(&mut writer, quality)
                    .encode_image(&image.to_rgb8())
                    .map_err(|error| GalleryError::Encode(error.to_string()))
            } else {
                image
                    .write_to(&mut writer, ImageFormat::Png)
                    .map_err(|error| GalleryError::Encode(error.to_string()))
            }
        });
    if result.is_err() {
        let _ = std::fs::remove_file(target);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::{gradient, jpeg};
    use genslate_testing::TempTree;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn sample() -> DynamicImage {
        DynamicImage::ImageRgb8(gradient(40, 20, 100))
    }

    #[test]
    fn default_recipe_changes_nothing() -> TestResult {
        let image = sample();
        assert_eq!(apply(&image, &Recipe::default())?, image);
        Ok(())
    }

    #[test]
    fn turns_flips_and_crops() -> TestResult {
        let image = sample();
        let turned = apply(
            &image,
            &Recipe {
                quarter_turns: 1,
                ..Recipe::default()
            },
        )?;
        assert_eq!((turned.width(), turned.height()), (20, 40));
        let cropped = apply(
            &image,
            &Recipe {
                crop: Some(Crop {
                    x: 0.5,
                    y: 0.0,
                    width: 0.5,
                    height: 0.5,
                }),
                ..Recipe::default()
            },
        )?;
        assert_eq!((cropped.width(), cropped.height()), (20, 10));
        let flipped = apply(
            &image,
            &Recipe {
                flip_horizontal: true,
                ..Recipe::default()
            },
        )?;
        assert_eq!(
            flipped.to_rgb8().get_pixel(0, 0),
            image.to_rgb8().get_pixel(39, 0)
        );
        Ok(())
    }

    #[test]
    fn straightening_keeps_the_size_and_fills_the_frame() -> TestResult {
        let image = DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
            60,
            40,
            image::Rgb([200, 10, 10]),
        ));
        let straight = apply(
            &image,
            &Recipe {
                straighten: 10.0,
                ..Recipe::default()
            },
        )?;
        assert_eq!((straight.width(), straight.height()), (60, 40));
        // A flat colour stays flat: no empty corners were pulled in.
        let corner = straight.to_rgba8();
        assert_eq!(corner.get_pixel(0, 0).0, [200, 10, 10, 255]);
        assert_eq!(corner.get_pixel(59, 39).0, [200, 10, 10, 255]);
        Ok(())
    }

    #[test]
    fn colour_adjustments() -> TestResult {
        let grey = DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
            2,
            2,
            image::Rgb([100, 100, 100]),
        ));
        let brighter = apply(
            &grey,
            &Recipe {
                light: 1.0,
                ..Recipe::default()
            },
        )?;
        assert_eq!(brighter.to_rgb8().get_pixel(0, 0).0, [200, 200, 200]);
        let warmer = apply(
            &grey,
            &Recipe {
                warmth: 1.0,
                ..Recipe::default()
            },
        )?;
        let [red, _, blue] = warmer.to_rgb8().get_pixel(0, 0).0;
        assert!(red > 100 && blue < 100);
        let desaturated = apply(
            &DynamicImage::ImageRgb8(image::RgbImage::from_pixel(1, 1, image::Rgb([200, 50, 50]))),
            &Recipe {
                saturation: -1.0,
                ..Recipe::default()
            },
        )?;
        let [red, green, blue] = desaturated.to_rgb8().get_pixel(0, 0).0;
        assert!(red == green && green == blue, "grey");
        Ok(())
    }

    #[test]
    fn rejects_out_of_range_values() {
        let bad = [
            Recipe {
                quarter_turns: 4,
                ..Recipe::default()
            },
            Recipe {
                straighten: 60.0,
                ..Recipe::default()
            },
            Recipe {
                light: 2.0,
                ..Recipe::default()
            },
            Recipe {
                crop: Some(Crop {
                    x: 0.8,
                    y: 0.0,
                    width: 0.5,
                    height: 1.0,
                }),
                ..Recipe::default()
            },
            Recipe {
                contrast: f64::NAN,
                ..Recipe::default()
            },
        ];
        for recipe in bad {
            assert!(recipe.validate().is_err(), "{recipe:?}");
        }
    }

    #[test]
    fn saves_a_copy_next_to_the_original() -> TestResult {
        let original = jpeg(40, 20, 50)?;
        let tree = TempTree::new()?.file("beach.jpg", &original)?;
        let recipe = Recipe {
            quarter_turns: 1,
            ..Recipe::default()
        };
        let first = save_copy(&tree.join("beach.jpg"), &recipe)?;
        assert_eq!(first, tree.join("beach (edited).jpg"));
        let second = save_copy(&tree.join("beach.jpg"), &recipe)?;
        assert_eq!(second, tree.join("beach (edited) 2.jpg"));
        assert_eq!(
            std::fs::read(tree.join("beach.jpg"))?,
            original,
            "untouched"
        );
        let saved = image::open(&first)?;
        assert_eq!((saved.width(), saved.height()), (20, 40));
        let tree = tree.file(
            "logo.svg",
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>"#,
        )?;
        assert_eq!(
            save_copy(&tree.join("logo.svg"), &Recipe::default())?,
            tree.join("logo (edited).png")
        );
        let tree = tree.file("a.heic", "x")?;
        assert!(save_copy(&tree.join("a.heic"), &Recipe::default()).is_err());
        Ok(())
    }
}
