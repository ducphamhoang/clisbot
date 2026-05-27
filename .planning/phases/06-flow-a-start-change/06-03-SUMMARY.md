---
phase: 06-flow-a-start-change
plan: "03"
subsystem: control/setup
tags:
  - wizard
  - readline
  - token-masking
  - tdd
dependency_graph:
  requires:
    - "06-01"
  provides:
    - promptMasked export in setup-wizard-utils.ts
  affects:
    - src/control/setup/setup-wizard-utils.ts
tech_stack:
  added: []
  patterns:
    - readline _writeToOutput monkey-patch for terminal masking
key_files:
  modified:
    - src/control/setup/setup-wizard-utils.ts
    - test/setup-wizard-utils.test.ts
decisions:
  - D-01: _writeToOutput monkey-patch used — no raw stdin mode
  - D-02: asterisks shown per character — operator sees *** as they type
  - D-03: function signature promptMasked(rl Interface, question string) Promise<string>
  - Import is from node:readline/promises (not node:readline) — the /promises variant has async question()
metrics:
  duration: "15m"
  completed: "2026-05-27T15:33:41Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 2
---

# Phase 06 Plan 03: promptMasked Implementation Summary

**One-liner:** Added `promptMasked` to `setup-wizard-utils.ts` using readline `_writeToOutput` monkey-patch to show asterisks per keystroke while collecting sensitive token input.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing tests for promptMasked | 373b81d | test/setup-wizard-utils.test.ts |
| GREEN | Implement promptMasked | 4fe22a7 | src/control/setup/setup-wizard-utils.ts |

## Implementation Details

`promptMasked` was appended to `setup-wizard-utils.ts` after `withWizardCleanup`. The import was added as `import type { Interface } from 'node:readline/promises'` — the `/promises` variant is required because it exposes the async `question()` method.

The implementation:
1. Captures the original `_writeToOutput` before overriding
2. Replaces it with a function that writes `*` for any non-empty, non-newline string
3. Passes `\n` and `\r\n` through unchanged (so Enter key works normally)
4. Restores the original in a `finally` block — safe for multiple calls per wizard session

## TDD Gate Compliance

- RED gate commit: `373b81d` — `test(06-03): add failing tests for promptMasked`
- GREEN gate commit: `4fe22a7` — `feat(06-03): implement promptMasked in setup-wizard-utils`
- REFACTOR: not needed — implementation is 22 lines, clean, no duplication

## Test Results

14 tests pass in `test/setup-wizard-utils.test.ts`:
- 9 pre-existing Phase 5 tests (unchanged)
- 5 new promptMasked tests: returns real answer, asterisk replacement, newline passthrough, restore on success, restore on error

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed import path for readline Interface type**
- **Found during:** GREEN — TypeScript errors at line 82
- **Issue:** Plan specified `import type { Interface } from 'node:readline'`. The `node:readline` module's `Interface.question()` has a callback-based signature returning `void`, not `Promise<string>`. TypeScript reported TS2322 and TS2554.
- **Fix:** Changed to `import type { Interface } from 'node:readline/promises'` — this module's `Interface` has the async `question(): Promise<string>` signature matching the implementation.
- **Files modified:** `src/control/setup/setup-wizard-utils.ts`
- **Commit:** `4fe22a7`

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `_writeToOutput` monkey-patch operates entirely in-process on terminal echo only. Token value never written to stdout/stderr. Restore in `finally` block per T-06-03-03 mitigation.

## Self-Check: PASSED

- `src/control/setup/setup-wizard-utils.ts` — FOUND
- `test/setup-wizard-utils.test.ts` — FOUND
- RED commit 373b81d — FOUND
- GREEN commit 4fe22a7 — FOUND
- 14 tests pass — CONFIRMED
- TypeScript: no errors in setup-wizard-utils.ts — CONFIRMED
