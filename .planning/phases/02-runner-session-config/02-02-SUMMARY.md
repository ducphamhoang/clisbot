---
phase: 02-runner-session-config
plan: "02"
subsystem: config/core
tags: [pi, runner, schema, template, tdd]
dependency_graph:
  requires: [02-01]
  provides: [pi-schema-defaults, pi-config-template]
  affects: [src/config/core/schema.ts, src/config/core/template.ts, test/runner-service.integration.test.ts]
tech_stack:
  added: []
  patterns: [tdd-green-on-arrival, schema-defaults, template-driven-config]
key_files:
  created: []
  modified:
    - test/runner-service.integration.test.ts
decisions:
  - "pi schema defaults and template entry were already implemented in plan 01 as Rule 2 auto-fixes; plan 02 added the Zod schema parse path tests"
  - "Test uses parsedWithoutPiOverrides() helper (removes pi key from template output) to exercise the schema default path, not the template merge path"
  - "newSessionCommand only returns '/new' via schema default path (pi key absent); template output has minimal pi block without newSessionCommand by design"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-26"
  tasks_completed: 2
  files_modified: 1
---

# Phase 02 Plan 02: Pi Schema and Template Defaults Summary

Pi runner Zod schema defaults and default config template entry verified via targeted test suite — closing SCHEMA-02 with complete parse-path coverage.

## What Was Built

**Plan 02 context:** Both `src/config/core/schema.ts` and `src/config/core/template.ts` were already updated with pi runner entries in plan 01 (commits `d8deb63`) as Rule 2 auto-fixes required by TypeScript correctness. Plan 02's work was therefore the verification layer: a focused test block that exercises the `clisbotConfigSchema.parse()` default path for pi.

**`test/runner-service.integration.test.ts`** (1c32235)
- Added `'pi schema defaults'` describe block (6 tests)
- Tests call `clisbotConfigSchema.parse()` with the pi key removed from input — exercises the Zod `.default({...})` path in `agentsDefaultsSchema.runner.pi`
- Asserts: `command === "pi"`, `sessionId.create.mode === "explicit"`, `sessionId.capture.mode === "off"`, `create.args === ["--session", "{sessionId}"]`, `newSessionCommand === "/new"`, `resume.mode === "command"`
- Helper `parsedWithoutPiOverrides()` deletes the pi key from template output before parse — ensures schema default path (not template merge path) is exercised

**`src/config/core/schema.ts`** (already present from 02-01 commit d8deb63)
- `pi: runnerFamilySchema.default({...})` in `agentsDefaultsSchema.runner`
- Full pi defaults: command, args, startupDelayMs, startupReadyPattern, startupRetryCount, startupRetryDelayMs, startupBlockers (2), promptSubmitDelayMs, newSessionCommand, sessionId (create/capture/resume)

**`src/config/core/template.ts`** (already present from 02-01 commit d8deb63)
- pi entry in `renderDefaultConfigTemplate()` runner section
- Minimal template: command, args, sessionId (create/capture/resume) — no startupReadyPattern/startupBlockers per template design

## Deviations from Plan

### Pre-completed Implementation (Not a Deviation — Plan Design)

Plan 02 specified adding pi to schema.ts and template.ts. Plan 01 completed this work as Rule 2 auto-fixes (TypeScript required the pi key in the runner object once `AgentCliToolId` included "pi"). The implementation matched plan 02's exact specification.

**Effect on plan 02 execution:** Task 1 (schema.ts) and Task 2 (template.ts) had no new code changes — only test additions for Task 1.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test using clisbotConfigSchema.parse({}) directly**
- **Found during:** Task 1 test writing
- **Issue:** `clisbotConfigSchema.parse({})` throws ZodError because `bots` is required — the plan's suggested call was not directly usable
- **Fix:** Use template output as base config with pi key deleted — correctly exercises the schema default path while satisfying all required preconditions
- **Files modified:** `test/runner-service.integration.test.ts`
- **Commit:** 1c32235

### TDD Gate Compliance

Note: This plan is `tdd="true"` but the implementation pre-existed (from plan 01). RED phase was not possible since schema.ts/template.ts already had correct pi entries. Tests were written and passed immediately (GREEN on first run).

- RED gate: not applicable (implementation pre-existed)
- GREEN gate: commit `1c32235` — all 6 pi schema default tests passing

## Test Results

```
bun test test/runner-service.integration.test.ts (worktree)
 26 pass  0 fail  38 expect() calls

bun test (full suite)
 976 pass  5 fail  3390 expect() calls
 5 failures are pre-existing flaky tests (same as plan 01 baseline)
```

## Verification

```
bunx tsc --noEmit  → exits 0
grep -n '"pi"' src/config/core/schema.ts  → line 491: command: "pi"
grep -n '"pi"' src/config/core/template.ts  → line 258: command: "pi"
renderDefaultConfigTemplate() output includes "pi" runner block  → confirmed
clisbotConfigSchema.parse() without pi key returns pi defaults  → all 6 tests pass
```

## Known Stubs

None.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. This plan added test coverage only; the schema and template changes were committed in plan 01.

## Self-Check: PASSED

- `/home/brewuser/clisbot/.claude/worktrees/agent-a29c786e351080bd9/src/config/core/schema.ts` pi entry — FOUND (line 491)
- `/home/brewuser/clisbot/.claude/worktrees/agent-a29c786e351080bd9/src/config/core/template.ts` pi entry — FOUND (line 258)
- `/home/brewuser/clisbot/.claude/worktrees/agent-a29c786e351080bd9/test/runner-service.integration.test.ts` pi schema defaults block — FOUND
- Commit `1c32235` (pi schema defaults tests) — verified via git log
