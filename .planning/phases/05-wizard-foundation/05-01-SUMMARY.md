---
phase: 05-wizard-foundation
plan: 01
subsystem: testing
tags: [bun-test, tdd, setup-wizard, process-exit, sigint, atomic-write]

requires: []
provides:
  - Failing test scaffold defining the interface contract for all four wizard utilities
  - Four describe blocks covering ensureTTY, ensureDaemonNotRunning, writeEditableConfigAtomic, withWizardCleanup
  - Nine RED-state test cases that Plan 02 must make pass
affects:
  - 05-02 (implementation plan reads this file to understand exact function signatures and expected behavior)

tech-stack:
  added: []
  patterns:
    - "Bun test mock.module() pattern for mocking getRuntimeStatus in unit tests"
    - "Object.defineProperty for mocking process.stdin.isTTY per test"
    - "spyOn(process, 'exit').mockImplementation(() => { throw }) to intercept exit calls in tests"

key-files:
  created:
    - test/setup-wizard-utils.test.ts
  modified: []

key-decisions:
  - "Mock process.exit by throwing — allows tests to assert exit code without process actually terminating"
  - "Use mock.module() for getRuntimeStatus isolation — avoids real filesystem/PID reads in unit tests"
  - "Use real filesystem for writeEditableConfigAtomic tests (no mock) — exercises actual atomic write behavior in isolation"
  - "Test SIGINT listener count before/after withWizardCleanup to verify handler is installed then removed"

patterns-established:
  - "TDD RED scaffold: test file imports from not-yet-created path, fails with Cannot find module"
  - "RuntimeStatus stub: minimal object with running boolean + required string fields for type safety"

requirements-completed:
  - FOUND-01
  - FOUND-02
  - FOUND-04
  - FOUND-05
  - FOUND-06

duration: 1min
completed: 2026-05-27
---

# Phase 5 Plan 01: Wizard Foundation Utilities — Test Scaffold Summary

**Nine-test RED scaffold defining ensureTTY, ensureDaemonNotRunning, writeEditableConfigAtomic, and withWizardCleanup interface contracts via failing Bun tests**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-27T14:07:26Z
- **Completed:** 2026-05-27T14:08:13Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `test/setup-wizard-utils.test.ts` with four describe blocks and nine test cases covering all four wizard utilities
- Confirmed RED state: `bun test test/setup-wizard-utils.test.ts` fails with `Cannot find module '../src/control/setup/setup-wizard-utils.ts'`
- Established interface contracts for Plan 02 to implement: function signatures, expected process.exit codes, atomic write filesystem behavior, SIGINT listener lifecycle

## Task Commits

1. **Task 1: Write failing test scaffold for all four wizard utilities** - `787b54e` (test)

**Plan metadata:** (committed below as docs commit)

## Files Created/Modified
- `test/setup-wizard-utils.test.ts` — Bun test scaffold with nine failing tests for all four Phase 5 utilities; imports from not-yet-created src/control/setup/setup-wizard-utils.ts

## Decisions Made
- Mocking `process.exit` via `spyOn().mockImplementation(() => { throw new Error(...) })` so test bodies halt on exit without terminating the test process
- Used `mock.module()` for `getRuntimeStatus` to avoid filesystem/PID reads; `mock.restore()` in afterEach to prevent test pollution
- Real filesystem for `writeEditableConfigAtomic` tests — no mocking needed since the function is deterministic and tmpdir provides isolation
- SIGINT listener count test uses `process.listenerCount('SIGINT')` before and after — clean and non-invasive

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (implementation) can immediately read this test file to understand exact function signatures and behavior expectations
- Nine test cases are RED — all will turn GREEN when Plan 02 creates `src/control/setup/setup-wizard-utils.ts`
- No blockers

---
*Phase: 05-wizard-foundation*
*Completed: 2026-05-27*
