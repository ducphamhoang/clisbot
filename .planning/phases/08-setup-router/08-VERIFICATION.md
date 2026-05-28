---
phase: 08-setup-router
verified: 2026-05-28T03:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run `clisbot setup` with no config file present, observe that it immediately enters the channels wizard without any menu prompt"
    expected: "Interactive channels token prompts appear; no 'What would you like to do?' menu appears"
    why_human: "TTY wizard interaction cannot be tested headlessly; ROUTER-01 path confirmed in code and tests but interactive UX requires a real terminal"
  - test: "Run `clisbot setup` with channels configured but no agent, observe brief preamble and direct entry into agent wizard"
    expected: "'Channels configured. Now set up your AI agent...' printed, then agent wizard prompts appear; no menu"
    why_human: "ROUTER-02 path confirmed in code and tests but live wizard interaction requires a real terminal"
  - test: "Run `clisbot setup` with both channels and agent configured, observe numbered menu, select '1', observe channels wizard"
    expected: "Status summary shows current channels and agent id, menu shown, choosing '1' enters channel wizard"
    why_human: "ROUTER-03 readline path: readline mock in tests patches after import so mock may not fully exercise the real readline path (WR-03 from code review, not yet fixed)"
  - test: "Run `clisbot setup channels` and confirm it routes directly to channels wizard, ignoring any existing config state"
    expected: "Channels wizard prompts appear immediately; no auto-detect menu"
    why_human: "WR-01 fix exists in code (subcommand detection before path resolution); confirm it works end-to-end in a live terminal"
  - test: "Run `clisbot setup agent` and confirm it routes directly to agent wizard, ignoring any existing config state"
    expected: "Agent wizard prompts appear immediately; no auto-detect menu"
    why_human: "Same as above — WR-01 fix verified statically, confirm live behavior"
---

# Phase 8: Setup Router and CLI Registration — Verification Report

**Phase Goal:** Setup router and CLI registration — `clisbot setup` command that auto-detects what is missing and routes to Flow A (channels) or Flow B (agent), plus `clisbot setup channels` / `clisbot setup agent` subcommand shortcuts.
**Verified:** 2026-05-28T03:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ROUTER-01: `clisbot setup` with no channels configured routes directly to `runChannelsWizard` without showing a menu | VERIFIED | `setup-router.ts:127-129` — `if (!hasChannelsConfigured(config)) { await channelsWizard({ configPath }) }`. Test ROUTER-01 passes. |
| 2 | ROUTER-02: `clisbot setup` with channels configured but no agent routes directly to `runAgentWizard` with a brief preamble | VERIFIED | `setup-router.ts:130-135` — preamble `'Channels configured. Now set up your AI agent...'` printed then `agentWizard({ configPath })`. Test ROUTER-02 passes. |
| 3 | ROUTER-03: `clisbot setup` with both configured shows status summary (channels + agent) and a numbered menu | VERIFIED | `setup-router.ts:33-73` — `displayStatusAndChooseFlow` renders channels, agent id, and `[1/2]` prompt. Test ROUTER-03 passes. |
| 4 | CLI-01: `clisbot setup` registered in `cli.ts` with `passthroughArgs: true`, help text mentioning `channels` and `agent` shortcuts | VERIFIED | `cli.ts:283-292` — `passthroughArgs: true`, `usage: ["setup [channels\|agent]"]`, helpLines explicitly mention `channels` and `agent` shortcuts. |
| 5 | CLI-02: `main.ts` handles the `setup` command via dynamic import of `runSetupRouter` | VERIFIED | `main.ts:113-117` — `if (command.name === "setup") { const { runSetupRouter } = await import("./control/setup/setup-router.ts"); await runSetupRouter({ args: command.args }); return true; }` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/control/setup/setup-router.ts` | ROUTER-01/02/03 routing logic | VERIFIED | 140 lines, all three routing branches present, injectable deps pattern, subcommand shortcuts |
| `src/cli.ts` | CLI-01 registration | VERIFIED | `setup` command at line 283, `passthroughArgs: true`, help text with `channels` and `agent` |
| `src/main.ts` | CLI-02 handler | VERIFIED | Dynamic import of `runSetupRouter` at line 114, passes `command.args` |
| `test/control/setup/setup-router.test.ts` | Test coverage for all three routing paths | VERIFIED | 3 tests, all pass — ROUTER-01, ROUTER-02, ROUTER-03 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cli.ts` `setup` node | `ParsedCliCommand` union | `{ name: "setup"; args: string[] }` type | WIRED | Line 46 in union, line 292 in handler |
| `main.ts` | `runSetupRouter` | dynamic `import("./control/setup/setup-router.ts")` | WIRED | `main.ts:114` — conditional on `command.name === "setup"` |
| `runSetupRouter` | `runChannelsWizard` | lazy dynamic import + direct call | WIRED | `setup-router.ts:107-108,115-118` |
| `runSetupRouter` | `runAgentWizard` | lazy dynamic import + direct call | WIRED | `setup-router.ts:109-110,119-122` |
| `hasChannelsConfigured` | `listStartupChannelDescriptors` | imported from `channels/catalog/registry.ts` | WIRED | `setup-router.ts:11,26-28` |

### WR-01 and WR-02 Fix Verification

The code review (08-REVIEW.md) identified two logic correctness warnings. Both are fixed in the current code:

**WR-01 (subcommand routing):** Fixed. `setup-router.ts:91-98` — `subcommand` is detected first (`args[0]?.toLowerCase()`), `isSubcommand` flag set, then configPath resolution uses `isSubcommand` to skip `args[0]` as a path:
```
isSubcommand ? (options?.configPath ?? ...) : (args[0] ?? options?.configPath ?? ...)
```
Direct routing at lines 115-122 exits before any config read when subcommand is recognized.

**WR-02 (type alias):** Fixed. `setup-router.ts:17` — `type EnsureConfigFileFn = (p: string) => Promise<{ configPath: string; created: boolean }>` includes `created: boolean`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All three router tests pass | `bun test test/control/setup/setup-router.test.ts` | 3 pass, 0 fail, 7 expect() calls, 290ms | PASS |
| TypeScript typecheck | `bunx tsc --noEmit` | No errors | PASS |

### Open Items from Code Review (not blockers)

| ID | Severity | Description | Impact |
|----|----------|-------------|--------|
| WR-03 | Warning | readline mock patches `node:readline` after `createInterface` is already bound in `setup-router.ts` — ROUTER-03 test may be passing because the mock does not intercept the real `createInterface` call, and the test only checks `toContain('runAgentWizard called')` without asserting that readline interaction actually drove the choice | Test validity for ROUTER-03 menu interaction is uncertain; the code path is correct but the test coverage of the readline interaction is weak |
| IN-01 | Info | ROUTER-03 test missing negative assertion `not.toContain('runChannelsWizard called')` | Minor coverage gap |
| IN-02 | Info | ROUTER-01 test label says "no config" but is actually "default config with no channels" | Misleading comment |
| IN-03 | Info | Invalid menu input in ROUTER-03 produces silent exit with no user feedback | Suboptimal UX, not a correctness issue |

### Anti-Patterns Found

None blocking. No TODO/FIXME/placeholder comments in any of the four files. No empty return stubs. All files within size limits (largest is `cli.ts` at 451 lines, under the 500-line target).

### Human Verification Required

All automated checks pass. The following require a real terminal to confirm:

#### 1. ROUTER-01 Live Path

**Test:** Run `clisbot setup` in an environment where the config file does not exist or has no channels enabled.
**Expected:** Interactive channels token prompts appear immediately with no menu.
**Why human:** Wizard TTY interaction cannot be headlessly tested; unit tests use injected stubs not real wizards.

#### 2. ROUTER-02 Live Path

**Test:** Run `clisbot setup` with a config that has channels enabled but no agents.
**Expected:** "Channels configured. Now set up your AI agent..." prints, then agent wizard prompts appear.
**Why human:** Same as above.

#### 3. ROUTER-03 Menu Interaction

**Test:** Run `clisbot setup` with both channels and agent configured; observe menu, enter `1`, then `2`.
**Expected:** Status summary shows current channels and agent id; each menu choice enters the correct wizard.
**Why human:** WR-03 (unresolved from code review) — readline mock may not exercise the real readline binding. The menu display and routing logic are correct in code, but live readline interaction should be confirmed.

#### 4. `clisbot setup channels` Direct Routing

**Test:** Run `clisbot setup channels` regardless of config state.
**Expected:** Channels wizard prompts appear immediately; no auto-detect logic runs; config written to correct path (not `<cwd>/channels`).
**Why human:** WR-01 fix is verified statically in code — the path resolution skips `args[0]` when it is `channels` or `agent`. Live confirmation rules out any remaining edge case.

#### 5. `clisbot setup agent` Direct Routing

**Test:** Run `clisbot setup agent` regardless of config state.
**Expected:** Agent wizard prompts appear immediately; config written to correct path (not `<cwd>/agent`).
**Why human:** Same as item 4.

### Gaps Summary

No gaps. All five must-haves are fully implemented, wired, and tested. The two critical bugs identified in the code review (WR-01 subcommand routing, WR-02 type alias) are fixed in the current code. Human verification items are all interactive wizard flows that cannot be tested headlessly.

---

_Verified: 2026-05-28T03:00:00Z_
_Verifier: Claude (gsd-verifier)_
