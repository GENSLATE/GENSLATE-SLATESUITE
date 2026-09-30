//! Events the shell emits to the UI (`listenEvent()` names in `desktop/gallery/src/ipc`).

/// The library changed (a scan batch, the watcher, a command): refetch the summary and view.
pub const LIBRARY_CHANGED: &str = "gallery://library-changed";
/// A scan made progress (`ScanProgress`).
pub const SCAN_PROGRESS: &str = "gallery://scan-progress";
/// Every pending scan finished (`ScanDone`).
pub const SCAN_DONE: &str = "gallery://scan-done";
/// A duplicate search or export made progress (`TaskProgress`).
pub const TASK_PROGRESS: &str = "gallery://task-progress";
/// A duplicate search finished (`DuplicatesDone`).
pub const DUPLICATES_DONE: &str = "gallery://duplicates-done";
/// An export finished (`ExportDone`).
pub const EXPORT_DONE: &str = "gallery://export-done";
/// The Undo stack changed (`Option<&str>`: the label of what Undo would reverse).
pub const UNDO: &str = "gallery://undo";
/// A second launch asked to open paths (`OpenTarget`).
pub const OPEN: &str = "gallery://open";
