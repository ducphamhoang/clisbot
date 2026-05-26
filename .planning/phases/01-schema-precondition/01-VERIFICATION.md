---
phase: 01-schema-precondition
verified: 2026-05-26T11:33:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
---

# Phase 1: Schema Precondition Verification Report

**Phase Goal:** `AgentToolTemplate` supports a `newSessionCommand` field so pi (and future CLIs) never receive a hardcoded `/new` as a literal prompt
**Verified:** 2026-05-26T11:33:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `AgentToolTemplate` has a `newSessionCommand?: string` field | VERIFIED | `agent-tool-presets.ts` line 20 |
| 2 | `ResolvedRunnerTemplate` carries `newSessionCommand?: string` | VERIFIED | `agent-tool-presets.ts` line 169 |
| 3 | `resolveNewSessionCommand()` reads `resolved.runner.newSessionCommand` with `/new` fallback | VERIFIED | `runner-service.ts` line 969: `resolved.runner.newSessionCommand ?? '/new'`; no `includes("gemini")` present |
| 4 | codex and claude templates declare `newSessionCommand: '/new'` | VERIFIED | `agent-tool-presets.ts` lines 58 (codex) and 92 (claude) |
| 5 | gemini template declares `newSessionCommand: '/clear'` | VERIFIED | `agent-tool-presets.ts` line 138 |
| 6 | Existing codex, claude, and gemini session-rotation behavior is unchanged | VERIFIED | `bun test test/runner-service.integration.test.ts`: 5/5 pass; `bunx tsc --noEmit`: exits 0 |
| 7 | `runnerLaunchSchema` and `runnerFamilyOverrideSchema` in schema.ts both accept `newSessionCommand` | VERIFIED | `schema.ts` line 74 (`runnerLaunchSchema`), line 148 (`runnerFamilyOverrideSchema`); also `agentRunnerOverrideSchema` at line 334 (deviation-fix, additive) |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/config/runtime/agent-tool-presets.ts` | `newSessionCommand?: string` in type + templates + `ResolvedRunnerTemplate` + both `buildRunnerFromToolTemplate` return paths | VERIFIED | 7 occurrences: type (line 20), codex (58), claude (92), gemini (138), `ResolvedRunnerTemplate` (169), codex branch passthrough (191), default branch passthrough (219) |
| `src/config/core/schema.ts` | `newSessionCommand: z.string().min(1).optional()` in `runnerLaunchSchema` and `runnerFamilyOverrideSchema` | VERIFIED | 3 schema occurrences (lines 74, 148, 334) plus 6 inline default occurrences confirming config pipeline propagation |
| `src/agents/runtime/runner-service.ts` | `resolved.runner.newSessionCommand ?? '/new'` replacing hardcoded ternary | VERIFIED | Line 969; zero occurrences of `includes.*gemini` in file |
| `test/runner-service.integration.test.ts` | 3 `newSessionCommand defaults` tests | VERIFIED | Lines 94-105; all 3 tests pass |

**Deviation-discovered files (not in plan, required for correctness):**

| File | Change | Status |
|------|--------|--------|
| `src/agents/routing/resolved-target.ts` | `newSessionCommand` passthrough in `resolveAgentTargetInternal` runner object (lines 114-116) | VERIFIED — required to satisfy TypeScript and propagate field to runner-service |
| `src/config/core/persisted-config.ts` | `"newSessionCommand"` added to `pruneAgentRunnerOverride` field list (line 124) | VERIFIED — prevents spurious field persistence in agent JSON config |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `agent-tool-presets.ts` | `runner-service.ts` | `ResolvedRunnerTemplate.newSessionCommand` read by `resolveNewSessionCommand()` | WIRED | `resolved.runner.newSessionCommand` at runner-service.ts:969; field present on `ResolvedRunnerTemplate` at agent-tool-presets.ts:169 |
| `schema.ts` | `agent-tool-presets.ts` | `runnerLaunchSchema` parsed config overlaid onto `DEFAULT_AGENT_TOOL_TEMPLATES` at runtime | WIRED | `newSessionCommand: z.string().min(1).optional()` present in `runnerLaunchSchema` (line 74); inline defaults in schema propagate correct values through config pipeline |
| `resolved-target.ts` | `runner-service.ts` | `resolveAgentTargetInternal` runner object carries `newSessionCommand` from override or family default | WIRED | Lines 114-116 of `resolved-target.ts`: `newSessionCommand: override?.runner?.newSessionCommand ?? runnerFamily.newSessionCommand` |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces schema/config artifacts, not UI components or data-rendering paths. The field flows through a config resolution pipeline, fully verified by type check and unit assertions.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| No type errors introduced | `bunx tsc --noEmit` | exits 0, no output | PASS |
| 3 new `newSessionCommand defaults` tests pass | `bun test test/runner-service.integration.test.ts` | 5 pass, 0 fail | PASS |
| Hardcoded gemini ternary removed | `grep -c "includes.*gemini" runner-service.ts` | 0 | PASS |
| codex template value | grep `newSessionCommand` in presets | `'/new'` at line 58 | PASS |
| claude template value | grep `newSessionCommand` in presets | `'/new'` at line 92 | PASS |
| gemini template value | grep `newSessionCommand` in presets | `'/clear'` at line 138 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCHEMA-01 | 01-01-PLAN.md | `AgentToolTemplate` has a `newSessionCommand` field (optional string, defaults to `"/new"`) so pi (and future CLIs) can declare their own session-rotation command | SATISFIED | Field present in type, templates, resolved type, Zod schemas, and runtime resolution; tests confirm values; tsc confirms type safety |

No orphaned requirements for Phase 1 — traceability table in REQUIREMENTS.md assigns only SCHEMA-01 to Phase 1.

### Anti-Patterns Found

None. No stubs, TODOs, FIXMEs, empty returns, or placeholder comments found in any modified file. The hardcoded gemini ternary has been fully replaced — zero residual occurrences.

### Human Verification Required

None. All must-haves are verifiable programmatically. Type check passes, tests pass, field presence confirmed at all required code locations.

### Gaps Summary

No gaps. All 7 observable truths are verified. SCHEMA-01 is fully satisfied. The implementation is complete and wired end-to-end:

- The field is declared in the TypeScript type (`AgentToolTemplate`), carried through `buildRunnerFromToolTemplate` in both branches, present on `ResolvedRunnerTemplate`, propagated by `resolveAgentTargetInternal`, and consumed by `resolveNewSessionCommand()`.
- The Zod schema accepts the field in three schema objects (`runnerLaunchSchema`, `runnerFamilyOverrideSchema`, `agentRunnerOverrideSchema`) with inline defaults propagating correct values through the full config parsing pipeline.
- The pruning logic in `persisted-config.ts` includes the field so it does not persist spuriously in agent JSON.
- Three regression tests assert exact field values for codex, claude, and gemini templates. All pass.

Phase 2 (pi runner template) has a complete, type-safe schema foundation to declare `newSessionCommand` without any further schema work.

---

_Verified: 2026-05-26T11:33:00Z_
_Verifier: Claude (gsd-verifier)_
