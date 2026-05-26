---
phase: 01-schema-precondition
plan: 01
subsystem: config
tags: [typescript, zod, agent-tool-presets, schema, runner-service]

# Dependency graph
requires: []
provides:
  - "AgentToolTemplate and ResolvedRunnerTemplate carry newSessionCommand?: string"
  - "DEFAULT_AGENT_TOOL_TEMPLATES declares /new for codex/claude, /clear for gemini"
  - "resolveNewSessionCommand() reads resolved.runner.newSessionCommand with /new fallback"
  - "runnerLaunchSchema, runnerFamilyOverrideSchema, agentRunnerOverrideSchema accept newSessionCommand"
  - "Schema inline defaults propagate newSessionCommand through config parsing pipeline"
affects: [02-pi-runner-template, 03-pi-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-CLI newSessionCommand declared in AgentToolTemplate, flows through buildRunnerFromToolTemplate into ResolvedRunnerTemplate and resolved target"
    - "Schema inline defaults must carry newSessionCommand to avoid undefined in config pipeline"
    - "pruneAgentRunnerOverride field list must include any new runner field to avoid spurious persistence"

key-files:
  created: []
  modified:
    - src/config/runtime/agent-tool-presets.ts
    - src/config/core/schema.ts
    - src/agents/runtime/runner-service.ts
    - src/agents/routing/resolved-target.ts
    - src/config/core/persisted-config.ts
    - test/runner-service.integration.test.ts

key-decisions:
  - "newSessionCommand defaults belong in schema inline defaults (not just runnerFamilySchema.default()) — the agentsDefaultsSchema.default({...}) overrides the field-level schema default"
  - "agentRunnerOverrideSchema also needs newSessionCommand to allow per-agent config overrides and to satisfy TypeScript in resolved-target.ts"
  - "pruneAgentRunnerOverride must include newSessionCommand in its field list — omitting it causes the field to persist in agent JSON config when it equals the CLI family default"

patterns-established:
  - "Runner field lifecycle: AgentToolTemplate -> buildRunnerFromToolTemplate -> ResolvedRunnerTemplate -> resolveAgentTargetInternal runner object -> runner-service consumption"
  - "Schema defaults require synchronization across: runnerFamilySchema.default(), agentsDefaultsSchema inline default, and the second clisbotConfigSchema.default() object"

requirements-completed: [SCHEMA-01]

# Metrics
duration: 75min
completed: 2026-05-26
---

# Phase 01 Plan 01: Schema Precondition Summary

**newSessionCommand field added to AgentToolTemplate, ResolvedRunnerTemplate, and Zod schemas — resolveNewSessionCommand() now reads from template instead of hardcoded gemini ternary**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-05-26T10:00:00Z
- **Completed:** 2026-05-26T11:15:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `AgentToolTemplate` and `ResolvedRunnerTemplate` gain `newSessionCommand?: string`
- `DEFAULT_AGENT_TOOL_TEMPLATES` declares `/new` for codex/claude and `/clear` for gemini
- `resolveNewSessionCommand()` replaces hardcoded gemini ternary with `resolved.runner.newSessionCommand ?? '/new'`
- Zod schemas (`runnerLaunchSchema`, `runnerFamilyOverrideSchema`, `agentRunnerOverrideSchema`) accept `newSessionCommand`
- Schema inline defaults carry `newSessionCommand` through the full config parsing pipeline
- 3 regression tests added to `test/runner-service.integration.test.ts`
- Full test gate: 958 pass, 2 fail (both failures pre-existing, unrelated to this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add newSessionCommand field to types, templates, and Zod schemas** - `c7cfe11` (feat)
2. **Task 2: Update resolveNewSessionCommand() and add test assertions** - `97f6cfa` (feat)

**Plan metadata:** (committed below)

_Note: TDD tasks have test assertions added before implementation (RED/GREEN)_

## Files Created/Modified

- `src/config/runtime/agent-tool-presets.ts` - Added `newSessionCommand?: string` to `AgentToolTemplate` and `ResolvedRunnerTemplate`; set `/new` on codex/claude templates, `/clear` on gemini; passthrough in `buildRunnerFromToolTemplate` both branches
- `src/config/core/schema.ts` - Added `newSessionCommand` to `runnerLaunchSchema`, `runnerFamilyOverrideSchema`, `agentRunnerOverrideSchema`; added `/new`/`/clear` defaults to all 4 schema inline default objects
- `src/agents/runtime/runner-service.ts` - Replaced hardcoded gemini ternary with `resolved.runner.newSessionCommand ?? '/new'`
- `src/agents/routing/resolved-target.ts` - Added `newSessionCommand` passthrough in `resolveAgentTargetInternal` runner object
- `src/config/core/persisted-config.ts` - Added `"newSessionCommand"` to `pruneAgentRunnerOverride` field list
- `test/runner-service.integration.test.ts` - Added `DEFAULT_AGENT_TOOL_TEMPLATES` import and 3 `newSessionCommand defaults` tests

## Decisions Made

- Schema inline defaults must be updated in all 4 locations (2 per `agentsDefaultsSchema` x 2 for the nested `.default({...})`). The `runnerFamilySchema.default({...})` level defaults are shadowed by the outer `agentsDefaultsSchema` inline defaults.
- `agentRunnerOverrideSchema` requires `newSessionCommand` both for TypeScript correctness and to support operators overriding the field per-agent in config JSON.
- `pruneAgentRunnerOverride` field list must include every field in `ResolvedRunnerTemplate` that maps to a per-CLI default — omitting `newSessionCommand` causes it to persist in agent JSON with a spurious non-empty runner object.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Add newSessionCommand to resolveAgentTargetInternal runner object**
- **Found during:** Task 2 (update resolveNewSessionCommand)
- **Issue:** TypeScript error TS2339 — `resolved.runner.newSessionCommand` does not exist because the `runner` object in `resolveAgentTargetInternal` is built inline without the new field
- **Fix:** Added `newSessionCommand: override?.runner?.newSessionCommand ?? runnerFamily.newSessionCommand` to the runner object in `resolved-target.ts`
- **Files modified:** `src/agents/routing/resolved-target.ts`
- **Verification:** `bunx tsc --noEmit` exits 0
- **Committed in:** `97f6cfa`

**2. [Rule 1 - Bug] Add newSessionCommand defaults to schema inline defaults**
- **Found during:** Task 2 (full check run)
- **Issue:** Schema parsed `config.agents.defaults.runner.gemini.newSessionCommand` returned `undefined` because the `agentsDefaultsSchema.default({...})` inline objects override the `runnerFamilySchema.default({..., newSessionCommand: "/clear", ...})` level defaults
- **Fix:** Added `newSessionCommand: "/new"` and `newSessionCommand: "/clear"` to all 4 inline default objects in `schema.ts`
- **Files modified:** `src/config/core/schema.ts`
- **Verification:** Schema parse test shows correct values; no agents-cli regressions
- **Committed in:** `97f6cfa`

**3. [Rule 1 - Bug] Add newSessionCommand to agentRunnerOverrideSchema**
- **Found during:** Task 2 (TypeScript check after resolving blocking issue)
- **Issue:** TypeScript TS2339 — `override?.runner?.newSessionCommand` fails because `agentRunnerOverrideSchema` did not include the field
- **Fix:** Added `newSessionCommand: z.string().min(1).optional()` to `agentRunnerOverrideSchema`
- **Files modified:** `src/config/core/schema.ts`
- **Verification:** `bunx tsc --noEmit` exits 0
- **Committed in:** `97f6cfa`

**4. [Rule 1 - Bug] Add newSessionCommand to pruneAgentRunnerOverride field list**
- **Found during:** Task 2 (agents-cli test failures after full check)
- **Issue:** `pruneAgentRunnerOverride` did not include `"newSessionCommand"` in its field list, causing agents added with codex/claude/gemini to persist `{ newSessionCommand: "/new" }` in config JSON when the field should be pruned as a default value
- **Fix:** Added `"newSessionCommand"` to the field list in `persisted-config.ts`
- **Files modified:** `src/config/core/persisted-config.ts`
- **Verification:** agents-cli tests pass (3 previously failing tests now pass)
- **Committed in:** `97f6cfa`

---

**Total deviations:** 4 auto-fixed (1 blocking, 3 bugs)
**Impact on plan:** All fixes required for correctness. The plan's scope was narrower than the actual integration surface — the field needed to flow through 3 additional files not listed in the plan's `files_modified`. No scope creep.

## Issues Encountered

- Bun's test runner silently skips describe blocks in integration test files when run from a different working directory (worktree root vs project root). Tests confirmed RED in worktree directory context. Pre-existing: zca-js and tmux-runner-latency tests fail unrelated to this plan.

## Known Stubs

None — all fields are wired with real values.

## Threat Flags

None — `newSessionCommand` follows the same trust surface as the existing `command` field (operator-controlled config, no secrets).

## Next Phase Readiness

- Phase 2 (pi runner template) can now declare `newSessionCommand: "/new"` in the pi `AgentToolTemplate` entry
- The schema (`runnerLaunchSchema`, `runnerFamilyOverrideSchema`) accepts `newSessionCommand` for operator config-file overrides of pi's session command
- `resolveNewSessionCommand()` will read pi's declared value without modification

---
*Phase: 01-schema-precondition*
*Completed: 2026-05-26*
