//! Recursive search from a folder: names by substring or glob (`*.pdf`, `IMG_????.jpg`), and
//! optionally the text inside small text files. Results stream out in batches.

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Serialize};

use crate::ExplorerError;
use crate::entry::{Entry, require_dir};

/// Files larger than this are not searched for text.
const CONTENT_LIMIT: u64 = 2 * 1024 * 1024;
/// Results per batch sent to the UI.
const BATCH: usize = 64;

/// What to look for.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub root: PathBuf,
    pub text: String,
    /// Also match text inside files.
    #[serde(default)]
    pub contents: bool,
    #[serde(default)]
    pub show_hidden: bool,
    /// Stop after this many matches.
    #[serde(default = "default_limit")]
    pub limit: usize,
}

const fn default_limit() -> usize {
    2000
}

/// How a finished search went.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSummary {
    pub scanned: u64,
    pub matched: usize,
    /// Hit `limit` before the end.
    pub truncated: bool,
    pub cancelled: bool,
}

/// Searches under `query.root`, calling `on_batch` with matches as they are found.
pub fn search(
    query: &SearchQuery,
    cancel: &AtomicBool,
    mut on_batch: impl FnMut(Vec<Entry>),
) -> Result<SearchSummary, ExplorerError> {
    let root = require_dir(&query.root)?;
    let matcher = Matcher::new(&query.text);
    let mut summary = SearchSummary::default();
    let mut batch = Vec::new();
    let mut stack = vec![root];

    'walk: while let Some(dir) = stack.pop() {
        let Ok(children) = fs::read_dir(&dir) else {
            continue;
        };
        for child in children.flatten() {
            if cancel.load(Ordering::Relaxed) {
                summary.cancelled = true;
                break 'walk;
            }
            summary.scanned += 1;
            let path = child.path();
            let Ok(entry) = Entry::read(&path) else {
                continue;
            };
            if entry.hidden && !query.show_hidden {
                continue;
            }
            // Linked folders are listed but not entered (they can loop).
            if entry.is_dir && !entry.symlink {
                stack.push(path.clone());
            }
            let hit = matcher.matches_name(&entry.name)
                || (query.contents && !entry.is_dir && matcher.matches_contents(&path, &entry));
            if !hit {
                continue;
            }
            batch.push(entry);
            summary.matched += 1;
            if batch.len() >= BATCH {
                on_batch(std::mem::take(&mut batch));
            }
            if summary.matched >= query.limit {
                summary.truncated = true;
                break 'walk;
            }
        }
    }
    if !batch.is_empty() {
        on_batch(batch);
    }
    Ok(summary)
}

/// Case-insensitive name matching: a glob when the text has `*` or `?`, else a substring.
#[derive(Debug)]
struct Matcher {
    needle: String,
    glob: bool,
}

impl Matcher {
    fn new(text: &str) -> Self {
        let needle = text.trim().to_lowercase();
        let glob = needle.contains(['*', '?']);
        Self { needle, glob }
    }

    fn matches_name(&self, name: &str) -> bool {
        let name = name.to_lowercase();
        if self.glob {
            glob_match(self.needle.as_bytes(), name.as_bytes())
        } else {
            name.contains(&self.needle)
        }
    }

    fn matches_contents(&self, path: &Path, entry: &Entry) -> bool {
        if self.glob || self.needle.is_empty() || !entry.kind.is_textual() {
            return false;
        }
        if entry.size.is_none_or(|size| size > CONTENT_LIMIT) {
            return false;
        }
        let mut text = String::new();
        let read = fs::File::open(path).and_then(|mut file| file.read_to_string(&mut text));
        read.is_ok() && text.to_lowercase().contains(&self.needle)
    }
}

/// `*` matches any run, `?` one character (byte-wise; fine for the ASCII wildcards).
fn glob_match(pattern: &[u8], text: &[u8]) -> bool {
    let (mut p, mut t) = (0, 0);
    let mut star: Option<(usize, usize)> = None;
    while t < text.len() {
        match pattern.get(p) {
            Some(b'*') => {
                star = Some((p, t));
                p += 1;
            }
            Some(&c) if c == b'?' || c == text[t] => {
                p += 1;
                t += 1;
            }
            _ => match star {
                Some((star_p, star_t)) => {
                    p = star_p + 1;
                    t = star_t + 1;
                    star = Some((star_p, star_t + 1));
                }
                None => return false,
            },
        }
    }
    pattern[p..].iter().all(|&c| c == b'*')
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    fn query(root: &Path, text: &str, contents: bool) -> SearchQuery {
        SearchQuery {
            root: root.to_path_buf(),
            text: text.to_owned(),
            contents,
            show_hidden: false,
            limit: default_limit(),
        }
    }

    fn names(root: &Path, text: &str, contents: bool) -> Result<Vec<String>, ExplorerError> {
        let mut found = Vec::new();
        search(
            &query(root, text, contents),
            &AtomicBool::new(false),
            |batch| {
                found.extend(batch.into_iter().map(|entry| entry.name));
            },
        )?;
        found.sort();
        Ok(found)
    }

    #[test]
    fn finds_names_recursively() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("Invoices/March-invoice.pdf", "")?
            .file("Invoices/2026/april INVOICE.pdf", "")?
            .file("notes.txt", "")?
            .file(".hidden/invoice.pdf", "")?;
        assert_eq!(
            names(tree.path(), "invoice", false)?,
            vec!["Invoices", "March-invoice.pdf", "april INVOICE.pdf"]
        );
        Ok(())
    }

    #[test]
    fn globs_and_contents() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("a.pdf", "")?
            .file("b.PDF", "")?
            .file("c.txt", "The budget for March")?
            .file("d.md", "nothing here")?;
        assert_eq!(names(tree.path(), "*.pdf", false)?, vec!["a.pdf", "b.PDF"]);
        assert_eq!(names(tree.path(), "?.txt", false)?, vec!["c.txt"]);
        assert_eq!(names(tree.path(), "budget", true)?, vec!["c.txt"]);
        assert!(names(tree.path(), "budget", false)?.is_empty());
        Ok(())
    }

    #[test]
    fn stops_at_the_limit_and_on_cancel() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("a1", "")?
            .file("a2", "")?
            .file("a3", "")?;
        let mut limited = query(tree.path(), "a", false);
        limited.limit = 2;
        let summary = search(&limited, &AtomicBool::new(false), |_| {})?;
        assert!(summary.truncated);
        assert_eq!(summary.matched, 2);
        let cancelled = search(
            &query(tree.path(), "a", false),
            &AtomicBool::new(true),
            |_| {},
        )?;
        assert!(cancelled.cancelled);
        Ok(())
    }

    #[test]
    fn glob_edge_cases() {
        assert!(glob_match(b"*", b""));
        assert!(glob_match(b"a*b*c", b"axxbyyc"));
        assert!(!glob_match(b"a*b", b"ac"));
        assert!(glob_match(b"img_????.jpg", b"img_0042.jpg"));
        assert!(!glob_match(b"img_????.jpg", b"img_042.jpg"));
    }
}
