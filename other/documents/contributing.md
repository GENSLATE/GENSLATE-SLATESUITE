# Contributing

## Workflow

1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
2. `bun run setup` once; lefthook installs the git hooks.
3. Make the change following the rules in [`.claude/rules/`](../../.claude/rules/) (they apply to humans too).
4. `bun run check` and `bun run test` must pass. UI changes: screenshots in Polar Night **and** Snow Storm.
5. Open a PR using the template; CI (lint, types, tests, Rust, security) must be green. CODEOWNERS review is required.

## Conventions

- **bun only** — never npm/npx/pnpm/yarn/node.
- **Dependencies**: add the latest stable version to the root `package.json` `workspaces.catalog` (exact) and reference `"catalog:"`; crates go into root `[workspace.dependencies]`.
- **Files**: kebab-case, dotted by kind — `title-bar.component.tsx`, `button.variants.ts`, `use-theme.hook.ts`, `nord.polar-night.theme.ts`, `build-tokens.ts`.
- **Generated files** are never edited by hand; regenerate (`bun run tokens`).
- **Config** belongs in `.config/`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), checked by commitlint on `commit-msg`:

```
feat(design-system): add segmented control
fix(example): keep traffic lights dimmed when the window is inactive
chore(deps): bump vite to 8.3.1
```

Scopes: `tokens`, `design-system`, `tauri-bridge`, `config-typescript`, `config-vite`, `example`, `crates`, `repo`, `ci`, `deps`, `claude`, `docs`, `release`. Subjects are lower-case, imperative, ≤ 100 characters in the header.

## Git hooks (lefthook)

| Hook | Runs |
|---|---|
| pre-commit | Biome (auto-fix, re-stage), rustfmt on staged `.rs`, token drift check when token sources change, cspell on staged files |
| commit-msg | commitlint |
| pre-push | `moon run :typecheck :test root:rust-test` |

## Reviews

Keep PRs focused. Reviewers check correctness, types, the design contract, accessibility, security (capabilities/IPC/deps) and docs. Claude Code users can run `/audit`, or the `code-reviewer` / `security-reviewer` / `ui-visual-qa` agents before requesting review.
