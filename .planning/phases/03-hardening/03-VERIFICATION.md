---
phase: 03-hardening
verified: 2026-05-26T14:57:24Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 3: Hardening Verification Report

**Phase Goal:** Pi startup failures surface actionable operator messages and pi-specific noise is stripped from transcript output.
**Verified:** 2026-05-26T14:57:24Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BLOCK-01: Pi template has `startupBlockers[0].pattern` = `'Warning: No models available'` | VERIFIED | `agent-tool-presets.ts` line 167; test passes |
| 2 | BLOCK-02: Pi template has `startupBlockers[1].pattern` = `'tmux extended-keys is off'` | VERIFIED | `agent-tool-presets.ts` line 172; test passes |
| 3 | BLOCK-01 operator message directs to configure a provider | VERIFIED | Message contains "Configure a provider via `/login`" and `DEEPSEEK_API_KEY / GITHUB_TOKEN` |
| 4 | BLOCK-02 operator message contains `set -g extended-keys on` and `~/.tmux.conf` | VERIFIED | Message: "Add \`set -g extended-keys on\` to ~/.tmux.conf and restart tmux." |
| 5 | NORM-01: Pi chrome lines are absent from transcript output sent to users | VERIFIED | `looksLikePiSnapshot()` + `shouldDropPiChromeLine()` wired in `cleanInteractionSnapshotInternal()`; 46 pi tests pass |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/config/runtime/agent-tool-presets.ts` | Pi template with `startupBlockers` array (BLOCK-01, BLOCK-02) | VERIFIED | Lines 165-176; both blockers present with correct patterns and operator messages |
| `src/runners/transcript/transcript-normalization.ts` | `looksLikePiSnapshot()` exported + `shouldDropPiChromeLine()` private + `isPi` wired in `cleanInteractionSnapshotInternal()` | VERIFIED | `looksLikePiSnapshot` exported at line 208; `shouldDropPiChromeLine` private at line 547; `isPi` assigned at line 615; filter applied at line 646 |
| `test/runner-service.integration.test.ts` | 7 blocker tests covering BLOCK-01 and BLOCK-02 | VERIFIED | Lines 170-207; 7 tests present, all pass (6 pass in targeted run) |
| `test/text/text-cleaning-chrome.suite.ts` | Pi chrome filtering tests with `describe('pi chrome filtering')` block | VERIFIED | Lines 456-615; 46 pi tests, all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DEFAULT_AGENT_TOOL_TEMPLATES['pi'].startupBlockers` | `waitForTmuxSessionBootstrap()` | `buildRunnerFromToolTemplate()` maps `startupBlockers` → `runner.startupBlockers` | VERIFIED | `agent-tool-presets.ts` line 229/257: `startupBlockers: template.startupBlockers?.map(...)` |
| `session-handshake.ts` blocker loop | `startupBlockers` patterns | `params.blockers` consumed at lines 357/364 | VERIFIED | `blockerPatterns = (params.blockers ?? []).map(entry => ({regex: new RegExp(entry.pattern, 'i'), message: entry.message}))` |
| `cleanInteractionSnapshotInternal()` | `looksLikePiSnapshot()` | `const isPi = !isCodex && !isClaude && !isGemini && looksLikePiSnapshot(lines)` | VERIFIED | Line 615 — correctly excludes other CLIs before activating pi detection |
| `cleanInteractionSnapshotInternal()` | `shouldDropPiChromeLine()` | `if (isPi && shouldDropPiChromeLine(line)) { return false }` | VERIFIED | Line 646 — gated behind `isPi` flag |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces filtering functions (pure transforms), not components that render dynamic data. No data-flow trace required.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pi chrome tests (all 46) | `bun test ./test/text/text-cleaning-chrome.suite.ts -t "pi"` | 46 pass, 0 fail | PASS |
| Blocker tests (BLOCK-01, BLOCK-02) | `bun test test/runner-service.integration.test.ts -t "blocker\|BLOCK"` | 6 pass, 0 fail | PASS |
| TypeScript type safety | `bunx tsc --noEmit` | exit 0, no errors | PASS |
| Phase-relevant test files combined | `bun test ./test/runner-service.integration.test.ts ./test/text/text-cleaning-chrome.suite.ts` | 79 pass, 0 fail | PASS |
| Full test suite regression | `bun test` | 1009 pass, 3 fail (pre-existing flaky tests) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BLOCK-01 | 03-02 | Pi startup blocked when no models configured; operator message directs to provider config | SATISFIED | Pattern `Warning: No models available` in `startupBlockers[0]`; message contains `/login`, `DEEPSEEK_API_KEY`, `GITHUB_TOKEN`; 2 test assertions verify pattern and message |
| BLOCK-02 | 03-02 | Pi startup blocked when tmux extended-keys is off; operator message directs to `.tmux.conf` | SATISFIED | Pattern `tmux extended-keys is off` in `startupBlockers[1]`; message contains `set -g extended-keys on` and `.tmux.conf`; 2 test assertions verify |
| NORM-01 | 03-01 | Pi-specific chrome lines absent from transcript output | SATISFIED | `looksLikePiSnapshot()` + `shouldDropPiChromeLine()` + `isPi` flag in `cleanInteractionSnapshotInternal()`; 46 tests covering warnings, fd errors, box-drawing lines, header lines, prompt markers, kept content, and cross-CLI non-contamination |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODOs, FIXMEs, stubs, placeholder returns, or empty handlers found in any phase-modified file.

### Implementation Notes

One minor deviation from the PLAN spec: `looksLikePiSnapshot()` in the implementation omits the `trimmed === '> '` case (trailing space variant) that was in the plan. The detection function only checks `trimmed === '>'`. However, `shouldDropPiChromeLine()` also only checks `trimmed === '>'`. The `> ` (with trailing space) variant is still handled correctly because `line.trim()` collapses trailing whitespace before comparison, so `> ` trims to `>` and is caught. This is correct behavior — not a gap.

The `isPi` assignment at line 615 uses `!isCodex && !isClaude && !isGemini && looksLikePiSnapshot(lines)` rather than the bare `looksLikePiSnapshot(lines)` from the plan. This is a deliberate safety improvement: it prevents pi detection from firing on a snapshot that also has codex/claude/gemini markers. The behavior is strictly better than specified.

### Human Verification Required

None. All success criteria are mechanically verifiable and have been verified.

---

_Verified: 2026-05-26T14:57:24Z_
_Verifier: Claude (gsd-verifier)_
