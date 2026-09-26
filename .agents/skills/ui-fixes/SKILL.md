---
name: ui-fixes
description: >-
  Systematic workflow for diagnosing and fixing UI/UX issues, styling defects, density mismatches, theme contrast problems, and Base UI component bugs across @genslate/design-system, desktop apps, and web apps. Enforces Angeletti's approval-before-action rule.
---

# UI Fixes & Visual Polish Runbook

Use this skill when tasked with fixing visual defects, theme issues, layout glitches, or styling inconsistencies in GENSLATE.

## Protocol: Approval Before Action

> [!IMPORTANT]
> **DO NOT AUTOMATICALLY MODIFY FILES.**
> You must investigate, identify the root cause, formulate the proposed fix, and ask Angeletti for approval before making any code changes.

---

## Step-by-Step Procedure

### 1. Locate and Inspect
- Find the affected component in `packages/design-system/src/components/<category>/<name>/`.
- Check its showcase section in `desktop/example/src/features/showcase/sections/`.
- Review the design contract in [.claude/rules/design-system.md](file:///d:/DEVELOPMENT/PROJECTS/GENSLATE/.claude/rules/design-system.md) and [.agents/rules/ui-guidelines.md](file:///d:/DEVELOPMENT/PROJECTS/GENSLATE/.agents/rules/ui-guidelines.md).

### 2. Identify the Root Cause
Common issues:
- **Token Utility Misuse**: Using arbitrary Tailwind classes (e.g. `bg-zinc-800`) or raw hex instead of semantic tokens (`bg-surface`, `bg-canvas`).
- **Base UI Attribute Missing**: Styling hover/focus directly instead of Base UI's data attributes (`data-[highlighted]`, `data-[selected]`, `data-[open]`, `data-[disabled]`).
- **Wrong Polymorphism**: Using `asChild` instead of Base UI 1.8's `render` prop.
- **Density / Spacing Mismatch**: Heights deviating from specs (titlebar 38px, statusbar 24px, control md 28px, control sm 24px).
- **Missing `data-slot`**: Every part requires a `data-slot="<component>-<part>"` attribute.
- **Platform Branching**: Forgetting macOS overlay titlebar vs. Windows/Linux custom decorations.

### 3. Check Design Token Availability
- If a new color or size is required, verify `packages/tokens/src/generated/css/tailwind.theme.css`.
- **Never hand-edit generated CSS or TS files.** If a token needs adjusting, edit `packages/tokens/src/**` and run `bun run tokens`.

### 4. Present Diagnosis & Proposed Solution (PAUSE FOR APPROVAL)
Present a concise report to Angeletti:
```markdown
### UI Defect Diagnosis
- **Component**: `<component_name>`
- **Observed Issue**: `<what is wrong>`
- **Root Cause**: `<why it happens>`
- **Proposed Fix**:
  `<explanation and exact diff to be applied>`
```
Ask: *"Would you like me to proceed with this fix?"*
**Stop and wait for Angeletti's response.**

### 5. Apply Fix & Verify
Once approved:
1. Apply the edits to the component or recipe.
2. Run typechecks:
   ```sh
   bun x moon run design-system:typecheck example:typecheck
   ```
3. Run component tests:
   ```sh
   bun test packages/design-system/tests/unit/<category>/<name>.test.tsx
   ```
4. **Dual-Theme Verification**: Verify that the component looks visually correct and passes contrast in both:
   - **Polar Night** (Dark theme: `[data-theme="polar-night"]`)
   - **Snow Storm** (Light theme: `[data-theme="snow-storm"]`)
