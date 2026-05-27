---
phase: 06-flow-a-start-change
plan: "02"
subsystem: test
tags: [tdd, startup, start-command, test-coverage]
dependency_graph:
  requires: []
  provides: [START-01-test-stubs]
  affects: [test/startup-bootstrap.test.ts]
tech_stack:
  added: []
  patterns: [TDD RED gate, temp config file isolation, console.log capture]
key_files:
  created: []
  modified:
    - test/startup-bootstrap.test.ts
decisions:
  - "Test 2 (still shows failure banner) passes in RED because it asserts absence of warning — which is correct; the key failing assertion is test 1's missing warning message"
  - "Used dynamic import of writeFileSync inside test to match plan's code pattern"
metrics:
  duration: "< 5 minutes"
  completed: "2026-05-27"
requirements:
  - START-01
---

# Phase 06 Plan 02: START-01 RED Test Stubs Summary

Two START-01 TDD RED-state test stubs appended to `test/startup-bootstrap.test.ts` to encode warn-and-continue behavior before the implementation changes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add START-01 RED-state test stubs | 4cf2d59 | test/startup-bootstrap.test.ts |

## What Was Built

A new `describe('START-01: start with channels but no agent', ...)` block was appended inside the existing `describe('startup bootstrap helpers', ...)` block. It contains:

1. **"warns and continues when telegram channel enabled but no agent"** — Builds a config with `telegram.defaults.enabled = true` and `agents.list = []`, writes it to a temp file, calls `start([])`, and asserts the two-line warning message is present in console output. **FAILS (RED)** because the current implementation hard-fails instead.

2. **"still shows failure banner when no channels and no agent"** — Same setup but with all channels disabled. Asserts the warning message is NOT in output. Passes correctly because the current implementation shows only the failure banner.

## TDD Gate Compliance

- RED gate: Test commit `4cf2d59` (`test(06-02): ...`) exists — gate satisfied.
- GREEN gate: Not yet — awaits Plan 06-04 implementation.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check

- [x] `test/startup-bootstrap.test.ts` modified — file exists
- [x] Commit `4cf2d59` exists
- [x] `grep -c "warns and continues\|still shows failure" test/startup-bootstrap.test.ts` returns 2
- [x] 15 existing tests pass; 1 new START-01 test fails (RED)
- [x] No unexpected file deletions

## Self-Check: PASSED
