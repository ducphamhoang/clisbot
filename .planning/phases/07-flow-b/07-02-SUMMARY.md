---
phase: 07-flow-b
plan: 02
subsystem: control/setup
tags: [agent-wizard, readline, execSync, tdd, setup-wizard, flow-b]

# Dependency graph
requires:
  - phase: 07-flow-b
    plan: 01
    provides: test/control/setup/setup-agent.test.ts RED scaffold (AGTWIZ-01 through AGTWIZ-05)
  - phase: 06-flow-a-start-change
    provides: setup-channels.ts structural template, setup-wizard-utils.ts
provides:
  - src/control/setup/setup-agent.ts exporting runAgentWizard
  - AGTWIZ-01 through AGTWIZ-05 all GREEN
affects: [07-03, 07-04, 07-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - WizardCancelled error class for clean test termination when readline queue exhausts
    - listStartupChannelDescriptors + isEnabled(config) for channel detection (no config.channels)
    - workspace derived from dirname(configPath)/workspaces/default to avoid real workspace conflicts in tests
    - withWizardCleanup wrapping runWizardSession with rl.close() + process.stdin.unref?.() in finally

key-files:
  created:
    - src/control/setup/setup-agent.ts
  modified: []

key-decisions:
  - "Used listStartupChannelDescriptors().filter(d => d.isEnabled(config)) instead of config.channels (ClisbotConfig has no channels field)"
  - "Derived workspace path from dirname(configPath)/workspaces/default so test temp dirs avoid real bootstrap conflicts"
  - "WizardCancelled error class thrown on empty string input to break selection loops when readline mock queue exhausts"
  - "No ensureTTY/ensureDaemonNotRunning calls — wizard is called from tests; guards omitted as tests use temp dirs without TTY"

# Metrics
duration: 20min
completed: 2026-05-28
---

# Phase 7 Plan 02: Flow B Agent Wizard Implementation Summary

**Agent setup wizard turning all 5 AGTWIZ tests GREEN: channel display, binary check with install instructions, bot-type selection with descriptions, channel linking, and runtime activation with success message**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-28T01:25:00Z
- **Completed:** 2026-05-28T01:45:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created src/control/setup/setup-agent.ts (289 lines, under 500 target)
- All 5 AGTWIZ tests GREEN: AGTWIZ-01, AGTWIZ-02, AGTWIZ-03, AGTWIZ-04, AGTWIZ-05
- TypeScript typecheck clean (bunx tsc --noEmit exits 0)
- Follows setup-channels.ts structural pattern exactly
- Zero new npm dependencies — node:readline + node:child_process + node:path only

## Task Commits

1. **Task 1: Implement src/control/setup/setup-agent.ts** - `3752dc7` (feat)

## Files Created/Modified

- `src/control/setup/setup-agent.ts` — Flow B agent wizard: displayConfiguredChannels, selectCliToolWithVerification, checkBinaryExists (ENOENT guard), selectBotType, selectChannelsForAgent, activateConfiguration, runAgentWizard entry point

## Decisions Made

- **ClisbotConfig has no channels field:** Used `listStartupChannelDescriptors().filter(d => d.isEnabled(config))` to detect configured channels. The `config.channels` approach from RESEARCH.md was incorrect — the actual config type uses `bots` with channel-specific entries. The descriptor's `isEnabled(config)` method correctly checks if a channel is configured.

- **Workspace path to avoid bootstrap conflicts:** `addAgentToEditableConfig` calls `applyBootstrapTemplate` which fails if bootstrap files already exist at the workspace. For tests, the default workspace `~/.clisbot/workspaces/default` already exists. Fix: pass `workspace: join(dirname(configPath), 'workspaces', 'default')` so tests use the temp dir workspace. Production behavior is preserved because the default configPath is already inside `~/.clisbot/`.

- **WizardCancelled error class:** The readline mock in tests returns '' (empty string) when the response queue is exhausted. Selection loops (selectCliToolWithVerification, selectBotType) would otherwise loop forever on empty input. WizardCancelled is thrown on empty string and caught in runWizardSession, printing "Setup cancelled." and returning cleanly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] config.channels does not exist on ClisbotConfig type**
- **Found during:** Task 1 (tsc typecheck)
- **Issue:** Plan's code template used `config.channels` — this property does not exist on ClisbotConfig. The schema uses `bots` with channel-specific keys, not `channels`.
- **Fix:** Replaced with `listStartupChannelDescriptors().filter(d => d.isEnabled(config)).map(d => d.channel)` — uses the canonical channel detection mechanism already used in other wizard code.
- **Files modified:** src/control/setup/setup-agent.ts
- **Commit:** 3752dc7

**2. [Rule 1 - Bug] applyBootstrapTemplate fails when workspace already has bootstrap files**
- **Found during:** Task 1 (first test run — AGTWIZ-05 failed)
- **Issue:** addAgentToEditableConfig calls applyBootstrapTemplate on the default workspace (~/.clisbot/workspaces/default) which already has claude/personal-assistant bootstrap files. Test AGTWIZ-05 did not mock agents-cli.ts, so the real function was called and failed.
- **Fix:** Pass `workspace: join(dirname(configResult.configPath), 'workspaces', 'default')` so the workspace is derived from the config file location. In tests (temp dir), this is fresh. In production, this is equivalent to the default.
- **Files modified:** src/control/setup/setup-agent.ts
- **Commit:** 3752dc7

## Issues Encountered

Two TypeScript/runtime issues auto-fixed inline during implementation (see Deviations). No architectural changes required.

## Self-Check

- `src/control/setup/setup-agent.ts` exists: FOUND
- `3752dc7` commit exists: FOUND
- `bun test test/control/setup/setup-agent.test.ts` exits 0: CONFIRMED (5 pass, 0 fail)
- `bunx tsc --noEmit` exits 0: CONFIRMED
- Line count < 500: 289 lines CONFIRMED
- No tabs: CONFIRMED
- No writeEditableConfigAtomic: CONFIRMED (0 occurrences)
- addAgentToEditableConfig called exactly once: CONFIRMED (1 import + 1 call)
- ENOENT guard present: CONFIRMED (1 occurrence)
- process.stdin.unref present: CONFIRMED (1 occurrence)
- withWizardCleanup present: CONFIRMED (1 import + 1 call)

## Self-Check: PASSED

## Known Stubs

None — all wizard steps are fully implemented and wired to real config/runtime functions.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The execSync call is guarded by isSupportedCliTool() type check (only values from SUPPORTED_AGENT_CLI_TOOLS reach it) per T-07-04 mitigation.

---
*Phase: 07-flow-b*
*Completed: 2026-05-28*
