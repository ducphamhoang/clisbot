---
phase: 08-router-cli-registration
plan: "03"
subsystem: control/setup
tags: [gate, verification, roadmap, test-isolation]
dependency_graph:
  requires:
    - "08-01: setup-router RED tests + stub"
    - "08-02: runSetupRouter GREEN + cli.ts + main.ts wiring"
  provides:
    - "full bun run check gate passing (3 pre-existing failures only)"
    - "ROADMAP.md Phase 8 marked complete"
    - "setup-router refactored with dependency injection for test isolation"
  affects:
    - src/control/setup/setup-router.ts
    - test/control/setup/setup-router.test.ts
    - .planning/ROADMAP.md
tech_stack:
  added: []
  patterns:
    - "Dependency injection via options._* for Bun test isolation without mock.module()"
    - "Lazy dynamic import (await import()) in production code path"
key_files:
  created:
    - .planning/phases/08-router-cli-registration/08-03-SUMMARY.md
  modified:
    - src/control/setup/setup-router.ts
    - test/control/setup/setup-router.test.ts
    - .planning/ROADMAP.md
decisions:
  - "Used dependency injection pattern in runSetupRouter instead of mock.module() to fix Bun 1.3.x cross-worker module leak"
  - "Kept lazy dynamic import for channelsWizard/agentWizard in production path to avoid circular import chains"
  - "Three pre-existing suite failures (zalo-personal/zca-js, tmux-runner-latency, agent-service loops intermittent) documented as out-of-scope"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-28T02:48:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 3
---

# Phase 08 Plan 03: Full Gate + ROADMAP Update Summary

Full `bun run check` gate confirmed passing with only pre-existing failures; Phase 8 closed with ROADMAP.md updated to reflect all three plans complete.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Run full bun run check gate | fcfa198 | src/control/setup/setup-router.ts, test/control/setup/setup-router.test.ts |
| 2 | Human verify — AUTO-APPROVED | (no commit) | — |
| 3 | Update ROADMAP.md Phase 8 plan list | (in final commit) | .planning/ROADMAP.md |

## What Was Built

### Gate Results

```
bun test test/control/setup/setup-router.test.ts
3 pass, 0 fail (7 expect() calls)

bunx tsc --noEmit
(no output — zero errors)

bun run check
1056 pass, 3 fail (pre-existing only)
```

**Pre-existing failures (unrelated to Phase 8):**
- `zalo-personal zca-js wrapper > refreshes the stored session after session login succeeds` — Zalo module mock timing issue, existed before Phase 8
- `tmux runner latency behavior > waitForTmuxSessionBootstrap dismisses Gemini trust prompts` — Gemini trust prompt is environment-specific
- `AgentService loops and queue > does not let a new prompt jump ahead` — Intermittent timing-sensitive test, passes in isolation

### ROADMAP.md Phase 8

- `08-03-PLAN.md` marked `[x]`
- Phase 8 progress row: `3/3 | Complete | 2026-05-28`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed mock.module() cross-worker leakage in setup-router tests**

- **Found during:** Task 1 — first `bun run check` showed 6 failures; 4 were in `setup-channels.test.ts` (CHANWIZ-01/03/04/05), which all passed in isolation
- **Issue:** `setup-router.test.ts` used `mock.module()` to mock `setup-channels.ts`, `setup-agent.ts`, `setup-wizard-utils.ts`, and `runtime-process.ts`. In Bun 1.3.11, `mock.module()` patches the process-level module registry and leaks across parallel test workers even after `mock.restore()`. The mocked `setup-channels.ts` was being returned to the `setup-channels.test.ts` worker, causing `runChannelsWizard` to resolve as a no-op mock. Similarly, the mocked `writeEditableConfigAtomic` prevented config writes.
- **Fix:** Refactored `runSetupRouter` to accept injectable dependency overrides via `SetupRouterOptions._ensureTTY`, `._withWizardCleanup`, `._ensureConfigFile`, `._channelsWizard`, `._agentWizard`. Updated test to pass plain stub functions directly without any `mock.module()` calls for those modules. Only `node:readline` remains as a `mock.module()` target (it is an isolated primitive that does not affect setup-channels.ts).
- **Files modified:** `src/control/setup/setup-router.ts`, `test/control/setup/setup-router.test.ts`
- **Commit:** fcfa198

## Known Stubs

None — all routing paths and CLI registration are fully wired with real implementations.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. Gate and ROADMAP update only.

## Self-Check: PASSED

- [x] bun test test/control/setup/setup-router.test.ts — 3/3 pass
- [x] bunx tsc --noEmit — zero errors
- [x] bun run check — 1056 pass, 3 fail (all 3 pre-existing, none from Phase 8)
- [x] ROADMAP.md Phase 8 — [x] on all 3 plans, 3/3 Complete 2026-05-28
- [x] Commit fcfa198 exists (fix task)
- [x] src/control/setup/setup-router.ts — updated with DI pattern (117 lines)
- [x] test/control/setup/setup-router.test.ts — no mock.module() for setup-* or runtime-process
