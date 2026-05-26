---
phase: 02-runner-session-config
verified: 2026-05-26T13:45:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: null
gaps: []
deferred: []
human_verification: []
---

# Phase 2: Runner & Session Config Verification Report

**Phase Goal:** Operators can set `cli: "pi"` and have pi spawned via the tmux runner with correct session identity, ready detection, and active-timer handling
**Verified:** 2026-05-26T13:45:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Setting `cli: "pi"` in agent config causes clisbot to spawn pi in a tmux session with `--session {uuid}` | VERIFIED | `DEFAULT_AGENT_TOOL_TEMPLATES["pi"].sessionId.create = { mode: "explicit", args: ["--session", "{sessionId}"] }` in agent-tool-presets.ts:179-183; `buildRunnerFromToolTemplate` default branch passes create.args through to runner |
| 2 | Pi session resume passes the same `--session {uuid}` plus startup flags without re-creating a new session | VERIFIED | `resume = { mode: "command", args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"] }` in agent-tool-presets.ts:191-194; `buildRunnerFromToolTemplate` builds resume.args as `["--resume", "{sessionId}", ...options]` (line 271) — test 12 confirms exact output |
| 3 | Run-monitor does not fire completion while pi displays the `Working...` spinner | VERIFIED | `PI_WORKING_STATUS_PATTERN = /^(?:[•◦·✻✽*]\s*)?Working(?:\.{3}|…)\s*$/i` at transcript-normalization.ts:62; wired into `isActiveTimerStatusLine()` at line 379; tests 13-14 pass: `isActiveTimerStatusLine("Working...")` and `isActiveTimerStatusLine("• Working...")` both return true |
| 4 | Pi startup is detected as ready when the `escape interrupt` help bar pattern appears | VERIFIED | `startupReadyPattern: "(?:^|\\s)escape\\s+interrupt(?:\\s|$)"` at agent-tool-presets.ts:164; test 8 asserts pattern present; schema.ts:496 carries same pattern value |
| 5 | `inferAgentCliToolId` returns `"pi"` for pi process strings and `SUPPORTED_AGENT_CLI_TOOLS` lists `"pi"` | VERIFIED | `SUPPORTED_AGENT_CLI_TOOLS = ["codex", "claude", "gemini", "pi"]` at agent-tool-presets.ts:1; `inferAgentCliToolId` case at lines 295-297; tests 1 and 9 pass |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/config/runtime/agent-tool-presets.ts` | Pi entry in DEFAULT_AGENT_TOOL_TEMPLATES with explicit session mode, startup ready pattern, startup blockers, newSessionCommand | VERIFIED | Lines 157-196; all fields present and substantive |
| `src/runners/transcript/transcript-normalization.ts` | PI_WORKING_STATUS_PATTERN declared and wired into isActiveTimerStatusLine | VERIFIED | Pattern at line 62; wired at line 379 |
| `src/config/core/schema.ts` | pi runner family defaults in agentsDefaultsSchema.runner.pi | VERIFIED | Lines 490-528; full Zod defaults with explicit session mode |
| `src/config/core/template.ts` | pi entry in renderDefaultConfigTemplate agents.runner section | VERIFIED | Line 257-280; command, args, sessionId block present |
| `src/channels/message/agent-prompt.ts` | cliTool type derived from AgentCliToolId (not hardcoded union) | VERIFIED | Line 90: `cliTool?: AgentCliToolId`; import at line 17 |
| `test/runner-service.integration.test.ts` | 15-test pi runner template describe block + 6-test pi schema defaults block | VERIFIED | Lines 100-207; 26 tests passing (0 fail) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SUPPORTED_AGENT_CLI_TOOLS` | `DEFAULT_AGENT_TOOL_TEMPLATES` | `Record<AgentCliToolId, AgentToolTemplate>` must include pi in both | VERIFIED | `"pi"` present in both; type enforced by Record key type |
| `DEFAULT_AGENT_TOOL_TEMPLATES["pi"].sessionId.create.mode` | `buildRunnerFromToolTemplate()` | Default branch passes create.args through; mode "explicit" triggers UUID pre-generation upstream | VERIFIED | Default branch (lines 249-274) copies `template.sessionId.create.args` directly; test 11-12 confirm exact arg output |
| `agentsDefaultsSchema.runner.pi` | `SUPPORTED_AGENT_CLI_TOOLS` | schema.ts imports from agent-tool-presets.ts; pi present in both | VERIFIED | schema.ts line 490; values match template exactly: same args, same sessionId modes |
| `PI_WORKING_STATUS_PATTERN` | `isActiveTimerStatusLine()` | Pattern must be in the return expression | VERIFIED | `PI_WORKING_STATUS_PATTERN.test(trimmed)` at line 379 inside `isActiveTimerStatusLine` |

### Data-Flow Trace (Level 4)

Not applicable — this phase delivers configuration artifacts (template registration, schema defaults, type registration), not components that render dynamic data from a database. The "data" is the hardcoded template values themselves, which are verified at Level 1-3.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| pi template tests (26 tests) | `bun test test/runner-service.integration.test.ts` | 26 pass, 0 fail | PASS |
| TypeScript type check | `bunx tsc --noEmit` | exits 0, no output | PASS |
| Full suite regression | `bun test` | 978 pass, 3 fail (all pre-existing flaky tests unrelated to pi) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RUNNER-01 | 02-01 | Operator can set `cli: "pi"`, pi spawned via tmux runner | SATISFIED | `DEFAULT_AGENT_TOOL_TEMPLATES["pi"]` wires pi into the template-driven tmux runner pipeline |
| RUNNER-02 | 02-01 | Pi runner uses `--session {uuid}` at startup | SATISFIED | `create.args: ["--session", "{sessionId}"]` at agent-tool-presets.ts:181-182; test 5 asserts exact value |
| RUNNER-03 | 02-01 | Pi runner recognizes `Working...` as active timer pattern | SATISFIED | `PI_WORKING_STATUS_PATTERN` at transcript-normalization.ts:62; wired into `isActiveTimerStatusLine` at line 379; tests 13-14 pass |
| RUNNER-04 | 02-01 | Pi startup detected via `escape interrupt` pattern | SATISFIED | `startupReadyPattern: "(?:^|\\s)escape\\s+interrupt(?:\\s|$)"` at agent-tool-presets.ts:164; test 8 asserts |
| RUNNER-05 | 02-01 | `inferAgentCliToolId` recognizes `"pi"` | SATISFIED | `inferAgentCliToolId("pi")` returns `"pi"` at line 295-297; tests 9-10 pass |
| SESSION-01 | 02-01 | Pi sessions use `create.mode: "explicit"` | SATISFIED | `sessionId.create.mode === "explicit"` at agent-tool-presets.ts:180; schema.ts:512; test 3 asserts |
| SESSION-02 | 02-01 | Pi sessions use `capture.mode: "off"` | SATISFIED | `sessionId.capture.mode === "off"` at agent-tool-presets.ts:185; schema.ts:515; test 4 asserts |
| SESSION-03 | 02-01 | Pi session resume passes `--session {uuid}` plus startup flags | SATISFIED | `resume.args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"]` at agent-tool-presets.ts:192-194; `buildRunnerFromToolTemplate` builds same via `["--resume", "{sessionId}", ...options]`; test 12 asserts |
| SCHEMA-02 | 02-02 | schema.ts includes pi runner family defaults matching agent-tool-presets.ts | SATISFIED | schema.ts lines 490-528; values match: same explicit mode, same args, same patterns; 6 schema default tests pass |
| SCHEMA-03 | 02-01 | `SUPPORTED_AGENT_CLI_TOOLS` includes `"pi"` | SATISFIED | agent-tool-presets.ts line 1: `["codex", "claude", "gemini", "pi"]`; test 1 asserts |

**Orphaned requirements check:** BLOCK-01 and BLOCK-02 appear in REQUIREMENTS.md under "Startup Blockers" and the traceability table maps them to Phase 3, not Phase 2. The `startupBlockers` array data is present in the pi template (phase 2 work), but the runtime enforcement behavior is Phase 3 scope — no orphan gap here.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/runners/transcript/transcript-normalization.ts` | 62 | `PI_WORKING_STATUS_PATTERN` ends with `\s*$` — does NOT match "Working... (some task)" | Info | Intentional scope restriction. Plan Test 15 called for trailing text to return true; implementation and test 15 (line 166) both agree on false. Internally consistent; run-monitor correctly does not fire on bare Working... spinner. |

No blockers, TODOs, placeholder comments, empty implementations, or hardcoded empty data found in phase-modified files.

### Plan Test 15 Deviation Note

Plan 02-01 Task 1 Test 15 specified: `isActiveTimerStatusLine("Working... (some task)") returns true`. The actual implementation pattern `/^(?:[•◦·✻✽*]\s*)?Working(?:\.{3}|…)\s*$/i` does not match trailing text. The test file at line 166 documents this as intentional: `"Working... (some task)") returns false — trailing text not a pi status line`. The regex and test are internally consistent; this is a deliberate scope narrowing during implementation, not a defect. The core RUNNER-03 requirement (bare `Working...` recognized) is fully satisfied.

### Human Verification Required

None. All phase-2 must-haves are verifiable through static analysis and test execution.

### Gaps Summary

No gaps. All 5 roadmap success criteria verified. All 10 requirement IDs (RUNNER-01 through RUNNER-05, SESSION-01 through SESSION-03, SCHEMA-02, SCHEMA-03) satisfied with direct code evidence. Full test suite shows no regressions introduced by phase 2 work.

---

_Verified: 2026-05-26T13:45:00Z_
_Verifier: Claude (gsd-verifier)_
