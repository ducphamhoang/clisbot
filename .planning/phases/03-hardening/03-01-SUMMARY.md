---
phase: 03-hardening
plan: "01"
subsystem: transcript-normalization
tags: [tdd, normalization, pi, chrome-filtering, transcript]
dependency-graph:
  requires: []
  provides: [pi-chrome-filtering]
  affects: [transcript-normalization, text-cleaning-chrome-tests]
tech-stack:
  added: []
  patterns: [per-cli snapshot detection, chrome-drop filter, isPi flag gate]
key-files:
  created:
    - test/text/text-cleaning-chrome.suite.ts (pi describe block added)
  modified:
    - src/runners/transcript/transcript-normalization.ts
decisions:
  - Use /^─+$/ and /^[╭╰│]/ anchor patterns instead of character-class range for box-drawing drops
metrics:
  duration: 812s
  completed: 2026-05-26
---

# Phase 03 Plan 01: Pi Chrome Filtering Summary

Pi chrome filtering added to transcript normalization: `looksLikePiSnapshot()` detects pi snapshots, `shouldDropPiChromeLine()` drops startup warnings, fd errors, separator lines, and status bar markers, all gated via `isPi` flag in `cleanInteractionSnapshotInternal()`.

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| RED | Add failing pi chrome tests | 47ceda9 | test/text/text-cleaning-chrome.suite.ts |
| GREEN | Implement pi chrome filtering | 21a9142 | src/runners/transcript/transcript-normalization.ts |

## What Was Built

### `looksLikePiSnapshot(lines: string[]): boolean` (exported)

Detects pi snapshots by scanning for markers: `Welcome to pi`, version pattern `/^pi\s+v\d+\.\d+\.\d+/i`, `Type your message`, `run /help`, or bare `>` / `> ` prompt lines.

### `shouldDropPiChromeLine(line: string): boolean` (private)

Drops pi-specific noise lines:
- `Warning: ...` and `Note: ...` startup messages
- `fd: not found` / `fd: command not found` error lines
- `─────` horizontal separator lines
- Lines starting with `╭`, `╰`, or `│` (box-drawing borders and side panels)
- `Welcome to pi` and version lines
- Bare `>` and `> ` prompt markers

### Integration in `cleanInteractionSnapshotInternal()`

Added `const isPi = looksLikePiSnapshot(lines)` after the existing detection constants, and `if (isPi && shouldDropPiChromeLine(line)) { return false }` in the filter loop — consistent with the codex/claude/gemini pattern.

## TDD Gate Compliance

- RED commit: `47ceda9` — `test(03-01): add failing pi chrome filtering tests` (46 tests, all failing)
- GREEN commit: `21a9142` — `feat(03-01): add pi chrome filtering to transcript normalization` (46/46 passing)
- REFACTOR: not needed — no cleanup required

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed box-drawing line regex patterns**
- **Found during:** GREEN phase, test run
- **Issue:** Plan spec used `^[─╭╰│├═=]{3,}$` character class for box-drawing detection. This failed for:
  - `╭──────╮` (ends with `╮` not in class)
  - `│ content │` (has spaces inside)
- **Fix:** Split into two targeted patterns: `/^─+$/` for horizontal separators and `/^[╭╰│]/` (anchor at start) to match all border/side variants
- **Files modified:** src/runners/transcript/transcript-normalization.ts
- **Commit:** 21a9142

## Verification Results

- `bun test ./test/text/text-cleaning-chrome.suite.ts -t "pi"`: 46/46 pass
- `bunx tsc --noEmit`: exit 0 (no type errors)
- `bun test` (full suite): 1002 pass, 3 fail — all 3 failures are pre-existing flaky tests (zalo-personal zca-js wrapper, tmux runner latency) unrelated to this plan

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| Mitigated: T-03-02 | transcript-normalization.ts | `shouldDropPiChromeLine()` uses `^`-anchored regex and per-CLI `isPi` gate; "kept" test cases confirm no over-dropping of user content |

## Self-Check: PASSED

- src/runners/transcript/transcript-normalization.ts: FOUND
- test/text/text-cleaning-chrome.suite.ts: FOUND
- .planning/phases/03-hardening/03-01-SUMMARY.md: FOUND
- commit 47ceda9 (RED): FOUND
- commit 21a9142 (GREEN): FOUND
