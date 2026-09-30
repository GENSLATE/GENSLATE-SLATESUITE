//! Core logic for GENSLATE Gallery, kept free of Tauri so it is unit-testable.
//!
//! - [`config`]: `config.toml` (`[gallery]` settings) and single-key write-back for Settings.
//! - [`kind`]: which files are photos and videos, and how each format is read.
//! - [`metadata`] (EXIF and video tracks via `nom-exif`) and [`places`] (offline reverse
//!   geocoding).
//! - [`library`]: the library database (SQLite via `genslate-storage`): folders, items,
//!   favorites, ratings, albums, tags, the Trash list and full-text search.
//! - [`scan`] keeps it in step with the disk, [`watch`] reports changes live.
//! - [`thumbnail`]: decoding (`image`, `resvg`, `jxl-oxide`), SIMD resizing
//!   (`fast_image_resize`) and the on-disk thumbnail cache.
//! - [`duplicates`] (BLAKE3 and perceptual hashes), [`edit`] (non-destructive edits saved as
//!   copies), [`export`], [`trash`] and [`names`].
//! - [`AppInfo`] (from `genslate-app-common`): the payload returned by `get_app_info`.
//!
//! Business logic lives here; `desktop/gallery/src-tauri` only wires it to IPC commands.
#![forbid(unsafe_code)]

pub mod config;
pub mod duplicates;
pub mod edit;
mod error;
pub mod export;
#[cfg(test)]
mod fixtures;
pub mod kind;
pub mod library;
pub mod metadata;
pub mod names;
pub mod places;
pub mod scan;
pub mod thumbnail;
pub mod trash;
pub mod watch;

pub use config::{Config, Gallery as GallerySettings};
pub use error::GalleryError;
pub use genslate_app_common::{AppInfo, ConfigError, LogLevel, ThemePreference};
pub use genslate_storage::StorageError;
