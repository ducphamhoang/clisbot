---
phase: 06-flow-a-start-change
plan: "01"
subsystem: control/setup
tags:
  - tdd
  - wizard
  - setup-channels
  - red-state
dependency_graph:
  requires: []
  provides:
    - test/control/setup/setup-channels.test.ts
  affects:
    - src/control/setup/setup-channels.ts (Wave 2 — not yet created)
tech_stack:
  added: []
  patterns:
    - bun:test describe/beforeEach/afterEach/mock pattern
    - readline mock via mock.module for headless test execution
    - temp dir per test via mkdtempSync for config isolation
key_files:
  created:
    - test/control/setup/setup-channels.test.ts
  modified: []
decisions:
  - "RED state confirmed: import error from missing src/control/setup/setup-channels.ts keeps all 5 tests failing"
  - "readline mocked via mock.module('node:readline') with FIFO response queue — no real TTY required"
  - "test/control/setup/ subdirectory created to mirror src/ layout; aligns with plan specification"
metrics:
  duration: "92s"
  completed: "2026-05-27"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 6 Plan 01: Setup-Channels RED-State Test Scaffold Summary

RED-state test scaffold for `runChannelsWizard` covering CHANWIZ-01 through CHANWIZ-05 — 5 failing stubs that define the exact behavioral contract for Flow A channel wizard.

## What Was Built

Created `test/control/setup/setup-channels.test.ts` with:
- `mockReadline(responses)` helper — patches `node:readline` createInterface with a FIFO queue of pre-determined responses to avoid TTY requirements
- `describe('setup-channels wizard')` block with `beforeEach`/`afterEach` saving and restoring all relevant env vars (`TELEGRAM_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`, `ZALO_BOT_TOKEN`, `CLISBOT_CONFIG_PATH`), creating a fresh temp dir per test, and capturing `console.log` output
- 5 test stubs (CHANWIZ-01 through CHANWIZ-05)

## Test Coverage

| Test | Requirement | Behavior Under Test |
|------|-------------|---------------------|
| CHANWIZ-01 | Env var detection | Output acknowledges TELEGRAM_BOT_TOKEN; no token prompt emitted |
| CHANWIZ-02 | Channel skip | No token written to config when user selects 'n' |
| CHANWIZ-03 | DM policy default | Config contains `directMessagesPolicy: "pairing"`; no DM policy question in output |
| CHANWIZ-04 | Review screen | Output contains "review" text; config written after confirmation |
| CHANWIZ-05 | Success screen | Output contains exact string "clisbot setup agent" |

## RED State Verification

```
bun test test/control/setup/setup-channels.test.ts
# error: Cannot find module '../../../src/control/setup/setup-channels.ts'
# 0 pass / 1 fail / 1 error
```

All 5 tests fail because `src/control/setup/setup-channels.ts` does not exist yet. This is the intended Wave 0 RED state.

## TDD Gate Compliance

- RED gate: This plan — `test(06-01)` commit `20b6b8a` creates failing stubs
- GREEN gate: Plans 06-02 through 06-05 implement the wizard and turn stubs GREEN
- CHANWIZ-05 specifically: turns GREEN in Plan 06-05 (success screen with unrouted start)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

All 5 tests are intentional stubs in RED state. They are not data stubs — they are TDD RED gates tracking future implementation plans (06-02 through 06-05).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| test/control/setup/setup-channels.test.ts | FOUND |
| Commit 20b6b8a | FOUND |
