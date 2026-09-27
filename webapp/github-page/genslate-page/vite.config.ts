import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { genslateContent } from './plugins/content.plugin';
import { themeInit } from './plugins/theme-init.plugin';
import { SITE_DEFAULTS } from './src/app/site.defaults';

const siteRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * The GENSLATE website. `GENSLATE_SITE_BASE` is the path the site is served under: `/GENSLATE/`
 * for the project site (genslate.github.io/GENSLATE/), `/` for a user site or a custom domain.
 * The Pages workflow passes the value `actions/configure-pages` reports.
 */
export default defineConfig({
  base: process.env['GENSLATE_SITE_BASE'] ?? SITE_DEFAULTS.base,
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    themeInit(),
    genslateContent({
      repoRoot,
      siteRoot,
      repoUrl: SITE_DEFAULTS.repoUrl,
      branch: SITE_DEFAULTS.branch,
    }),
  ],
  server: {
    port: 1430,
    strictPort: true,
    // App icons and developer docs live outside this project.
    fs: { allow: [repoRoot] },
  },
  preview: { port: 1431, strictPort: true },
  build: {
    target: 'baseline-widely-available',
    reportCompressedSize: false,
  },
});
