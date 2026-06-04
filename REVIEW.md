---
phase: code-review
reviewed: 2026-06-04T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/agents/runtime/runner-service.ts
  - src/config/core/schema.ts
  - src/config/runtime/agent-tool-presets.ts
  - src/runners/tmux/session-handshake.ts
  - test/runner-service.test.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Code Review Report

**Reviewed:** 2026-06-04
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

The five files cover the runner lifecycle (session startup, handshake, identity capture), configuration schema for the new `pi` CLI tool, and test coverage for `RunnerService`. The overall structure is solid — error classification, retry logic, and the session identity capture flow are well-designed. Three issues warrant attention: a missing `pi` runner entry in one of the two hardcoded default objects in `schema.ts`, a dead stub in one test that means the test is exercising the wrong code path, and a no-op `applyTemplate` call in `agent-tool-presets.ts` that silently does nothing and obscures intent. Several minor style and quality items round out the findings.

---

## Warnings

### WR-01: `pi` runner missing from outer `.default()` in `schema.ts`

**File:** `src/config/core/schema.ts:785`

**Issue:** The `agentsDefaultsSchema` is defined with a `.default({...})` at line 650 that includes all four runner families (`codex`, `claude`, `gemini`, `pi`). However, the outer `agents` `z.object({...}).default({...})` at line 785 — used when the entire `agents` key is absent from a config file — duplicates this default object but **omits `pi`**. When a user has no `agents:` section in their config, Zod falls through to the outer default, and `runner.pi` will be `undefined`. Any codepath that resolves a target for the `pi` CLI without an `agents:` section in config will access `undefined` instead of the pi runner family config.

**Fix:** Add the `pi` runner entry to the outer `.default({...})` object at line 785, mirroring what is already present in `agentsDefaultsSchema.default({...})` at line 650 (and matching the definition at lines 490–528). The two default objects must stay in sync.

```typescript
// In agents z.object({...}).default({ defaults: { runner: { ... } } })
// add alongside codex/claude/gemini:
pi: {
  command: "pi",
  args: [],
  startupDelayMs: INTERACTIVE_CLI_STARTUP_DELAY_MS,
  startupRetryCount: 2,
  startupRetryDelayMs: 1000,
  startupReadyPattern: "escape\\s+interrupt[^\\n]*\\n",
  startupBlockers: [...],
  promptSubmitDelayMs: 150,
  newSessionCommand: "/new",
  sessionId: {
    create: { mode: "runner", args: [] },
    capture: { mode: "status-command", statusCommand: "/session", ... },
    resume: { mode: "command", args: ["--session", "{sessionId}"] },
  },
},
```

---

### WR-02: Dead stub in test — `persistStoredSessionId` does not exist on `RunnerService`

**File:** `test/runner-service.test.ts:278`

**Issue:** The test "does not fail startup when durable session id persistence degrades after the runner is ready" stubs `(runner as any).persistStoredSessionId`, but no such method exists on `RunnerService`. The real call chain is `finalizeSessionStartup` → `recordActiveSessionIdBestEffort` → `recordActiveSessionId` → `this.sessionMapping.setActive`. Because `sessionMapping` is `{} as SessionMapping`, calling the missing `setActive` method throws a `TypeError`. The test passes only because `recordActiveSessionIdBestEffort` catches _any_ error (including this `TypeError`) and calls `warnStartupSessionIdentityDegraded`. The stub is never invoked and the test is therefore exercising an accidental path (a mock misconfiguration), not the intended graceful-degradation scenario.

**Fix:** Replace the dead stub with a stub on `sessionMapping.setActive`:

```typescript
// Remove:
(runner as any).persistStoredSessionId = async () => {
  throw new Error("disk full");
};

// Add (patch the sessionMapping that was set to {}):
(runner as any).sessionMapping = {
  setActive: async () => { throw new Error("disk full") },
};
```

---

### WR-03: `schema.ts` exceeds the project hard limit of 700 lines

**File:** `src/config/core/schema.ts:1`

**Issue:** The file is 935 lines, which exceeds the hard limit of 700 lines defined in `CLAUDE.md`. The primary driver is the large duplicate default-value literal that repeats the full runner configuration (codex, claude, gemini) across two `.default({...})` calls — once inside `agentsDefaultsSchema.default({...})` (lines ~650–783) and again in the outer `agents.default({...})` (lines ~785–921). These two objects are nearly identical and already drifted out of sync (WR-01 above).

**Fix:** Refactor the schema to define the default runner config object once as a typed constant and reference it in both `.default({...})` calls. This eliminates the duplication, fixes the drift risk, and brings the file below the hard limit.

---

## Info

### IN-01: No-op `applyTemplate` call in `buildRunnerFromToolTemplate`

**File:** `src/config/runtime/agent-tool-presets.ts:277`

**Issue:** The non-codex path calls `applyTemplate(arg, { sessionId: '{sessionId}' })`, substituting the literal string `{sessionId}` for the `{sessionId}` placeholder. This is always a no-op — the output is identical to the input. The intent appears to be preserving the `{sessionId}` placeholder for later substitution at launch time, but the `map` call with `applyTemplate` obscures this. It also creates a false impression that substitution is happening here.

**Fix:** Remove the `applyTemplate` call and spread the args directly, with a comment explaining why:

```typescript
// Non-codex runners: preserve template's resume args as-is; {sessionId} is substituted
// at launch time via buildRunnerArgs, not here.
args: [...template.sessionId.resume.args],
```

---

### IN-02: Inconsistent quote style in `runner-service.ts`

**File:** `src/agents/runtime/runner-service.ts:368-370` and `858-859`

**Issue:** `CLAUDE.md` requires single quotes only when the string contains a single quote; otherwise double quotes are the convention throughout this file. Lines 368–370 and 858–859 use single-quoted string literals (`'command'`, `'runner'`, `'explicit'`, `'off'`) inconsistently with the rest of the file.

**Fix:** Replace with double quotes:

```typescript
resolved.runner.sessionId.resume.mode !== "command" ||
(resolved.runner.sessionId.create.mode !== "runner" &&
  resolved.runner.sessionId.create.mode !== "explicit")
```

---

### IN-03: Missing semicolons on `return null` at line 373 in `runner-service.ts`

**File:** `src/agents/runtime/runner-service.ts:373`

**Issue:** While `CLAUDE.md` specifies omitting semicolons, this is consistent with the rest of the file. However, the `return null` statement at line 373 has no trailing semicolon, which is correct — no action needed. This note is retracted.

*(Retracted — no issue.)*

---

### IN-04: `acceptStartupContinuePromptIfPresent` is a one-line delegating wrapper

**File:** `src/agents/runtime/runner-service.ts:745-747`

**Issue:** `acceptStartupContinuePromptIfPresent` does nothing but delegate to `acceptVisibleStartupContinuePrompt` with no transformation. It adds indirection without value and all callers could call `acceptVisibleStartupContinuePrompt` directly.

```typescript
private async acceptStartupContinuePromptIfPresent(resolved: ResolvedAgentTarget) {
  await this.acceptVisibleStartupContinuePrompt(resolved);
}
```

**Fix:** Remove the wrapper and inline the call at each of its three call sites, or keep only `acceptVisibleStartupContinuePrompt` and rename it if the name needs to be clarified. This is a minor clean-up; defer if there is a planned extension.

---

_Reviewed: 2026-06-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
