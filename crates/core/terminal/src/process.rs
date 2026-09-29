//! What a shell is running: the newest, deepest descendant of the shell process (the program
//! in the foreground, e.g. `vim` or `cargo`, rather than a helper it started long ago).
//!
//! [`ProcessProbe`] keeps its `sysinfo::System` between calls so CPU usage is measured over
//! the time since the previous refresh (the first refresh reports 0 %).

use std::collections::HashMap;

use serde::Serialize;
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System};

/// The program a shell is running (`SessionInfo.running`).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningProgram {
    pub name: String,
    pub pid: u32,
    /// Percent of one core since the previous refresh.
    pub cpu: f32,
    pub memory_bytes: u64,
}

/// Process table snapshots; keep one alive and [`refresh`](ProcessProbe::refresh) it before
/// each round of questions.
pub struct ProcessProbe {
    system: System,
}

impl std::fmt::Debug for ProcessProbe {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ProcessProbe")
            .field("processes", &self.system.processes().len())
            .finish()
    }
}

impl Default for ProcessProbe {
    fn default() -> Self {
        Self::new()
    }
}

impl ProcessProbe {
    /// An empty probe (refresh before asking).
    pub fn new() -> Self {
        Self {
            system: System::new(),
        }
    }

    /// Re-reads the process table (names, parents, CPU and memory).
    pub fn refresh(&mut self) {
        self.system.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory(),
        );
    }

    /// The program `shell_pid` is running, or `None` when the shell is idle (or gone).
    pub fn foreground(&self, shell_pid: u32) -> Option<RunningProgram> {
        let processes = self.system.processes();
        let table: Vec<ProcessRow> = processes
            .iter()
            .map(|(pid, process)| ProcessRow {
                pid: pid.as_u32(),
                parent: process.parent().map(Pid::as_u32),
                start_time: process.start_time(),
            })
            .collect();
        let pid = pick_foreground(&table, shell_pid)?;
        let process = processes.get(&Pid::from_u32(pid))?;
        Some(RunningProgram {
            name: process.name().to_string_lossy().into_owned(),
            pid,
            cpu: process.cpu_usage(),
            memory_bytes: process.memory(),
        })
    }
}

/// One process-table row, as [`pick_foreground`] needs it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProcessRow {
    pub pid: u32,
    pub parent: Option<u32>,
    /// Seconds since the Unix epoch.
    pub start_time: u64,
}

/// The deepest descendant of `root` (newest first, then highest pid, among equals).
pub fn pick_foreground(table: &[ProcessRow], root: u32) -> Option<u32> {
    let mut children: HashMap<u32, Vec<&ProcessRow>> = HashMap::new();
    for row in table {
        // A process can't be its own parent; guards against broken tables and pid reuse loops.
        if let Some(parent) = row.parent.filter(|parent| *parent != row.pid) {
            children.entry(parent).or_default().push(row);
        }
    }
    let mut best: Option<(usize, u64, u32)> = None;
    let mut frontier = vec![root];
    let mut depth = 0;
    while !frontier.is_empty() && depth < 64 {
        depth += 1;
        let mut next = Vec::new();
        for pid in frontier {
            for child in children.get(&pid).into_iter().flatten() {
                let candidate = (depth, child.start_time, child.pid);
                if best.is_none_or(|known| candidate > known) {
                    best = Some(candidate);
                }
                next.push(child.pid);
            }
        }
        frontier = next;
    }
    best.map(|(_, _, pid)| pid)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(pid: u32, parent: u32, start_time: u64) -> ProcessRow {
        ProcessRow {
            pid,
            parent: Some(parent),
            start_time,
        }
    }

    #[test]
    fn an_idle_shell_runs_nothing() {
        let table = [row(10, 1, 100), row(20, 1, 100)];
        assert_eq!(pick_foreground(&table, 10), None);
    }

    #[test]
    fn picks_the_deepest_then_newest_descendant() {
        let table = [
            row(10, 1, 100),  // the shell
            row(11, 10, 200), // cargo
            row(12, 11, 210), // rustc (deeper)
            row(13, 10, 300), // a newer direct child
            row(14, 11, 220), // a newer rustc
            row(99, 1, 500),  // unrelated
        ];
        assert_eq!(pick_foreground(&table, 10), Some(14));
        assert_eq!(pick_foreground(&table, 11), Some(14));
        assert_eq!(pick_foreground(&table, 13), None);
    }

    #[test]
    fn survives_cycles_and_self_parents() {
        let table = [
            row(10, 10, 1),
            row(11, 12, 1),
            row(12, 11, 1),
            row(13, 10, 5),
        ];
        assert_eq!(pick_foreground(&table, 10), Some(13));
        assert!(pick_foreground(&table, 11).is_some());
    }

    #[cfg(unix)]
    #[test]
    fn finds_a_real_child() -> Result<(), Box<dyn std::error::Error>> {
        let mut child = std::process::Command::new("sleep").arg("5").spawn()?;
        let mut probe = ProcessProbe::new();
        probe.refresh();
        let found = probe.foreground(std::process::id());
        child.kill()?;
        child.wait()?;
        // Other tests may start children too: ours must be among the candidates at least.
        assert!(found.is_some());
        Ok(())
    }
}
