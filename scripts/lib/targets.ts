/**
 * Release targets: the OS/architecture combinations GENSLATE ships, mapped to Rust triples.
 */
import { fail } from './args';

/** OS family of a target. */
export type TargetOs = 'windows' | 'macos' | 'linux';

/** A release target. */
export interface Target {
  /** `windows-x64`, `macos-universal`, … — used in artefact names. */
  readonly id: string;
  readonly os: TargetOs;
  /** Rust target triple passed to `tauri build --target`; `undefined` = host build. */
  readonly triple: string | undefined;
}

/** Every target GENSLATE ships. */
export const TARGETS = [
  { id: 'windows-x64', os: 'windows', triple: 'x86_64-pc-windows-msvc' },
  { id: 'windows-arm64', os: 'windows', triple: 'aarch64-pc-windows-msvc' },
  { id: 'macos-universal', os: 'macos', triple: 'universal-apple-darwin' },
  { id: 'linux-x64', os: 'linux', triple: 'x86_64-unknown-linux-gnu' },
] as const satisfies readonly Target[];

/** The target matching this machine (no cross-compilation; Cargo's default output folder). */
export function hostTarget(): Target {
  const os = hostOs();
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const id = os === 'macos' ? `macos-${arch}` : `${os}-${arch}`;
  return { id, os, triple: undefined };
}

/** `--target <id>` → a known target, or the host when omitted. */
export function selectTarget(id: string | undefined): Target {
  if (id === undefined) return hostTarget();
  const target = TARGETS.find((candidate) => candidate.id === id);
  if (target === undefined) {
    fail(`unknown target "${id}" (available: ${TARGETS.map((t) => t.id).join(', ')})`);
  }
  if (target.os !== hostOs()) fail(`${target.id} must be built on ${target.os}`);
  return target;
}

/** `target/<triple>/<profile>` or `target/<profile>` for host builds. */
export function outputDir(targetDir: string, target: Target, profile: 'debug' | 'release'): string {
  return target.triple === undefined
    ? `${targetDir}/${profile}`
    : `${targetDir}/${target.triple}/${profile}`;
}

function hostOs(): TargetOs {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'macos';
  return 'linux';
}
