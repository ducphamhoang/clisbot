import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// This import WILL fail until Wave 1 — that is the intended RED state:
import { runAgentWizard } from '../../../src/control/setup/setup-agent.ts'

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
// execSync mock for binary checking
// Controls binary existence without PATH manipulation.
// ---------------------------------------------------------------------------

function mockBinaryExists(binaryName: string, exists: boolean): void {
  mock.module('node:child_process', () => ({
    execSync: mock((cmd: string) => {
      if (cmd.includes(`which ${binaryName}`)) {
        if (!exists) {
          const err = Object.assign(new Error('not found'), { code: 'ENOENT' })
          throw err
        }
        return ''
      }
      throw new Error('unexpected execSync call')
    }),
  }))
}

// ---------------------------------------------------------------------------
// describe
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // AGTWIZ-01: Channel summary is displayed before CLI selection
  // -------------------------------------------------------------------------

  test('AGTWIZ-01: displays configured channels before CLI selection', async () => {
    // 'n' to abort at the first prompt so wizard exits before binary check
    mockReadline(['n'])

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/configured channels|channels:/i)
  })

  // -------------------------------------------------------------------------
  // AGTWIZ-02: Binary verification triggers, missing binary shows instructions
  // -------------------------------------------------------------------------

  test('AGTWIZ-02: shows install instructions when binary is missing', async () => {
    mockBinaryExists('codex', false)
    // 'codex' triggers binary check fail; 'n' cancels after the fail message
    mockReadline(['codex', 'n'])

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/not found|install/i)
    expect(combinedOutput).toMatch(/codex/)
  })

  // -------------------------------------------------------------------------
  // AGTWIZ-03: Bot-type selection with descriptions
  // -------------------------------------------------------------------------

  test('AGTWIZ-03: displays bot-type descriptions before selection', async () => {
    mockBinaryExists('claude', true)
    // 'claude' (binary found), 'n' at bot type prompt to abort
    mockReadline(['claude', 'n'])

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/personal.assistant|team.assistant|bot type/i)
  })

  // -------------------------------------------------------------------------
  // AGTWIZ-04: Channel linking confirmation
  // -------------------------------------------------------------------------

  test('AGTWIZ-04: shows channel linking options', async () => {
    mockBinaryExists('claude', true)
    // 'claude', bot type '1', then 'n' at channel link or confirm
    mockReadline(['claude', '1', 'n'])

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/link to|channels/i)
  })

  // -------------------------------------------------------------------------
  // AGTWIZ-05: Runtime reloads or restarts, success message shown
  // -------------------------------------------------------------------------

  test('AGTWIZ-05: displays success message after agent config is written', async () => {
    mockBinaryExists('claude', true)

    // Mock runtime to avoid real process launch
    mock.module('../../../src/control/runtime/runtime-process.ts', () => ({
      startDetachedRuntime: mock(() =>
        Promise.resolve({
          pid: 999,
          alreadyRunning: false,
          createdConfig: false,
          configPath: '',
          logPath: '',
        }),
      ),
      getRuntimeStatus: mock(() => Promise.resolve({ running: false })),
      ensureConfigFile: mock((p: string) => Promise.resolve({ configPath: p })),
    }))

    // Full wizard inputs: CLI, bot type, link channel (y), confirm (y)
    mockReadline(['claude', '1', 'y', 'y'])

    await runAgentWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')
    expect(combinedOutput).toMatch(/complete|success|next step/i)
  })
})
