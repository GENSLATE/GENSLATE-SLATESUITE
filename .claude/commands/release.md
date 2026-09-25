---
description: Prepare a GENSLATE release (preflight, version bump, changelog, tag) using the release-manager agent.
argument-hint: "<version>  e.g. 0.2.0"
---

Prepare release `$ARGUMENTS` with the `release-manager` agent's flow:

1. Preflight: clean git tree on `main`, `bun run check` and `bun run test` green.
2. Bump versions with `bun run version` to `$ARGUMENTS` and show the diff.
3. Draft release notes from Conventional Commits since the last tag (`git describe --tags --abbrev=0`).
4. Optionally run `bun run package` and list the artifacts in `release/<app>/$ARGUMENTS/`.
5. **Stop and ask** before creating or pushing the tag `v$ARGUMENTS` — pushing it starts `.github/workflows/release.yml`, which builds macOS (arm64 + x64), Windows and Linux installers into a draft GitHub release.
