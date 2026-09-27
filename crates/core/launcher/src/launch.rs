//! Starting apps safely.
//!
//! The UI only ever sends an [`crate::AppId`]; the program path comes from the catalog and must
//! resolve (after following links) inside an allowed root — `programs/`, or `target/` in dev.
//! Apps are started detached, in their own folder, with no inherited stdio.

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use crate::LauncherError;
use crate::catalog::{AppEntry, HostOs};

/// A validated launch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LaunchSpec {
    /// Canonical program path (executable, or `.app` bundle on macOS).
    pub program: PathBuf,
    pub args: Vec<String>,
    /// Working directory: the app's own folder.
    pub cwd: PathBuf,
    pub host: HostOs,
}

impl LaunchSpec {
    /// Validates `app` for launching. `args` replaces the app's configured arguments.
    pub fn resolve(
        app: &AppEntry,
        args: Option<Vec<String>>,
        allowed_roots: &[PathBuf],
        host: HostOs,
    ) -> Result<Self, LauncherError> {
        if !app.status.is_launchable() {
            return Err(LauncherError::NotInstalled(app.name.clone()));
        }
        let program = app
            .program
            .as_deref()
            .ok_or_else(|| LauncherError::NotInstalled(app.name.clone()))?;
        let program = dunce::canonicalize(program).map_err(|source| LauncherError::Spawn {
            path: program.to_path_buf(),
            source,
        })?;
        let inside = allowed_roots
            .iter()
            .filter_map(|root| dunce::canonicalize(root).ok())
            .any(|root| program.starts_with(&root) && program != root);
        if !inside {
            return Err(LauncherError::OutsideRoot(program));
        }
        let cwd = program
            .parent()
            .map_or_else(|| program.clone(), Path::to_path_buf);
        Ok(Self {
            args: args.unwrap_or_else(|| app.args.clone()),
            program,
            cwd,
            host,
        })
    }

    /// The command that starts the app.
    pub fn command(&self) -> Command {
        let mut command = if self.host == HostOs::Macos && is_app_bundle(&self.program) {
            // `open -n` starts a new instance of the bundle the way Finder would.
            let mut open = Command::new("open");
            open.arg("-n").arg("-a").arg(&self.program);
            if !self.args.is_empty() {
                open.arg("--args").args(&self.args);
            }
            open
        } else {
            let mut direct = Command::new(&self.program);
            direct.args(&self.args);
            direct
        };
        command
            .current_dir(&self.cwd)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        detach(&mut command);
        command
    }

    /// Starts the app and returns its process id (the `open` helper's on macOS).
    pub fn spawn(&self) -> Result<u32, LauncherError> {
        self.command()
            .spawn()
            .map(|child| child.id())
            .map_err(|source| LauncherError::Spawn {
                path: self.program.clone(),
                source,
            })
    }
}

fn is_app_bundle(path: &Path) -> bool {
    path.extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case("app"))
        && path.is_dir()
}

#[cfg(windows)]
fn detach(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    /// Own process group: Ctrl+C / console close of the launcher never reach the app.
    const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
    command.creation_flags(CREATE_NEW_PROCESS_GROUP);
}

#[cfg(unix)]
fn detach(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    // Own process group so signals to the launcher don't take the app down with it.
    command.process_group(0);
}

#[cfg(not(any(windows, unix)))]
fn detach(_command: &mut Command) {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::{AppId, AppStatus, Source};
    use genslate_testing::TempTree;

    fn app(program: PathBuf) -> AppEntry {
        let mut app = AppEntry::new(AppId::new(Source::Genslate, "x"), "X");
        app.program = Some(program);
        app.args = vec!["--default".to_owned()];
        app
    }

    #[test]
    fn accepts_programs_inside_the_roots() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("programs/genslate/x/x.exe", "")?;
        let spec = LaunchSpec::resolve(
            &app(tree.join("programs/genslate/x/x.exe")),
            None,
            &[tree.join("programs")],
            HostOs::Windows,
        )?;
        assert!(spec.program.ends_with("x.exe"));
        assert!(spec.cwd.ends_with("x"));
        assert_eq!(spec.args, ["--default"]);
        let custom = LaunchSpec::resolve(
            &app(tree.join("programs/genslate/x/x.exe")),
            Some(vec!["--a".to_owned()]),
            &[tree.join("programs")],
            HostOs::Windows,
        )?;
        assert_eq!(custom.args, ["--a"]);
        Ok(())
    }

    #[test]
    fn rejects_programs_outside_the_roots() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("outside/evil.exe", "")?
            .dir("programs")?;
        let sneaky = tree.join("programs/../outside/evil.exe");
        let error = LaunchSpec::resolve(
            &app(sneaky),
            None,
            &[tree.join("programs")],
            HostOs::Windows,
        )
        .err()
        .ok_or("expected an error")?;
        assert_eq!(error.kind(), "outside-root");
        Ok(())
    }

    #[test]
    fn refuses_apps_that_are_not_installed() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("programs/x.exe", "")?;
        let mut missing = app(tree.join("programs/x.exe"));
        missing.status = AppStatus::NotInstalled;
        let error = LaunchSpec::resolve(&missing, None, &[tree.join("programs")], HostOs::Windows)
            .err()
            .ok_or("expected an error")?;
        assert_eq!(error.kind(), "not-installed");
        Ok(())
    }

    #[test]
    fn macos_bundles_open_with_open() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("programs/X.app/Contents/MacOS")?;
        let spec = LaunchSpec::resolve(
            &app(tree.join("programs/X.app")),
            None,
            &[tree.join("programs")],
            HostOs::Macos,
        )?;
        let command = spec.command();
        assert_eq!(command.get_program(), "open");
        let args: Vec<_> = command
            .get_args()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect();
        assert_eq!(args.first().map(String::as_str), Some("-n"));
        assert!(args.contains(&"--args".to_owned()));
        Ok(())
    }
}
