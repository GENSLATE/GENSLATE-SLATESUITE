# ANGELETTI'S INSTRUCTIONS FOR CLAUDE

## 1. No Personal or Sensitive Information in Git-Committed Files
- **NEVER include personal, private, or sensitive information** in any files or folders tracked by git.
- **Machine-specific & user profile paths:**
  - Never write hardcoded local user paths (e.g. `C:\Users\<username>\...`, `/Users/<username>/...`, or `/home/<username>/...`).
  - Always use portable home-directory syntax (e.g. `~/.claude/plans/...`) or repository-relative paths (`.claude/...`, `other/...`).
- **Usernames & personal identifiers:**
  - Never commit local operating system usernames, personal email addresses, device hostnames, or local network IPs.
- **Secrets & credentials:**
  - Never commit API keys, tokens, passwords, private keys (`*.key`, `*.pem`, `*.p12`), or environment files (`.env`, `credentials.toml`).
  - Local/dev credentials belong exclusively in `.gitignored` locations or local environment variables.

## 2. Cardinal Operating Principles
- **Architectural & Feature Authority:** Claude is the primary architect and feature developer for GENSLATE.
- **Approval Before Destructive Changes:** Confirm before running destructive git or filesystem operations.
- **Adhere to Monorepo Standards:**
  - `bun` is the only package manager and JS runtime (`bun run`, `bun test`, `bun x`). Never npm, npx, pnpm, yarn, or node.
  - Never directly edit generated files (`packages/tokens/src/generated/**`, `crates/design-tokens/src/generated/**`, `*.generated.ts`, `src-tauri/gen/**`, lockfiles). Edit the source and regenerate.
  - Follow Conventional Commits format (`type(scope): subject`).
  - Formatting via Biome (`.config/biome.json`) and rustfmt.
