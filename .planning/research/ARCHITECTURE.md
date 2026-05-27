# Architecture Research — Setup Wizard Integration

**Project:** clisbot v0.3.0 — Interactive Setup Wizard
**Researched:** 2026-05-27
**Confidence:** HIGH — derived from direct source reading, no speculation

---

## New Files

| File | Purpose | Line Estimate |
|------|---------|---------------|
| `src/control/commands/setup-cli.ts` | Top-level `clisbot setup` router. Reads config state, decides which flow (A or B) is needed, dispatches. Entry point registered in CLI index. | ~80 |
| `src/control/commands/setup-channels-cli.ts` | Flow A wizard. Collects channel tokens via readline, validates, writes config via existing `applyBootstrapBotsToConfig` + `writeEditableConfig`, then calls `startDetachedRuntime` directly. | ~180 |
| `src/control/commands/setup-agent-cli.ts` | Flow B wizard. Collects CLI tool + bot-type, checks binary via `commandExists`, calls `addAgentToEditableConfig`, then calls `requireChannelBotRecord` + `writeEditableConfig` to bind the agent to each configured bot. No CLI re-dispatch. | ~150 |
| `src/control/commands/setup-state.ts` | Wizard resume state. Reads/writes `wizard-state.json` under `getDefaultStateDir()`. Exports `readWizardState`, `writeWizardState`, `clearWizardState`. No config loading — state is a separate document. | ~60 |
| `src/control/commands/setup-wizard-validation.ts` | Pure validation helpers: token format checks, binary existence check wrapper around `commandExists`, channel reachability probe stubs. No I/O, no config reads. | ~80 |

Total new code: ~550 lines across 5 files. All files stay under the 500-line target.

---

## Modified Files

| File | What Changes | Risk Level |
|------|-------------|------------|
| `src/control/commands/runtime-bootstrap-cli.ts` | `start()` function: remove hard-fail branch for "channels configured, no agent"; replace with warning + continue. TTY guard does NOT go here — wizard is a separate command, not embedded in `start`. | LOW — isolated branch change in `start()` around `ensureDefaultAgentBootstrap` return value |
| CLI entry point (main index / `src/control/commands/index.ts` or equivalent) | Register `setup` subcommand, routing to `setup-cli.ts` | LOW — additive only |

---

## Key Integration Points

### Q1: TTY guard placement relative to `prepareBootstrapState`

The TTY guard (`process.stdin.isTTY`) does NOT belong in `runtime-bootstrap-cli.ts`. The wizard is invoked via a separate `clisbot setup` command, not embedded in `clisbot start`. The guard belongs at the top of `setup-cli.ts`, `setup-channels-cli.ts`, and `setup-agent-cli.ts`, before any readline is opened:

```
setup-cli.ts: runSetupWizard()
  if (!process.stdin.isTTY) throw/exit with non-interactive message
  → determine which flow is needed
  → dispatch to setup-channels-cli or setup-agent-cli
```

`prepareBootstrapState` is not called by any wizard file. The wizard manages its own config loading via `readEditableConfig` + `writeEditableConfig` directly, mirroring what `prepareBootstrapState` does without reusing its flag-parsing and mem-credential logic.

### Q2: How `setup-state.ts` reads config without duplicating config loading

`setup-state.ts` must not load `ClisbotConfig` at all. It is a narrow resume-state document only. Config loading stays in the individual wizard files (`setup-channels-cli.ts`, `setup-agent-cli.ts`) via the existing `readEditableConfig` from `src/config/core/config-file.ts`.

The resume state shape is:
```typescript
type WizardState = {
  completedSteps: string[]   // e.g. ['channels']
  lastAttemptedStep: string  // e.g. 'agent'
  timestamp: number
}
```

`setup-state.ts` uses `getDefaultStateDir()` from `src/infra/paths.ts` to locate `wizard-state.json` — the same directory as sessions, pid, and activity files. It reads/writes with `readTextFile`/`writeTextFile` from `src/infra/fs.ts`. No schema.ts types, no config imports.

### Q3: Calling `startDetachedRuntime` from `setup-channels-cli.ts` bypassing `ensureDefaultAgentBootstrap`

`startDetachedRuntime` is already exported directly from `src/control/runtime/runtime-process.ts`. The wizard calls it directly, skipping `ensureDefaultAgentBootstrap` entirely:

```
setup-channels-cli.ts call chain:
  readEditableConfig(configPath)
  → applyBootstrapBotsToConfig(config, bots, { firstRun })    // from channel-bot-management.ts
  → writeEditableConfig(configPath, config)
  → ensureConfigFile(configPath)                               // from runtime-process.ts
  → startDetachedRuntime({                                     // from runtime-process.ts
      scriptPath: process.argv[1]!,
      configPath,
      extraEnv: runtimeMemEnv,
      runtimeCredentialsPath: getDefaultRuntimeCredentialsPath(),
    })
```

This is the same call `start()` makes in `runtime-bootstrap-cli.ts` at line 469, minus `ensureDefaultAgentBootstrap`. The wizard intentionally starts runtime in "unrouted" mode (channels enabled, no agent assigned). That is not a bug — it is the defined behavior for Flow A.

`buildBootstrapRuntimeMemEnv` from `channel-bot-management.ts` is used to build `extraEnv` from the collected tokens, matching what `start()` does.

### Q4: Calling `bots set-agent` from `setup-agent-cli.ts` — direct function call, not CLI re-dispatch

CLI re-dispatch (spawning a subprocess or calling `runBotsCli(["set-agent", ...])`) is wrong here. The agent-binding logic in `bots set-agent` is 10 lines of config mutation (lines 294–302 in `bots-cli.ts`). That logic is not exported as a standalone function — the mutation is inline in `getOrSetBotAgent`.

The correct approach is a direct config mutation in `setup-agent-cli.ts`, mirroring what `getOrSetBotAgent` does:

```
setup-agent-cli.ts call chain for agent binding:
  readEditableConfig(configPath)
  → requireChannelBotRecord(config, channelId, botId)   // from channel-bots.ts — exported
  → bot.agentId = agentId                               // direct mutation
  → writeEditableConfig(configPath, config)             // persist once after all bots updated
```

`requireChannelBotRecord` is already exported from `src/config/channels/channel-bots.ts`. The wizard iterates over all configured channel bots and sets `agentId` on each, then does a single `writeEditableConfig`. This keeps the mutation path DRY relative to the existing pattern and avoids any CLI subprocess dependency.

Do not call `runBotsCli` or spawn a subprocess. That would introduce fragile string-based argument construction and break the "wizard calls existing functions" design decision.

### Q5: `wizard-state.json` location relative to `CLISBOT_HOME`

Location: `${CLISBOT_HOME}/state/wizard-state.json`

This maps to `getDefaultStateDir()` which returns `join(resolveAppHomeDir(env), "state")`. This is exactly where pid, sessions, activity, pairing, and runtime-health files already live. The wizard state file belongs in the same directory — it is an operator-facing runtime state artifact, not a credential or config file.

The path helper in `setup-state.ts`:
```typescript
import { getDefaultStateDir } from '../../infra/paths.ts'
import { join } from 'node:path'

function getWizardStatePath(env = process.env) {
  return join(getDefaultStateDir(env), 'wizard-state.json')
}
```

This respects the `CLISBOT_HOME` env var chain: explicit param → `CLISBOT_*` env vars → `CLISBOT_HOME`-derived default. No hardcoded path.

---

## Build Order

| Phase | Files | Rationale |
|-------|-------|-----------|
| Phase 1 — Foundation | `setup-state.ts`, `setup-wizard-validation.ts` | No dependencies on other new files. Pure utilities. Must exist before wizard files import them. |
| Phase 2 — Flow A | `setup-channels-cli.ts` | Depends on Phase 1. Calls only existing functions (`readEditableConfig`, `applyBootstrapBotsToConfig`, `startDetachedRuntime`). Can be built and tested independently of Flow B. |
| Phase 2 — `start()` change | `runtime-bootstrap-cli.ts` | The warning-not-hard-fail change is a prerequisite for Flow A to make sense — if `start()` still hard-fails without an agent, the Flow A result would immediately look broken. Implement alongside Phase 2. |
| Phase 3 — Flow B | `setup-agent-cli.ts` | Depends on Phase 1 (validation). Depends on config state written by Flow A having run first (agents.list is empty, at least one channel bot exists). |
| Phase 4 — Router | `setup-cli.ts` | Depends on both Flow A and Flow B files existing. Implements detection logic and dispatch. Register in CLI entry point here. |

---

## Data Flow

```
clisbot setup
  └── setup-cli.ts: runSetupWizard()
        [TTY guard]
        readWizardState()                    ← setup-state.ts reads state/wizard-state.json
        readEditableConfig(configPath)       ← config/core/config-file.ts
        detect what is missing
        ↓
        if channels missing → setup-channels-cli.ts: runChannelSetupWizard()
          readline prompts for tokens
          validateToken(token)               ← setup-wizard-validation.ts
          applyBootstrapBotsToConfig(config, bots, { firstRun })
          buildBootstrapRuntimeMemEnv(bots, process.env)
          writeEditableConfig(configPath, config)
          ensureConfigFile(configPath)
          startDetachedRuntime({ configPath, extraEnv, scriptPath, runtimeCredentialsPath })
          writeWizardState({ completedSteps: ['channels'] })  ← setup-state.ts
        ↓
        if agent missing → setup-agent-cli.ts: runAgentSetupWizard()
          readline prompts for cli tool + bot type
          commandExists(cliTool)             ← infra/process.ts
          addAgentToEditableConfig({ agentId: 'default', cliTool, bootstrap })  ← agents-cli.ts
          for each configured bot:
            requireChannelBotRecord(config, channel, botId)  ← config/channels/channel-bots.ts
            bot.agentId = 'default'
          writeEditableConfig(configPath, config)
          writeWizardState({ completedSteps: ['channels', 'agent'] })
        ↓
        clearWizardState()                   ← setup-state.ts removes wizard-state.json
```

Config read happens once per wizard invocation (at router level), then passed into flow functions by parameter. Each flow does its own `writeEditableConfig` after mutation. No config loading in `setup-state.ts` or `setup-wizard-validation.ts`.

---

## Dependency Map (imports)

```
setup-cli.ts
  ← setup-channels-cli.ts
  ← setup-agent-cli.ts
  ← setup-state.ts
  ← config/core/config-file.ts (readEditableConfig)
  ← infra/paths.ts (expandHomePath, DEFAULT_CONFIG_PATH)

setup-channels-cli.ts
  ← setup-wizard-validation.ts
  ← setup-state.ts
  ← config/channels/channel-bot-management.ts (applyBootstrapBotsToConfig, buildBootstrapRuntimeMemEnv)
  ← config/core/config-file.ts (readEditableConfig, writeEditableConfig)
  ← control/runtime/runtime-process.ts (ensureConfigFile, startDetachedRuntime)
  ← infra/paths.ts (getDefaultRuntimeCredentialsPath)
  ← channels/catalog/registry.ts (listChannelPlugins)

setup-agent-cli.ts
  ← setup-wizard-validation.ts
  ← setup-state.ts
  ← control/commands/agents-cli.ts (addAgentToEditableConfig)
  ← config/channels/channel-bots.ts (requireChannelBotRecord)
  ← config/core/config-file.ts (readEditableConfig, writeEditableConfig)
  ← infra/process.ts (commandExists)

setup-state.ts
  ← infra/paths.ts (getDefaultStateDir)
  ← infra/fs.ts (readTextFile, writeTextFile)

setup-wizard-validation.ts
  (no internal imports — pure functions + infra/process.ts for commandExists wrapper)
```

No new config mutation primitives are introduced. All config writes go through the existing `writeEditableConfig`. No circular dependencies. All new files sit entirely within `src/control/commands/`.
