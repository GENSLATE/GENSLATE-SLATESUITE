/** Returned by the `get_app_info` command (Rust: `genslate_core_example::AppInfo`). */
export interface AppInfo {
  /** Product name from tauri.conf.json. */
  name: string;
  /** App version. */
  version: string;
  /** Tauri runtime version. */
  tauriVersion: string;
  /** `macos`, `windows`, `linux`. */
  os: string;
  /** `aarch64`, `x86_64`, … */
  arch: string;
  /** Debug build. */
  debug: boolean;
}
