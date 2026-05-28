---
phase: 08-router-cli-registration
plan: "02"
subsystem: control/setup
tags: [setup, router, cli-registration, wizard]
dependency_graph:
  requires:
    - "08-01: setup-router.ts stub and RED tests"
  provides:
    - "runSetupRouter full implementation (ROUTER-01, ROUTER-02, ROUTER-03)"
    - "setup command in ROOT_COMMAND_TREE"
    - "setup handler in runBuiltinCommand via dynamic import"
  affects:
    - src/control/setup/setup-router.ts
    - src/cli.ts
    - src/main.ts
tech_stack:
  added: []
  patterns:
    - "listStartupChannelDescriptors() for schema-safe channel detection"
    - "Bun #21189 readline cleanup: rl.close() then process.stdin.unref?.() in finally"
    - "dynamic import in runBuiltinCommand to defer wizard code loading"
key_files:
  created: []
  modified:
    - src/control/setup/setup-router.ts
    - src/cli.ts
    - src/main.ts
decisions:
  - "Used listStartupChannelDescriptors().some(d => d.isEnabled(config)) instead of direct config.bots['zalo-bot'] access — plan had wrong key name (kebab-case); actual schema uses camelCase zaloBot; registry pattern is schema-safe and extensible"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-28T02:21:21Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 08 Plan 02: setup-router GREEN + CLI Registration Summary

Smart-router for `clisbot setup` fully implemented — three dispatch paths (no-config, channels-only, both-configured) passing 3/3 tests, registered in CLI command tree, and wired via dynamic import in main.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement setup-router.ts (GREEN) | 5d17e83 | src/control/setup/setup-router.ts |
| 2 | Register setup in cli.ts + wire main.ts | f78dcb3 | src/cli.ts, src/main.ts |

## What Was Built

### setup-router.ts (89 lines)

Full implementation of `runSetupRouter` with three routing paths:

- **ROUTER-01**: `!hasChannelsConfigured` → direct `runChannelsWizard` call, no menu, no preamble
- **ROUTER-02**: channels configured, no agent → preamble containing "Channels configured" then `runAgentWizard`
- **ROUTER-03**: both configured → `displayStatusAndChooseFlow` opens readline menu, shows current config summary, dispatches on `'1'` or `'2'`, silently ignores other input

Channel detection uses `listStartupChannelDescriptors().some(d => d.isEnabled(config))` — safe against schema evolution, matches the pattern in `setup-agent.ts`.

### cli.ts changes

- Added `| { name: "setup"; args: string[] }` to `ParsedCliCommand` union (after `init`)
- Added setup node to `ROOT_COMMAND_TREE` before `init`, with `passthroughArgs: true`

### main.ts changes

- Added `command.name === "setup"` handler in `runBuiltinCommand`
- Dynamic import `await import('./control/setup/setup-router.ts')` — wizard code stays out of main process until needed
- Calls `runSetupRouter({ args: command.args })`

## Verification Results

```
bun test test/control/setup/setup-router.test.ts
3 pass, 0 fail (7 expect() calls)

bunx tsc --noEmit
(no output — zero errors)

grep -n "name: 'setup'" src/cli.ts
46:  | { name: "setup"; args: string[] }
283:      name: "setup",
292:      handler: ({ passthroughArgs }) => ...

grep -n "command.name === 'setup'" src/main.ts
113:  if (command.name === "setup") {
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used listStartupChannelDescriptors() instead of direct config.bots['zalo-bot'] access**
- **Found during:** Task 1 — first test run showed `TypeError: undefined is not an object (evaluating 'config.bots["zalo-bot"].defaults')`
- **Issue:** Plan specified `config.bots['zalo-bot']` but actual config schema uses camelCase key `zaloBot`. The bracket notation `['zalo-bot']` produced `undefined`.
- **Fix:** Replaced hardcoded key access with `listStartupChannelDescriptors().some(d => d.isEnabled(config))` — mirrors the pattern already used in `setup-agent.ts` and is robust to schema key naming.
- **Files modified:** src/control/setup/setup-router.ts
- **Commit:** 5d17e83

## Known Stubs

None — all three routing paths are fully wired with real wizard calls.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary surfaces introduced. Input validation for readline choice is enforced: only `'1'` and `'2'` dispatch; all other values fall through silently (T-08-04 mitigated as designed).

## Self-Check: PASSED

- [x] src/control/setup/setup-router.ts — 89 lines, exists
- [x] src/cli.ts — setup in ParsedCliCommand union and ROOT_COMMAND_TREE
- [x] src/main.ts — dynamic import handler for command.name === 'setup'
- [x] Commit 5d17e83 exists (Task 1)
- [x] Commit f78dcb3 exists (Task 2)
- [x] 3/3 tests pass
- [x] Zero TypeScript errors
- [x] STATE.md not modified
- [x] ROADMAP.md not modified
