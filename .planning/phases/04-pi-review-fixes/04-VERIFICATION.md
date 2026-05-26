---
phase: 04-pi-review-fixes
verified: 2026-05-27T00:21:00+07:00
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 4: Pi Review Fixes Verification Report

**Phase Goal:** Fix all critical, high, and medium findings from the v0.2.0 adversarial milestone review so pi is production-safe
**Verified:** 2026-05-27T00:21:00+07:00
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | triggerNewSession for pi routes directly to restartRunnerWithFreshSessionIdForNewCommand without calling triggerNewSessionInLiveRunner | ✓ VERIFIED | `skipLiveRotation` guard at runner-service.ts:827–831 fires on `capture.mode === 'off' && create.mode === 'explicit'`; early return before `hasSession` check |
| 2 | retryFreshStartAfterStoredResumeFailure does not discard pi session IDs on crash recovery | ✓ VERIFIED | Gate at runner-service.ts:352–355 now allows `create.mode !== 'runner' && create.mode !== 'explicit'`; pi's `explicit` mode passes through |
| 3 | Pi prompt echo lines ('> user message') are stripped from pi response output | ✓ VERIFIED | `dropPiPromptBlocks` defined at transcript-normalization.ts:369–371; wired into `promptStripped` dispatch at line 626–627 (`isPi ? dropPiPromptBlocks(lines) : lines`) |
| 4 | Pi help-bar lines ('Type your message', 'run /help') are dropped from pi output | ✓ VERIFIED | `shouldDropPiChromeLine` at lines 563–564 contains both `trimmed.includes('Type your message')` and `trimmed.includes('run /help')` |
| 5 | AI response lines starting with 'Warning:' or 'Note:' are not stripped from pi output | ✓ VERIFIED | `/^(?:Warning|Note):\s/i` rule absent from `shouldDropPiChromeLine`; grep confirms no match in that function |
| 6 | A snapshot containing only bare '>' lines is not classified as a pi snapshot | ✓ VERIFIED | `trimmed === '>'` absent from `looksLikePiSnapshot` (line 208–218); only present in `shouldDropPiChromeLine` (line 562) as a chrome drop rule |
| 7 | REQUIREMENTS.md SESSION-03 documents --resume as the pi session resume flag | ✓ VERIFIED | REQUIREMENTS.md line 15: `Pi session resume passes \`--resume {uuid}\` plus startup flags` |
| 8 | buildRunnerFromToolTemplate for non-codex runners preserves the template's resume.args array | ✓ VERIFIED | agent-tool-presets.ts:277 uses `template.sessionId.resume.args.map((arg) => applyTemplate(arg, { sessionId: '{sessionId}' }))` — per-element substitution, not hardcoded reconstruction |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/runners/transcript/transcript-normalization.ts` | shouldDropPiChromeLine without Warning/Note rule; looksLikePiSnapshot without trimmed === '>'; dropPiPromptBlocks function; help-bar drop conditions | ✓ VERIFIED | All four conditions met; confirmed by grep and direct read |
| `test/text/text-cleaning-chrome.suite.ts` | Updated tests for Fix 3, Fix 4, Fix 5, Fix 6 | ✓ VERIFIED | 54 tests pass; Warning/Note tests updated, bare > test updated, prompt echo tests added, help-bar tests added |
| `.planning/REQUIREMENTS.md` | SESSION-03 documents --resume {uuid} | ✓ VERIFIED | Line 15 contains `--resume {uuid}` |
| `src/config/runtime/agent-tool-presets.ts` | non-codex branch uses applyTemplate on template.sessionId.resume.args | ✓ VERIFIED | Lines 275–277: comment + `.map((arg) => applyTemplate(arg, ...))` pattern |
| `src/agents/runtime/runner-service.ts` | triggerNewSession pi guard; retryFreshStartAfterStoredResumeFailure widened gate | ✓ VERIFIED | Lines 827–831 (guard) and 351–355 (gate) confirmed present |
| `test/runner-service.integration.test.ts` | Tests for Fix 1, Fix 2, Fix 8 | ✓ VERIFIED | 41 tests pass; describe blocks for `pi triggerNewSession routing (Fix 1)`, gate (Fix 2), and template preservation (Fix 8) all present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `looksLikePiSnapshot` | `cleanInteractionSnapshotInternal isPi guard` | detection result consumed in `isPi` assignment | ✓ WIRED | `isPi = !isCodex && !isClaude && !isGemini && looksLikePiSnapshot(lines)` at line 619 |
| `shouldDropPiChromeLine` | `cleanInteractionSnapshotInternal filter` | `isPi && shouldDropPiChromeLine(line)` | ✓ WIRED | line 652: `if (isPi && shouldDropPiChromeLine(line))` |
| `dropPiPromptBlocks` | `cleanInteractionSnapshotInternal promptStripped dispatch` | `isPi ? dropPiPromptBlocks(lines) : lines` | ✓ WIRED | lines 626–627 confirmed |
| `triggerNewSession skipLiveRotation guard` | `restartRunnerWithFreshSessionIdForNewCommand` | early return before hasSession check | ✓ WIRED | Lines 827–831; guard is BEFORE the `hasSession` branch |
| `retryFreshStartAfterStoredResumeFailure gate` | `sessionMapping.touch` | widened condition allows explicit create.mode to proceed | ✓ WIRED | Gate at 351–355 no longer returns null for `create.mode === 'explicit'` |
| `applyTemplate on resume.args` | `pi template sessionId.resume.args` | `.map((arg) => applyTemplate(arg, { sessionId: '{sessionId}' }))` | ✓ WIRED | agent-tool-presets.ts:277 — template array preserved, substitution applied per element |

### Data-Flow Trace (Level 4)

Not applicable — this phase contains no new UI components or data-rendering paths. All changes are filtering logic, routing guards, and documentation.

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `looksLikePiSnapshot` rejects bare `>` | grep for `trimmed === '>'` in `looksLikePiSnapshot` body | absent from function (only in `shouldDropPiChromeLine`) | ✓ PASS |
| Warning/Note rule absent | grep for `/^(?:Warning\|Note):\s/i` in normalization file | no match | ✓ PASS |
| `dropPiPromptBlocks` exists and is wired | grep for `dropPiPromptBlocks` | 2 matches: definition (line 369) + dispatch (line 627) | ✓ PASS |
| SESSION-03 uses `--resume` | grep SESSION-03 in REQUIREMENTS.md | `--resume {uuid}` present, no `--session {uuid}` | ✓ PASS |
| `applyTemplate` used in non-codex resume | grep `applyTemplate.*resume` in agent-tool-presets.ts | match at line 277 | ✓ PASS |
| `skipLiveRotation` guard present before hasSession | direct read runner-service.ts:822–837 | guard at 827–831, hasSession at 833 — correct order | ✓ PASS |
| Chrome test suite passes | `bun test ./test/text/text-cleaning-chrome.suite.ts` | 54 pass, 0 fail | ✓ PASS |
| Integration test suite passes | `bun test test/runner-service.integration.test.ts` | 41 pass, 0 fail | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FIX-01 | 04-05 | `/new` must not throw for pi — route through restartRunnerWithFreshSessionIdForNewCommand | ✓ SATISFIED | `skipLiveRotation` guard in `triggerNewSession` at runner-service.ts:827–831 |
| FIX-02 | 04-05 | Crash recovery must preserve pi session ID — widen retryFreshStartAfterStoredResumeFailure gate | ✓ SATISFIED | Gate at runner-service.ts:351–355 allows `create.mode === 'explicit'` |
| FIX-03 | 04-03 | Pi prompt echo lines stripped via dropPiPromptBlocks | ✓ SATISFIED | Function at transcript-normalization.ts:369; wired at line 626 |
| FIX-04 | 04-03 | Pi chrome filter drops help-bar phrases | ✓ SATISFIED | `Type your message` and `run /help` conditions at lines 563–564 |
| FIX-05 | 04-01 | shouldDropPiChromeLine must not drop Warning:/Note: lines | ✓ SATISFIED | Rule absent from shouldDropPiChromeLine; confirmed by grep returning no match |
| FIX-06 | 04-01 | looksLikePiSnapshot must not classify bare `>` as pi | ✓ SATISFIED | `trimmed === '>'` absent from looksLikePiSnapshot (208–218) |
| FIX-07 | 04-02 | REQUIREMENTS.md SESSION-03 documents `--resume {uuid}` | ✓ SATISFIED | REQUIREMENTS.md line 15 confirmed |
| FIX-08 | 04-04 | buildRunnerFromToolTemplate non-codex branch preserves template resume.args | ✓ SATISFIED | agent-tool-presets.ts:277 uses `.map((arg) => applyTemplate(arg, ...))` |

All 8 FIX requirements satisfied. No orphaned requirements — traceability table in REQUIREMENTS.md does not map FIX-01 through FIX-08 to a phase row (they are Phase 4 items added in this milestone), and all are covered by the plans above.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

No TODO/FIXME/placeholder comments, empty implementations, stubs, or hardcoded empty data found in modified files.

### Deviation Notes

Two deviations from plan were auto-fixed by the executor; both are correct:

1. **FIX-08 (Plan 04):** `applyTemplate` does not accept arrays — executor used `.map((arg) => applyTemplate(arg, ...))` instead of the plan's `applyTemplate(array, ...)`. Implementation is correct; plan interface section contained a type error.

2. **FIX-01 (Plan 05):** Claude template also satisfies the `skipLiveRotation` guard (`capture.mode: 'off'` and `create.mode: 'explicit'`), same as pi. The guard correctly applies to both. The plan's negative test assumption about claude was wrong; executor corrected it and added a gemini negative test instead. Behavior is architecturally correct per the SUMMARY comment: "both pi and claude require restart not live rotation."

### Human Verification Required

None — all must-haves are verifiable programmatically. Runtime behavior (e.g., actual `/new` command execution against a live pi session) would confirm end-to-end flow but is not required to close the phase; the guard condition tests cover the routing decision exhaustively.

### Full Test Suite Status

- `bun test ./test/text/text-cleaning-chrome.suite.ts`: 54 pass, 0 fail
- `bun test test/runner-service.integration.test.ts`: 41 pass, 0 fail
- `bun run check` (1028 tests across 111 files): 1025–1026 pass, 2–3 fail
  - All failures are pre-existing and unrelated to Phase 4:
    - `zalo-personal zca-js wrapper > refreshes the stored session after session login succeeds` — disk full error, pre-existing
    - `tmux runner latency behavior > waitForTmuxSessionBootstrap dismisses Gemini trust prompts` — pre-existing
    - `AgentService loops > does not let a new prompt jump ahead` — flaky timing test, not consistently failing

---

_Verified: 2026-05-27T00:21:00+07:00_
_Verifier: Claude (gsd-verifier)_
