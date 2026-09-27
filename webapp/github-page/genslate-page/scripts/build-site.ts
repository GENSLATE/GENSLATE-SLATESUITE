#!/usr/bin/env bun
/**
 * Builds the GENSLATE website for GitHub Pages:
 *   1. the client bundle (Vite) → dist/site
 *   2. the server bundle (Vite SSR) → dist/ssr
 *   3. every route prerendered into dist/site/<route>/index.html, plus 404.html, sitemap.xml,
 *      robots.txt and .nojekyll.
 *
 * Environment (set by the Pages workflow from actions/configure-pages):
 *   GENSLATE_SITE_BASE    path the site is served under (default /GENSLATE/)
 *   GENSLATE_SITE_ORIGIN  scheme + host for canonical URLs (default https://genslate.github.io)
 */
import { createHash } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

import { HEAD_SCRIPT } from '../plugins/theme-init.plugin';
import { SITE_DEFAULTS } from '../src/app/site.defaults';
import type { RenderedPage } from '../src/entry.server';

// The repo imports without file extensions (TS convention); Vite 8 flags that as unsupported by its
// future native config loader. The bundled loader it uses today handles it fine.
process.env['VITE_CONFIG_NATIVE_IGNORE_WARNING'] ??= 'true';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));
const configFile = join(siteRoot, 'vite.config.ts');
const clientOut = join(siteRoot, 'dist', 'site');
const serverOut = join(siteRoot, 'dist', 'ssr');

const base = process.env['GENSLATE_SITE_BASE'] ?? SITE_DEFAULTS.base;
const origin = (process.env['GENSLATE_SITE_ORIGIN'] ?? SITE_DEFAULTS.origin).replace(/\/$/, '');

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** JSON for an inline <script> data block (`<` escaped so it can never close the tag). */
const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003C');

/** Executable inline scripts (no src, not a JSON data block). */
const INLINE_SCRIPT =
  /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g;

const sha256 = (text: string) => createHash('sha256').update(text).digest('base64');

async function main(): Promise<void> {
  const started = performance.now();
  await rm(join(siteRoot, 'dist'), { recursive: true, force: true });

  await build({ root: siteRoot, configFile, logLevel: 'warn', build: { outDir: clientOut } });
  await build({
    root: siteRoot,
    configFile,
    logLevel: 'warn',
    build: { ssr: 'src/entry.server.tsx', outDir: serverOut, copyPublicDir: false },
  });

  const template = await Bun.file(join(clientOut, 'index.html')).text();
  if (!template.includes('<!--site-head-->') || !template.includes('<!--site-html-->')) {
    throw new Error('index.html lost its <!--site-head--> / <!--site-html--> placeholders');
  }
  // The apple-touch-icon is the 1024px app icon: reuse it as the social preview image.
  const iconHref = /rel="apple-touch-icon" href="([^"]+)"/.exec(template)?.[1];

  const server: {
    render: (path: string) => Promise<RenderedPage>;
    staticPaths: () => string[];
  } = await import(pathToFileURL(join(serverOut, 'entry.server.js')).href);

  /**
   * A strict CSP per page: scripts only from this origin, plus the exact inline scripts the page
   * contains — the theme bootstrap and any pre-hydration script a component renders (Base UI's
   * Slider positions its thumbs before React loads) — allowed by hash.
   */
  const cspFor = (html: string) => {
    const inline = [...html.matchAll(INLINE_SCRIPT)].map((match) => match[1] ?? '');
    const hashes = [...new Set([HEAD_SCRIPT, ...inline])].map((code) => `'sha256-${sha256(code)}'`);
    return [
      "default-src 'self'",
      `script-src 'self' ${hashes.join(' ')}`,
      // React style props and Shiki token colours are inline styles.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
      'upgrade-insecure-requests',
    ].join('; ');
  };

  const pages = [...server.staticPaths(), '/404/'];
  const sitemap: string[] = [];

  for (const path of pages) {
    const { route, html } = await server.render(path);
    const notFound = route.view.kind === 'not-found';
    const url = `${origin}${base}${path.slice(1)}`;
    const image = iconHref ? `${origin}${iconHref}` : undefined;

    const structured =
      route.view.kind === 'app'
        ? {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: `GENSLATE ${route.view.app.name}`,
            description: route.view.app.summary,
            applicationCategory: `${route.view.app.category}Application`,
            operatingSystem: 'Windows, macOS, Linux',
            url,
          }
        : route.view.kind === 'home'
          ? {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: SITE_DEFAULTS.name,
              url,
              description: route.meta.description,
            }
          : undefined;

    const head = [
      `<title>${escapeAttr(route.meta.title)}</title>`,
      `<meta name="description" content="${escapeAttr(route.meta.description)}" />`,
      `<meta http-equiv="Content-Security-Policy" content="${cspFor(html)}" />`,
      `<meta name="referrer" content="strict-origin-when-cross-origin" />`,
      notFound
        ? '<meta name="robots" content="noindex" />'
        : `<link rel="canonical" href="${url}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${SITE_DEFAULTS.name}" />`,
      `<meta property="og:title" content="${escapeAttr(route.meta.title)}" />`,
      `<meta property="og:description" content="${escapeAttr(route.meta.description)}" />`,
      notFound ? '' : `<meta property="og:url" content="${url}" />`,
      image ? `<meta property="og:image" content="${image}" />` : '',
      `<meta name="twitter:card" content="summary" />`,
      structured ? `<script type="application/ld+json">${jsonLd(structured)}</script>` : '',
    ]
      .filter(Boolean)
      .join('\n    ');

    const page = template.replace('<!--site-head-->', head).replace('<!--site-html-->', html);
    const file = notFound ? join(clientOut, '404.html') : join(clientOut, path, 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await Bun.write(file, page);
    if (!notFound) sitemap.push(`  <url><loc>${url}</loc></url>`);
  }

  await Bun.write(
    join(clientOut, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.join('\n')}\n</urlset>\n`,
  );
  await Bun.write(
    join(clientOut, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}${base}sitemap.xml\n`,
  );
  // GitHub Pages: serve files as-is (no Jekyll processing).
  await Bun.write(join(clientOut, '.nojekyll'), '');
  await rm(serverOut, { recursive: true, force: true });

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  process.stdout.write(
    `✓ genslate-page: ${pages.length} pages prerendered into dist/site (base ${base}) in ${seconds}s\n`,
  );
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`✗ genslate-page build failed: ${detail}\n`);
  process.exit(1);
});
