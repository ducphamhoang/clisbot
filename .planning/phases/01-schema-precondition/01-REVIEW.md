---
phase: 01-schema-precondition
reviewed: 2026-05-26T11:30:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/config/runtime/agent-tool-presets.ts
  - src/config/core/schema.ts
  - src/agents/runtime/runner-service.ts
  - src/agents/routing/resolved-target.ts
  - src/config/core/persisted-config.ts
  - test/runner-service.integration.test.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-26T11:30:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 1 adds `newSessionCommand` as a first-class schema field across `AgentToolTemplate`, `ResolvedRunnerTemplate`, three Zod schemas, the resolved-target builder, and the pruner. The approach is correct and consistent: all three CLI families declare their commands in templates and in schema defaults, the field flows cleanly through the override resolution chain, and the old CLI-name heuristic in `resolveNewSessionCommand` is replaced with a data-driven read.

One warning: the new unit tests only assert against `DEFAULT_AGENT_TOOL_TEMPLATES` directly. They do not exercise the config-to-resolved pipeline, so a regression in `resolveAgentTargetInternal` (e.g., dropping the field from the runner object) would not be caught by these tests. Two info items cover a redundant fallback and a minor import quote inconsistency.

No critical issues. No security or correctness bugs introduced.

---

## Warnings

### WR-01: New tests do not cover the resolved-target propagation path

**File:** `test/runner-service.integration.test.ts:94-106`

**Issue:** The three new tests assert `DEFAULT_AGENT_TOOL_TEMPLATES.{cli}.newSessionCommand` directly. They confirm the constant values but do not verify that `resolveAgentTarget` (or the schema parse path) propagates `newSessionCommand` into the resolved runner object. If `newSessionCommand` were accidentally dropped from the `runner` object in `resolveAgentTargetInternal` (e.g., a merge conflict in `resolved-target.ts`), all three new tests would still pass, and `resolveNewSessionCommand` would silently fall back to `'/new'` for gemini users.

**Fix:** Add an assertion that checks the resolved runner's `newSessionCommand` through the standard config path. This can be lightweight — no tmux required:

```typescript
test('resolveAgentTarget propagates gemini newSessionCommand from schema defaults', () => {
  const config = clisbotConfigSchema.parse({})
  const loaded = { raw: config, /* ... minimal LoadedConfig */ }
  const resolved = resolveAgentTarget(loaded, { agentId: 'default', sessionKey: 'test' })
  // default cli is codex, so set cli to gemini via a per-agent override or change defaults.cli
  expect(resolved.runner.newSessionCommand).toBe('/new') // codex default
})
```

Or more directly, use the existing `createConfig` helper to build a gemini-targeting agent entry and assert `resolved.runner.newSessionCommand === '/clear'` through `resolveAgentTarget`. The key gap is that the resolved-target code path is untested for this field.

---

## Info

### IN-01: Redundant `?? '/new'` fallback in `resolveNewSessionCommand`

**File:** `src/agents/runtime/runner-service.ts:969`

**Issue:** The fallback `?? '/new'` is unreachable for all currently supported CLIs. All three CLI families (`codex`, `claude`, `gemini`) now unconditionally set `newSessionCommand` in their templates and schema defaults. The resolution chain in `resolveAgentTargetInternal` is `override?.runner?.newSessionCommand ?? runnerFamily.newSessionCommand`, and `runnerFamily` is always one of the three known families. So `resolved.runner.newSessionCommand` is never `undefined` in practice. The fallback would only fire for a hypothetical future fourth CLI that omits `newSessionCommand` from its template — and in that case the silent default of `'/new'` could mask a configuration error.

**Fix:** Either remove the fallback and let TypeScript enforce that callers of `resolveNewSessionCommand` always have the field set, or document the intent:

```typescript
// Option A: remove fallback, rely on types (requires making field non-optional on ResolvedRunnerTemplate)
private resolveNewSessionCommand(resolved: ResolvedAgentTarget) {
  return resolved.runner.newSessionCommand
}

// Option B: keep fallback but make the intent explicit
private resolveNewSessionCommand(resolved: ResolvedAgentTarget) {
  // Fallback covers custom CLI tools not registered in DEFAULT_AGENT_TOOL_TEMPLATES.
  return resolved.runner.newSessionCommand ?? '/new'
}
```

Option A is cleaner if `newSessionCommand` is required for all supported tools. Option B is acceptable if the field should remain optional for forward compatibility with custom CLIs. A comment on the fallback branch would make the intent unambiguous.

---

### IN-02: New import in test file uses single quotes while surrounding imports use double quotes

**File:** `test/runner-service.integration.test.ts:14`

**Issue:** The import added in this phase uses single quotes:
```typescript
import { DEFAULT_AGENT_TOOL_TEMPLATES } from '../src/config/runtime/agent-tool-presets.ts'
```
All 13 pre-existing imports in the same file use double quotes. Per CLAUDE.md, single quotes are the project standard — so the new line is technically correct, but it creates a visual inconsistency with its neighbors. The pre-existing imports carry the original inconsistency from upstream; this PR did not introduce them.

**Fix:** Either update the new import to match the surrounding file style (double quotes, for local consistency until the whole file is normalized), or leave as-is and accept the mix until a lint pass normalises the file. No functional impact either way.

---

_Reviewed: 2026-05-26T11:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
