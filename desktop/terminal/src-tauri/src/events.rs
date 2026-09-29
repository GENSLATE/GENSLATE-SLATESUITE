//! Events the shell emits to every window (`listenEvent()` names in `desktop/terminal/src`).

/// A shell process ended: `{ id, code }`.
pub const EXIT: &str = "terminal://exit";
/// The shell integration reported a finished command: `{ id, entry }` (`entry.id` is 0 when
/// the command was not stored: history off or unavailable, or typed with a leading space).
pub const COMMAND: &str = "terminal://command";
/// Watched folders whose contents changed (`Vec<String>`), debounced.
pub const FILES_CHANGED: &str = "terminal://files-changed";
/// A second launch asks for a new tab: `{ cwd, profileId }`.
pub const OPEN: &str = "terminal://open";
