---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript / React

- TypeScript 7, strictest settings (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` → `process.env['X']`, `verbatimModuleSyntax`, `erasableSyntaxOnly` → no `enum`/`namespace`/parameter properties).
- ESM, named exports only (default exports only in `*.config.ts` / `vite.config.ts`), `import type` for types, `node:` prefix for built-ins, no `.ts` extensions in imports.
- No `any`, no non-null `!`, no `as unknown as`; validate external data at the boundary.
- React 19.3 with the React Compiler: function components, `ref` as a normal prop (no `forwardRef`), follow the Rules of React, don't add `useMemo`/`useCallback` by reflex.
- Apps call Tauri only through `@genslate/tauri-bridge` (it no-ops in a browser); the design system never imports Tauri.
- Tests: `bun:test` + Testing Library + happy-dom under `tests/unit/**/<name>.test.ts(x)`; test roles, keyboard and states, not markup snapshots.
- Scripts run with bun (`Bun.spawn`, `Bun.file`); format with Biome (2 spaces, single quotes, semicolons, trailing commas, width 100).
