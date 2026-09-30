//! Recursive search from a folder: names by substring or glob (`*.pdf`, `IMG_????.jpg`), and
//! optionally the text inside files. Results stream out in batches.
//!
//! The walk is `ignore`'s parallel walker (one thread per core), so it honours `.gitignore`,
//! `.ignore` and `.git/info/exclude` the way developers expect; names are matched with
//! `globset` and contents with ripgrep's `grep-searcher`, which streams each file, stops at the
//! first hit and gives up on binary files at their first NUL byte.

use std::io;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::{Duration, Instant};

use globset::{GlobBuilder, GlobMatcher};
use grep_regex::{RegexMatcher, RegexMatcherBuilder};
use grep_searcher::{BinaryDetection, Searcher, SearcherBuilder, Sink, SinkMatch};
use ignore::{DirEntry, WalkBuilder, WalkState};
use serde::{Deserialize, Serialize};

use crate::ExplorerError;
use crate::entry::{Entry, require_dir};
use crate::kind::FileKind;

/// Files larger than this are not searched for text.
const CONTENT_LIMIT: u64 = 2 * 1024 * 1024;
/// Results per batch sent to the UI.
const BATCH: usize = 64;
/// A partial batch is sent after this long, so slow searches still show results early.
const FLUSH: Duration = Duration::from_millis(150);

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
    /// Entries visited. With the parallel walk this is exact for a finished search but only
    /// approximate after a cancel or once `limit` is hit (other threads may still be counting).
    pub scanned: u64,
    pub matched: usize,
    /// Hit `limit` before the end.
    pub truncated: bool,
    pub cancelled: bool,
}

/// State the walker threads share.
struct Shared<'a> {
    query: &'a SearchQuery,
    names: NameMatcher,
    contents: Option<RegexMatcher>,
    cancel: &'a AtomicBool,
    scanned: AtomicU64,
    /// Matches claimed so far (may run past `limit` by the losers of a race; those are dropped).
    claimed: AtomicUsize,
    truncated: AtomicBool,
    cancelled: AtomicBool,
}

/// Searches under `query.root`, calling `on_batch` with matches as they are found.
pub fn search(
    query: &SearchQuery,
    cancel: &AtomicBool,
    mut on_batch: impl FnMut(Vec<Entry>),
) -> Result<SearchSummary, ExplorerError> {
    let root = require_dir(&query.root)?;
    let shared = Shared {
        query,
        names: NameMatcher::new(&query.text),
        contents: query
            .contents
            .then(|| content_matcher(&query.text))
            .flatten(),
        cancel,
        scanned: AtomicU64::new(0),
        claimed: AtomicUsize::new(0),
        truncated: AtomicBool::new(false),
        cancelled: AtomicBool::new(false),
    };
    let mut builder = WalkBuilder::new(&root);
    builder
        .hidden(!query.show_hidden)
        // Linked folders are listed but not entered (they can loop).
        .follow_links(false)
        // `.gitignore`, `.ignore` and `.git/info/exclude` (also from parent folders) are
        // honoured: build output and `node_modules` would otherwise drown the results. The
        // user's global git excludes are not: they are personal editor settings, and a file
        // manager should not hide files because of them.
        .parents(true)
        .ignore(true)
        .git_ignore(true)
        .git_exclude(true)
        .git_global(false);
    let walker = builder.build_parallel();

    let (sender, receiver) = mpsc::channel::<Entry>();
    let mut matched = 0;
    thread::scope(|scope| {
        let shared = &shared;
        scope.spawn(move || {
            walker.run(|| {
                let sender = sender.clone();
                let mut searcher = SearcherBuilder::new()
                    .binary_detection(BinaryDetection::quit(0))
                    .line_number(false)
                    .build();
                Box::new(move |result| visit(shared, &mut searcher, &sender, result))
            });
            // `sender` (and every clone) is dropped here, which ends the receiving loop.
        });

        let mut batch = Vec::new();
        let mut flushed = Instant::now();
        loop {
            match receiver.recv_timeout(FLUSH) {
                Ok(entry) => {
                    batch.push(entry);
                    matched += 1;
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
            if batch.len() >= BATCH || (!batch.is_empty() && flushed.elapsed() >= FLUSH) {
                on_batch(std::mem::take(&mut batch));
                flushed = Instant::now();
            }
        }
        if !batch.is_empty() {
            on_batch(batch);
        }
    });
    Ok(SearchSummary {
        scanned: shared.scanned.load(Ordering::Relaxed),
        matched,
        truncated: shared.truncated.load(Ordering::Relaxed),
        cancelled: shared.cancelled.load(Ordering::Relaxed),
    })
}

/// Handles one walked entry on a walker thread.
fn visit(
    shared: &Shared<'_>,
    searcher: &mut Searcher,
    sender: &mpsc::Sender<Entry>,
    result: Result<DirEntry, ignore::Error>,
) -> WalkState {
    if shared.cancel.load(Ordering::Relaxed) {
        shared.cancelled.store(true, Ordering::Relaxed);
        return WalkState::Quit;
    }
    if shared.truncated.load(Ordering::Relaxed) {
        return WalkState::Quit;
    }
    // Unreadable folders and broken ignore files are skipped, as before.
    let Ok(dent) = result else {
        return WalkState::Continue;
    };
    // The root itself is not a result.
    if dent.depth() == 0 {
        return WalkState::Continue;
    }
    shared.scanned.fetch_add(1, Ordering::Relaxed);
    // Names that are not Unicode can't cross IPC (see `entry`), so they can't be results.
    let Some(name) = dent.file_name().to_str() else {
        return WalkState::Continue;
    };
    let hit = shared.names.matches(name)
        || shared
            .contents
            .as_ref()
            .is_some_and(|matcher| contents_match(searcher, matcher, &dent, name));
    if !hit {
        return WalkState::Continue;
    }
    let entry = match Entry::read(dent.path()) {
        Ok(entry) => entry,
        Err(error) => {
            log::debug!("search: skipping {}: {error}", dent.path().display());
            return WalkState::Continue;
        }
    };
    // `ignore` decides hidden-ness the same way `Entry` does (dot names, and the hidden
    // attribute on Windows); this only guards a link whose target is hidden on Windows.
    if entry.hidden && !shared.query.show_hidden {
        return WalkState::Skip;
    }
    let claimed = shared.claimed.fetch_add(1, Ordering::Relaxed);
    if claimed >= shared.query.limit {
        shared.truncated.store(true, Ordering::Relaxed);
        return WalkState::Quit;
    }
    // The receiver only goes away if the caller's thread panicked; stop walking then.
    if sender.send(entry).is_err() {
        return WalkState::Quit;
    }
    if claimed + 1 >= shared.query.limit {
        shared.truncated.store(true, Ordering::Relaxed);
        return WalkState::Quit;
    }
    WalkState::Continue
}

/// Case-insensitive name matching: a glob when the text has `*` or `?`, else a substring.
#[derive(Debug)]
enum NameMatcher {
    Glob(GlobMatcher),
    /// The lower-cased needle.
    Substring(String),
}

impl NameMatcher {
    fn new(text: &str) -> Self {
        let text = text.trim();
        if text.contains(['*', '?']) {
            match GlobBuilder::new(text)
                .case_insensitive(true)
                .literal_separator(false)
                .build()
            {
                Ok(glob) => return Self::Glob(glob.compile_matcher()),
                // An unfinished pattern (`[a-`) is looked for as plain text instead.
                Err(error) => log::debug!("search: not a glob ({error}), matching as text"),
            }
        }
        Self::Substring(text.to_lowercase())
    }

    fn matches(&self, name: &str) -> bool {
        match self {
            Self::Glob(glob) => glob.is_match(name),
            Self::Substring(needle) => name.to_lowercase().contains(needle.as_str()),
        }
    }
}

/// A case-insensitive literal matcher for file contents; `None` when there is nothing to look
/// for (an empty text, or a glob, which only applies to names).
fn content_matcher(text: &str) -> Option<RegexMatcher> {
    let needle = text.trim();
    if needle.is_empty() || needle.contains(['*', '?']) {
        return None;
    }
    RegexMatcherBuilder::new()
        .case_insensitive(true)
        .fixed_strings(true)
        .build(needle)
        .map_err(|error| log::debug!("search: no content matcher for {needle:?}: {error}"))
        .ok()
}

/// `true` when the regular file `dent` contains the needle. Files over [`CONTENT_LIMIT`] and
/// kinds that are known binary containers (images, media, archives, PDFs, Office files) are
/// never opened. Every other kind, including unknown extensions (`Makefile`, `.env.local`), is
/// searched: `grep-searcher` quits at the first NUL byte, so a binary file costs one buffer
/// read, and the old "textual kinds only" gate would have missed plain-text files with
/// unusual names.
fn contents_match(
    searcher: &mut Searcher,
    matcher: &RegexMatcher,
    dent: &DirEntry,
    name: &str,
) -> bool {
    if !dent.file_type().is_some_and(|kind| kind.is_file()) {
        return false;
    }
    let kind = FileKind::from_name(name);
    if !(kind.is_textual() || kind == FileKind::Other) {
        return false;
    }
    if dent
        .metadata()
        .map_or(true, |meta| meta.len() > CONTENT_LIMIT)
    {
        return false;
    }
    let mut sink = FirstMatch(false);
    if let Err(error) = searcher.search_path(matcher, dent.path(), &mut sink) {
        log::debug!("search: could not read {}: {error}", dent.path().display());
    }
    sink.0
}

/// A sink that records whether anything matched and stops at the first match.
struct FirstMatch(bool);

impl Sink for FirstMatch {
    type Error = io::Error;

    fn matched(&mut self, _: &Searcher, _: &SinkMatch<'_>) -> Result<bool, io::Error> {
        self.0 = true;
        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;
    use std::path::Path;

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
        let matches = |pattern: &str, name: &str| NameMatcher::new(pattern).matches(name);
        assert!(matches("*", ""));
        assert!(matches("a*b*c", "axxbyyc"));
        assert!(!matches("a*b", "ac"));
        assert!(matches("img_????.jpg", "IMG_0042.JPG"));
        assert!(!matches("img_????.jpg", "img_042.jpg"));
        // Not a valid glob: looked for as text.
        assert!(matches("[a-*", "x[a-*y"));
    }

    #[test]
    fn skips_gitignored_files() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .dir(".git")?
            .file(".gitignore", "target/\n*.log\n")?
            .file(".ignore", "secret-*\n")?
            .file("report.txt", "")?
            .file("report.log", "")?
            .file("secret-report.txt", "")?
            .file("target/report.bin", "")?
            .file("src/report.rs", "")?;
        assert_eq!(
            names(tree.path(), "report", false)?,
            vec!["report.rs", "report.txt"]
        );
        Ok(())
    }

    #[test]
    fn contents_skip_binaries_and_large_files() -> Result<(), Box<dyn std::error::Error>> {
        let large = "x".repeat(usize::try_from(CONTENT_LIMIT)? + 1) + "needle";
        let tree = TempTree::new()?
            .file("Makefile", "build: NEEDLE")?
            .file("blob.dat", b"needle\0\0\0".as_slice())?
            .file("photo.png", "needle")?
            .file("big.txt", large)?;
        assert_eq!(names(tree.path(), "needle", true)?, vec!["Makefile"]);
        Ok(())
    }

    #[test]
    fn counts_scanned_entries() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a/b.txt", "")?.file("c.txt", "")?;
        let summary = search(
            &query(tree.path(), "zzz", false),
            &AtomicBool::new(false),
            |_| {},
        )?;
        assert_eq!(summary.scanned, 3);
        assert_eq!(summary.matched, 0);
        assert!(!summary.truncated && !summary.cancelled);
        Ok(())
    }
}
