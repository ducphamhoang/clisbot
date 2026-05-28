---
status: partial
phase: 08-setup-router
source: [08-VERIFICATION.md]
started: 2026-05-28T03:00:00.000Z
updated: 2026-05-28T03:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. ROUTER-01 live path — no channels configured
expected: Running `clisbot setup` in a real terminal with no config (or an empty one) launches the channels wizard directly without showing a setup menu.
result: [pending]

### 2. ROUTER-02 live path — channels configured, no agent
expected: Running `clisbot setup` with channels configured but no agent shows a brief preamble ("Channels configured. Now set up your AI agent...") then launches the agent wizard directly without showing a menu.
result: [pending]

### 3. ROUTER-03 menu interaction — both configured
expected: Running `clisbot setup` with both channels and agent configured shows the status summary (current channels + agent) and a numbered menu. Choosing 1 launches channels wizard; choosing 2 launches agent wizard.
result: [pending]

### 4. `clisbot setup channels` direct routing
expected: `clisbot setup channels` launches the channels wizard directly regardless of current config state. Config is written to the correct default path, not a path named "channels".
result: [pending]

### 5. `clisbot setup agent` direct routing
expected: `clisbot setup agent` launches the agent wizard directly regardless of current config state. Config is written to the correct default path, not a path named "agent".
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
