# GENSLATE licence

GENSLATE (all first-party source code, documentation, designs and assets in this repository) is **proprietary software** — © 2026 GENSLATE. All rights reserved. The full terms are in the repository root [`LICENSE`](../../LICENSE).

- npm packages are marked `"license": "UNLICENSED"` and `"private": true`.
- Rust crates are marked `license = "LicenseRef-Proprietary"` and `publish = false`; `cargo deny` skips them via `[licenses.private] ignore = true`.

Third-party components keep their own licences:

| File | Covers |
|---|---|
| [`third-party-fonts-icons.md`](./third-party-fonts-icons.md) | Fonts, icon sets and the Nord palette bundled in the apps |

Runtime dependencies (npm and crates) are restricted to permissive licences by `.config/cargo/deny.toml` (Rust) and the dependency-review workflow (npm).
