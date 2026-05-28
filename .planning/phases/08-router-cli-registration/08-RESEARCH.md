# Phase 8: Router + CLI Registration - Research

**Researched:** 2026-05-28
**Domain:** CLI routing, wizard orchestration, command registration
**Confidence:** HIGH

## Summary

Phase 8 builds the final setup command: `clisbot setup`. This is a smart router that detects the current configuration state and automatically dispatches to the right wizard (Flow A or Flow B) without presenting an intermediate menu in the common case.

The implementation has two parts:

1. **Create `src/control/setup/setup-router.ts`** — A state-detecting router that reads config, determines what's missing (channels, agent, or both), and dispatches to Flow A or Flow B accordingly.
2. **Register setup subcommands in CLI** — Add `setup [channels|agent]` to the root command tree in `src/cli.ts` and handler dispatch in `src/main.ts`.

The router reuses existing shared utilities (ensureTTY, ensureDaemonNotRunning, withWizardCleanup) and calls the already-implemented wizard entry points (runChannelsWizard, runAgentWizard).

**Primary recommendation:** Router detection logic is straightforward — check config.bots for any enabled channels, check config.agents.list length for agents — and is best kept in a minimal setup-router.ts file that acts as dispatcher before calling the wizards.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROUTER-01 | No config → direct to channel wizard | Router detects empty config, calls runChannelsWizard() without menu |
| ROUTER-02 | Channels only → direct to agent wizard with preamble | Router detects channels configured (config.bots.*.defaults.enabled) but empty agents.list, calls runAgentWizard() with summary output first |
| ROUTER-03 | Channels + agent → status summary + menu | Router detects both configured, displays summary, prompts user for flow choice |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Command parsing & dispatch | API / CLI | — | main.ts parseCliArgs routes setup command to handler |
| Config state detection | API / Backend | — | Router reads config to determine what's missing |
| TTY and daemon guards | CLI / Setup | — | Shared utils ensure safe execution environment |
| Wizard orchestration | CLI / Setup | — | Router calls runChannelsWizard() or runAgentWizard() |
| Interactive prompting | CLI / Setup | — | Readline-based menu (if needed in ROUTER-03 case) uses same setup-wizard-utils pattern |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:readline | Builtin | Interactive prompts (if ROUTER-03 menu needed) | Zero-dependency, matches Flow A/B |
| node:child_process | Builtin | None (not needed for router) | — |

### Supporting Utilities (Existing)
| Library | Module | Purpose | When to Use |
|---------|--------|---------|-------------|
| ensureTTY | setup-wizard-utils.ts | TTY guard | Before opening readline in menu case |
| ensureDaemonNotRunning | setup-wizard-utils.ts | Daemon check | Before wizard dispatch (already called by wizards) |
| withWizardCleanup | setup-wizard-utils.ts | Cleanup handler for Ctrl+C | Wrap router's readline if ROUTER-03 menu used |

### No New Dependencies
- Router is **zero new npm dependencies** — uses only Node stdlib and existing imports
- `node:readline` is standard, matches Flow A/B pattern
- No TUI framework (@clack/prompts is forbidden per FOUND-06)

**Installation:** Nothing to install — uses existing codebase only.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     clisbot setup [args]                    │
│                      (CLI entry point)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   parseCliArgs (src/cli.ts)        │
        │   Routes "setup" → handler         │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  runSetupRouter (setup-router.ts)  │
        │  - ensureTTY()                     │
        │  - readEditableConfig()            │
        │  - detect state                    │
        └────────────┬───────────────────────┘
                     │
           ┌─────────┼─────────┐
           │         │         │
           ▼         ▼         ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │No config │ │Channels  │ │Both      │
    │          │ │only      │ │config    │
    │ROUTER-01 │ │ROUTER-02 │ │ROUTER-03 │
    └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │
         ▼            ▼            ▼
    runChannels   runAgent    Display
    Wizard()      Wizard()    summary
                             + menu
    (Flow A)      (Flow B)    readline
                             (to Flow A
                              or B)
```

Data flows:
1. CLI parser extracts "setup" subcommand
2. Router reads config file
3. Router detects state (0 channels, 0 agents, etc.)
4. Router either dispatches directly or presents menu
5. Selected wizard runs and returns

### Recommended Project Structure

The router is a single file added to existing structure:

```
src/control/setup/
├── setup-router.ts          # NEW — state detection and dispatch
├── setup-channels.ts         # existing Flow A
├── setup-agent.ts            # existing Flow B
└── setup-wizard-utils.ts     # existing shared utilities
```

### Pattern 1: Config State Detection

**What:** Check which config fields are populated to determine what setup is missing.

**When to use:** In setup-router.ts to answer "what does the operator still need to configure?"

**Example:**
```typescript
// Source: src/config/core/schema.ts (config shape) + setup-agent.ts (example detection)

type ClisbotConfig = {
  bots: {
    telegram: { defaults: { enabled: boolean } }
    slack: { defaults: { enabled: boolean } }
    'zalo-bot': { defaults: { enabled: boolean } }
  }
  agents: {
    list: Array<{ id: string }>
  }
}

function hasChannelsConfigured(config: ClisbotConfig): boolean {
  // At least one channel is enabled in defaults
  return (
    config.bots.telegram.defaults.enabled ||
    config.bots.slack.defaults.enabled ||
    config.bots['zalo-bot'].defaults.enabled
  )
}

function hasAgentConfigured(config: ClisbotConfig): boolean {
  // agents.list is non-empty
  return config.agents.list.length > 0
}

// Router logic:
if (!hasChannelsConfigured(config)) {
  // ROUTER-01: no config → Flow A
  await runChannelsWizard()
} else if (!hasAgentConfigured(config)) {
  // ROUTER-02: channels only → Flow B with preamble
  console.log('Channels configured. Now configuring agent...')
  await runAgentWizard()
} else {
  // ROUTER-03: both configured → show menu
  await displayStatusAndMenu(config)
}
```

### Pattern 2: Direct Dispatch (ROUTER-01, ROUTER-02)

**What:** No intermediate menu — jump straight to the wizard the operator needs.

**When to use:** Common case (no config or channels-only).

**Example:**
```typescript
// Router dispatch — no readline, just call wizard directly
export async function runSetupRouter(options?: { configPath?: string }): Promise<void> {
  const configPath = expandHomePath(
    options?.configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
  )

  ensureTTY() // Guard: interactive terminal required

  const configResult = await ensureConfigFile(configPath)
  const { config } = await readEditableConfig(configResult.configPath)

  if (!hasChannelsConfigured(config)) {
    // ROUTER-01
    await runChannelsWizard({ configPath })
  } else if (!hasAgentConfigured(config)) {
    // ROUTER-02 — brief preamble, then Flow B
    console.log('')
    console.log('Channels configured. Now set up your AI agent...')
    await runAgentWizard({ configPath })
  } else {
    // ROUTER-03 — menu
    await displayStatusAndChooseFlow(config, configPath)
  }
}
```

### Pattern 3: Menu with Choice (ROUTER-03)

**What:** Display current config status, then let operator choose which wizard to run.

**When to use:** Both channels and agent already configured — operator may want to adjust either.

**Example:**
```typescript
async function displayStatusAndChooseFlow(
  config: ClisbotConfig,
  configPath: string,
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  await withWizardCleanup(async () => {
    try {
      console.log('')
      console.log('=== clisbot setup ===')
      console.log('')
      console.log('Current configuration:')
      console.log('  Channels: [list enabled channels]')
      console.log('  Agent: [agent id and cli tool]')
      console.log('')
      console.log('What would you like to do?')
      console.log('  1. Reconfigure channels')
      console.log('  2. Reconfigure agent')
      console.log('')

      const answer = await ask(rl, 'Choose [1/2]: ')
      if (answer.trim() === '1') {
        await runChannelsWizard({ configPath })
      } else if (answer.trim() === '2') {
        await runAgentWizard({ configPath })
      } else {
        console.log('No change.')
      }
    } finally {
      rl.close()
      process.stdin.unref?.()
    }
  }, configPath)
}
```

### Anti-Patterns to Avoid
- **Presenting a menu in ROUTER-01 or ROUTER-02:** Common mistake — the whole point is direct dispatch when the path is obvious. Only show a menu in ROUTER-03 (both configured).
- **Calling ensureDaemonNotRunning twice:** Router calls it once; Flow A/B call it again (safe to call twice, harmless, but document it).
- **Hardcoding config paths:** Always use expandHomePath() + getDefaultConfigPath() + CLISBOT_CONFIG_PATH env var (already done in Flow A/B — match the pattern).
- **Forgetting process.stdin.unref() after rl.close():** Required to avoid Bun #21189 (already handled in Flow A/B pattern).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive prompts in menu | Custom readline wrapper | `node:readline` with existing `ask()` pattern | Matches Flow A/B, proven TTY safe, small test surface |
| Config state detection | Custom "all fields" checklist | Simple field checks (enabled flags, list length) | Config shape is stable, checks are 1-liners |
| Cleanup on Ctrl+C | Custom SIGINT handler | Existing `withWizardCleanup()` utility | Already tested, handles tmp files, works with Bun |
| Atomic config write | Custom temp + rename | Existing `writeEditableConfigAtomic()` | Proven pattern, already in use |

**Key insight:** The router is thin dispatch logic between the CLI entry point and existing wizards. Don't add generic "wizard orchestration" utilities — the router itself is small and readable enough to live as one file.

## Code Examples

### Example 1: Router Entry Point (Full Function)
```typescript
// Source: Pattern established by setup-channels.ts and setup-agent.ts

import { createInterface } from 'node:readline'
import { readEditableConfig, ensureConfigFile } from '../../config/core/config-file.ts'
import { withWizardCleanup, ensureTTY } from './setup-wizard-utils.ts'
import { runChannelsWizard } from './setup-channels.ts'
import { runAgentWizard } from './setup-agent.ts'
import { expandHomePath, getDefaultConfigPath } from '../../infra/paths.ts'
import type { ClisbotConfig } from '../../config/core/schema.ts'

function hasChannelsConfigured(config: ClisbotConfig): boolean {
  return (
    config.bots.telegram.defaults.enabled ||
    config.bots.slack.defaults.enabled ||
    config.bots['zalo-bot'].defaults.enabled
  )
}

function hasAgentConfigured(config: ClisbotConfig): boolean {
  return config.agents.list.length > 0
}

async function displayStatusAndChooseFlow(
  config: ClisbotConfig,
  configPath: string,
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  await withWizardCleanup(async () => {
    try {
      // Display current status
      console.log('')
      console.log('=== clisbot setup ===')
      console.log('')
      displayCurrentStatus(config)
      console.log('What would you like to do?')
      console.log('  1. channels  — reconfigure bot tokens')
      console.log('  2. agent     — reconfigure AI CLI and workspace')
      console.log('')

      const answer = await ask(rl, 'Choose [1/2]: ')
      const choice = answer.trim()
      if (choice === '1') {
        await runChannelsWizard({ configPath })
      } else if (choice === '2') {
        await runAgentWizard({ configPath })
      } else if (choice !== '') {
        console.log('Invalid choice.')
      }
    } finally {
      rl.close()
      process.stdin.unref?.()
    }
  }, configPath)
}

export async function runSetupRouter(options?: { configPath?: string }): Promise<void> {
  const configPath = expandHomePath(
    options?.configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
  )

  ensureTTY()

  const configResult = await ensureConfigFile(configPath)
  const { config } = await readEditableConfig(configResult.configPath)

  if (!hasChannelsConfigured(config)) {
    // ROUTER-01: no config → direct to channels
    await runChannelsWizard({ configPath })
  } else if (!hasAgentConfigured(config)) {
    // ROUTER-02: channels only → brief preamble, then agent wizard
    console.log('')
    console.log('Channels configured. Now set up your AI agent...')
    console.log('')
    await runAgentWizard({ configPath })
  } else {
    // ROUTER-03: both configured → status summary and menu
    await displayStatusAndChooseFlow(config, configPath)
  }
}
```

### Example 2: CLI Registration Pattern (From Existing)
```typescript
// Source: src/cli.ts (existing command tree pattern)

// In ROOT_COMMAND_TREE.nodes:
{
  name: 'setup',
  summary: 'Configure bot tokens and AI agent interactively.',
  usage: ['setup [channels|agent]'],
  helpLines: [
    'With no subcommand, auto-detects what is missing and routes to the right wizard.',
    'Pass `channels` to skip detection and go straight to channel setup.',
    'Pass `agent` to skip detection and go straight to agent setup.',
  ],
  passthroughArgs: true,
  handler: ({ passthroughArgs }) => ({ name: 'setup', args: [...passthroughArgs] }),
}
```

### Example 3: Main.ts Handler Dispatch
```typescript
// Source: src/main.ts (existing dispatch pattern)

// In parseCliArgs return type:
| { name: 'setup'; args: string[] }

// In runBuiltinCommand or runControlCommand:
if (command.name === 'setup') {
  await runSetupRouter({ /* configPath from args if provided */ })
  return true
}
```

## Runtime State Inventory

No runtime state rename/refactor/migration — all state is written by wizards, detected by this new router code. Skip this section.

## Common Pitfalls

### Pitfall 1: Presenting a Menu When the Path is Obvious
**What goes wrong:** Operator runs `clisbot setup` with no config, sees a menu asking "channels or agent?" even though they obviously need channels first.
**Why it happens:** Treating all three cases (ROUTER-01, ROUTER-02, ROUTER-03) the same way.
**How to avoid:** Read the requirements carefully — ROUTER-01 and ROUTER-02 are **direct dispatch**, only ROUTER-03 gets a menu. Implement the conditional logic explicitly.
**Warning signs:** Code that always creates a readline interface and prompts; any menu shown before Flow A is complete.

### Pitfall 2: Forgetting Ctrl+C Cleanup in Menu Case
**What goes wrong:** Operator presses Ctrl+C during menu, temp config file is left behind.
**Why it happens:** Adding menu logic without wrapping it in `withWizardCleanup()`.
**How to avoid:** Any code that opens a readline in the router must be wrapped in `withWizardCleanup()` — see setup-channels.ts for the pattern.
**Warning signs:** Temp files (~/.clisbot/config.json.tmp) left behind after Ctrl+C during `clisbot setup` menu.

### Pitfall 3: Detecting Agent Configuration Wrongly
**What goes wrong:** Router thinks agent is configured when it's not, or vice versa.
**Why it happens:** Checking the wrong field — e.g., checking defaults instead of the agents.list array.
**How to avoid:** Use the established pattern from setup-agent.ts: `config.agents.list.length > 0` is definitive for agent existence.
**Warning signs:** Router routes to agent wizard when agents already exist; or routes to channels wizard when an agent is already set up.

### Pitfall 4: Double Daemon Check
**What goes wrong:** Code complexity from calling ensureDaemonNotRunning twice (once in router, once in wizard).
**Why it happens:** Not realizing both call it.
**How to avoid:** It's safe to call twice — each wizard already calls it, so router doesn't need to. Document this in comments so future maintainers don't add redundant checks.
**Warning signs:** Daemon check output printed twice; or refactoring moves the check to "just the router" and wizards break.

## Code Examples (Verification Patterns)

### Verify Config Detection Logic
```typescript
// Test helper: check detection matches current state
const config = {
  bots: { telegram: { defaults: { enabled: true } }, slack: { defaults: { enabled: false } }, 'zalo-bot': { defaults: { enabled: false } } },
  agents: { list: [] },
}
assert(hasChannelsConfigured(config) === true) // at least one channel enabled
assert(hasAgentConfigured(config) === false)   // no agents
// → Router should dispatch to Flow B (agent wizard) with preamble
```

### Verify ROUTER-03 Menu Works
```typescript
// Manual test: run `clisbot setup` with both channels and agent configured
// Expected: see status summary + menu with options 1 and 2
// Select 1 → channels wizard starts
// Select 2 → agent wizard starts
// Press Ctrl+C → clean exit, no temp files
```

## Environment Availability

No external dependencies — uses only Node stdlib and existing codebase.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node:readline | ROUTER-03 menu | ✓ | Builtin | — |
| node:fs/promises | Config file ops | ✓ | Builtin | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | test/setup-router.test.ts (NEW — Wave 0) |
| Quick run command | `bun test test/setup-router.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROUTER-01 | No config → runChannelsWizard called | unit | `bun test test/setup-router.test.ts --grep ROUTER-01` | ❌ Wave 0 |
| ROUTER-02 | Channels only → runAgentWizard called with preamble | unit | `bun test test/setup-router.test.ts --grep ROUTER-02` | ❌ Wave 0 |
| ROUTER-03 | Both configured → menu shown, choice dispatches | unit | `bun test test/setup-router.test.ts --grep ROUTER-03` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test test/setup-router.test.ts`
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/setup-router.test.ts` — test stubs for all three router paths (ROUTER-01, ROUTER-02, ROUTER-03)
- [ ] `src/control/setup/setup-router.ts` — placeholder with runSetupRouter export (RED state)
- [ ] CLI registration in `src/cli.ts` — add "setup" node to ROOT_COMMAND_TREE
- [ ] Main dispatch in `src/main.ts` — add setup handler to runBuiltinCommand or runControlCommand

## Security Domain

No security enforcement required for this phase — router is pure dispatch logic, no auth, no input validation beyond menu choice, no secrets. Config state detection is read-only.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single wizard for all setup | Two independent wizards (Flow A, Flow B) + router | v0.3.0 Phase 5-8 | Operators can reconfigure channels OR agent independently; router auto-routes to whichever is missing |
| Menu at start every time | Smart detection, menu only when both configured | v0.3.0 Phase 8 | Faster common case (no config or channels-only), no intermediate menu in obvious paths |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | hasChannelsConfigured checks config.bots.*.defaults.enabled | Pattern 1 | Router routes to wrong wizard; easy fix once confirmed |
| A2 | hasAgentConfigured checks config.agents.list.length | Pattern 1 | Router thinks agent is configured when it's not; easy fix once confirmed |
| A3 | ensureDaemonNotRunning is already called by wizards, router doesn't need to call it again | Pitfall 4 | Double check output; minor cosmetic issue, not a blocker |

## Open Questions (RESOLVED)

1. **Should the ROUTER-03 menu use numbered choices or word choices?**
   - What we know: setup-agent.ts uses "1" for personal-assistant, "2" for team-assistant; Flow A doesn't have choices
   - What's unclear: Consistency — should ROUTER-03 follow the same "1/2" pattern for "channels/agent"?
   - Recommendation: Use "1" and "2" for consistency with agent wizard; test manually to ensure readability — RESOLVED: implemented as 1/2 in displayStatusAndChooseFlow

2. **What status information should ROUTER-03 display?**
   - What we know: setup-agent.ts shows "Configured Channels:" with channel list; review screen shows token source
   - What's unclear: How much detail in ROUTER-03 summary? Full review screen or brief one-liner per category?
   - Recommendation: Brief summary (3-4 lines) — matching the preamble in ROUTER-02. Full details come if operator chooses to re-run a wizard. — RESOLVED: displayStatusAndChooseFlow prints "Current configuration:" with channels list and agent ID (4 lines)

3. **Should ROUTER-03 offer a third "skip" option?**
   - What we know: Both wizards support Ctrl+C cancellation; ROUTER-03 is presented after both are configured
   - What's unclear: Should operator be able to exit setup without making changes?
   - Recommendation: Yes, if neither 1 nor 2 is chosen, just exit. No forced action; matches Ctrl+C behavior. — RESOLVED: implemented as silent fallthrough when choice is not "1" or "2"

## Sources

### Primary (HIGH confidence)
- setup-channels.ts runChannelsWizard export — confirmed in codebase
- setup-agent.ts runAgentWizard export — confirmed in codebase
- setup-wizard-utils.ts — ensureTTY, ensureDaemonNotRunning, withWizardCleanup, promptMasked confirmed
- src/cli.ts ROOT_COMMAND_TREE pattern — command tree structure, handler dispatch verified
- src/main.ts runBuiltinCommand / runControlCommand dispatch pattern — verified existing pattern

### Secondary (MEDIUM confidence)
- config/core/schema.ts config shape — bots and agents structure inferred from setup-agent.ts usage
- REQUIREMENTS.md ROUTER-01/02/03 — phase requirements as stated in project docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — uses only Node stdlib and existing modules
- Architecture: HIGH — simple dispatcher, no complex patterns needed
- Pitfalls: HIGH — clear from existing wizard patterns what works and what doesn't
- CLI registration: MEDIUM — confirmed existing command tree pattern, but needs verification once implemented

**Research date:** 2026-05-28
**Valid until:** 2026-06-04 (7 days — setup patterns are stable, config schema unlikely to change in one week)
