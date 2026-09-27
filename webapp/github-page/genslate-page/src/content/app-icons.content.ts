/**
 * The GENSLATE icon family (`other/resources/icons/genslate/<app>.svg`), bundled by Vite as
 * hashed asset URLs. Each SVG is a 1024 canvas with an 824 plate at (100, 100) — the macOS icon
 * grid — so `AppIcon` can crop to the plate for small tiles.
 */
const ICON_URLS = import.meta.glob<string>('../../../../../other/resources/icons/genslate/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const BY_ID = new Map(
  Object.entries(ICON_URLS).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
);

/** The icon URL for an app id, if the family has one. */
export function appIconUrl(id: string): string | undefined {
  return BY_ID.get(id);
}
