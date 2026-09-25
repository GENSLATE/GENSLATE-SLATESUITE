# Release

## Versioning

SemVer, one version for the whole repo (`package.json` files, `Cargo.toml` `[workspace.package].version`, `tauri.conf.json`). Bump with `bun run version`. Tags are `v<version>`.

## Local packaging

```sh
bun run package
```
Builds release installers with the Tauri CLI and copies them to `release/<app>/<version>/` (git-ignored):

| OS | Artifacts |
|---|---|
| macOS | `.dmg`, `.app` |
| Windows | `.msi` (WiX), `-setup.exe` (NSIS) |
| Linux | `.deb`, `.rpm`, `.AppImage` |

Release profile: LTO, `codegen-units = 1`, `opt-level = "s"`, `panic = "abort"`, stripped.

## GitHub release

1. Preflight on `main`: `bun run check`, `bun run test`, CI green.
2. `bun run version`, commit (`chore(release): v<version>`), open/merge the PR.
3. `git tag v<version> && git push origin v<version>`.
4. `.github/workflows/release.yml` builds the example app on macOS (Apple Silicon + Intel), Windows and Linux with `tauri-apps/tauri-action` and uploads the installers to a **draft** release.
5. Review the assets and notes, then publish the draft.

Manual runs (`workflow_dispatch`) accept an `app` input (folder under `desktop/`).

## Signing

Not configured yet — builds are unsigned. When certificates exist, add them as repository secrets (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`; Windows code-signing; `TAURI_SIGNING_PRIVATE_KEY` for the updater) and pass them to the tauri-action step.
