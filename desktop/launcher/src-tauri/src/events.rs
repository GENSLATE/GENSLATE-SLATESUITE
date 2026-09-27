//! Events the shell emits to the UI (`listen()` names in `desktop/launcher/src/ipc`).

/// The window was placed and shown — play the entrance animation.
pub const SHOWN: &str = "launcher://shown";
/// The window hides in a moment — play the exit animation.
pub const WILL_HIDE: &str = "launcher://will-hide";
/// Pinned state changed (`bool`).
pub const PINNED: &str = "launcher://pinned";
/// `config.toml`/`keybindings.toml` changed (`Settings`).
pub const SETTINGS: &str = "launcher://settings";
/// Apps changed (installed, removed, favorited, running) — refetch the list.
pub const CATALOG: &str = "launcher://catalog";
/// A status-bar sample (`Telemetry`).
pub const TELEMETRY: &str = "launcher://telemetry";
