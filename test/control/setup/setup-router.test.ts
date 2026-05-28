import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// This import WILL fail until Wave 1 stub exists — that is the intended RED state:
import { runSetupRouter } from '../../../src/control/setup/setup-router.ts'

// ---------------------------------------------------------------------------
// readline mock helper
// Patches node:readline createInterface to return deterministic responses
// from a FIFO queue, avoiding real TTY requirements.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// describe
// ---------------------------------------------------------------------------

describe('setup-router', () => {
  let tempDir: string
  let savedConfigPath: string | undefined
  let logOutput: string[]
  let originalConsoleLog: typeof console.log

  // Wizard and infra stubs are passed via dependency injection
  // (options._channelsWizard / options._agentWizard / etc.) to avoid
  // mock.module() on setup-channels.ts, setup-agent.ts, setup-wizard-utils.ts,
  // and runtime-process.ts.  mock.module() calls leak across Bun 1.3.x workers
  // and cannot be fully restored with mock.restore(), causing cross-file test
  // contamination.
  function makeStubs(): {
    channelsWizard: () => Promise<void>
    agentWizard: () => Promise<void>
    ensureTTY: () => void
    withWizardCleanup: <T>(fn: () => Promise<T>) => Promise<T>
    ensureConfigFile: (p: string) => Promise<{ configPath: string; created: boolean }>
  } {
    return {
      channelsWizard: async () => {
        logOutput.push('runChannelsWizard called')
      },
      agentWizard: async () => {
        logOutput.push('runAgentWizard called')
      },
      ensureTTY: () => undefined,
      withWizardCleanup: async <T>(fn: () => Promise<T>) => fn(),
      ensureConfigFile: async (p: string) => ({ configPath: p, created: false }),
    }
  }

  function writeConfig(
    configPath: string,
    telegramEnabled: boolean,
    agents: Array<{ id: string }>,
  ): void {
    const config = {
      bots: {
        telegram: { defaults: { enabled: telegramEnabled } },
        slack: { defaults: { enabled: false } },
        'zalo-bot': { defaults: { enabled: false } },
      },
      agents: { list: agents },
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  }

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

  // -------------------------------------------------------------------------
  // ROUTER-01: no config → direct to channels wizard
  // -------------------------------------------------------------------------

  test('ROUTER-01: no config — routes directly to channels wizard', async () => {
    const stubs = makeStubs()
    mockReadline([])

    // Do NOT write a config file — router should detect missing/empty config
    await runSetupRouter({
      configPath: join(tempDir, 'clisbot.json'),
      _channelsWizard: stubs.channelsWizard,
      _agentWizard: stubs.agentWizard,
      _ensureTTY: stubs.ensureTTY,
      _withWizardCleanup: stubs.withWizardCleanup,
      _ensureConfigFile: stubs.ensureConfigFile,
    })

    const output = logOutput.join('\n')
    expect(output).toContain('runChannelsWizard called')
    expect(output).not.toContain('runAgentWizard called')
  })

  // -------------------------------------------------------------------------
  // ROUTER-02: channels configured, no agent → agent wizard with preamble
  // -------------------------------------------------------------------------

  test('ROUTER-02: channels configured, no agent — routes directly to agent wizard with preamble', async () => {
    const stubs = makeStubs()
    mockReadline([])

    writeConfig(join(tempDir, 'clisbot.json'), true, [])

    await runSetupRouter({
      configPath: join(tempDir, 'clisbot.json'),
      _channelsWizard: stubs.channelsWizard,
      _agentWizard: stubs.agentWizard,
      _ensureTTY: stubs.ensureTTY,
      _withWizardCleanup: stubs.withWizardCleanup,
      _ensureConfigFile: stubs.ensureConfigFile,
    })

    const output = logOutput.join('\n')
    expect(output).toContain('Channels configured')
    expect(output).toContain('runAgentWizard called')
    expect(output).not.toContain('runChannelsWizard called')
  })

  // -------------------------------------------------------------------------
  // ROUTER-03: both channels and agent configured → status summary and menu
  // -------------------------------------------------------------------------

  test('ROUTER-03: both channels and agent configured — shows status summary and menu', async () => {
    const stubs = makeStubs()
    mockReadline(['2'])

    writeConfig(join(tempDir, 'clisbot.json'), true, [{ id: 'default' }])

    await runSetupRouter({
      configPath: join(tempDir, 'clisbot.json'),
      _channelsWizard: stubs.channelsWizard,
      _agentWizard: stubs.agentWizard,
      _ensureTTY: stubs.ensureTTY,
      _withWizardCleanup: stubs.withWizardCleanup,
      _ensureConfigFile: stubs.ensureConfigFile,
    })

    const output = logOutput.join('\n')
    expect(output).toContain('Current configuration')
    expect(output).toContain('runAgentWizard called')
  })
})
