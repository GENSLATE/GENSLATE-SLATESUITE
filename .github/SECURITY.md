# Security policy

## Supported versions

GENSLATE is pre-1.0. Only the latest release (and `main`) receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue.** Report privately via
[GitHub Security Advisories](https://github.com/ATOMANGELETTI/GENSLATE/security/advisories/new).

Include:
- affected app / package / crate and version (or commit),
- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- any suggested fix.

You'll get an acknowledgement within **3 business days** and a status update at least weekly until it is resolved. We coordinate disclosure with you and credit you in the advisory unless you prefer otherwise.

## Scope

In scope: the desktop apps (Tauri capabilities, CSP, IPC commands), `@genslate/*` packages, `genslate-*` crates, build scripts and CI workflows.

Out of scope: vulnerabilities in upstream dependencies that are already publicly known (report them upstream; we track them via Dependabot, `cargo deny` and dependency review), and issues requiring a compromised local machine.

## How we keep things secure

See [other/documents/security.md](../other/documents/security.md): least-privilege Tauri capabilities, strict CSP, typed and validated IPC, exact dependency pins with committed lockfiles, cargo-deny, CodeQL, dependency review and SHA-pinned GitHub Actions.
