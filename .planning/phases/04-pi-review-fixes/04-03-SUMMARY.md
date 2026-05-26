---
phase: 04-pi-review-fixes
plan: "03"
subsystem: transcript-normalization
tags: [fix, pi, chrome-filtering, transcript-normalization, tdd, prompt-echo]
dependency_graph:
  requires: [04-01]
  provides: [FIX-03, FIX-04]
  affects: [transcript-normalization, pi-chrome-filtering]
tech_stack:
  added: []
  patterns: [TDD-red-green, dropPromptBlocks, shouldDropPiChromeLine]
key_files:
  created: []
  modified:
    - src/runners/transcript/transcript-normalization.ts
    - test/text/text-cleaning-chrome.suite.ts
decisions:
  - "dropPiPromptBlocks uses same /^\\s*>\\s/ pattern as dropGeminiPromptBlocks — safe because isPi guard in cleanInteractionSnapshotInternal already excludes gemini"
  - "Help-bar phrases (Type your message, run /help) are now both detected and dropped — detection markers must be filtered from output"
metrics:
  duration: "~7m"
  completed: "2026-05-26"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 03: Pi Prompt Echo and Help-Bar Chrome Filtering Summary

Add `dropPiPromptBlocks` to strip `> user message` prompt echo lines from pi responses, and extend `shouldDropPiChromeLine` to also drop `Type your message` and `run /help` help-bar lines that were being used as pi detection markers but never filtered from output.

## What Was Built

**Fix 3:** Added `dropPiPromptBlocks` function in `transcript-normalization.ts` using the shared `dropPromptBlocks` helper with pattern `/^\s*>\s/`. This is structurally identical to `dropGeminiPromptBlocks` (same prompt syntax). Wired into `cleanInteractionSnapshotInternal` at the `promptStripped` dispatch block — added `isPi ? dropPiPromptBlocks(lines) :` before the final `lines` fallback. Pi prompt echo lines (`> explain this code`) and their indented continuation blocks are now stripped before channel output.

**Fix 4:** Added two explicit drop rules to `shouldDropPiChromeLine`:
- `trimmed.includes('Type your message')` — drops the help-bar input prompt line
- `trimmed.includes('run /help')` — drops the help-bar shortcuts line

These phrases were already used as pi detection markers in `looksLikePiSnapshot`, but were never filtered from output. Now detection and dropping are symmetric.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1 RED: failing tests for Fix 3 | 458a95a | test(04-03): add failing tests for dropPiPromptBlocks |
| 1 GREEN: implement Fix 3 | 80e9f63 | feat(04-03): add dropPiPromptBlocks and wire into promptStripped dispatch |
| 2 RED: failing tests for Fix 4 | 8b73cbb | test(04-03): add failing tests for shouldDropPiChromeLine help-bar drops |
| 2 GREEN: implement Fix 4 | 9c3ed06 | feat(04-03): add help-bar drop conditions to shouldDropPiChromeLine |

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- `bun test ./test/text/text-cleaning-chrome.suite.ts`: 54 pass, 0 fail (up from 50 in Plan 01)
- `bun run check` (full suite): 3 pre-existing failures, same as documented in Plan 01 SUMMARY (zalo session test, tmux latency test, agent service timing flaky test) — none related to this plan

## Known Stubs

None.

## Threat Flags

None — changes are pure filtering additions within the existing normalization pipeline. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `src/runners/transcript/transcript-normalization.ts` contains `function dropPiPromptBlocks` — confirmed
- `src/runners/transcript/transcript-normalization.ts` contains `isPi` branch in promptStripped dispatch with `dropPiPromptBlocks(lines)` — confirmed
- `src/runners/transcript/transcript-normalization.ts` contains `trimmed.includes('Type your message')` in `shouldDropPiChromeLine` — confirmed
- `src/runners/transcript/transcript-normalization.ts` contains `trimmed.includes('run /help')` in `shouldDropPiChromeLine` — confirmed
- `test/text/text-cleaning-chrome.suite.ts` — exists, 54 tests pass
- Commits: 458a95a, 80e9f63, 8b73cbb, 9c3ed06 — all confirmed in git log
