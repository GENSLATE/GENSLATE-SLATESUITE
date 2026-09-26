//! Shared test helpers for GENSLATE crates.
//!
//! Use it as a `[dev-dependencies]` entry. Everything returns [`std::io::Result`] so tests
//! can use `?` (the workspace denies `unwrap`/`expect`).
//!
//! ```
//! # fn main() -> std::io::Result<()> {
//! let tree = genslate_testing::TempTree::new()?
//!     .file("config/app.toml", "name = \"demo\"\n")?
//!     .dir("logs")?;
//! assert!(tree.join("config/app.toml").is_file());
//! assert_eq!(tree.read("config/app.toml")?, "name = \"demo\"\n");
//! # Ok(())
//! # }
//! ```
#![forbid(unsafe_code)]

mod repo;
mod tree;

pub use repo::{REPO_MARKERS, fake_repo};
pub use tree::TempTree;
