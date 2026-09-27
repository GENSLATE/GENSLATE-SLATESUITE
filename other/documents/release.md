# Release

## Versioning

SemVer, one version for the whole repo (`package.json` files, `Cargo.toml` `[workspace.package].version`, `tauri.conf.json`). Bump with `bun run version`. Tags are `v<version>`.

## Local packaging

```sh
bun run package [app...|--all] [--target <id>] [--debug] [--skip-build] [--installers]
```
Every GENSLATE app ships as a **portable standalone archive**: extract it anywhere and it keeps
its config, logs and files beside itself (see [portability](portability.md)).

```
release/                                   (git-ignored)
├─ <app>/                                  always the newest build
│  ├─ genslate-<app>-<version>-<target>.zip   (.tar.gz on Linux, keeps the executable bit)
│  ├─ checksums.sha256                       (sha256sum -c compatible)
│  └─ manifest.json                          (app, version, target, commit, files)
└─ .archive/<app>/<YYYY-MM-DD_HH-MM>/      previous builds, moved here automatically
```

The archive contains `genslate-<app>/` with the program (`.exe`, the `.app` bundle on macOS, or
the Linux binary), `other/` (the app's config defaults, its launcher metadata with `version`,
`build`, `identifier` and `exe` stamped in, licences, empty log/database/cache folders) and
`storage/users/shared/`. The repo's own metadata files are never modified.

| Target (`--target`) | Built on | Notes |
|---|---|---|
| `windows-x64`, `windows-arm64` | Windows | WebView2 runtime required (preinstalled on Windows 10/11) |
| `macos-universal` | macOS | `.app` inside the zip; unsigned until notarisation is set up |
| `linux-x64` | Linux | needs `webkit2gtk-4.1` from the system |

Default target: this machine. `--installers` additionally builds the Tauri installers
(`.msi`/`-setup.exe`, `.dmg`, `.deb`/`.rpm`/`.AppImage`) and collects them into the same folder.

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
