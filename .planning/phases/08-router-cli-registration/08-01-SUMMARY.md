---
phase: 08-router-cli-registration
plan: "01"
subsystem: control/setup
tags: [tdd, red-state, setup-router, wave-1]
dependency_graph:
  requires: []
  provides:
    - test/control/setup/setup-router.test.ts
    - src/control/setup/setup-router.ts
  affects: []
tech_stack:
  added: []
  patterns:
    - bun:test mock.module for wizard isolation
    - queue-based mockReadline helper (FIFO, async callback)
    - writeConfig helper for minimal JSON config setup
key_files:
  created:
    - test/control/setup/setup-router.test.ts
    - src/control/setup/setup-router.ts
  modified: []
decisions:
  - mockWizards defined inside describe block so logOutput closure captures the correct array reference
  - All GREEN-phase imports pre-declared in stub to avoid circular refactor later
  - void-cast pattern used for unused imports to satisfy TypeScript without removing them
metrics:
  duration: "~5 minutes"
  completed: "2026-05-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 08 Plan 01: Setup Router RED Scaffold Summary

Wave 1 RED state established: three failing tests for the setup-router dispatch contract (ROUTER-01/02/03) plus a minimal stub that compiles but throws.

## What Was Built

**test/control/setup/setup-router.test.ts** — 3 RED tests covering all router dispatch paths:
- ROUTER-01: no config file present → expects `runChannelsWizard` called, not `runAgentWizard`
- ROUTER-02: config with `telegram.defaults.enabled=true`, empty agents list → expects `Channels configured` log and `runAgentWizard` called
- ROUTER-03: config with both channels and agents configured, readline responds `'2'` → expects `Current configuration` log and `runAgentWizard` called

**src/control/setup/setup-router.ts** — minimal stub that:
- exports `runSetupRouter(options?: { configPath?: string }): Promise<void>`
- throws `Error('not implemented')` so tests fail at runtime rather than passing accidentally
- pre-declares all imports needed for GREEN phase (no refactor needed in plan 02)

## Test Results (RED State Confirmed)

```
 0 pass
 3 fail
Ran 3 tests across 1 file.
```

All 3 failures: `error: not implemented` from `runSetupRouter` — not import or compile errors.

## TypeScript

`bunx tsc --noEmit` — zero errors.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 - RED test scaffold | 9e85d34 | test(08-01): add RED test scaffold for setup-router (ROUTER-01/02/03) |
| 2 - stub | f95a374 | feat(08-01): add runSetupRouter stub — RED state, throws not implemented |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Pattern | Reason |
|------|---------|--------|
| src/control/setup/setup-router.ts | `throw new Error('not implemented')` | Intentional RED state; GREEN implementation comes in plan 02 |

## Threat Flags

None — no new network endpoints, auth paths, file access, or schema changes introduced. Test-only scope.

## Self-Check: PASSED

- [x] test/control/setup/setup-router.test.ts exists (159 lines)
- [x] src/control/setup/setup-router.ts exists (31 lines)
- [x] Commit 9e85d34 exists (test scaffold)
- [x] Commit f95a374 exists (stub)
- [x] 3 tests, 0 pass, 3 fail — RED state confirmed
- [x] Zero TypeScript errors
