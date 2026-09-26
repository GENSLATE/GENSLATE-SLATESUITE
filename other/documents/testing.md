# Testing

| Layer | Tooling | Location | Run |
|---|---|---|---|
| TS units (tokens, bridge, scripts) | `bun test` | `<project>/tests/unit/**/*.test.ts` | `bun x moon run <project>:test` |
| React components | `bun test` + Testing Library + happy-dom (preloaded by `tests/setup/dom.preload.ts`) | `packages/design-system/tests/unit/<category>/<name>.test.tsx`, `desktop/<app>/tests/unit/**` | `bun x moon run design-system:test` |
| Rust | `cargo test` | `#[cfg(test)] mod tests` next to the code; helpers in `crates/testing` | `bun x moon run root:rust-test` / `cargo t` |
| End-to-end | planned | `tests/e2e/` | — |
| Visual QA | screenshots in both themes + `ui-visual-qa` agent | `other/resources/screenshots/` | manual |

Everything: `bun run test`. CI runs only affected tests via `moon ci`.

## Writing TS/React tests

```tsx
import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button', () => {
  test('calls onClick from the keyboard', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => { clicks += 1; }}>Save</Button>);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(clicks).toBe(1);
  });
});
```

- Query by role and accessible name; assert `aria-*` / `data-*` states and callbacks. No markup snapshots, no style assertions.
- Every bug fix gets a regression test.

## Coverage

- TS: `bun test --coverage` (text + lcov into `coverage/`, configured in `bunfig.toml`).
- Rust: `cargo cov` (cargo-tarpaulin, `.config/cargo/tarpaulin.toml`, HTML + lcov in `target/coverage/`).
- Mutation testing (optional): `cargo mutants-ws` (`.config/cargo/mutants.toml`).
