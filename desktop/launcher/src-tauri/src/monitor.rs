//! Background sampling while the launcher is visible: status-bar telemetry (1 Hz, only when
//! the UI asks for it) and running apps (every 2 s). Hidden = idle.

use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;

use genslate_core_launcher::system::{ProcessProbe, Sampler};
use tauri::{AppHandle, Manager, Runtime};

use crate::events;
use crate::reload::emit;
use crate::state::Launcher;

const TICK: Duration = Duration::from_secs(1);
const PROCESS_EVERY_TICKS: u32 = 2;

/// Starts the sampling thread.
pub fn spawn<R: Runtime>(app: AppHandle<R>) {
    let spawned = thread::Builder::new()
        .name("launcher-monitor".to_owned())
        .spawn(move || {
            let mut sampler: Option<Sampler> = None;
            let mut probe = ProcessProbe::new();
            let mut tick: u32 = 0;
            loop {
                thread::sleep(TICK);
                let launcher = app.state::<Launcher>();
                if !launcher.is_visible() {
                    // Rates would span the hidden time; start fresh next time.
                    sampler = None;
                    continue;
                }
                if launcher.telemetry_active.load(Ordering::Relaxed) {
                    let sample = sampler.get_or_insert_with(Sampler::new).sample();
                    emit(&app, events::TELEMETRY, sample);
                }
                tick = tick.wrapping_add(1);
                if tick.is_multiple_of(PROCESS_EVERY_TICKS) {
                    let running = probe.running_executables();
                    if launcher.catalog_mut().update_running(&running) {
                        emit(&app, events::CATALOG, ());
                    }
                }
            }
        });
    if let Err(error) = spawned {
        log::error!("monitor thread failed to start: {error}");
    }
}
