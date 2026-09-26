---
name: run-tests
description: >-
  Procedure for running, diagnosing, and writing automated tests across TypeScript, React, and Rust crates in GENSLATE. Use when testing components, investigating test failures, or validating fixes. Enforces Angeletti's approval-before-action rule.
---

# Testing & Diagnosis Runbook

Use this skill when running test suites, triaging test failures, or authoring unit and regression tests.

## Protocol: Approval Before Action

> [!IMPORTANT]
> When tests fail, **DO NOT automatically patch code or change assertions**.
> Diagnose the failure, determine whether the code or test is faulty, propose the fix with full reasoning, and request Angeletti's approval first.

---

## Step-by-Step Procedure

### 1. Select the Narrowest Test Target
Avoid running the full workspace test suite when investigating a specific component or crate:
- **Single Component**:
  ```sh
  bun test packages/design-system/tests/unit/<category>/<name>.test.tsx
  ```
- **Tokens Suite**:
  ```sh
  bun x moon run tokens:test
  ```
- **Design System Suite**:
  ```sh
  bun x moon run design-system:test
  ```
- **Single Rust Crate**:
  ```sh
  cargo test -p <crate_name>
  ```
- **All Rust Workspace Tests**:
  ```sh
  bun x moon run root:rust-test
  ```

### 2. Analyze the Failure Output
- Check the exact failure:
  - Did an assertion fail? (`Expected: ..., Received: ...`)
  - Was an element not found by role/name? (Check accessibility markup)
  - Did an unhandled promise or async action timeout?
  - In Rust: did a panic occur or did a Result return an `Err`?

### 3. Formulate the Remediation (PAUSE FOR APPROVAL)
Present your analysis clearly to Angeletti:
```markdown
### Test Failure Diagnosis
- **Test File**: `<path/to/test>`
- **Failing Case**: `<test title>`
- **Root Cause**: `<why the assertion or execution failed>`
- **Proposed Solution**:
  `<detailed diff and explanation>`
```
Ask: *"Would you like me to apply this fix and re-run the tests?"*
**Stop and wait for Angeletti's response.**

### 4. Execute the Fix & Validate
Once approved:
1. Apply the agreed changes.
2. Re-run the targeted test command to verify the fix.
3. If fixing a bug, verify that a regression test case covers the edge case.
4. Run full project check if needed:
   ```sh
   bun run check
   ```
