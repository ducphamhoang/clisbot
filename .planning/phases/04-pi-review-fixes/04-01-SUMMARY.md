---
phase: 04-pi-review-fixes
plan: "01"
subsystem: transcript-normalization
tags: [fix, pi, chrome-filtering, transcript-normalization, tdd]
dependency_graph:
  requires: []
  provides: [FIX-05, FIX-06]
  affects: [transcript-normalization, pi-chrome-filtering]
tech_stack:
  added: []
  patterns: [TDD-red-green, shouldDropPiChromeLine, looksLikePiSnapshot]
key_files:
  created: []
  modified:
    - src/runners/transcript/transcript-normalization.ts
    - test/text/text-cleaning-chrome.suite.ts
decisions:
  - "Remove Warning/Note rule from shouldDropPiChromeLine; startup blockers are caught at launch by startupBlockers before normalization runs"
  - "Remove trimmed === '>' from looksLikePiSnapshot; bare > is too ambiguous (Bash PS2, heredoc, markdown) to be a pi classification signal"
metrics:
  duration: "~16m"
  completed: "2026-05-26"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 01: Pi Transcript Normalization — Remove Warning/Note and Bare '>' Rules Summary

Remove two incorrect filtering rules from pi transcript normalization that were silently discarding legitimate content.

## What Was Built

**Fix 5:** Removed `/^(?:Warning|Note):\s/i` from `shouldDropPiChromeLine`. This rule was stripping legitimate AI response content like "Warning: this command is destructive" or "Note: you need sudo privileges." Startup warnings (e.g., "Warning: No models available") are caught at launch by `startupBlockers` before normalization ever runs — the second filter was both redundant and harmful.

**Fix 6:** Removed `trimmed === '>'` as a standalone condition from `looksLikePiSnapshot`. Bare `>` is too ambiguous to classify a snapshot as pi — it matches Bash PS2 prompts, heredoc markers, and markdown blockquotes, causing false-positive pi chrome stripping on non-pi content. Pi detection now relies only on uniquely-pi markers: version header, "Welcome to pi", and the help bar phrases.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1: Remove Warning/Note rule (Fix 5) | 747018a | TDD: delete `/^(?:Warning|Note):\s/i` from `shouldDropPiChromeLine`; update + add tests |
| 2: Remove bare '>' from looksLikePiSnapshot (Fix 6) | bf196a6 | TDD: delete `trimmed === '>'` from `looksLikePiSnapshot`; update + add tests |

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- `bun test ./test/text/text-cleaning-chrome.suite.ts`: 50 pass, 0 fail
- `bun run check` (full suite): 3 pre-existing failures unrelated to this plan (confirmed by running against base commit):
  - `zalo-personal zca-js wrapper > refreshes the stored session after session login succeeds` — pre-existing (disk full error)
  - `tmux runner latency behavior > waitForTmuxSessionBootstrap dismisses Gemini trust prompts` — pre-existing
  - `AgentService loops > does not let a new prompt jump ahead` — flaky timing test, not consistently failing

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. Both changes reduce the filtering surface by removing rules.

## Self-Check: PASSED

- `src/runners/transcript/transcript-normalization.ts` — exists, does not contain `/^(?:Warning|Note):\s/i`, does not contain `trimmed === '>'` in `looksLikePiSnapshot`
- `test/text/text-cleaning-chrome.suite.ts` — exists, updated tests pass
- Commits: 747018a (Task 1), bf196a6 (Task 2) — both confirmed in git log
