# Website: the GitHub Pages site

`webapps/genslate-page` (moon project `genslate-page`) is the public site for the suite:
the landing page, one page per app, the Design Kit showcase, downloads, and the docs & wiki. It is
built with the same design system as the apps, so it looks like them.

## Commands

```sh
bun x moon run genslate-page:web-dev      # dev server with HMR → http://localhost:1430/GENSLATE/
bun x moon run genslate-page:web-build    # prerender every route → dist/site
bun x moon run genslate-page:web-preview  # serve dist/site → http://localhost:1431/GENSLATE/
bun x moon run genslate-page:test         # markdown pipeline, router, catalogue drift
```

## How it works

| Piece | Where | Notes |
|---|---|---|
| Pages | `src/features/<page>/` | Home, apps, app detail, design, download, docs, 404 — one chunk each (`src/app/pages.registry.tsx`). |
| Router | `src/app/router/` | Base-path aware, intercepts same-site links, loads the next page's chunk and data first, swaps inside a view transition, restores scroll, moves focus to `<main>`. |
| App catalogue | `src/content/apps.content.ts` | Website copy per app. Name, tagline, category, colour and keywords must match `other/config/slatesuite/metadata/<app>.toml` — a test enforces it. |
| App pictures | `src/features/mockups/` | Live, `inert` mockups built from design-system components at a fixed window size and scaled with CSS (`mockup.stage.css`). The Design Kit uses real screenshots from `other/resources/screenshots/`. |
| Wiki | `content/wiki/*.md` | User guides with frontmatter (`title`, `description`, `section`, `order`, `icon`). |
| Developer docs | `other/documents/*.md` | Rendered as-is (the list is `DEVELOPER_DOCS` in `plugins/content.plugin.ts`). Relative `.md` links become site links; other repo paths link to GitHub. |
| Markdown | `plugins/markdown.ts` | `Bun.markdown` (GFM) + Shiki highlighting with Nord CSS variables, GitHub alerts as callouts, heading anchors and an outline. Runs at build time only. |
| Prerender | `scripts/build-site.ts` | Client build, SSR build, then `renderToString` per route with title, description, canonical, Open Graph, JSON-LD and a per-page hashed Content-Security-Policy; writes `404.html`, `sitemap.xml`, `robots.txt`, `.nojekyll`. |

## Base path

GitHub Pages serves a repository named `GENSLATE` as a **project site** at
`https://<owner>.github.io/GENSLATE/`, so the default base is `/GENSLATE/`
(`src/app/site.defaults.ts`). Only a repository named `<owner>.github.io` (or a custom domain) is
served from `/`. The Pages workflow passes what `actions/configure-pages` reports:

| Variable | Default | Used for |
|---|---|---|
| `GENSLATE_SITE_BASE` | `/GENSLATE/` | Vite `base`, every link and asset URL |
| `GENSLATE_SITE_ORIGIN` | `https://genslate.github.io` | canonical URLs, sitemap, Open Graph |

## Deployment

`.github/workflows/pages.yml` runs on pushes to `main` that touch the site, the design system,
tokens, docs, icons or app metadata: typecheck, tests, prerender, then `actions/deploy-pages`.
Enable it once under **Settings → Pages → Source: GitHub Actions**.

## Motion and accessibility

- Scroll reveals use scroll-driven animations (`animation-timeline: view()`) with an
  IntersectionObserver fallback; page and theme changes use view transitions.
- Everything is progressive enhancement and switches off under `prefers-reduced-motion`.
- Mockups are `inert` with a text alternative; mockup animations only run while on screen.
- Theme-dependent or machine-dependent output (⌘ vs Ctrl, detected OS) renders after hydration
  (`useIsClient`) so prerendered HTML always matches.

## Adding things

- **An app:** add it to `APPS` (keep it in sync with its metadata TOML), add a mockup in
  `src/features/mockups/` and register it in `mockups.registry.tsx`.
- **A wiki page:** add `content/wiki/<slug>.md` with frontmatter; it appears at `/docs/<slug>/`.
- **A developer doc:** add it to `other/documents/` and to `DEVELOPER_DOCS`.
