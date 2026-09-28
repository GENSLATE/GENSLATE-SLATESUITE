//! File name rules for new, renamed and pasted items.
//!
//! The suite is portable (it lives on USB drives and moves between Windows, macOS and Linux),
//! so names follow the strictest rules (Windows') on every OS: a name that works here works
//! everywhere the suite runs.

use std::path::{Path, PathBuf};

use crate::ExplorerError;
use crate::kind::extension;

/// Characters Windows forbids in names (plus both separators).
const FORBIDDEN: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

/// Device names Windows reserves, with or without an extension.
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// The longest name most file systems accept, in bytes.
const MAX_NAME_BYTES: usize = 255;

/// Checks a single file or folder name, returning it trimmed of leading spaces.
pub fn validate_name(name: &str) -> Result<&str, ExplorerError> {
    let invalid = |message: &str| Err(ExplorerError::InvalidName(message.to_owned()));
    let name = name.trim_start();
    if name.trim().is_empty() {
        return invalid("A name can't be empty.");
    }
    if name == "." || name == ".." {
        return invalid("“.” and “..” are reserved names.");
    }
    if let Some(bad) = name
        .chars()
        .find(|c| FORBIDDEN.contains(c) || c.is_control())
    {
        let shown = if bad.is_control() {
            "control characters".to_owned()
        } else {
            format!("“{bad}”")
        };
        return Err(ExplorerError::InvalidName(format!(
            "A name can't contain {shown}."
        )));
    }
    if name.ends_with(' ') || name.ends_with('.') {
        return invalid("A name can't end with a space or a period.");
    }
    let stem = name.split('.').next().unwrap_or(name).trim_end();
    if RESERVED
        .iter()
        .any(|reserved| reserved.eq_ignore_ascii_case(stem))
    {
        return Err(ExplorerError::InvalidName(format!(
            "“{stem}” is reserved by Windows."
        )));
    }
    if name.len() > MAX_NAME_BYTES {
        return invalid("That name is too long.");
    }
    Ok(name)
}

/// `dir/name`, or the first free `name (2)`, `name (3)`… (`report (2).pdf` keeps the extension).
pub fn unique_path(dir: &Path, name: &str) -> PathBuf {
    let candidate = dir.join(name);
    if !exists(&candidate) {
        return candidate;
    }
    let (stem, ext) = split_name(name);
    let (base, mut next) = numbered(stem);
    loop {
        next += 1;
        let candidate = dir.join(format!("{base} ({next}){ext}"));
        if !exists(&candidate) {
            return candidate;
        }
    }
}

/// `true` for anything at `path`, including a dangling symlink.
pub fn exists(path: &Path) -> bool {
    path.symlink_metadata().is_ok()
}

/// `("report", ".pdf")`; folders and dotfiles keep the whole name as the stem.
fn split_name(name: &str) -> (&str, &str) {
    match extension(name) {
        Some(ext) => name.split_at(name.len() - ext.len() - 1),
        None => (name, ""),
    }
}

/// `"report (3)"` → `("report", 3)`; anything else → `(name, 1)`.
fn numbered(stem: &str) -> (&str, u32) {
    let parsed = stem.strip_suffix(')').and_then(|rest| {
        let (base, number) = rest.rsplit_once(" (")?;
        let number = number.parse::<u32>().ok()?;
        (!base.is_empty() && number >= 2).then_some((base, number))
    });
    parsed.unwrap_or((stem, 1))
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    #[test]
    fn accepts_ordinary_names() -> Result<(), ExplorerError> {
        assert_eq!(validate_name("Report 2026.pdf")?, "Report 2026.pdf");
        assert_eq!(validate_name("  padded")?, "padded");
        assert_eq!(validate_name(".gitignore")?, ".gitignore");
        assert_eq!(validate_name("Consoles")?, "Consoles");
        Ok(())
    }

    #[test]
    fn rejects_unportable_names() {
        for bad in [
            "",
            "   ",
            ".",
            "..",
            "a/b",
            "a\\b",
            "what?",
            "star*",
            "pipe|",
            "colon:",
            "dot.",
            "space ",
            "CON",
            "con.txt",
            "LPT1",
            "tab\tname",
        ] {
            assert!(validate_name(bad).is_err(), "{bad:?} should be rejected");
        }
        assert!(validate_name(&"x".repeat(256)).is_err());
    }

    #[test]
    fn numbers_duplicates_before_the_extension() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("report.pdf", "")?
            .file("report (2).pdf", "")?
            .dir("Photos")?;
        assert!(unique_path(tree.path(), "report.pdf").ends_with("report (3).pdf"));
        assert!(unique_path(tree.path(), "report (2).pdf").ends_with("report (3).pdf"));
        assert!(unique_path(tree.path(), "Photos").ends_with("Photos (2)"));
        assert!(unique_path(tree.path(), "new.txt").ends_with("new.txt"));
        Ok(())
    }

    #[test]
    fn splits_names() {
        assert_eq!(split_name("a.tar.gz"), ("a.tar", ".gz"));
        assert_eq!(split_name(".env"), (".env", ""));
        assert_eq!(numbered("x (12)"), ("x", 12));
        assert_eq!(numbered("x (1)"), ("x (1)", 1));
        assert_eq!(numbered("(3)"), ("(3)", 1));
    }
}
