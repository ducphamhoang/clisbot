---
phase: 06-flow-a-start-change
plan: "04"
subsystem: control
tags: [cli, bootstrap, startup, runtime, start-command]

# Dependency graph
requires:
  - phase: 06-flow-a-start-change/06-02
    provides: START-01 test stubs in test/startup-bootstrap.test.ts
provides:
  - START-01 warn-and-continue logic in ensureDefaultAgentBootstrap
  - clisbot start with channels but no agent proceeds with warning instead of hard fail
affects:
  - 06-05
  - 07-01
  - phase-8-setup-cli

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "hasChannels guard: check config.bots.{channel}.defaults.enabled before calling hard-fail path"
    - "Warn-and-continue: return true from bootstrap guard to signal continue to caller"

key-files:
  created: []
  modified:
    - src/control/commands/runtime-bootstrap-cli.ts

key-decisions:
  - "Used config.bots.zaloBot (not bots['zalo-bot']) — camelCase is the TypeScript property name in schema"
  - "Warning is output to stdout via console.log (not stderr) matching operator console output convention"
  - "hasChannels condition placed before printMissingBootstrapOptions call so init path falls through unchanged"

patterns-established:
  - "hasChannels guard pattern: check all three channel defaults.enabled booleans before emitting hard-fail"

requirements-completed:
  - START-01

# Metrics
duration: 8min
completed: 2026-05-27
---

# Phase 6 Plan 04: START-01 Warn-and-Continue Summary

**`clisbot start` with at least one channel enabled but no agent now prints a warning and continues instead of hard-failing with the full missing-bootstrap banner**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-27T15:24:00Z
- **Completed:** 2026-05-27T15:32:27Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `hasChannels` guard inside `ensureDefaultAgentBootstrap` that checks `config.bots.{telegram,slack,zaloBot}.defaults.enabled`
- When at least one channel is enabled and no agent exists, prints exact D-13 warning and returns `true` (continue)
- When no channels are enabled and no agent exists, existing `printMissingBootstrapOptions` hard-fail path is unchanged
- `clisbot init` path completely unaffected (guard is inside `commandName === 'start'` branch)
- All 16 tests in `test/startup-bootstrap.test.ts` pass including both new START-01 stubs

## Task Commits

1. **Task 1: Add START-01 warn-and-continue logic to ensureDefaultAgentBootstrap** - `4f3eadf` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/control/commands/runtime-bootstrap-cli.ts` - Added `hasChannels` guard with warn-and-continue in `ensureDefaultAgentBootstrap`, lines ~268–285

## Decisions Made
- The config property for Zalo Bot is `bots.zaloBot` (camelCase), not `bots['zalo-bot']` — the plan's interface comment showed the string key form but TypeScript schema uses camelCase. Fixed after tsc caught the error.
- Warning output goes to `console.log` (stdout), matching the established console output pattern in this file (no logger abstraction).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] config.bots.zaloBot not bots['zalo-bot']**
- **Found during:** Task 1 (implementation)
- **Issue:** Plan's `<interfaces>` block showed `state.config.bots['zalo-bot'].defaults.enabled` but the TypeScript config schema property is `bots.zaloBot.defaults.enabled`. Using `bots['zalo-bot']` caused `TS2551` error.
- **Fix:** Changed `state.config.bots['zalo-bot'].defaults.enabled` to `state.config.bots.zaloBot.defaults.enabled`
- **Files modified:** `src/control/commands/runtime-bootstrap-cli.ts`
- **Verification:** `bunx tsc --noEmit` — no errors for `runtime-bootstrap-cli.ts`; all tests pass
- **Committed in:** `4f3eadf` (same task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in plan's interface reference)
**Impact on plan:** Required for TypeScript correctness. No scope creep. Plan objective unchanged.

## Issues Encountered
- Plan's `<interfaces>` block used the string key notation `bots['zalo-bot']` which does not match the actual camelCase TypeScript property `bots.zaloBot`. Caught immediately by `tsc`. Fixed inline.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The change is a pure conditional guard inside an existing function. T-06-04-01 (unrouted mode only activates when channels ARE configured), T-06-04-02 (init path unchanged), and T-06-04-03 (operator-visible console output only) are all addressed by the implementation as written.

## Known Stubs

None — the warning message is the exact D-13 string and the return value correctly signals continuation to `startDetachedRuntime`.

## Next Phase Readiness
- START-01 is complete; `clisbot start` in channels-only mode will warn and proceed
- `setup-channels.ts` wizard (plans 06-01, 06-02, 06-03) can rely on this behavior after writing config and starting runtime
- Ready for Phase 7 (setup agent) and Phase 8 (setup CLI registration)

---
*Phase: 06-flow-a-start-change*
*Completed: 2026-05-27*
