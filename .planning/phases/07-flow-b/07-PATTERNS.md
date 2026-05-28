# Phase 7: Flow B - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 3 (2 new, 1 modified)
**Analogs found:** 3 / 3 (100%)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/control/setup/setup-agent.ts` | wizard/controller | request-response | `src/control/setup/setup-channels.ts` | exact |
| `test/control/setup/setup-agent.test.ts` | test | unit | `test/control/setup/setup-channels.test.ts` | exact |
| `src/control/setup/setup-wizard-utils.ts` | utility | request-response | `src/control/setup/setup-wizard-utils.ts` (self) | N/A — modify in-place |

---

## Pattern Assignments

### `src/control/setup/setup-agent.ts` (wizard/controller, request-response)

**Analog:** `src/control/setup/setup-channels.ts`

**Overall structure:** Copy Phase 6 channel wizard structure verbatim, then replace channel-specific logic with agent-specific logic (CLI tool selection, bot-type choice, channel linking, runtime reload).

**Imports pattern** (lines 1-23):
```typescript
import { createInterface } from 'node:readline'
import type { Interface } from 'node:readline/promises'
import {
  writeEditableConfigAtomic,
  withWizardCleanup,
} from './setup-wizard-utils.ts'
import { addAgentToEditableConfig } from '../../control/commands/agents-cli.ts'
import type { AgentCliToolId } from '../../config/runtime/agent-tool-presets.ts'
import { SUPPORTED_AGENT_CLI_TOOLS } from '../../config/runtime/agent-tool-presets.ts'
import {
  startDetachedRuntime,
  getRuntimeStatus,
} from '../runtime/runtime-process.ts'
import { readEditableConfig } from '../../config/core/config-file.ts'
import {
  expandHomePath,
  getDefaultConfigPath,
  getDefaultRuntimeCredentialsPath,
} from '../../infra/paths.ts'
```

**Entry point and readline setup** (lines 60-75 from setup-channels.ts, adapted):
```typescript
type RLInterface = ReturnType<typeof createInterface>

function ask(rl: RLInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer))
  })
}

export async function runAgentWizard(options?: { configPath?: string }): Promise<void> {
  const configPath = expandHomePath(
    options?.configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
  )

  const rl = createInterface({ input: process.stdin, output: process.stdout })

  await withWizardCleanup(async () => {
    try {
      await runWizardSession(rl, configPath)
    } finally {
      rl.close()
      process.stdin.unref?.()
    }
  }, configPath)
}
```

**Core wizard session flow** (new function, follows setup-channels pattern):
```typescript
async function runWizardSession(rl: RLInterface, configPath: string): Promise<void> {
  console.log('')
  console.log('=== clisbot setup agent ===')
  console.log('')

  // 1. Display configured channels first (context for operator)
  const { config } = await readEditableConfig(configPath)
  displayConfiguredChannels(config)

  // 2. Select CLI tool with binary verification
  const cliTool = await selectCliToolWithVerification(rl)

  // 3. Choose bot type (personal/team)
  const botType = await selectBotType(rl)

  // 4. Select channels to link
  const selectedChannels = await selectChannelsForAgent(rl, config)

  // 5. Display review before write
  displayReview(cliTool, botType, selectedChannels)

  // 6. Confirm proceed
  const confirmed = await ask(rl, 'Proceed? [Y/n] ')
  if (confirmed.trim().toLowerCase() === 'n') {
    console.log('Setup cancelled.')
    return
  }

  // 7. Write config and activate
  await writeAgentConfig(configPath, cliTool, botType)
  await activateConfiguration(configPath)
}
```

**Binary existence check pattern** (from RESEARCH.md, uses execSync):
```typescript
import { execSync } from 'node:child_process'

function checkBinaryExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' })
    return true
  } catch (err) {
    if ((err as any).code === 'ENOENT') {
      return false
    }
    throw err // Re-throw non-ENOENT errors (permission, disk, etc.)
  }
}
```

**CLI tool selection with verification** (lines 166-182 from RESEARCH.md):
```typescript
async function selectCliToolWithVerification(rl: RLInterface): Promise<AgentCliToolId> {
  while (true) {
    console.log('')
    console.log('Available CLI tools:')
    for (const tool of SUPPORTED_AGENT_CLI_TOOLS) {
      console.log(`  • ${tool}`)
    }
    console.log('')

    const cliTool = await ask(rl, 'Select AI CLI: ')
    if (!isSupportedCliTool(cliTool)) {
      console.log('  Invalid selection. Try again.')
      continue
    }

    if (!checkBinaryExists(cliTool)) {
      console.log(`  Binary not found: ${cliTool}`)
      console.log(`  Install: npm install -g @anthropic-ai/${cliTool}`)
      console.log('  Try again after installation.')
      continue
    }

    return cliTool
  }
}

function isSupportedCliTool(tool: string): tool is AgentCliToolId {
  return (SUPPORTED_AGENT_CLI_TOOLS as readonly string[]).includes(tool)
}
```

**Bot-type selection** (lines 191-204 from RESEARCH.md):
```typescript
async function selectBotType(rl: RLInterface): Promise<AgentBootstrapMode> {
  console.log('')
  console.log('Bot Type:')
  console.log('  1. personal-assistant — single operator, focused workspace')
  console.log('  2. team-assistant — shared team workflows, explicit routes required')
  console.log('')

  while (true) {
    const choice = await ask(rl, 'Choose bot type [1/2]: ')
    if (choice === '1') return 'personal-assistant'
    if (choice === '2') return 'team-assistant'
    console.log('  Invalid selection. Enter 1 or 2.')
  }
}
```

**Channel selection** (lines 213-237 from RESEARCH.md):
```typescript
async function selectChannelsForAgent(
  rl: RLInterface,
  config: ClisbotConfig,
): Promise<string[]> {
  console.log('')
  console.log('Link to channels:')

  const channelNames = Object.keys(config.channels || {})
    .filter((ch) => config.channels![ch] && Object.keys(config.channels![ch]).length > 0)

  if (channelNames.length === 0) {
    console.log('  No channels configured.')
    return []
  }

  const selected: string[] = []
  for (const channel of channelNames) {
    const answer = await ask(rl, `  Link to ${channel}? [Y/n] `)
    if (answer.trim().toLowerCase() !== 'n') {
      selected.push(channel)
    }
  }

  return selected
}
```

**Config write and agent creation** (adapted from agents-cli.ts addAgentToEditableConfig):
```typescript
async function writeAgentConfig(
  configPath: string,
  cliTool: AgentCliToolId,
  botType: AgentBootstrapMode,
): Promise<void> {
  await addAgentToEditableConfig({
    configPath,
    agentId: 'default',
    cliTool,
    bootstrap: botType,
  })
}
```

**Runtime activation** (lines 246-264 from RESEARCH.md):
```typescript
async function activateConfiguration(configPath: string): Promise<void> {
  const status = await getRuntimeStatus({ configPath })

  if (status.running) {
    console.log('')
    console.log('Runtime is running — config will reload automatically.')
  } else {
    console.log('')
    console.log('Runtime not running — starting...')
    try {
      const result = await startDetachedRuntime({
        scriptPath: process.argv[1]!,
        configPath,
        runtimeCredentialsPath: getDefaultRuntimeCredentialsPath(),
      })
      console.log(`Started (pid: ${result.pid}).`)
    } catch (err) {
      console.error('Runtime failed to start.')
      console.error((err as Error).message)
      console.error('Run: clisbot start')
      throw err
    }
  }

  displaySuccessMessage()
}
```

**Display functions** (lines 215-230 and other display patterns from setup-channels.ts):
```typescript
function displayConfiguredChannels(config: ClisbotConfig): void {
  console.log('')
  console.log('Configured Channels:')
  console.log('')

  const configured = Object.entries(config.channels || {})
    .filter(([, ch]) => ch && Object.keys(ch).length > 0)

  if (configured.length === 0) {
    console.log('  (none yet — run clisbot setup channels first)')
    return
  }

  for (const [channel] of configured) {
    console.log(`  • ${channel}`)
  }
  console.log('')
}

function displayReview(
  cliTool: AgentCliToolId,
  botType: AgentBootstrapMode,
  selectedChannels: string[],
): void {
  console.log('')
  console.log('='.repeat(50))
  console.log('REVIEW AGENT CONFIGURATION')
  console.log('='.repeat(50))
  console.log('')
  console.log(`  CLI Tool: ${cliTool}`)
  console.log(`  Bot Type: ${botType}`)
  console.log(`  Channels: ${selectedChannels.length > 0 ? selectedChannels.join(', ') : '(none)'}`)
  console.log('')
}

function displaySuccessMessage(): void {
  console.log('')
  console.log('Agent wizard complete.')
  console.log('Next step: clisbot routes add')
  console.log('')
}
```

---

### `test/control/setup/setup-agent.test.ts` (test, unit)

**Analog:** `test/control/setup/setup-channels.test.ts`

**Test scaffold structure** (lines 1-70 from setup-channels.test.ts, adapted for agents):
```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runAgentWizard } from '../../../src/control/setup/setup-agent.ts'

// ---------------------------------------------------------------------------
// readline mock helper
// Patches node:readline createInterface to return deterministic responses
// ---------------------------------------------------------------------------

function mockReadline(responses: string[]): void {
  const queue = [...responses]
  mock.module('node:readline', () => ({
    createInterface: mock(() => ({
      question(_prompt: string, callback: (answer: string) => void): void {
        const answer = queue.shift() ?? ''
        Promise.resolve().then(() => callback(answer))
      },
      close: mock(() => undefined),
      on: mock((_event: string, _handler: unknown) => undefined),
    })),
  }))
}

// ---------------------------------------------------------------------------
// execSync mock for binary checking
// ---------------------------------------------------------------------------

function mockBinaryExists(binaryName: string, exists: boolean): void {
  mock.module('node:child_process', () => ({
    execSync: mock((cmd: string) => {
      if (cmd.includes(`which ${binaryName}`)) {
        if (!exists) {
          const err = new Error('not found')
          ;(err as any).code = 'ENOENT'
          throw err
        }
        return ''
      }
      throw new Error('unexpected execSync call')
    }),
  }))
}

describe('setup-agent wizard', () => {
  let tempDir: string
  let savedConfigPath: string | undefined
  let logOutput: string[]
  let originalConsoleLog: typeof console.log

  beforeEach(() => {
    savedConfigPath = process.env.CLISBOT_CONFIG_PATH
    delete process.env.CLISBOT_CONFIG_PATH

    tempDir = mkdtempSync(join(tmpdir(), 'clisbot-agent-test-'))

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

  // -----------------------------------------------------------------------
  // AGTWIZ-01: Channel summary is displayed before CLI selection
  // -----------------------------------------------------------------------

  test('AGTWIZ-01: displays configured channels before CLI selection', async () => {
    mockReadline(['n'])
    // Channels exist in config, agent wizard should display them

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/configured channels|channels:/i)
  })

  // -----------------------------------------------------------------------
  // AGTWIZ-02: Binary verification triggers, missing binary shows instructions
  // -----------------------------------------------------------------------

  test('AGTWIZ-02: binary check fails for missing CLI tool', async () => {
    mockReadline(['codex', 'n'])
    mockBinaryExists('codex', false)

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/not found|install/i)
    expect(combinedOutput).toMatch(/codex/)
  })

  // -----------------------------------------------------------------------
  // AGTWIZ-03: Bot-type selection with descriptions
  // -----------------------------------------------------------------------

  test('AGTWIZ-03: displays bot-type descriptions', async () => {
    mockReadline(['claude', '1', 'n'])
    mockBinaryExists('claude', true)

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/personal|team|bot type/i)
  })

  // -----------------------------------------------------------------------
  // AGTWIZ-04: Channel linking confirmation
  // -----------------------------------------------------------------------

  test('AGTWIZ-04: shows channel linking options', async () => {
    mockReadline(['claude', '1', 'n', 'y'])
    mockBinaryExists('claude', true)

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/link to|channels/i)
  })

  // -----------------------------------------------------------------------
  // AGTWIZ-05: Runtime reloads or restarts, success message shown
  // -----------------------------------------------------------------------

  test('AGTWIZ-05: displays success message after config write', async () => {
    mockReadline(['claude', '1', 'n', 'y'])
    mockBinaryExists('claude', true)

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/complete|success|next step/i)
  })
})
```

---

### `src/control/setup/setup-wizard-utils.ts` (utility, request-response — MODIFY in-place)

**Analog:** Self (existing file at `/home/brewuser/clisbot/src/control/setup/setup-wizard-utils.ts`)

**No new patterns required.** This file already exports all functions needed:
- `ensureTTY()` — guard for interactive terminal (lines 8-15)
- `ensureDaemonNotRunning()` — check runtime not running (lines 17-25)
- `withWizardCleanup()` — SIGINT handler and cleanup (lines 35-65)
- `writeEditableConfigAtomic()` — atomic temp+rename config write (lines 27-33)
- `promptMasked()` — masked input (lines 67-86)

**Do NOT modify setup-wizard-utils.ts** — Phase 7 wizard will call these functions as-is. If new helpers are needed (e.g., `promptSelect` for multi-choice), add them in Phase 7 implementation, not here.

---

## Shared Patterns

### Readline Interface Setup
**Source:** `src/control/setup/setup-channels.ts` lines 31-37, 65

All wizards follow this pattern:
```typescript
type RLInterface = ReturnType<typeof createInterface>

function ask(rl: RLInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer))
  })
}

// In main function:
const rl = createInterface({ input: process.stdin, output: process.stdout })
await withWizardCleanup(async () => {
  try {
    await runWizardSession(rl, configPath)
  } finally {
    rl.close()
    process.stdin.unref?.()
  }
}, configPath)
```

### Atomic Config Write
**Source:** `src/control/setup/setup-wizard-utils.ts` lines 27-33

All config mutations use:
```typescript
await writeEditableConfigAtomic(configPath, jsonOutput)
```

Do NOT use direct `fs.writeFileSync` — temp+rename pattern prevents partial writes on crash.

### Error Handling in Runtime Activation
**Source:** `src/control/setup/setup-channels.ts` lines 189-212

When starting runtime after config write:
```typescript
try {
  const result = await startDetachedRuntime({
    scriptPath: process.argv[1]!,
    configPath,
    runtimeCredentialsPath: getDefaultRuntimeCredentialsPath(),
  })
  console.log(`Started (pid: ${result.pid}).`)
} catch (err) {
  console.error('Config saved. Runtime failed to start automatically.')
  console.error((err as Error).message)
  console.error('Run: clisbot start')
}
```

---

## No Analog Found

None — all Phase 7 files have exact analogs in the Phase 6 codebase or are minor modifications.

---

## Metadata

**Analog search scope:** `/home/brewuser/clisbot/src/control/{setup,commands,runtime}/*.ts`, `/home/brewuser/clisbot/test/control/setup/*.test.ts`

**Files scanned:** 15+ (setup, runtime, config, commands modules)

**Pattern extraction date:** 2026-05-28

**Key insights:**
- Phase 7 is a near-identical copy of Phase 6 structure with agent-specific logic swaps (CLI tool selection → channel selection; bot-type choice → token entry; channel linking → one-time setup)
- Binary verification (`which <command>` with execSync) is a new pattern not present in Phase 6; standard Node.js approach
- All config mutations delegate to `addAgentToEditableConfig` (existing function in agents-cli.ts); no hand-rolled config schema logic
- Test structure mirrors setup-channels.test.ts; readline and execSync mocking patterns are reusable
