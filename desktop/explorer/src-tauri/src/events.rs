//! Events the shell emits to the UI (`listenEvent()` names in `desktop/explorer/src/ipc`).

/// A copy or move made progress (`TaskProgress`).
pub const PROGRESS: &str = "explorer://progress";
/// A copy or move finished, failed or was cancelled (`TaskDone`).
pub const TASK_DONE: &str = "explorer://task-done";
/// A batch of search matches (`SearchBatch`).
pub const SEARCH_RESULTS: &str = "explorer://search-results";
/// A search finished (`SearchDone`).
pub const SEARCH_DONE: &str = "explorer://search-done";
/// Watched folders changed on disk (`Vec<String>`): refetch them.
pub const CHANGED: &str = "explorer://changed";
/// The Undo stack changed (`Option<&str>`: the label of what Undo would reverse).
pub const UNDO: &str = "explorer://undo";
