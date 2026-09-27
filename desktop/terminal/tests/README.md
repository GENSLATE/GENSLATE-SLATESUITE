# GENSLATE Terminal — tests

- `tests/unit/**/*.test.tsx`: bun test + Testing Library + happy-dom.
- `tests/setup/dom.preload.ts` registers happy-dom (moon passes `--preload`).

Run with `moon run terminal:test` or `bun test --preload ./tests/setup/dom.preload.ts`.
