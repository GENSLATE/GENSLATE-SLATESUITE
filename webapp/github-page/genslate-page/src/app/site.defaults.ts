/**
 * Where the site and the code live. Shared by `vite.config.ts`, the prerender script and the app.
 *
 * GitHub Pages: a repo named `GENSLATE` under the `genslate` account publishes at
 * `https://genslate.github.io/GENSLATE/` (a *project* site, base `/GENSLATE/`). Only a repo named
 * `genslate.github.io` is served from the bare domain (base `/`). The Pages workflow overrides
 * `base` and `origin` with what `actions/configure-pages` reports, so both work unchanged.
 */
export const SITE_DEFAULTS = {
  name: 'GENSLATE',
  base: '/GENSLATE/',
  origin: 'https://genslate.github.io',
  repoUrl: 'https://github.com/genslate/GENSLATE',
  branch: 'main',
} as const;

/** Frequently linked pages on GitHub. */
export const REPO_LINKS = {
  home: SITE_DEFAULTS.repoUrl,
  releases: `${SITE_DEFAULTS.repoUrl}/releases`,
  latestRelease: `${SITE_DEFAULTS.repoUrl}/releases/latest`,
  issues: `${SITE_DEFAULTS.repoUrl}/issues`,
  discussions: `${SITE_DEFAULTS.repoUrl}/discussions`,
} as const;
