---
phase: 04-pi-review-fixes
plan: "05"
subsystem: runner-service
tags:
  - session-routing
  - crash-recovery
  - pi
  - fix

dependency_graph:
  requires:
    - 04-03
    - 04-04
  provides:
    - triggerNewSession-pi-guard
    - retryFreshStartAfterStoredResumeFailure-widened-gate
  affects:
    - src/agents/runtime/runner-service.ts

tech_stack:
  added: []
  patterns:
    - optional-chaining on sessionId for backward-compatible guard
    - widened union type guard for create.mode

key_files:
  created: []
  modified:
    - src/agents/runtime/runner-service.ts
    - test/runner-service.integration.test.ts

decisions:
  - "Guard condition uses optional chaining (sessionId?.capture.mode) to remain safe when tests mock runner without sessionId"
  - "triggerNewSession guard applies to all runners with capture.mode=off AND create.mode=explicit (both pi and claude); this is correct per architecture — both require restart not live rotation"
  - "Test for 'claude does NOT satisfy guard' corrected to match reality: claude also has capture.mode=off and create.mode=explicit"

metrics:
  duration: "~15min"
  completed: "2026-05-26"
  tasks_completed: 2
  files_modified: 2
---

# Phase 04 Plan 05: triggerNewSession Pi Guard and retryFreshStartAfterStoredResumeFailure Gate — Summary

**One-liner:** Added `skipLiveRotation` guard in `triggerNewSession` to route explicit+off-capture runners directly to restart, and widened `retryFreshStartAfterStoredResumeFailure` gate to preserve pi session IDs on crash recovery.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add TDD tests for Fix 1 and Fix 2 (RED phase) | d918a91 | test/runner-service.integration.test.ts |
| 2 | Implement Fix 1 guard + Fix 2 gate widening (GREEN phase) | e4511c7 | src/agents/runtime/runner-service.ts, test/runner-service.integration.test.ts |

## What Was Built

### Fix 1: triggerNewSession Pi Guard

Added a `skipLiveRotation` guard in `triggerNewSession` (runner-service.ts ~line 822). The guard fires when `resolved.runner.sessionId?.capture.mode === 'off' && resolved.runner.sessionId?.create.mode === 'explicit'`. When true, the function immediately calls `restartRunnerWithFreshSessionIdForNewCommand` without entering `triggerNewSessionInLiveRunner`.

This fixes the `/new` hang for pi: `triggerNewSessionInLiveRunner` calls `captureNewSessionIdentityAfterTrigger` with `forceStatusCommand: true`, which bypasses the `capture.mode: "off"` guard and tries to scrape a session ID from pi using `/status` — a command pi does not have. The timeout error was surfaced to users on every `/new` command.

### Fix 2: retryFreshStartAfterStoredResumeFailure Gate Widening

Changed the gate condition from:
```typescript
resolved.runner.sessionId.create.mode !== "runner"
```
to:
```typescript
resolved.runner.sessionId.create.mode !== 'runner' &&
  resolved.runner.sessionId.create.mode !== 'explicit'
```

This allows pi (and claude) with `create.mode: 'explicit'` to proceed through the crash-recovery path instead of returning null and silently discarding the stored session ID.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test for claude satisfying skipLiveRotation corrected**
- **Found during:** Task 1 (RED phase), test run failure
- **Issue:** The plan's test assumed `claude template does NOT satisfy skipLiveRotation guard` but the claude template has `capture.mode: "off"` and `create.mode: "explicit"` — identical to pi. The guard correctly applies to claude too.
- **Fix:** Changed test to verify that claude DOES satisfy the guard condition (matching reality). Added a separate test for `gemini template does NOT satisfy skipLiveRotation guard` to cover the negative case.
- **Files modified:** test/runner-service.integration.test.ts
- **Commit:** d918a91

**2. [Rule 1 - Bug] Optional chaining needed for sessionId access**
- **Found during:** Task 2, test failure in runner-service.test.ts
- **Issue:** The test file `runner-service.test.ts` passes a minimal mock `runner: { command: "codex" }` without a `sessionId` property. Accessing `resolved.runner.sessionId.capture.mode` threw a TypeError.
- **Fix:** Changed to `resolved.runner.sessionId?.capture.mode` and `resolved.runner.sessionId?.create.mode` using optional chaining. When `sessionId` is undefined, both evaluate to `undefined !== 'off'` → `false`, so the guard does not activate for mocked minimal runners.
- **Files modified:** src/agents/runtime/runner-service.ts
- **Commit:** e4511c7

**3. [Rule 1 - Bug] TypeScript literal comparison errors in gate tests**
- **Found during:** Task 2, typecheck failure
- **Issue:** TypeScript correctly flagged `'unknown-mode' !== 'runner'` and `'off' !== 'command'` as unintentional comparisons since the literals have no overlap.
- **Fix:** Changed `const resumeMode = 'off'` to `const resumeMode: string = 'off'` (and same for createMode) to widen the type and allow the gate logic test.
- **Files modified:** test/runner-service.integration.test.ts
- **Commit:** e4511c7

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `src/agents/runtime/runner-service.ts` — contains `skipLiveRotation` guard at triggerNewSession (line 827-829)
- `src/agents/runtime/runner-service.ts` — contains `create.mode !== 'runner' && create.mode !== 'explicit'` at retryFreshStartAfterStoredResumeFailure gate (lines 353-354)
- Commits d918a91 and e4511c7 exist in git log
- `bun test test/runner-service.integration.test.ts` — 41 pass, 0 fail
- `bunx tsc --noEmit` — 0 errors
- `bun run check` — passes (2 pre-existing failures: zalo-personal, tmux Gemini trust prompt; not caused by this plan)
