//! Git information for the status bar and the file tree, read with `gix` (no `git` binary).
//!
//! - [`info`]: the repository around a folder, its branch (or detached HEAD) and how many
//!   files changed.
//! - [`RepoStatus`]: per-path status (index and worktree, untracked included) for decorating
//!   file listings; folders containing changes are `modified`, and everything inside an
//!   untracked folder is `untracked`.
//!
//! Rename tracking is off (a rename shows as `deleted` + `added`/`untracked`) and submodule
//! contents are not inspected, which keeps a status fast on big repositories.

use std::collections::{HashMap, HashSet};
use std::path::{Component, Path, PathBuf};

use gix::bstr::{BStr, BString, ByteSlice};
use gix::status::UntrackedFiles;
use serde::Serialize;

use crate::TerminalError;

/// A path's state in git (`FileNode.git`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum GitStatus {
    Modified,
    Added,
    Untracked,
    Deleted,
    Renamed,
    Conflicted,
}

impl GitStatus {
    /// Which of two statuses for the same path wins (the more important one).
    const fn weight(self) -> u8 {
        match self {
            Self::Conflicted => 6,
            Self::Added => 5,
            Self::Renamed => 4,
            Self::Deleted => 3,
            Self::Modified => 2,
            Self::Untracked => 1,
        }
    }
}

/// The repository around a folder (`GitInfo`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    /// The working tree's root folder.
    pub root: String,
    /// The checked-out branch; `None` when HEAD is detached.
    pub branch: Option<String>,
    /// Abbreviated HEAD commit id (empty before the first commit).
    pub head: String,
    /// Files with any change (staged, unstaged or untracked).
    pub changes: usize,
}

/// The repository containing `path` and its state, or `None` outside a repository (and for
/// bare repositories).
pub fn info(path: &Path) -> Result<Option<GitInfo>, TerminalError> {
    let Some(repo) = discover(path) else {
        return Ok(None);
    };
    let Some(workdir) = repo.workdir().map(Path::to_path_buf) else {
        return Ok(None);
    };
    let head = repo.head().map_err(git_error)?;
    let branch = head
        .referent_name()
        .map(|name| name.shorten().to_str_lossy().into_owned());
    let head_id = head
        .id()
        .map(|id| id.shorten_or_id().to_string())
        .unwrap_or_default();
    let changes = collect(&repo, &workdir, None)?.changed_files.len();
    Ok(Some(GitInfo {
        root: workdir.to_string_lossy().into_owned(),
        branch,
        head: head_id,
        changes,
    }))
}

/// Git status of the paths in and below one folder.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RepoStatus {
    workdir: PathBuf,
    /// Absolute path → status; changed paths plus every folder above them (`modified`).
    entries: HashMap<PathBuf, GitStatus>,
    /// Untracked folders reported as a whole.
    untracked_dirs: Vec<PathBuf>,
}

impl RepoStatus {
    /// The status of everything under `folder`, or `None` when it isn't in a repository.
    pub fn for_folder(folder: &Path) -> Result<Option<Self>, TerminalError> {
        let Some(repo) = discover(folder) else {
            return Ok(None);
        };
        let Some(workdir) = repo.workdir().map(Path::to_path_buf) else {
            return Ok(None);
        };
        let folder = dunce::canonicalize(folder).unwrap_or_else(|_| folder.to_path_buf());
        let within = folder
            .strip_prefix(&workdir)
            .ok()
            .filter(|relative| !relative.as_os_str().is_empty());
        let collected = collect(&repo, &workdir, within)?;
        Ok(Some(collected.status))
    }

    /// The status of `path` (absolute): its own, else `untracked` inside an untracked folder.
    pub fn get(&self, path: &Path) -> Option<GitStatus> {
        if let Some(status) = self.entries.get(path) {
            return Some(*status);
        }
        self.untracked_dirs
            .iter()
            .any(|dir| path.starts_with(dir))
            .then_some(GitStatus::Untracked)
    }

    /// Every path with a status.
    pub fn entries(&self) -> &HashMap<PathBuf, GitStatus> {
        &self.entries
    }

    /// The repository's working tree root.
    pub fn workdir(&self) -> &Path {
        &self.workdir
    }
}

/// The status of every changed path in the repository at `repo_root` (worktree and index,
/// untracked included; folders above changes are `modified`).
pub fn statuses(repo_root: &Path) -> Result<HashMap<PathBuf, GitStatus>, TerminalError> {
    Ok(RepoStatus::for_folder(repo_root)?
        .map(|status| status.entries)
        .unwrap_or_default())
}

struct Collected {
    status: RepoStatus,
    changed_files: HashSet<PathBuf>,
}

/// Settings that can run programs (filter drivers, credential helpers) are only read from the
/// user's and the system's git config, never from the repository's own `.git/config`: listing a
/// folder that came from an archive or a USB stick must not run what it names.
fn outside_repository(meta: &gix::config::file::Metadata) -> bool {
    meta.source.kind() != gix::config::source::Kind::Repository
}

fn discover(path: &Path) -> Option<gix::Repository> {
    let path = dunce::canonicalize(path).ok()?;
    let options = gix::open::Options::default().filter_config_section(outside_repository);
    gix::discover_opts(&path, gix::discover::upwards::Options::default(), options).ok()
}

fn collect(
    repo: &gix::Repository,
    workdir: &Path,
    within: Option<&Path>,
) -> Result<Collected, TerminalError> {
    let patterns: Vec<BString> = within
        .map(|relative| {
            let relative = gix::path::to_unix_separators_on_windows(gix::path::into_bstr(relative));
            let mut pattern = BString::from(":(literal)");
            pattern.extend_from_slice(&relative);
            pattern
        })
        .into_iter()
        .collect();
    let iter = repo
        .status(gix::progress::Discard)
        .map_err(git_error)?
        .untracked_files(UntrackedFiles::Collapsed)
        .index_worktree_rewrites(None)
        .into_iter(patterns)
        .map_err(git_error)?;

    let mut status = RepoStatus {
        workdir: workdir.to_path_buf(),
        ..RepoStatus::default()
    };
    let mut changed_files = HashSet::new();
    for item in iter {
        let item = item.map_err(git_error)?;
        let Some(kind) = classify(&item) else {
            continue;
        };
        let relative = item.location();
        let path = join_relative(workdir, relative);
        if kind == GitStatus::Untracked && is_folder_entry(&item) {
            status.untracked_dirs.push(path.clone());
        }
        changed_files.insert(path.clone());
        record(&mut status.entries, path.clone(), kind);
        for folder in path.ancestors().skip(1) {
            if folder == workdir || !folder.starts_with(workdir) {
                break;
            }
            status
                .entries
                .entry(folder.to_path_buf())
                .or_insert(GitStatus::Modified);
        }
    }
    Ok(Collected {
        status,
        changed_files,
    })
}

fn record(entries: &mut HashMap<PathBuf, GitStatus>, path: PathBuf, kind: GitStatus) {
    entries
        .entry(path)
        .and_modify(|known| {
            if kind.weight() > known.weight() {
                *known = kind;
            }
        })
        .or_insert(kind);
}

fn classify(item: &gix::status::Item) -> Option<GitStatus> {
    use gix::diff::index::ChangeRef;
    use gix::status::index_worktree::iter::Summary;
    match item {
        gix::status::Item::IndexWorktree(change) => Some(match change.summary()? {
            Summary::Added => GitStatus::Untracked,
            Summary::Removed => GitStatus::Deleted,
            Summary::Modified | Summary::TypeChange => GitStatus::Modified,
            Summary::Renamed | Summary::Copied => GitStatus::Renamed,
            Summary::IntentToAdd => GitStatus::Added,
            Summary::Conflict => GitStatus::Conflicted,
        }),
        gix::status::Item::TreeIndex(change) => Some(match change {
            ChangeRef::Addition { .. } => GitStatus::Added,
            ChangeRef::Deletion { .. } => GitStatus::Deleted,
            ChangeRef::Modification { .. } => GitStatus::Modified,
            ChangeRef::Rewrite { .. } => GitStatus::Renamed,
        }),
    }
}

/// `true` for a collapsed untracked folder (reported once for all its contents).
fn is_folder_entry(item: &gix::status::Item) -> bool {
    matches!(
        item,
        gix::status::Item::IndexWorktree(gix::status::index_worktree::Item::DirectoryContents {
            entry,
            ..
        }) if entry.disk_kind.is_some_and(|kind| kind.is_dir())
    )
}

/// `workdir` joined with a repository-relative `a/b/c` path, component by component (so
/// Windows gets `\` separators).
fn join_relative(workdir: &Path, relative: &BStr) -> PathBuf {
    let mut path = workdir.to_path_buf();
    for part in relative
        .split(|&byte| byte == b'/')
        .filter(|part| !part.is_empty())
    {
        let part = gix::path::from_byte_slice(part);
        if part
            .components()
            .all(|component| matches!(component, Component::Normal(_)))
        {
            path.push(part);
        }
    }
    path
}

fn git_error(error: impl std::fmt::Display) -> TerminalError {
    TerminalError::Git(error.to_string())
}

#[cfg(test)]
mod tests {
    use genslate_testing::TempTree;
    use gix::objs::tree::EntryKind;

    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    /// A repository with one commit on `main` holding `files`, and a matching index.
    fn repo_with(
        files: &[(&str, &str)],
    ) -> Result<(TempTree, gix::Repository), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let repo = gix::init(tree.path())?;
        let empty = gix::ObjectId::empty_tree(repo.object_hash());
        let mut editor = repo.edit_tree(empty)?;
        for (path, contents) in files {
            tree.write(path, contents)?;
            let blob = repo.write_blob(contents.as_bytes())?;
            editor.upsert(*path, EntryKind::Blob, blob)?;
        }
        let tree_id = editor.write()?;
        let signature = gix::actor::SignatureRef {
            name: "GENSLATE".into(),
            email: "tests@genslate.invalid".into(),
            time: "1700000000 +0000",
        };
        repo.commit_as(
            signature,
            signature,
            "HEAD",
            "initial",
            tree_id,
            gix::commit::NO_PARENT_IDS,
        )?;
        let mut index = repo.index_from_tree(&tree_id)?;
        index
            .write(gix::index::write::Options::default())
            .map_err(gix::Exn::into_error)?;
        Ok((tree, repo))
    }

    #[test]
    fn no_repository_means_no_info() -> TestResult {
        let tree = TempTree::new()?;
        assert_eq!(info(tree.path())?, None);
        assert_eq!(RepoStatus::for_folder(tree.path())?, None);
        assert!(statuses(tree.path())?.is_empty());
        Ok(())
    }

    #[test]
    fn a_clean_repository() -> TestResult {
        let (tree, _repo) = repo_with(&[("README.md", "hi\n"), ("src/lib.rs", "// lib\n")])?;
        let found = info(&tree.join("src"))?.ok_or("no repo")?;
        let root = dunce::canonicalize(tree.path())?;
        assert_eq!(Path::new(&found.root), root);
        assert!(found.branch.is_some());
        assert!(found.head.len() >= 4, "{}", found.head);
        assert_eq!(found.changes, 0);
        assert!(statuses(tree.path())?.is_empty());
        Ok(())
    }

    #[test]
    fn reports_changes_untracked_and_deletions() -> TestResult {
        let (tree, _repo) = repo_with(&[
            ("README.md", "hi\n"),
            ("src/lib.rs", "// lib\n"),
            ("src/old.rs", "// old\n"),
            ("docs/guide.md", "guide\n"),
        ])?;
        tree.write("src/lib.rs", "// changed\n")?;
        std::fs::remove_file(tree.join("src/old.rs"))?;
        tree.write("notes.txt", "new\n")?;
        tree.write("scratch/a/b.txt", "deep\n")?;
        tree.write(".gitignore", "*.log\n")?;
        tree.write("debug.log", "ignored\n")?;

        let root = dunce::canonicalize(tree.path())?;
        let all = statuses(&root)?;
        assert_eq!(
            all.get(&root.join("src/lib.rs")),
            Some(&GitStatus::Modified)
        );
        assert_eq!(all.get(&root.join("src/old.rs")), Some(&GitStatus::Deleted));
        assert_eq!(
            all.get(&root.join("notes.txt")),
            Some(&GitStatus::Untracked)
        );
        assert_eq!(
            all.get(&root.join("src")),
            Some(&GitStatus::Modified),
            "roll-up"
        );
        assert_eq!(all.get(&root.join("debug.log")), None, "ignored");
        assert_eq!(all.get(&root.join("README.md")), None);
        assert_eq!(all.get(&root.join("docs")), None);

        let status = RepoStatus::for_folder(&root)?.ok_or("no repo")?;
        assert_eq!(
            status.get(&root.join("scratch")),
            Some(GitStatus::Untracked)
        );
        assert_eq!(
            status.get(&root.join("scratch/a/b.txt")),
            Some(GitStatus::Untracked),
            "inside an untracked folder"
        );

        let found = info(&root)?.ok_or("no repo")?;
        // lib.rs, old.rs, notes.txt, scratch/, .gitignore
        assert_eq!(found.changes, 5);
        Ok(())
    }

    #[test]
    fn status_can_be_limited_to_a_folder() -> TestResult {
        let (tree, _repo) = repo_with(&[("a/one.txt", "1\n"), ("b/two.txt", "2\n")])?;
        tree.write("a/one.txt", "changed\n")?;
        tree.write("b/two.txt", "changed\n")?;
        let root = dunce::canonicalize(tree.path())?;
        let status = RepoStatus::for_folder(&root.join("a"))?.ok_or("no repo")?;
        assert_eq!(
            status.get(&root.join("a/one.txt")),
            Some(GitStatus::Modified)
        );
        assert_eq!(
            status.get(&root.join("b/two.txt")),
            None,
            "outside the folder"
        );
        assert_eq!(status.workdir(), root);
        Ok(())
    }

    #[test]
    fn staged_files_are_added() -> TestResult {
        let (tree, repo) = repo_with(&[("keep.txt", "k\n")])?;
        // Stage a new file: index from a tree that has it, worktree has it too.
        let head_tree = repo.head_tree_id()?;
        let mut editor = repo.edit_tree(head_tree)?;
        let blob = repo.write_blob(b"staged\n")?;
        editor.upsert("new.txt", EntryKind::Blob, blob)?;
        let staged_tree = editor.write()?;
        let mut index = repo.index_from_tree(&staged_tree)?;
        index
            .write(gix::index::write::Options::default())
            .map_err(gix::Exn::into_error)?;
        tree.write("new.txt", "staged\n")?;
        let root = dunce::canonicalize(tree.path())?;
        assert_eq!(
            statuses(&root)?.get(&root.join("new.txt")),
            Some(&GitStatus::Added)
        );
        Ok(())
    }

    #[test]
    fn detached_head_has_no_branch() -> TestResult {
        let (tree, repo) = repo_with(&[("a.txt", "a\n")])?;
        let id = repo.head_id()?.detach();
        std::fs::write(repo.git_dir().join("HEAD"), format!("{id}\n"))?;
        let found = info(tree.path())?.ok_or("no repo")?;
        assert_eq!(found.branch, None);
        assert!(id.to_string().starts_with(&found.head));
        Ok(())
    }

    /// A downloaded repository must not run programs named in its own `.git/config` (filter
    /// drivers run while git compares a changed file) just because we listed its folder.
    #[cfg(unix)]
    #[test]
    fn repository_filter_drivers_never_run() -> TestResult {
        let (tree, repo) = repo_with(&[("a.txt", "one\n")])?;
        let marker = tree.join("driver-ran");
        let config = repo.git_dir().join("config");
        let text = format!(
            "{}[filter \"x\"]\n\tclean = touch '{}'; cat\n\trequired = true\n",
            std::fs::read_to_string(&config)?,
            marker.display()
        );
        std::fs::write(&config, text)?;
        tree.write(".gitattributes", "* filter=x\n")?;
        // Same size, new content: git has to read the file (through the filter) to compare it.
        tree.write("a.txt", "two\n")?;
        let root = dunce::canonicalize(tree.path())?;
        let _ = statuses(&root)?;
        let _ = info(&root)?;
        assert!(!marker.exists(), "the repository's filter driver ran");
        Ok(())
    }

    #[test]
    fn stronger_statuses_win() {
        let mut entries = HashMap::new();
        record(&mut entries, PathBuf::from("/x"), GitStatus::Modified);
        record(&mut entries, PathBuf::from("/x"), GitStatus::Added);
        record(&mut entries, PathBuf::from("/x"), GitStatus::Untracked);
        assert_eq!(entries.get(Path::new("/x")), Some(&GitStatus::Added));
    }

    #[test]
    fn joins_relative_paths_safely() {
        let joined = join_relative(Path::new("/repo"), BStr::new(b"a/../b//c.txt"));
        assert_eq!(joined, Path::new("/repo/a/b/c.txt"));
    }
}
