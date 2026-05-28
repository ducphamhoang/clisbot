---
phase: 07-flow-b
plan: 01
subsystem: testing
tags: [bun-test, readline-mock, execSync-mock, tdd, setup-wizard]

# Dependency graph
requires:
  - phase: 06-flow-a-start-change
    provides: setup-channels.test.ts readline mock pattern (mockReadline helper, beforeEach/afterEach structure, console.log capture)
provides:
  - test/control/setup/setup-agent.test.ts with AGTWIZ-01 through AGTWIZ-05 in RED state
  - mockBinaryExists helper for execSync mocking without PATH manipulation
  - TDD gate contract for Wave 1 implementation of runAgentWizard
affects: [07-02, 07-03, 07-04, 07-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - mockBinaryExists: mock.module('node:child_process') with execSync that simulates which-command success or ENOENT failure
    - TDD RED gate: import failure from non-existent src/control/setup/setup-agent.ts prevents all 5 tests from loading

key-files:
  created:
    - test/control/setup/setup-agent.test.ts
  modified: []

key-decisions:
  - "Used Object.assign(new Error(), { code: 'ENOENT' }) for mockBinaryExists to match checkBinaryExists error handling in the to-be-written implementation"
  - "AGTWIZ-01 uses mockReadline(['n']) to abort before binary check — wizard must display channels before any CLI prompt"
  - "AGTWIZ-05 mocks startDetachedRuntime and getRuntimeStatus to prevent real process launch when implementation reaches runtime activation"

patterns-established:
  - "mockBinaryExists pattern: mock.module('node:child_process') with cmd.includes('which <binaryName>') check"

requirements-completed:
  - AGTWIZ-01
  - AGTWIZ-02
  - AGTWIZ-03
  - AGTWIZ-04
  - AGTWIZ-05

# Metrics
duration: 10min
completed: 2026-05-28
---

# Phase 7 Plan 01: Flow B RED Test Scaffold Summary

**5-test RED scaffold for setup-agent wizard using readline+execSync mocks, import-failure RED gate on non-existent setup-agent.ts**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-28T01:09:00Z
- **Completed:** 2026-05-28T01:19:20Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created test/control/setup/setup-agent.test.ts with 5 failing tests (AGTWIZ-01 through AGTWIZ-05)
- Copied readline mock pattern exactly from setup-channels.test.ts (identical FIFO queue structure)
- Added mockBinaryExists helper for execSync mocking — controls binary existence without PATH manipulation
- beforeEach/afterEach mirrors setup-channels.test.ts (env save/restore, temp dir, console.log capture, mock.restore)
- RED state confirmed: import error for src/control/setup/setup-agent.ts is sole failure cause

## Task Commits

Each task was committed atomically:

1. **Task 1: Write RED test scaffold for AGTWIZ-01 through AGTWIZ-05** - `ea12853` (test)

**Plan metadata:** (pending — committed with SUMMARY.md)

## Files Created/Modified

- `test/control/setup/setup-agent.test.ts` — RED test scaffold with 5 AGTWIZ tests, mockReadline and mockBinaryExists helpers

## Decisions Made

- AGTWIZ-01 uses single `mockReadline(['n'])` — wizard must display channel summary before any CLI selection prompt, so 'n' aborts at the first question after the display. No binary mock needed since wizard exits before reaching binary check.
- AGTWIZ-02 orders `mockBinaryExists` before `mockReadline` — mock.module calls must precede the readline mock to avoid ordering issues in Bun's mock registry.
- AGTWIZ-05 mocks both `startDetachedRuntime` and `getRuntimeStatus` to prevent real runtime launch when the implementation reaches the activation step. The `getRuntimeStatus` mock returns `{ running: false }` so the wizard takes the "start runtime" path.
- `mockReadline(['claude', '1', 'n'])` for AGTWIZ-04: CLI='claude' (binary found), bot-type='1' (personal-assistant), then 'n' at channel link or confirm — sufficient to reach the channel display.

## Deviations from Plan

None — plan executed exactly as written. The PATTERNS.md scaffold was followed closely; AGTWIZ-05 mock structure was taken from the plan spec (which adds `getRuntimeStatus` and `ensureConfigFile` mocks matching the CHANWIZ-05 analog pattern).

## Issues Encountered

None.

## Self-Check

- `test/control/setup/setup-agent.test.ts` exists: FOUND
- `ea12853` commit exists: FOUND
- RED state confirmed: `bun test` exits non-zero with "Cannot find module" for setup-agent.ts
- 5 AGTWIZ IDs present: AGTWIZ-01, AGTWIZ-02, AGTWIZ-03, AGTWIZ-04, AGTWIZ-05
- Both helpers present: mockReadline, mockBinaryExists
- Zero tabs in file: CONFIRMED

## Self-Check: PASSED

## Known Stubs

None — this is a test-only file; no production stubs.

## Threat Flags

None — test file introduces no network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Next Phase Readiness

- Wave 1 (07-02) can proceed: implement src/control/setup/setup-agent.ts to turn all 5 tests GREEN
- Contract is clear: runAgentWizard(options?: { configPath?: string }): Promise<void>
- Test responses designed to exercise each wizard step independently

---
*Phase: 07-flow-b*
*Completed: 2026-05-28*
