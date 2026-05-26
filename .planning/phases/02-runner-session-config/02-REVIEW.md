---
phase: 02-runner-session-config
reviewed: 2026-05-26T13:30:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/channels/message/agent-prompt.ts
  - src/config/core/schema.ts
  - src/config/core/template.ts
  - src/config/runtime/agent-tool-presets.ts
  - src/runners/transcript/transcript-normalization.ts
  - test/runner-service.integration.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-26T13:30:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

This phase introduced the `pi` runner backend, wired `newSessionCommand` into the config schema and tool presets, and added transcript normalization for Pi's working-status pattern. The core implementation logic is sound. Three actionable issues were found: one failing test assertion (the test itself encodes a wrong expectation), one incomplete pi configuration in the default config template, and one schema file that breaches the hard line-limit. Three info-level items cover dead parameters and a quote-style inconsistency.

## Warnings

### WR-01: Failing test — `isActiveTimerStatusLine("Working... (some task)")` asserts `true` but returns `false`

**File:** `test/runner-service.integration.test.ts:166-168`
**Issue:** The test asserts that `isActiveTimerStatusLine('Working... (some task)')` is `true`. None of the five patterns in `isActiveTimerStatusLine` match that string. `PI_WORKING_STATUS_PATTERN` requires end-of-string immediately after the ellipsis (`\s*$`), so any trailing content causes a miss. `CODEX_WORKING_STATUS_PATTERN` requires a duration token and an interrupt cue, neither of which are present. The assertion is wrong: Pi emits plain `Working...` or `• Working...`, not `Working... (some task)`. Running the test confirms the failure:

```
(fail) pi runner template > isActiveTimerStatusLine("Working... (some task)") returns true
Expected: true   Received: false
```

**Fix:** Remove the incorrect assertion or, if Pi genuinely emits parenthetical working-status lines in the wild, update `PI_WORKING_STATUS_PATTERN` to allow trailing content and add a proper fixture first:

```typescript
// Option A — remove the unsupported assertion (preferred)
// Delete lines 166-168.

// Option B — if Pi does emit this format, expand the pattern in transcript-normalization.ts:
const PI_WORKING_STATUS_PATTERN = /^(?:[•◦·✻✽*]\s*)?Working(?:\.{3}|…)(?:\s*\(.*\))?\s*$/i;
```

---

### WR-02: `template.ts` pi block omits runtime fields present in `schema.ts`

**File:** `src/config/core/template.ts:257-281`
**Issue:** The pi runner block in the generated default config template is missing five fields that the schema default and the `DEFAULT_AGENT_TOOL_TEMPLATES` preset both carry:
- `startupReadyPattern` (`"(?:^|\\s)escape\\s+interrupt(?:\\s|$)"`)
- `startupBlockers` (two entries for "No models available" and "tmux extended-keys is off")
- `startupRetryCount` (`2`)
- `startupRetryDelayMs` (`1000`)
- `newSessionCommand` (`"/new"`)
- `promptSubmitDelayMs` (`150`)

Because the template is used to generate the initial `clisbot.json`, operators who bootstrap with the default config and run pi will start with no startup-ready detection and no new-session command until they edit the file manually. The schema Zod defaults do fill in values at parse time, but the serialized file a user sees in their editor will be incomplete relative to the other runners (codex, claude, gemini all have their full fields in the template).

**Fix:** Align the pi block in `renderDefaultConfigTemplate` with the schema defaults:

```typescript
pi: {
  command: "pi",
  args: ["--dangerously-skip-permissions"],
  startupRetryCount: 2,
  startupRetryDelayMs: 1000,
  startupReadyPattern: "(?:^|\\\\s)escape\\\\s+interrupt(?:\\\\s|$)",
  startupBlockers: [
    {
      pattern: "Warning: No models available",
      message: "Pi has no models configured. Configure a provider via `/login` or set DEEPSEEK_API_KEY / GITHUB_TOKEN before routing through clisbot.",
    },
    {
      pattern: "tmux extended-keys is off",
      message: "Pi requires tmux extended-keys support. Add `set -g extended-keys on` to ~/.tmux.conf and restart tmux.",
    },
  ],
  promptSubmitDelayMs: 150,
  newSessionCommand: "/new",
  sessionId: { /* existing block unchanged */ },
},
```

---

### WR-03: `schema.ts` exceeds the hard line limit

**File:** `src/config/core/schema.ts:1-935`
**Issue:** The file is 935 lines against a 700-line hard limit (CLAUDE.md). The excess is almost entirely caused by duplicating the full runner default objects three times: once as the Zod schema-level `.default(...)` on `agentsDefaultsSchema.runner`, once inside `clisbotConfigSchema`'s `.default(...)` for `agents.defaults`, and again in the top-level `clisbotConfigSchema` `.default(...)` for `agents`. This is both a DRY violation and the direct cause of the size breach.

**Fix:** Extract the repeated runner-defaults literal into a named constant and reference it from all three call-sites. The `pi` runner block is also not yet duplicated in the second and third default blocks — adding it to bring parity will push the file further over the limit without this refactor. A targeted extraction (one `RUNNER_DEFAULTS_LITERAL` and per-family constants) would bring the file well under 700 lines.

---

## Info

### IN-01: `cliTool` parameter accepted by `buildAgentPromptText` but silently discarded

**File:** `src/channels/message/agent-prompt.ts:90`
**Issue:** `buildAgentPromptText` declares `cliTool?: AgentCliToolId` in its params type and spreads `...params` into `buildChannelPromptText`, but `buildChannelPromptText` does not include `cliTool` in its own parameter type. TypeScript excess-property checks do not apply here because the spread produces an intersection. The field is accepted without error but never reaches any downstream logic. If `cliTool` was intended to influence prompt rendering (e.g. customise the reply command or style hint per CLI tool) it is currently a no-op.

**Fix:** Either add `cliTool` to `buildChannelPromptText`'s parameter type and thread it to the render logic, or remove it from `buildAgentPromptText`'s param type until it is needed.

---

### IN-02: `streaming` parameter declared in `renderMessagePromptParts` but never read

**File:** `src/channels/message/agent-prompt.ts:212`
**Issue:** `renderMessagePromptParts` accepts `streaming?: "off" | "latest" | "all"` but the function body never references `params.streaming`. The parameter appears to be a forward declaration that was not yet connected to any rendering logic.

**Fix:** Remove the `streaming` field from `renderMessagePromptParts`'s parameter type until it is wired to behaviour, or document the intent with a `// TODO` if it is a planned hook.

---

### IN-03: Mixed quote style in `test/runner-service.integration.test.ts`

**File:** `test/runner-service.integration.test.ts:1-20`
**Issue:** Import statements on lines 1–13 use double quotes while the imports added on lines 19–20 and all test body strings use single quotes. CLAUDE.md mandates single quotes throughout.

**Fix:** Convert the existing double-quoted import strings to single quotes:

```typescript
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
// ... etc
```

---

_Reviewed: 2026-05-26T13:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
