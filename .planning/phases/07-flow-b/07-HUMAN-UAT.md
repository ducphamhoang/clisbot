---
status: partial
phase: 07-flow-b
source: [07-VERIFICATION.md]
started: 2026-05-28T01:53:00.000Z
updated: 2026-05-28T01:53:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live wizard walkthrough
expected: Running `clisbot setup agent` in a real terminal shows channel summary, CLI tool selection with binary check, bot type selection with plain-English descriptions, channel linking, and a success screen with routing hint. Ctrl+C at any prompt exits cleanly with no partial config written.
result: [pending]

### 2. Real binary detection
expected: Selecting a CLI tool that is installed passes the binary check and wizard continues. Selecting a CLI tool that is NOT installed shows the correct install instruction (e.g. `npm install -g @openai/codex`) and re-prompts.
result: [pending]

### 3. Full flow with runtime start
expected: After agent config is written, if the daemon is running it reloads automatically; if stopped, `startDetachedRuntime` is called and the operator sees the routing chain and a hint to run `clisbot routes add`.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
