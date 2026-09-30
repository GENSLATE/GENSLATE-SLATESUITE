//! Exports copies of photos to a folder: as they are, or resized and re-encoded. Re-encoded
//! copies carry no metadata at all (camera, date and **location** are left out), so they are
//! safe to share.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Serialize};

use crate::GalleryError;
use crate::edit;
use crate::kind::Format;
use crate::names;
use crate::thumbnail;

/// The file type of exported copies.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExportFormat {
    /// Copy the files unchanged (with all their metadata).
    Original,
    #[default]
    Jpeg,
    Png,
}

/// How to export.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ExportOptions {
    pub format: ExportFormat,
    /// Longest edge in pixels, or `None` for full size.
    pub long_edge: Option<u32>,
    /// JPEG quality, 1–100.
    pub quality: u8,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            format: ExportFormat::Jpeg,
            long_edge: Some(2048),
            quality: 88,
        }
    }
}

/// What an export did.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOutcome {
    pub written: Vec<PathBuf>,
    /// Files that could not be exported, with why.
    pub failed: Vec<(PathBuf, String)>,
    pub cancelled: bool,
}

/// Exports `sources` into `destination`, reporting `(done, total)` after each file.
pub fn export(
    sources: &[PathBuf],
    destination: &Path,
    options: ExportOptions,
    cancel: &AtomicBool,
    mut progress: impl FnMut(usize, usize),
) -> Result<ExportOutcome, GalleryError> {
    if !destination.is_dir() {
        return Err(GalleryError::NotAFolder(destination.to_path_buf()));
    }
    if !(1..=100).contains(&options.quality) {
        return Err(GalleryError::InvalidArgument(
            "the quality goes from 1 to 100".to_owned(),
        ));
    }
    let mut outcome = ExportOutcome::default();
    for (index, source) in sources.iter().enumerate() {
        if cancel.load(Ordering::Relaxed) {
            outcome.cancelled = true;
            break;
        }
        match export_one(source, destination, options) {
            Ok(target) => outcome.written.push(target),
            Err(error) => outcome.failed.push((source.clone(), error.to_string())),
        }
        progress(index + 1, sources.len());
    }
    Ok(outcome)
}

fn export_one(
    source: &Path,
    destination: &Path,
    options: ExportOptions,
) -> Result<PathBuf, GalleryError> {
    let (stem, extension) = names::split(source);
    if options.format == ExportFormat::Original {
        let target = names::free_path(destination, &stem, &extension);
        fs::copy(source, &target).map_err(GalleryError::io("could not copy", source))?;
        return Ok(target);
    }
    let format = Format::of(source)
        .filter(|format| format.decodable())
        .ok_or(GalleryError::Unsupported(
            "Only photos Gallery can open can be resized; export the original instead.",
        ))?;
    let mut image = thumbnail::decode(source, format)?;
    if let Some(edge) = options.long_edge {
        image = thumbnail::fit(&image, edge)?;
    }
    let jpeg = options.format == ExportFormat::Jpeg;
    let target = names::free_path(destination, &stem, if jpeg { "jpg" } else { "png" });
    edit::write(&image, &target, jpeg, options.quality)?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::{ExifFixture, jpeg_with_exif};
    use crate::metadata::{self, Metadata};
    use genslate_testing::TempTree;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn tree() -> Result<TempTree, Box<dyn std::error::Error>> {
        let photo = jpeg_with_exif(
            800,
            400,
            &ExifFixture {
                make: "Canon",
                model: "Canon EOS R6",
                taken: "2026:09:27 18:30:00",
                orientation: 1,
                gps: Some(((38, 42, 36), 'N', (9, 8, 24), 'W')),
            },
        )?;
        Ok(TempTree::new()?.file("in/beach.jpg", photo)?.dir("out")?)
    }

    #[test]
    fn resized_exports_drop_location_and_metadata() -> TestResult {
        let tree = tree()?;
        let mut steps = Vec::new();
        let outcome = export(
            &[tree.join("in/beach.jpg"), tree.join("in/missing.jpg")],
            &tree.join("out"),
            ExportOptions {
                long_edge: Some(200),
                ..ExportOptions::default()
            },
            &AtomicBool::new(false),
            |done, total| steps.push((done, total)),
        )?;
        assert_eq!(steps, [(1, 2), (2, 2)]);
        assert_eq!(outcome.written, [tree.join("out/beach.jpg")]);
        assert_eq!(outcome.failed.len(), 1);
        let exported = metadata::read(&tree.join("out/beach.jpg"), Format::Raster);
        assert_eq!((exported.width, exported.height), (Some(200), Some(100)));
        assert_eq!(exported.gps, None, "location removed");
        assert_eq!(exported.camera, None);
        Ok(())
    }

    #[test]
    fn original_exports_are_exact_copies() -> TestResult {
        let tree = tree()?;
        let options = ExportOptions {
            format: ExportFormat::Original,
            ..ExportOptions::default()
        };
        let run = || {
            export(
                &[tree.join("in/beach.jpg")],
                &tree.join("out"),
                options,
                &AtomicBool::new(false),
                |_, _| {},
            )
        };
        run()?;
        let second = run()?;
        assert_eq!(second.written, [tree.join("out/beach 2.jpg")]);
        let copy: Metadata = metadata::read(&tree.join("out/beach.jpg"), Format::Raster);
        assert!(copy.gps.is_some(), "kept as is");
        Ok(())
    }

    #[test]
    fn checks_the_destination_and_quality() -> TestResult {
        let tree = tree()?;
        let never = AtomicBool::new(false);
        assert!(
            export(
                &[],
                &tree.join("in/beach.jpg"),
                ExportOptions::default(),
                &never,
                |_, _| {}
            )
            .is_err()
        );
        let bad = ExportOptions {
            quality: 0,
            ..ExportOptions::default()
        };
        assert!(export(&[], &tree.join("out"), bad, &never, |_, _| {}).is_err());
        Ok(())
    }
}
