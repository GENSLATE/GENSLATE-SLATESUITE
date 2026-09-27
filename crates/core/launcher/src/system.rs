//! System status for the status bar: the drive the launcher lives on, CPU/GPU temperatures,
//! usage and network throughput, and which programs are running.
//!
//! Every reading is optional — `None` means "not available here" and the UI hides it
//! (Windows only exposes temperatures to administrators; GPU stats need NVIDIA's NVML).

use std::path::{Path, PathBuf};
use std::time::Instant;

use serde::Serialize;
use sysinfo::{
    Components, Disks, Networks, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind,
};

/// The volume holding the install folder.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VolumeInfo {
    /// `D:` on Windows, the mount point elsewhere (`/`, `/Volumes/USB`).
    pub label: String,
    /// The volume name, if it has one.
    pub name: Option<String>,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub removable: bool,
}

/// The volume whose mount point is the longest prefix of `path`.
pub fn volume_for(path: &Path) -> Option<VolumeInfo> {
    let disks = Disks::new_with_refreshed_list();
    let target = comparable(path);
    disks
        .list()
        .iter()
        .filter(|disk| target.starts_with(&comparable(disk.mount_point())))
        .max_by_key(|disk| disk.mount_point().as_os_str().len())
        .map(|disk| {
            let mount = disk.mount_point().to_string_lossy();
            let label = if cfg!(windows) {
                mount.trim_end_matches(['\\', '/']).to_owned()
            } else {
                mount.into_owned()
            };
            let name = disk.name().to_string_lossy().trim().to_owned();
            VolumeInfo {
                label,
                name: (!name.is_empty()).then_some(name),
                total_bytes: disk.total_space(),
                available_bytes: disk.available_space(),
                removable: disk.is_removable(),
            }
        })
}

fn comparable(path: &Path) -> String {
    let text = dunce::simplified(path).to_string_lossy().replace('\\', "/");
    if cfg!(windows) {
        text.to_lowercase()
    } else {
        text
    }
}

/// One status-bar sample. `None` fields are unavailable and hidden.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Telemetry {
    pub cpu_temp_c: Option<f32>,
    pub gpu_temp_c: Option<f32>,
    pub cpu_usage_pct: Option<f32>,
    pub gpu_usage_pct: Option<f32>,
    /// Bytes per second, all interfaces.
    pub net_down_bps: Option<u64>,
    pub net_up_bps: Option<u64>,
}

/// Samples [`Telemetry`]; call [`Sampler::sample`] about once a second.
#[derive(Debug)]
pub struct Sampler {
    system: System,
    networks: Networks,
    components: Components,
    last: Instant,
    gpu: Option<gpu::Gpu>,
}

impl Default for Sampler {
    fn default() -> Self {
        Self::new()
    }
}

impl Sampler {
    /// Prepares the probes. The first [`Sampler::sample`] has no CPU/network rates yet.
    pub fn new() -> Self {
        let mut system = System::new();
        system.refresh_cpu_usage();
        Self {
            system,
            networks: Networks::new_with_refreshed_list(),
            components: Components::new_with_refreshed_list(),
            last: Instant::now(),
            gpu: gpu::Gpu::open(),
        }
    }

    /// Takes a sample (rates are averaged since the previous call).
    pub fn sample(&mut self) -> Telemetry {
        let elapsed = self.last.elapsed().as_secs_f64().max(0.001);
        self.last = Instant::now();
        self.system.refresh_cpu_usage();
        self.networks.refresh(true);
        self.components.refresh(true);

        let (down, up) = self
            .networks
            .list()
            .values()
            .fold((0_u64, 0_u64), |(down, up), data| {
                (
                    down.saturating_add(data.received()),
                    up.saturating_add(data.transmitted()),
                )
            });
        let usage = self.system.global_cpu_usage();
        let gpu = self.gpu.as_ref().map(gpu::Gpu::read).unwrap_or_default();
        Telemetry {
            cpu_temp_c: cpu_temperature(&self.components),
            gpu_temp_c: gpu
                .temperature
                .or_else(|| labelled_temperature(&self.components, &["gpu", "amdgpu", "radeon"])),
            cpu_usage_pct: (usage.is_finite() && usage > 0.0).then_some(usage),
            gpu_usage_pct: gpu.usage,
            net_down_bps: Some(per_second(down, elapsed)),
            net_up_bps: Some(per_second(up, elapsed)),
        }
    }
}

/// The CPU package temperature, from the best-named sensor.
fn cpu_temperature(components: &Components) -> Option<f32> {
    labelled_temperature(
        components,
        &[
            "package", "tctl", "tdie", "cpu", "coretemp", "k10temp", "soc",
        ],
    )
}

fn labelled_temperature(components: &Components, needles: &[&str]) -> Option<f32> {
    needles.iter().find_map(|needle| {
        components
            .list()
            .iter()
            .filter(|component| component.label().to_lowercase().contains(needle))
            .filter_map(sysinfo::Component::temperature)
            .filter(|temp| temp.is_finite() && *temp > 0.0 && *temp < 150.0)
            .reduce(f32::max)
    })
}

#[allow(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    reason = "byte rates are non-negative and far below 2^53"
)]
fn per_second(bytes: u64, seconds: f64) -> u64 {
    (bytes as f64 / seconds).round() as u64
}

/// Executable paths of every running process (for the "running" dot).
#[derive(Debug)]
pub struct ProcessProbe {
    system: System,
}

impl Default for ProcessProbe {
    fn default() -> Self {
        Self::new()
    }
}

impl ProcessProbe {
    pub fn new() -> Self {
        Self {
            system: System::new(),
        }
    }

    /// Refreshes and returns the executable paths (only the exe is read — cheap).
    pub fn running_executables(&mut self) -> Vec<PathBuf> {
        self.system.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet),
        );
        self.system
            .processes()
            .values()
            .filter_map(|process| process.exe().map(Path::to_path_buf))
            .collect()
    }
}

#[cfg(feature = "nvidia")]
mod gpu {
    use nvml_wrapper::Nvml;
    use nvml_wrapper::enum_wrappers::device::TemperatureSensor;

    /// NVML loaded at runtime (absent drivers → no GPU readout).
    pub(super) struct Gpu(Nvml);

    impl std::fmt::Debug for Gpu {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.write_str("Gpu(NVML)")
        }
    }

    #[derive(Debug, Default)]
    pub(super) struct Reading {
        pub temperature: Option<f32>,
        pub usage: Option<f32>,
    }

    impl Gpu {
        pub(super) fn open() -> Option<Self> {
            Nvml::init()
                .inspect_err(|error| log::debug!("NVML unavailable: {error}"))
                .ok()
                .map(Self)
        }

        #[allow(
            clippy::cast_precision_loss,
            reason = "percent and °C are tiny integers"
        )]
        pub(super) fn read(&self) -> Reading {
            let Ok(device) = self.0.device_by_index(0) else {
                return Reading::default();
            };
            Reading {
                temperature: device
                    .temperature(TemperatureSensor::Gpu)
                    .ok()
                    .map(|t| t as f32),
                usage: device.utilization_rates().ok().map(|u| u.gpu as f32),
            }
        }
    }
}

#[cfg(not(feature = "nvidia"))]
mod gpu {
    #[derive(Debug)]
    pub(super) struct Gpu;

    #[derive(Debug, Default)]
    pub(super) struct Reading {
        pub temperature: Option<f32>,
        pub usage: Option<f32>,
    }

    impl Gpu {
        pub(super) fn open() -> Option<Self> {
            None
        }

        pub(super) fn read(&self) -> Reading {
            Reading::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_the_volume_of_the_current_folder() -> std::io::Result<()> {
        let here = std::env::current_dir()?;
        let volume = volume_for(&here);
        if let Some(volume) = volume {
            assert!(volume.total_bytes >= volume.available_bytes);
            assert!(!volume.label.is_empty());
        }
        Ok(())
    }

    #[test]
    fn samples_without_panicking_and_rates_are_non_negative() {
        let mut sampler = Sampler::new();
        let _first = sampler.sample();
        let second = sampler.sample();
        assert!(second.net_down_bps.is_some());
        if let Some(cpu) = second.cpu_usage_pct {
            assert!((0.0..=100.0).contains(&cpu));
        }
    }

    #[test]
    fn sees_its_own_process() {
        let mut probe = ProcessProbe::new();
        let own = std::env::current_exe()
            .ok()
            .and_then(|exe| dunce::canonicalize(exe).ok());
        let running = probe.running_executables();
        if let Some(own) = own {
            let own = comparable(&own);
            assert!(running.iter().any(|exe| comparable(exe) == own));
        }
    }

    #[test]
    fn per_second_rounds() {
        assert_eq!(per_second(1_000, 0.5), 2_000);
        assert_eq!(per_second(0, 1.0), 0);
    }
}
