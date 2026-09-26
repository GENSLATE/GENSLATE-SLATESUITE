---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript standards

- **TypeScript 7** (native compiler, `tsc` from `typescript@7`) in the strictest config (`packages/config-typescript/tsconfig.base.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` (use `obj['key']` for index signatures, e.g. `process.env['X']`), `verbatimModuleSyntax`, `erasableSyntaxOnly` (no `enum`, no `namespace`, no parameter properties).
- Extend the right preset: `tsconfig.bun.json` (scripts, tooling), `tsconfig.react.json` (UI packages and apps).
- ESM only. `import type` for types (Biome enforces `useImportType`). `node:` prefix for built-ins. Import paths without `.ts` extensions.
- **Named exports only** — no default exports (except config files that require one: `vite.config.ts`, `*.config.ts`).
- No `any`, no non-null `!`, no `as unknown as`. Narrow with type guards; parse external data (IPC, JSON, stdin) at the boundary into typed values.
- Prefer `readonly` props/arrays for inputs, `as const` for literal tables, `satisfies` to check object literals against a type without widening.
- Model variants with string-literal unions, not enums.
- Async: always `await` or explicitly `void` with a reason; no floating promises.

## React (19.3 + React Compiler)
- Function components only; `ref` is a regular prop (no `forwardRef`).
- The React Compiler memoises automatically — follow the Rules of React (pure render, no mutation of props/state, hooks at top level) and don't sprinkle `useMemo`/`useCallback`.
- Styling only via token utilities + `tv()`/`cn()` (see `.claude/rules/design-system.md`).
- Tauri access only through `@genslate/tauri-bridge` (never `@tauri-apps/api` directly in apps' UI code), so everything also runs in a plain browser.

## Scripts (`scripts/`, `.claude/hooks/`, `packages/*/scripts/`)
- Run with bun (`#!/usr/bin/env bun`), use Bun APIs (`Bun.spawn`, `Bun.file`, `Bun.$`) over Node shims where simpler.
- Exit non-zero on failure with a clear one-line message; Claude hooks must fail open.

## Tests
`bun:test` (`describe`/`test`/`expect`), files under `tests/unit/**/<name>.test.ts(x)`; React via Testing Library + happy-dom preload.
