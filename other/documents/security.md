# Security

Reporting a vulnerability: see [`.github/SECURITY.md`](../../.github/SECURITY.md).

## Application

- **Capabilities**: each window gets a least-privilege capability file (`desktop/<app>/src-tauri/capabilities/*.json`). Only the window APIs the custom titlebar needs, `os`, `log`, `window-state`, and `opener:allow-open-url` scoped to `https://*`.
- **CSP**: strict production CSP in `tauri.conf.json` — `default-src 'self'`, no remote scripts, `connect-src ipc: http://ipc.localhost`; the looser `devCsp` only allows the Vite HMR socket. `freezePrototype` is enabled.
- **IPC**: every command validates input, returns typed `{ kind, message }` errors without secrets or absolute paths, and delegates to core crates. See [IPC](./ipc.md).
- **Rust**: `unsafe_code` is denied workspace-wide; no `unwrap`/`expect` outside tests.
- **Frontend**: anything prefixed `VITE_` or `TAURI_ENV_` is bundled into the app — never put secrets there. External links open in the system browser via the opener plugin.

## Supply chain

| Control | Where |
|---|---|
| Exact version pins (catalog / workspace deps) + committed `bun.lock` / `Cargo.lock` + `--frozen-lockfile` | `package.json`, `Cargo.toml`, CI |
| New-release quarantine (`cooldown`) and grouped updates | `.github/dependabot.yml` |
| Dependency review on PRs (vulnerabilities ≥ moderate, copyleft licences) | `.github/workflows/security.yml` |
| cargo-deny: RustSec advisories, licence allow-list, bans, crates.io-only sources | `.config/cargo/deny.toml` |
| CodeQL: Actions, JavaScript/TypeScript, Rust (`security-extended`) | `.github/workflows/security.yml` |
| Actions pinned by commit SHA, least-privilege `permissions`, `persist-credentials: false` | `.github/workflows/*.yml` |

## Secrets

`.env*` (except `.env.example`), `*.pem`, `*.key` and `credentials.toml` are git-ignored, and Claude Code is denied read access to them (`.claude/settings.json`). CI secrets live only in GitHub encrypted secrets.
