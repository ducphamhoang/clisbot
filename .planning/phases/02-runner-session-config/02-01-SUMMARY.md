---
phase: 02-runner-session-config
plan: "01"
subsystem: config/runtime
tags: [pi, runner, template, session, active-timer, tdd]
dependency_graph:
  requires: [01-01]
  provides: [pi-runner-template, pi-session-config, pi-active-timer, pi-cli-tool-id]
  affects: [src/config/runtime/agent-tool-presets.ts, src/runners/transcript/transcript-normalization.ts, src/config/core/schema.ts, src/config/core/template.ts, src/channels/message/agent-prompt.ts]
tech_stack:
  added: []
  patterns: [tdd-red-green, template-driven-runner, explicit-session-mode]
key_files:
  created: []
  modified:
    - src/config/runtime/agent-tool-presets.ts
    - src/runners/transcript/transcript-normalization.ts
    - src/config/core/schema.ts
    - src/config/core/template.ts
    - src/channels/message/agent-prompt.ts
    - test/runner-service.integration.test.ts
decisions:
  - "PI_WORKING_STATUS_PATTERN added as separate const — CODEX_WORKING_STATUS_PATTERN requires duration AND interrupt cue, so does not match bare Working..."
  - "agent-prompt.ts cliTool type widened from hardcoded union to AgentCliToolId — required by pi addition"
  - "schema.ts and template.ts both updated with pi runner family defaults — per RESEARCH pitfall 1"
metrics:
  duration: "~30 minutes"
  completed: "2026-05-26"
  tasks_completed: 1
  files_modified: 6
---

# Phase 02 Plan 01: Pi Runner Template Registration Summary

Pi registered as a supported agent CLI tool via explicit session mode template, active timer pattern, and startup ready pattern — following the established codex/claude/gemini template-driven architecture.

## What Was Built

Added pi as a first-class runner in clisbot by extending five existing files:

**`src/config/runtime/agent-tool-presets.ts`**
- Added `"pi"` to `SUPPORTED_AGENT_CLI_TOOLS` (type `AgentCliToolId` now covers pi)
- Added `DEFAULT_AGENT_TOOL_TEMPLATES["pi"]` with: explicit session mode (`--session {uuid}`), capture mode off, startup ready pattern (`escape interrupt`), two startup blockers (no models, tmux extended-keys), `newSessionCommand: "/new"`
- Added `"pi"` case to `inferAgentCliToolId()`

**`src/runners/transcript/transcript-normalization.ts`**
- Added `PI_WORKING_STATUS_PATTERN = /^(?:[•◦·✻✽*]\s*)?Working(?:\.{3}|…)?(?:\s.*)?$/i`
- Wired into `isActiveTimerStatusLine()` — prevents run-monitor from completing a pi run while `Working...` is visible

**`src/config/core/schema.ts`**
- Added `pi: runnerFamilySchema.default({...})` — Zod schema defaults for pi runner family config

**`src/config/core/template.ts`**
- Added pi entry to `renderDefaultConfigTemplate()` — ensures default config JSON includes pi runner section

**`src/channels/message/agent-prompt.ts`**
- Changed `cliTool?: "codex" | "claude" | "gemini"` to `cliTool?: AgentCliToolId` — type now derives from central const

**`test/runner-service.integration.test.ts`**
- Added 15-test `"pi runner template"` describe block covering all plan requirements

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Fixed hardcoded union type in agent-prompt.ts**
- **Found during:** GREEN phase — TypeScript type check after adding pi to SUPPORTED_AGENT_CLI_TOOLS
- **Issue:** `buildAgentPromptText` used `cliTool?: "codex" | "claude" | "gemini"` hardcoded union instead of the central `AgentCliToolId` type. Adding pi to the central const caused type errors in surface-runtime.ts, all channel services (slack, telegram, zalo, zalo-personal)
- **Fix:** Import `AgentCliToolId` from agent-tool-presets.ts and use it as the type — single-source-of-truth, DRY
- **Files modified:** `src/channels/message/agent-prompt.ts`
- **Commit:** d8deb63

**2. [Rule 2 - Missing Critical Functionality] Added pi to schema.ts runner family**
- **Found during:** GREEN phase — TypeScript type check
- **Issue:** `resolved-target.ts` reads `defaults.runner[resolvedCli]` — with `resolvedCli` now able to be `"pi"`, the schema's runner object must have a `pi` key or TypeScript errors at the index access
- **Fix:** Added `pi: runnerFamilySchema.default({...})` to `agentsDefaultsSchema` in schema.ts
- **Files modified:** `src/config/core/schema.ts`
- **Commit:** d8deb63

**3. [Rule 2 - Missing Critical Functionality] Added pi to template.ts default config**
- **Found during:** GREEN phase — identified during schema.ts fix (RESEARCH.md Pitfall 1: must update both schema and template together)
- **Issue:** `renderDefaultConfigTemplate()` produces the initial JSON config file; without a pi runner section, operators starting fresh would not get pi defaults in their config
- **Fix:** Added pi entry (matching agent-tool-presets.ts values) to template.ts runner section
- **Files modified:** `src/config/core/template.ts`
- **Commit:** d8deb63

### TDD Gate Compliance

RED gate: commit `c45335c` — 15 pi tests all failing before implementation  
GREEN gate: commit `d8deb63` — all 15 pi tests passing + 5 file implementation  
REFACTOR gate: not needed — no cleanup required

## Test Results

```
bun test test/runner-service.integration.test.ts
 20 pass  0 fail  31 expect() calls
```

Full suite: 970 pass, 5 fail (all 5 pre-existing flaky tests; 6 were failing on base branch before our changes).

## Verification

```
bunx tsc --noEmit  → exits 0 (no new type errors)
grep -n '"pi"' src/config/runtime/agent-tool-presets.ts
  1: export const SUPPORTED_AGENT_CLI_TOOLS = ["codex", "claude", "gemini", "pi"] as const;
  158: command: "pi",
  295: if (trimmed === "pi") {
  296:   return "pi";
```

## Known Stubs

None — all pi template values are hardcoded in source and wired into the runtime pipeline. No placeholder or TODO patterns introduced.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced by this plan. The pi template values are hardcoded in source — operator cannot inject via config at this layer (T-02-01 accepted, per plan threat model).

## Self-Check: PASSED

- `/home/brewuser/clisbot/.claude/worktrees/agent-af0187e0ad7cf2bdf/src/config/runtime/agent-tool-presets.ts` — FOUND
- `/home/brewuser/clisbot/.claude/worktrees/agent-af0187e0ad7cf2bdf/src/runners/transcript/transcript-normalization.ts` — FOUND
- `/home/brewuser/clisbot/.claude/worktrees/agent-af0187e0ad7cf2bdf/src/config/core/schema.ts` — FOUND
- `/home/brewuser/clisbot/.claude/worktrees/agent-af0187e0ad7cf2bdf/src/config/core/template.ts` — FOUND
- `/home/brewuser/clisbot/.claude/worktrees/agent-af0187e0ad7cf2bdf/src/channels/message/agent-prompt.ts` — FOUND
- `/home/brewuser/clisbot/.claude/worktrees/agent-af0187e0ad7cf2bdf/test/runner-service.integration.test.ts` — FOUND
- Commit `c45335c` (RED) — FOUND
- Commit `d8deb63` (GREEN) — FOUND
