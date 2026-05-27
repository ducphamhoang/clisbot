---
phase: 05-wizard-foundation
plan: "02"
subsystem: control/setup
tags:
  - wizard
  - tty-guard
  - atomic-write
  - sigint-cleanup
  - daemon-check
dependency_graph:
  requires:
    - src/control/runtime/runtime-process.ts (getRuntimeStatus)
    - src/infra/paths.ts (expandHomePath, getDefaultConfigPath, ensureDir)
    - src/infra/fs.ts (writeTextFile)
  provides:
    - src/control/setup/setup-wizard-utils.ts
  affects:
    - Phase 6 (Flow A) and Phase 7 (Flow B) — both import from setup-wizard-utils.ts
tech_stack:
  added:
    - src/control/setup/ directory (new)
  patterns:
    - temp+rename atomic write (POSIX atomic, T-05-03 mitigation)
    - SIGINT cleanup with stdin.unref() (Bun #21189 mitigation, D-10)
key_files:
  created:
    - src/control/setup/setup-wizard-utils.ts
  modified: []
decisions:
  - "D-01: writeEditableConfigAtomic takes raw text string, not ClisbotConfig; config-file.ts not modified"
  - "D-02: Atomic write uses temp+rename pattern; final path only exists after successful rename"
  - "D-03: SIGINT handler removes orphaned .tmp before exit(130)"
  - "D-08: SIGINT exits with code 130 (POSIX convention)"
  - "D-10: process.stdin.unref() called before exit to mitigate Bun #21189 dangling process bug"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-27T14:11:34Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 05 Plan 02: Setup Wizard Utils Summary

**One-liner:** Atomic config write, TTY guard, daemon check, and SIGINT cleanup — four named exports forming the wizard safety foundation for Phase 6 and 7.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement setup-wizard-utils.ts with all four exports | 6001a55 | src/control/setup/setup-wizard-utils.ts |

## Verification

All 9 tests in `test/setup-wizard-utils.test.ts` pass:
- `ensureTTY`: 2 tests (TTY false → exit(1); TTY true → no exit)
- `ensureDaemonNotRunning`: 2 tests (running → exit(1); not running → resolves)
- `writeEditableConfigAtomic`: 2 tests (writes final, removes .tmp; creates nested parent dirs)
- `withWizardCleanup`: 3 tests (returns result; re-throws errors; removes SIGINT handler after)

TypeScript clean: `bunx tsc --noEmit` exits 0 with no new errors.

`src/config/core/config-file.ts` is unmodified (D-01 satisfied).

## Implementation Details

**ensureTTY:** Checks `process.stdin.isTTY` — falsy triggers `console.error` + `process.exit(1)`.

**ensureDaemonNotRunning:** Delegates to `getRuntimeStatus({ configPath })` — exits(1) if `status.running` is true.

**writeEditableConfigAtomic:** `expandHomePath` → `ensureDir(dirname)` → `writeTextFile(tmp)` → `rename(tmp, final)`. The `.tmp` file is always absent after successful completion.

**withWizardCleanup:** Resolves tmp path from configPath/env/default, installs SIGINT handler before `fn()`, removes handler in `finally`. SIGINT handler: `unlink(tmpPath).catch(() => {})` → `process.stdin.unref()` → `process.exit(130)`.

## Threat Surface

All T-05-03 through T-05-08 mitigations from the threat register are implemented:
- T-05-03: temp+rename atomic write
- T-05-04: ensureDaemonNotRunning guards wizard entry
- T-05-05: ensureTTY rejects non-interactive environments
- T-05-06: stdin.unref() before exit(130)
- T-05-07: unlink(tmpPath).catch(() => {}) in SIGINT handler
- T-05-08: error messages use command names, not internal paths (accepted)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/control/setup/setup-wizard-utils.ts` exists
- [x] 4 named exports present (`grep -c "^export"` returns 4)
- [x] Commit 6001a55 exists in git log
- [x] All 9 tests pass
- [x] TypeScript clean
- [x] config-file.ts unmodified
- [x] No readline import
- [x] `process.stdin.unref()` present
- [x] `process.exit(130)` present
- [x] `rename` import present
