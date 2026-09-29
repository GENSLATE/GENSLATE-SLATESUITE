//! The side panel's file tree: one folder level at a time, folders first in natural order
//! (`file2` before `file10`), hidden and git-ignored items left out unless asked for, each item
//! tagged with its git status. Also [`save_output`], which saves a terminal's text.

use std::cmp::Ordering;
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use ignore::WalkBuilder;
use serde::Serialize;

use crate::TerminalError;
use crate::git::{GitStatus, RepoStatus};

/// A folder's contents (`DirListing`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirListing {
    /// The folder, canonical (symlinks resolved).
    pub path: String,
    pub entries: Vec<FileNode>,
}

/// One item of a listing (`FileNode`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    /// A folder, or a link to one.
    pub is_dir: bool,
    pub is_symlink: bool,
    /// Bytes, for files.
    pub size: Option<u64>,
    /// For folders: `modified` when anything inside changed.
    pub git: Option<GitStatus>,
}

/// Lists `path` (absolute). `show_hidden` also shows dotfiles, hidden files and git-ignored
/// items.
pub fn list_dir(path: &Path, show_hidden: bool) -> Result<DirListing, TerminalError> {
    let folder = existing_folder(path)?;
    let walker = WalkBuilder::new(&folder)
        .max_depth(Some(1))
        .follow_links(false)
        .hidden(!show_hidden)
        .ignore(!show_hidden)
        .git_ignore(!show_hidden)
        .git_global(!show_hidden)
        .git_exclude(!show_hidden)
        .parents(!show_hidden)
        .build();
    let mut entries: Vec<FileNode> = walker
        .filter_map(|entry| match entry {
            Ok(entry) if entry.depth() == 1 => node(entry.path(), entry.path_is_symlink()),
            Ok(_) => None,
            Err(error) => {
                log::debug!("skipping an item of {}: {error}", folder.display());
                None
            }
        })
        .collect();
    let status = RepoStatus::for_folder(&folder).unwrap_or_else(|error| {
        log::debug!("no git status for {}: {error}", folder.display());
        None
    });
    if let Some(status) = status {
        for entry in &mut entries {
            entry.git = status.get(Path::new(&entry.path));
        }
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| natural_cmp(&a.name, &b.name))
    });
    Ok(DirListing {
        path: folder.to_string_lossy().into_owned(),
        entries,
    })
}

/// `path` checked to be an absolute, existing folder, with symlinks resolved.
pub fn existing_folder(path: &Path) -> Result<PathBuf, TerminalError> {
    if !path.is_absolute() {
        return Err(TerminalError::NotAbsolute(path.to_path_buf()));
    }
    let folder = dunce::canonicalize(path).map_err(|error| match error.kind() {
        io::ErrorKind::NotFound => TerminalError::NotFound(path.to_path_buf()),
        _ => TerminalError::io("could not open", path)(error),
    })?;
    if !folder.is_dir() {
        return Err(TerminalError::NotAFolder(path.to_path_buf()));
    }
    Ok(folder)
}

/// `path` checked to be absolute and to exist (file or folder), with symlinks resolved.
pub fn existing_path(path: &Path) -> Result<PathBuf, TerminalError> {
    if !path.is_absolute() {
        return Err(TerminalError::NotAbsolute(path.to_path_buf()));
    }
    dunce::canonicalize(path).map_err(|error| match error.kind() {
        io::ErrorKind::NotFound => TerminalError::NotFound(path.to_path_buf()),
        _ => TerminalError::io("could not open", path)(error),
    })
}

fn node(path: &Path, is_symlink: bool) -> Option<FileNode> {
    // Follows links so a link to a folder can be expanded; a broken link is still listed.
    let metadata = fs::metadata(path)
        .or_else(|_| fs::symlink_metadata(path))
        .ok()?;
    let is_dir = metadata.is_dir();
    Some(FileNode {
        name: path.file_name()?.to_string_lossy().into_owned(),
        path: path.to_string_lossy().into_owned(),
        is_dir,
        is_symlink,
        size: (!is_dir).then_some(metadata.len()),
        git: None,
    })
}

/// The most text [`save_output`] writes (bytes).
pub const MAX_SAVED_TEXT: usize = 64 * 1024 * 1024;

/// Writes `text` to a new file in `dir` named after `file_name` (made safe for every OS,
/// `.txt` added when it has no extension). An existing file is never overwritten: `-1`, `-2`…
/// is added instead. Returns the path written.
pub fn save_output(dir: &Path, file_name: &str, text: &str) -> Result<PathBuf, TerminalError> {
    if text.len() > MAX_SAVED_TEXT {
        return Err(TerminalError::InvalidArgument(
            "the output is too large to save".to_owned(),
        ));
    }
    fs::create_dir_all(dir).map_err(TerminalError::io("could not create", dir))?;
    let name = sanitize_file_name(file_name);
    let (stem, extension) = match name.rfind('.') {
        Some(dot) if dot > 0 => name.split_at(dot),
        _ => (name.as_str(), ""),
    };
    for attempt in 0..10_000 {
        let candidate = if attempt == 0 {
            name.clone()
        } else {
            format!("{stem}-{attempt}{extension}")
        };
        let path = dir.join(candidate);
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut file) => {
                file.write_all(text.as_bytes())
                    .and_then(|()| file.flush())
                    .map_err(TerminalError::io("could not write", &path))?;
                return Ok(path);
            }
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(TerminalError::io("could not create", &path)(error)),
        }
    }
    Err(TerminalError::InvalidArgument(format!(
        "too many files named “{name}” already"
    )))
}

/// A file name every OS accepts: no folders, no reserved characters or device names, at most
/// 120 characters, `.txt` when there is no extension.
pub fn sanitize_file_name(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or(name);
    let cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_control() || matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*') {
                '-'
            } else {
                c
            }
        })
        .take(120)
        .collect();
    let mut cleaned = cleaned
        .trim_matches(|c: char| c == '.' || c.is_whitespace())
        .to_owned();
    if cleaned.is_empty() {
        cleaned.push_str("terminal-output");
    }
    let stem = cleaned
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    let reserved = matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ((stem.starts_with("COM") || stem.starts_with("LPT"))
            && stem.len() == 4
            && stem.as_bytes()[3].is_ascii_digit());
    if reserved {
        cleaned.insert(0, '_');
    }
    if !cleaned.contains('.') {
        cleaned.push_str(".txt");
    }
    cleaned
}

/// Case-insensitive order with digit runs compared as numbers (`a2` < `a10`).
pub fn natural_cmp(a: &str, b: &str) -> Ordering {
    let mut left = a.chars().peekable();
    let mut right = b.chars().peekable();
    loop {
        match (left.peek().copied(), right.peek().copied()) {
            (None, None) => return a.cmp(b),
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(x), Some(y)) if x.is_ascii_digit() && y.is_ascii_digit() => {
                let x = take_digits(&mut left);
                let y = take_digits(&mut right);
                let (xs, ys) = (x.trim_start_matches('0'), y.trim_start_matches('0'));
                let order = xs
                    .len()
                    .cmp(&ys.len())
                    .then_with(|| xs.cmp(ys))
                    .then_with(|| x.len().cmp(&y.len()));
                if order != Ordering::Equal {
                    return order;
                }
            }
            (Some(x), Some(y)) => {
                let order = x.to_lowercase().cmp(y.to_lowercase());
                if order != Ordering::Equal {
                    return order;
                }
                left.next();
                right.next();
            }
        }
    }
}

fn take_digits(chars: &mut std::iter::Peekable<std::str::Chars<'_>>) -> String {
    let mut digits = String::new();
    while let Some(c) = chars.next_if(char::is_ascii_digit) {
        digits.push(c);
    }
    digits
}

#[cfg(test)]
mod tests {
    use genslate_testing::TempTree;

    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn names(listing: &DirListing) -> Vec<&str> {
        listing
            .entries
            .iter()
            .map(|entry| entry.name.as_str())
            .collect()
    }

    #[test]
    fn existing_path_accepts_files_and_folders_only_when_absolute() -> TestResult {
        let tree = TempTree::new()?.file("notes.txt", "hi")?;
        let file = existing_path(&tree.join("notes.txt"))?;
        assert!(file.is_absolute() && file.is_file());
        assert!(existing_path(tree.path())?.is_dir());
        assert_eq!(
            existing_path(&tree.join("missing"))
                .err()
                .map(|error| error.kind()),
            Some("not-found")
        );
        assert_eq!(
            existing_path(Path::new("notes.txt"))
                .err()
                .map(|error| error.kind()),
            Some("not-absolute")
        );
        Ok(())
    }

    #[test]
    fn natural_order() {
        let mut names = vec![
            "file10.txt",
            "File2.txt",
            "file1.txt",
            "b",
            "A",
            "file02.txt",
            "a1b2",
            "a1b10",
        ];
        names.sort_by(|a, b| natural_cmp(a, b));
        assert_eq!(
            names,
            [
                "A",
                "a1b2",
                "a1b10",
                "b",
                "file1.txt",
                "File2.txt",
                "file02.txt",
                "file10.txt"
            ]
        );
        assert_eq!(natural_cmp("x", "x"), Ordering::Equal);
        assert_eq!(natural_cmp("abc", "ab"), Ordering::Greater);
        assert_eq!(natural_cmp("9", "10"), Ordering::Less);
        assert_eq!(
            natural_cmp("99999999999999999999999", "100000000000000000000000"),
            Ordering::Less
        );
    }

    #[test]
    fn folders_first_then_natural_names() -> TestResult {
        let tree = TempTree::new()?
            .file("b10.txt", "1234")?
            .file("b9.txt", "")?
            .dir("zeta")?
            .dir("Alpha")?
            .file("a.txt", "")?;
        let listing = list_dir(tree.path(), false)?;
        assert_eq!(
            names(&listing),
            ["Alpha", "zeta", "a.txt", "b9.txt", "b10.txt"]
        );
        let file = &listing.entries[4];
        assert_eq!(file.size, Some(4));
        assert!(!file.is_dir && !file.is_symlink);
        assert_eq!(listing.entries[0].size, None);
        assert!(Path::new(&file.path).is_absolute());
        assert!(
            listing.entries.iter().all(|entry| entry.git.is_none()),
            "no repository"
        );
        Ok(())
    }

    #[test]
    fn hides_dotfiles_and_ignored_items_unless_asked() -> TestResult {
        let tree = TempTree::new()?
            .dir(".git")?
            .file(".gitignore", "target/\n*.log\n")?
            .file(".env.example", "")?
            .file("debug.log", "")?
            .dir("target")?
            .file("main.rs", "")?;
        assert_eq!(names(&list_dir(tree.path(), false)?), ["main.rs"]);
        assert_eq!(
            names(&list_dir(tree.path(), true)?),
            [
                ".git",
                "target",
                ".env.example",
                ".gitignore",
                "debug.log",
                "main.rs"
            ]
        );
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn follows_links_to_folders() -> TestResult {
        let tree = TempTree::new()?.dir("real")?.file("real/inside.txt", "")?;
        std::os::unix::fs::symlink(tree.join("real"), tree.join("link"))?;
        std::os::unix::fs::symlink(tree.join("missing"), tree.join("broken"))?;
        let listing = list_dir(tree.path(), false)?;
        let link = listing
            .entries
            .iter()
            .find(|entry| entry.name == "link")
            .ok_or("no link")?;
        assert!(link.is_dir && link.is_symlink);
        let broken = listing
            .entries
            .iter()
            .find(|entry| entry.name == "broken")
            .ok_or("no broken")?;
        assert!(!broken.is_dir && broken.is_symlink);
        Ok(())
    }

    #[test]
    fn rejects_bad_paths() -> TestResult {
        let tree = TempTree::new()?.file("file.txt", "")?;
        assert_eq!(
            list_dir(Path::new("relative"), false)
                .err()
                .map(|e| e.kind()),
            Some("not-absolute")
        );
        assert_eq!(
            list_dir(&tree.join("missing"), false)
                .err()
                .map(|e| e.kind()),
            Some("not-found")
        );
        assert_eq!(
            list_dir(&tree.join("file.txt"), false)
                .err()
                .map(|e| e.kind()),
            Some("not-a-folder")
        );
        Ok(())
    }

    #[test]
    fn sanitizes_file_names() {
        assert_eq!(sanitize_file_name("build log"), "build log.txt");
        assert_eq!(sanitize_file_name("../../etc/passwd"), "passwd.txt");
        assert_eq!(sanitize_file_name(r"C:\x\out.log"), "out.log");
        assert_eq!(sanitize_file_name("a<b>c:d|e?f*.txt"), "a-b-c-d-e-f-.txt");
        assert_eq!(sanitize_file_name("  ..  "), "terminal-output.txt");
        assert_eq!(sanitize_file_name("con.txt"), "_con.txt");
        assert_eq!(sanitize_file_name("COM1"), "_COM1.txt");
        assert_eq!(sanitize_file_name("COMET"), "COMET.txt");
        assert_eq!(sanitize_file_name(&"x".repeat(300)).len(), 124);
    }

    #[test]
    fn saves_output_without_overwriting() -> TestResult {
        let tree = TempTree::new()?;
        let dir = tree.join("Downloads");
        let first = save_output(&dir, "session.log", "one")?;
        let second = save_output(&dir, "session.log", "two")?;
        let third = save_output(&dir, "session.log", "three")?;
        assert_eq!(first, dir.join("session.log"));
        assert_eq!(second, dir.join("session-1.log"));
        assert_eq!(third, dir.join("session-2.log"));
        assert_eq!(fs::read_to_string(&first)?, "one");
        assert_eq!(fs::read_to_string(&third)?, "three");
        let plain = save_output(&dir, "notes", "x")?;
        assert_eq!(plain, dir.join("notes.txt"));
        assert_eq!(save_output(&dir, "notes", "y")?, dir.join("notes-1.txt"));
        Ok(())
    }

    #[test]
    fn tags_items_with_their_git_status() -> TestResult {
        let tree = TempTree::new()?;
        gix::init(tree.path())?;
        tree.write("new.txt", "x")?;
        tree.write("sub/deep.txt", "x")?;
        let listing = list_dir(tree.path(), false)?;
        let status = |name: &str| {
            listing
                .entries
                .iter()
                .find(|entry| entry.name == name)
                .and_then(|entry| entry.git)
        };
        assert_eq!(status("new.txt"), Some(GitStatus::Untracked));
        assert_eq!(status("sub"), Some(GitStatus::Untracked));
        let inside = list_dir(&tree.join("sub"), false)?;
        assert_eq!(inside.entries[0].git, Some(GitStatus::Untracked));
        Ok(())
    }
}
