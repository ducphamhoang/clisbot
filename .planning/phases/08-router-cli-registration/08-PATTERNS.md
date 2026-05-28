# Phase 8: Router + CLI Registration - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 4 new/modified
**Analogs found:** 4 / 4 (exact matches)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/control/setup/setup-router.ts` | service | request-response | `src/control/setup/setup-channels.ts` + `src/control/setup/setup-agent.ts` | exact |
| `test/control/setup/setup-router.test.ts` | test | test-coverage | `test/control/setup/setup-agent.test.ts` | exact |
| `src/cli.ts` | config | config | `src/cli.ts` (self) | self-reference |
| `src/main.ts` | controller | request-response | `src/main.ts` (self) | self-reference |

## Pattern Assignments

### `src/control/setup/setup-router.ts` (service, request-response)

**Primary Analog:** `src/control/setup/setup-channels.ts` lines 60-75 + `src/control/setup/setup-agent.ts` lines 1-45

**Imports pattern** (from setup-channels.ts lines 1-24):
```typescript
import { createInterface } from 'node:readline'
import type { Interface } from 'node:readline/promises'
import {
  writeEditableConfigAtomic,
  withWizardCleanup,
  promptMasked,
} from './setup-wizard-utils.ts'
import { applyBootstrapBotsToConfig } from '../../config/channels/channel-bot-management.ts'
import type { ChannelBootstrapBots } from '../../config/channels/channel-bot-management.ts'
import type { ChannelBootstrapBotInput } from '../../config/channels/channel-bootstrap.ts'
import { listChannelCredentialContracts } from '../../config/channels/channel-credential-contract.ts'
import { getDefaultChannelAvailability } from '../commands/startup-bootstrap.ts'
import { listStartupChannelDescriptors } from '../../channels/catalog/registry.ts'
import {
  startDetachedRuntime,
  ensureConfigFile,
} from '../runtime/runtime-process.ts'
import { readEditableConfig } from '../../config/core/config-file.ts'
import {
  expandHomePath,
  getDefaultConfigPath,
  getDefaultRuntimeCredentialsPath,
} from '../../infra/paths.ts'
```

**Router imports pattern** (adapt from setup-agent.ts lines 1-24):
```typescript
import { createInterface } from 'node:readline'
import { readEditableConfig, ensureConfigFile } from '../../config/core/config-file.ts'
import { withWizardCleanup, ensureTTY } from './setup-wizard-utils.ts'
import { runChannelsWizard } from './setup-channels.ts'
import { runAgentWizard } from './setup-agent.ts'
import { expandHomePath, getDefaultConfigPath } from '../../infra/paths.ts'
import type { ClisbotConfig } from '../../config/core/schema.ts'
```

**Core dispatch pattern** (design from research ROUTER-01/02/03):
```typescript
export async function runSetupRouter(options?: { configPath?: string }): Promise<void> {
  const configPath = expandHomePath(
    options?.configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
  )

  ensureTTY() // Guard: from setup-wizard-utils.ts line 8-14

  const configResult = await ensureConfigFile(configPath)
  const { config } = await readEditableConfig(configResult.configPath)

  if (!hasChannelsConfigured(config)) {
    // ROUTER-01: no config → direct to Flow A (channels wizard)
    await runChannelsWizard({ configPath })
  } else if (!hasAgentConfigured(config)) {
    // ROUTER-02: channels only → brief preamble, then Flow B (agent wizard)
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

**Config detection helpers** (from research FOUND-03, implemented as 1-liners):
```typescript
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
```

**Menu pattern for ROUTER-03** (from setup-channels.ts and setup-agent.ts readline usage):
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
      // Display configured channels (from setup-agent.ts lines 81-93)
      const channelNames = listStartupChannelDescriptors()
        .filter((d) => d.isEnabled(config))
        .map((d) => d.channel)
      console.log('  Channels: ' + (channelNames.length > 0 ? channelNames.join(', ') : '(none)'))
      console.log('  Agent: ' + (config.agents.list.length > 0 ? config.agents.list[0].id : '(none)'))
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
      }
    } finally {
      rl.close()
      process.stdin.unref?.()
    }
  }, configPath)
}

// Helper for readline (from setup-channels.ts lines 33-36)
function ask(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer))
  })
}
```

**Cleanup pattern** (from setup-wizard-utils.ts lines 35-65):
```typescript
// withWizardCleanup wraps any async function, ensuring:
// - SIGINT handler cleans up tmpPath on Ctrl+C
// - process.stdin.unref() called to avoid Bun #21189
// - Error propagation preserved
// Usage: await withWizardCleanup(async () => { ... }, configPath)
```

---

### `test/control/setup/setup-router.test.ts` (test, test-coverage)

**Analog:** `test/control/setup/setup-agent.test.ts` lines 1-100 + `test/control/setup/setup-channels.test.ts` lines 1-100

**Test scaffold pattern** (from setup-agent.test.ts lines 1-82):
```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSetupRouter } from '../../../src/control/setup/setup-router.ts'

function mockReadline(responses: string[]): void {
  const queue = [...responses]
  mock.module('node:readline', () => ({
    createInterface: mock(() => ({
      question(_prompt: string, callback: (answer: string) => void): void {
        const answer = queue.shift() ?? ''
        // Simulate async to match real readline behaviour
        Promise.resolve().then(() => callback(answer))
      },
      close: mock(() => undefined),
      on: mock((_event: string, _handler: unknown) => undefined),
    })),
  }))
}

describe('setup-router', () => {
  let tempDir: string
  let savedConfigPath: string | undefined
  let logOutput: string[]
  let originalConsoleLog: typeof console.log

  beforeEach(() => {
    savedConfigPath = process.env.CLISBOT_CONFIG_PATH
    delete process.env.CLISBOT_CONFIG_PATH
    tempDir = mkdtempSync(join(tmpdir(), 'clisbot-router-test-'))
    logOutput = []
    originalConsoleLog = console.log
    console.log = (...args: unknown[]) => {
      logOutput.push(args.map(String).join(' '))
    }
  })

  afterEach(() => {
    if (savedConfigPath !== undefined) {
      process.env.CLISBOT_CONFIG_PATH = savedConfigPath
    } else {
      delete process.env.CLISBOT_CONFIG_PATH
    }
    console.log = originalConsoleLog
    rmSync(tempDir, { recursive: true, force: true })
    mock.restore()
  })
```

**Test pattern for ROUTER-01 (no config):**
```typescript
  test('ROUTER-01: no config → direct to channels wizard', async () => {
    // Mock runChannelsWizard to avoid interactive session
    mock.module('../../../src/control/setup/setup-channels.ts', () => ({
      runChannelsWizard: mock(async () => { logOutput.push('runChannelsWizard called') }),
    }))

    mockReadline([]) // No responses needed (direct dispatch)

    await runSetupRouter({ configPath: join(tempDir, 'clisbot.json') })

    const output = logOutput.join('\n')
    expect(output).toContain('runChannelsWizard called')
    expect(output).not.toContain('agent')
  })
```

**Test pattern for ROUTER-02 (channels only):**
```typescript
  test('ROUTER-02: channels only → agent wizard with preamble', async () => {
    // Mock agent wizard
    mock.module('../../../src/control/setup/setup-agent.ts', () => ({
      runAgentWizard: mock(async () => { logOutput.push('runAgentWizard called') }),
    }))

    mockReadline([])

    // Create config with channels enabled but no agents
    // (write to join(tempDir, 'clisbot.json') before calling)

    await runSetupRouter({ configPath: join(tempDir, 'clisbot.json') })

    const output = logOutput.join('\n')
    expect(output).toContain('Channels configured')
    expect(output).toContain('runAgentWizard called')
  })
```

**Test pattern for ROUTER-03 (both configured):**
```typescript
  test('ROUTER-03: both configured → menu displays, choice dispatches', async () => {
    // Mock both wizards
    mock.module('../../../src/control/setup/setup-channels.ts', () => ({
      runChannelsWizard: mock(async () => { logOutput.push('runChannelsWizard called') }),
    }))
    mock.module('../../../src/control/setup/setup-agent.ts', () => ({
      runAgentWizard: mock(async () => { logOutput.push('runAgentWizard called') }),
    }))

    // User chooses option 2 (reconfigure agent)
    mockReadline(['2'])

    // Create config with both channels and agents configured before calling

    await runSetupRouter({ configPath: join(tempDir, 'clisbot.json') })

    const output = logOutput.join('\n')
    expect(output).toContain('Current configuration')
    expect(output).toContain('runAgentWizard called')
  })
```

---

### `src/cli.ts` (config, config)

**Analog:** `src/cli.ts` lines 50-150 (self-reference for ROOT_COMMAND_TREE pattern)

**ParsedCliCommand type extension** (lines 20-48):
```typescript
// Add to ParsedCliCommand union type:
| { name: "setup"; args: string[] }
```

**ROOT_COMMAND_TREE node addition** (from pattern at lines 50-150):
```typescript
{
  name: "setup",
  summary: "Configure bot tokens and AI agent interactively.",
  usage: ["setup [channels|agent]"],
  helpLines: [
    "With no subcommand, auto-detects what is missing and routes to the right wizard.",
    "Pass `channels` to skip detection and go straight to channel setup.",
    "Pass `agent` to skip detection and go straight to agent setup.",
  ],
  passthroughArgs: true,
  handler: ({ passthroughArgs }) => ({ name: "setup", args: [...passthroughArgs] }),
}
```

Insert this node in the nodes array of ROOT_COMMAND_TREE (around line 52, in logical order with other setup-related commands like "start", "init").

---

### `src/main.ts` (controller, request-response)

**Analog:** `src/main.ts` lines 56-114 (runBuiltinCommand pattern)

**Handler dispatch in runBuiltinCommand** (lines 56-114):
```typescript
async function runBuiltinCommand(command: ReturnType<typeof parseCliArgs>) {
  // Add this alongside other command handlers:
  if (command.name === "setup") {
    const { runSetupRouter } = await import("./control/setup/setup-router.ts")
    // Extract configPath from args if provided: setup --config /path/to/config.json
    // Otherwise runSetupRouter uses env var or default
    await runSetupRouter()
    return true
  }

  // existing handlers for help, version, init, serve-*, start, restart, stop, status, logs, update...
  // ...
}
```

**Import statement to add** (at top of main.ts, around line 1-35):
```typescript
// Dynamic import in handler is preferred; can also add static import:
// import { runSetupRouter } from "./control/setup/setup-router.ts"
// (but dynamic import keeps setup code out of main process until needed)
```

---

## Shared Patterns

### Config Path Resolution Pattern
**Source:** `src/control/setup/setup-channels.ts` lines 61-63 + `setup-wizard-utils.ts` lines 4, 36-37

**Apply to:** All new setup control functions (setup-router.ts, any future setup-* additions)

```typescript
// Standard pattern: env var > explicit param > default
const configPath = expandHomePath(
  options?.configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
)
```

### TTY Guard Pattern
**Source:** `src/control/setup/setup-wizard-utils.ts` lines 8-15

**Apply to:** setup-router.ts (line 1 before any readline interaction)

```typescript
export function ensureTTY(): void {
  if (!process.stdin.isTTY) {
    console.error(
      'Setup wizard requires an interactive terminal.\nIn non-interactive environments, use: clisbot init',
    )
    process.exit(1)
  }
}
```

### Readline Cleanup Pattern
**Source:** `src/control/setup/setup-wizard-utils.ts` lines 35-65

**Apply to:** setup-router.ts (ROUTER-03 menu case)

```typescript
// Must close readline AND unref stdin to avoid Bun #21189 hang:
try {
  // ... readline interaction ...
} finally {
  rl.close()
  process.stdin.unref?.()
}
```

### SIGINT Cleanup for Temp Files
**Source:** `src/control/setup/setup-wizard-utils.ts` lines 35-65

**Apply to:** setup-router.ts (wrap any readline in withWizardCleanup)

```typescript
await withWizardCleanup(async () => {
  try {
    // readline interaction here
  } finally {
    rl.close()
    process.stdin.unref?.()
  }
}, configPath)
```

---

## No Analog Found

None — all patterns have direct analogs in existing setup-channels.ts, setup-agent.ts, cli.ts, and main.ts.

---

## Metadata

**Analog search scope:**
- `src/control/setup/` — all setup wizard implementations
- `src/cli.ts` — command tree registration pattern
- `src/main.ts` — handler dispatch pattern
- `test/control/setup/` — test scaffold patterns

**Files scanned:** 7 analogs + 8 test references = 15 files inspected

**Pattern extraction date:** 2026-05-28

**High-confidence matches:**
- Imports: direct copy from setup-channels.ts (lines 1-24)
- Config detection: simple field checks (enabled flags, list length)
- Cleanup: withWizardCleanup() already tested in setup-channels, setup-agent
- CLI registration: ROOT_COMMAND_TREE pattern proven across 20+ commands
- Handler dispatch: runBuiltinCommand pattern proven for 10+ handlers
