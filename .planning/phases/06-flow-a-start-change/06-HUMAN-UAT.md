---
status: partial
phase: 06-flow-a-start-change
source: [06-VERIFICATION.md]
started: 2026-05-27T15:30:00.000Z
updated: 2026-05-27T15:30:00.000Z
---

## Current Test

[awaiting human testing — auto-approved in --auto mode, pending live validation]

## Tests

### 1. Token masking shows asterisks in live TTY
expected: When running `clisbot setup channels` in a real terminal, keystrokes during token prompts appear as `*` characters, not the actual characters typed. The `_writeToOutput` monkey-patch is active when readline's `_writeToOutput` method exists.
result: [pending]

### 2. Wizard starts runtime after config write (CHANWIZ-05 live)
expected: After completing all channel prompts and confirming the review screen, the runtime starts in unrouted mode. The success screen displays `clisbot setup agent` as the exact next command. `clisbot status` confirms the daemon is running.
result: [pending]

### 3. clisbot start warns and continues with channels-only config (START-01 live)
expected: With channels configured but no agent linked, running `clisbot start` prints `warning: no agent configured — starting in unrouted mode. Run clisbot setup agent to add an AI agent.` and then starts the runtime (does not exit with error banner).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
