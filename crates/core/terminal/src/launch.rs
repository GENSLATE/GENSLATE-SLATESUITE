//! Command-line arguments: `genslate-terminal [--cwd <folder>] [--profile <id>]` (also
//! `--cwd=<folder>`). The first launch opens its first tab with them; a second launch hands
//! them to the running window, which opens a new tab.

use std::path::{Path, PathBuf};

/// What a launch asks for.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct LaunchArgs {
    /// An existing folder (relative ones are resolved against the launching process's folder).
    pub cwd: Option<String>,
    pub profile_id: Option<String>,
}

/// Reads `--cwd` and `--profile` from `args` (the program name included or not; unknown
/// arguments are ignored). A `--cwd` that is not an existing folder is dropped.
pub fn parse(args: &[String], base: &Path) -> LaunchArgs {
    let mut launch = LaunchArgs::default();
    let mut iter = args.iter();
    while let Some(arg) = iter.next() {
        let (name, inline) = match arg.split_once('=') {
            Some((name, value)) if name.starts_with("--") => (name, Some(value.to_owned())),
            _ => (arg.as_str(), None),
        };
        match name {
            "--cwd" => {
                let value = inline.or_else(|| iter.next().cloned());
                launch.cwd = value.and_then(|value| folder(&value, base));
            }
            "--profile" => {
                launch.profile_id = inline
                    .or_else(|| iter.next().cloned())
                    .map(|id| id.trim().to_owned())
                    .filter(|id| !id.is_empty());
            }
            _ => {}
        }
    }
    launch
}

fn folder(value: &str, base: &Path) -> Option<String> {
    let path = PathBuf::from(value.trim());
    if path.as_os_str().is_empty() {
        return None;
    }
    let path = if path.is_absolute() {
        path
    } else {
        base.join(path)
    };
    let path = dunce::canonicalize(path).ok()?;
    path.is_dir().then(|| path.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use genslate_testing::TempTree;

    use super::*;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|arg| (*arg).to_owned()).collect()
    }

    #[test]
    fn reads_both_forms() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("project")?;
        let root = dunce::canonicalize(tree.path())?;
        let parsed = parse(
            &args(&["genslate-terminal", "--cwd", "project", "--profile", "pwsh"]),
            &root,
        );
        assert_eq!(
            parsed.cwd.as_deref().map(Path::new),
            Some(root.join("project").as_path())
        );
        assert_eq!(parsed.profile_id.as_deref(), Some("pwsh"));
        let root_text = root.to_string_lossy();
        let inline = parse(
            &args(&[&format!("--cwd={root_text}"), "--profile=zsh"]),
            Path::new("/"),
        );
        assert_eq!(inline.cwd.as_deref(), Some(root_text.as_ref()));
        assert_eq!(inline.profile_id.as_deref(), Some("zsh"));
        Ok(())
    }

    #[test]
    fn drops_missing_folders_and_ignores_the_rest() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("file.txt", "")?;
        let parsed = parse(
            &args(&["x", "--verbose", "--cwd", "missing", "--profile"]),
            tree.path(),
        );
        assert_eq!(parsed, LaunchArgs::default());
        let file = parse(
            &args(&["--cwd", "file.txt", "--profile", "  "]),
            tree.path(),
        );
        assert_eq!(file, LaunchArgs::default());
        assert_eq!(parse(&[], tree.path()), LaunchArgs::default());
        Ok(())
    }
}
