/**
 * Launcher metadata (`other/config/slatesuite/metadata/<app>.toml`): the `[app]` table is
 * hand-written; `[build]` (version, build, identifier, guid) and `[exe]` (per-OS launch path)
 * are stamped into the *packaged copy* at release time so they never drift.
 */
import type { DesktopApp } from './apps';

/** Values stamped into a packaged metadata file. */
export interface MetadataStamp {
  readonly version: string;
  /** `YYYYMMDD.<short commit>` */
  readonly build: string;
  readonly identifier: string;
  /** Launch path per OS, relative to `programs/genslate/<app>/`. */
  readonly exe: { readonly windows: string; readonly macos: string; readonly linux: string };
}

/** Per-OS executable names of an app, relative to its program folder. */
export function executablePaths(app: DesktopApp): MetadataStamp['exe'] {
  return {
    windows: `${app.binaryName}.exe`,
    macos: `${app.productName}.app`,
    linux: app.binaryName,
  };
}

/**
 * Returns `source` with `[build]` and `[exe]` replaced by `stamp`. Everything else (the
 * hand-written `[app]` table and its comments) is kept byte for byte; an existing
 * `[build].guid` is preserved.
 */
export function stampMetadata(source: string, stamp: MetadataStamp): string {
  const parsed: unknown = Bun.TOML.parse(source);
  const guid = readGuid(parsed);
  // Re-joining the kept chunks with \n restores them exactly as written.
  const kept = splitTables(source)
    .filter((table) => table.name !== 'build' && table.name !== 'exe')
    .map((table) => table.text)
    .join('\n')
    .trimEnd();
  const build = [
    '[build]',
    ...(guid === undefined ? [] : [`guid = ${quote(guid)}`]),
    `version = ${quote(stamp.version)}`,
    `build = ${quote(stamp.build)}`,
    `identifier = ${quote(stamp.identifier)}`,
  ].join('\n');
  const exe = [
    '[exe]',
    `windows = ${quote(stamp.exe.windows)}`,
    `macos = ${quote(stamp.exe.macos)}`,
    `linux = ${quote(stamp.exe.linux)}`,
  ].join('\n');
  return `${[kept, build, exe].filter((part) => part.length > 0).join('\n\n')}\n`;
}

interface Table {
  /** `undefined` for the text before the first header. */
  readonly name: string | undefined;
  readonly text: string;
}

/** Splits TOML text at top-level `[table]` headers (comments stay with the table they precede). */
function splitTables(source: string): Table[] {
  const tables: Table[] = [];
  let name: string | undefined;
  let lines: string[] = [];
  for (const line of source.replaceAll('\r\n', '\n').split('\n')) {
    const header = /^\s*\[([A-Za-z0-9_.-]+)\]\s*(#.*)?$/.exec(line);
    if (header !== null) {
      tables.push({ name, text: lines.join('\n') });
      name = header[1];
      lines = [line];
    } else {
      lines.push(line);
    }
  }
  tables.push({ name, text: lines.join('\n') });
  return tables;
}

function readGuid(parsed: unknown): string | undefined {
  if (typeof parsed !== 'object' || parsed === null || !('build' in parsed)) return undefined;
  const build = parsed.build;
  if (typeof build !== 'object' || build === null || !('guid' in build)) return undefined;
  return typeof build.guid === 'string' ? build.guid : undefined;
}

function quote(value: string): string {
  return JSON.stringify(value);
}
