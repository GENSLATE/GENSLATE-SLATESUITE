# {{ title }} — tests

- `tests/unit/**/*.test.tsx`: bun test + Testing Library + happy-dom.
- `tests/setup/dom.preload.ts` registers happy-dom (moon passes `--preload`).

Run with `moon run {{ name }}:test` or `bun test --preload ./tests/setup/dom.preload.ts`.
