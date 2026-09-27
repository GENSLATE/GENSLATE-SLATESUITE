/**
 * Pure helpers for `bun run new-app`: launcher metadata → Tauri bundle fields, the root
 * Cargo.toml workspace dependency, config stubs and the placeholder icon.
 */

/** The `[app]` table of `other/config/appdata/metadata/<name>.toml`. */
export interface AppMetadata {
  readonly name?: string;
  readonly description?: string;
  readonly category?: string;
}

/** Launcher categories → Tauri `bundle.category` (Apple LSApplicationCategoryType names). */
const TAURI_CATEGORY: Readonly<Record<string, string>> = {
  AI: 'Productivity',
  Development: 'DeveloperTool',
  Graphics: 'GraphicsAndDesign',
  Internet: 'Utility',
  Media: 'Entertainment',
  Office: 'Productivity',
  System: 'Utility',
  Utilities: 'Utility',
};

/** The Tauri bundle category for a launcher category (default `Utility`). */
export function tauriCategory(category: string | undefined): string {
  return (category === undefined ? undefined : TAURI_CATEGORY[category]) ?? 'Utility';
}

/** Reads the `[app]` table of a launcher metadata file, or `{}` when it is missing or invalid. */
export function parseMetadata(text: string | undefined): AppMetadata {
  if (text === undefined) return {};
  try {
    const parsed = Bun.TOML.parse(text) as { app?: Record<string, unknown> };
    const app = parsed.app ?? {};
    const pick = (key: string) => (typeof app[key] === 'string' ? { [key]: app[key] } : {});
    return { ...pick('name'), ...pick('description'), ...pick('category') };
  } catch {
    // A hand-edited file that no longer parses just means "no defaults from metadata".
    return {};
  }
}

/**
 * Adds `<crate> = { path = "<path>" }` to `[workspace.dependencies]`, in alphabetical order among
 * the `genslate-core-*` entries (or at the end of the table). Idempotent.
 */
export function addWorkspaceDependency(cargoToml: string, crate: string, path: string): string {
  const lines = cargoToml.split('\n');
  if (lines.some((line) => line.replace(/\s/g, '').startsWith(`${crate}=`))) return cargoToml;
  const entry = `${crate} = { path = "${path}" }`;
  const table = lines.findIndex((line) => line.trim() === '[workspace.dependencies]');
  if (table === -1) throw new Error('Cargo.toml has no [workspace.dependencies] table');
  let end = lines.findIndex((line, index) => index > table && /^\[/.test(line.trim()));
  if (end === -1) end = lines.length;
  let insertAt = -1;
  for (let index = table + 1; index < end; index++) {
    const line = lines[index] ?? '';
    if (!line.startsWith('genslate-core-')) continue;
    if (line.localeCompare(entry) > 0) {
      insertAt = index;
      break;
    }
    insertAt = index + 1;
  }
  if (insertAt === -1) {
    insertAt = end;
    while (insertAt > table + 1 && lines[insertAt - 1]?.trim() === '') insertAt--;
  }
  lines.splice(insertAt, 0, entry);
  return lines.join('\n');
}

/** `other/config/genslate/<name>/config.toml`: the shared sections, every key commented. */
export function configStub(name: string, title: string): string {
  return `# ${title} — config. Every key is optional; delete a key to get its default.
# Location: <installDir>/other/config/genslate/${name}/config.toml (suite), the same path beside
# the app when run from its own zip, or the repo's other/config in dev. See other/documents/portability.md.

[appearance]
# "system" | "polar-night" | "snow-storm"
theme = "system"

[window]
# Restore window size and position between launches.
remember-state = true

[logging]
# "off" | "error" | "warn" | "info" | "debug" | "trace"
level = "info"
`;
}

/**
 * A neutral member of the GENSLATE icon family (an app window with a Frost accent) for apps
 * that have no `other/resources/icons/genslate/<name>.svg` yet.
 */
export function placeholderIcon(title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <title>${title}</title>
  <!--
    Placeholder in the GENSLATE app icon family (see the other icons in this folder): a flat
    Polar Night plate (nord1, nord2 hairline rim) on the macOS Big Sur icon grid, Snow Storm line
    work and one nord8 accent. Replace the glyph with one that says what the app does.
  -->
  <defs>
    <filter id="drop" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect x="100" y="100" width="824" height="824" rx="185" fill="#3b4252" filter="url(#drop)"/>
  <rect x="102" y="102" width="820" height="820" rx="183" fill="none" stroke="#434c5e" stroke-width="4"/>
  <path d="M340 316H684Q744 316 744 376V648Q744 708 684 708H340Q280 708 280 648V376Q280 316 340 316Z" fill="none" stroke="#eceff4" stroke-width="40" stroke-linejoin="round"/>
  <path d="M280 420H744" fill="none" stroke="#eceff4" stroke-width="40" opacity="0.4"/>
  <path d="M340 368a16 16 0 1 0 32 0a16 16 0 1 0 -32 0Z" fill="#88c0d0"/>
</svg>
`;
}
