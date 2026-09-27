import { APPS, findApp, type SuiteApp } from '../content/apps.content';
import type { DocEntry } from '../content/content.types';
import { DOCS, findDoc, loadDocHtml } from '../content/docs.content';
import { normalizePath } from './router/router.util';

/** What a route renders, with its data already loaded. */
export type RouteView =
  | { readonly kind: 'home' }
  | { readonly kind: 'apps' }
  | { readonly kind: 'app'; readonly app: SuiteApp }
  | { readonly kind: 'design' }
  | { readonly kind: 'download' }
  | { readonly kind: 'docs-home' }
  | { readonly kind: 'doc'; readonly doc: DocEntry; readonly html: string }
  | { readonly kind: 'not-found' };

export interface PageMeta {
  readonly title: string;
  readonly description: string;
}

export interface ResolvedRoute {
  /** Base-relative, normalised (`/apps/terminal/`). */
  readonly path: string;
  readonly view: RouteView;
  readonly meta: PageMeta;
}

const SUITE_DESCRIPTION =
  'GENSLATE is a suite of beautiful, portable desktop apps — Launcher, Terminal, Explorer, Editor and more — built with Tauri and Rust and themed in official Nord.';

const titled = (title: string) => `${title} · GENSLATE`;

/** Resolves a path to its view and metadata, loading page data (docs HTML) first. */
export async function resolveRoute(rawPath: string): Promise<ResolvedRoute> {
  const path = normalizePath(rawPath);
  const segments = path.split('/').filter(Boolean);
  const [first, ...rest] = segments;

  const done = (view: RouteView, meta: PageMeta): ResolvedRoute => ({ path, view, meta });

  if (first === undefined) {
    return done(
      { kind: 'home' },
      { title: 'GENSLATE — portable desktop apps in Nord', description: SUITE_DESCRIPTION },
    );
  }
  if (first === 'apps' && rest.length === 0) {
    return done(
      { kind: 'apps' },
      {
        title: titled('Apps'),
        description: `Every app in the GENSLATE suite: ${APPS.map((app) => app.name).join(', ')}.`,
      },
    );
  }
  if (first === 'apps' && rest.length === 1) {
    const app = findApp(rest[0] ?? '');
    if (app)
      return done({ kind: 'app', app }, { title: titled(app.name), description: app.summary });
  }
  if (first === 'design' && rest.length === 0) {
    return done(
      { kind: 'design' },
      {
        title: titled('Design Kit'),
        description:
          'The GENSLATE design system: official Nord themes, macOS refinement and VS Code density, built on Base UI and Tailwind CSS v4.',
      },
    );
  }
  if (first === 'download' && rest.length === 0) {
    return done(
      { kind: 'download' },
      {
        title: titled('Download'),
        description:
          'Download the GENSLATE suite or a single app for Windows, macOS and Linux — portable, no installer required.',
      },
    );
  }
  if (first === 'docs') {
    if (rest.length === 0) {
      return done(
        { kind: 'docs-home' },
        {
          title: titled('Docs'),
          description:
            'Guides for using the GENSLATE apps, and the developer documentation for building on the suite.',
        },
      );
    }
    const doc = findDoc(rest.join('/'));
    const html = doc ? await loadDocHtml(doc.slug) : undefined;
    if (doc && html !== undefined) {
      return done(
        { kind: 'doc', doc, html },
        { title: titled(doc.title), description: doc.description },
      );
    }
  }
  return done(
    { kind: 'not-found' },
    { title: titled('Page not found'), description: 'This page does not exist.' },
  );
}

/** Every route to prerender. */
export function staticPaths(): string[] {
  return [
    '/',
    '/apps/',
    ...APPS.map((app) => `/apps/${app.id}/`),
    '/design/',
    '/download/',
    '/docs/',
    ...DOCS.map((doc) => doc.route),
  ];
}
