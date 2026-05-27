import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// This import WILL fail until Wave 2 — that is the intended RED state:
import { runChannelsWizard } from '../../../src/control/setup/setup-channels.ts'

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

describe('setup-channels wizard', () => {
  let tempDir: string
  let savedTelegramBotToken: string | undefined
  let savedSlackAppToken: string | undefined
  let savedSlackBotToken: string | undefined
  let savedZaloBotToken: string | undefined
  let savedConfigPath: string | undefined

  // Captured console.log output
  let logOutput: string[]
  let originalConsoleLog: typeof console.log

  beforeEach(() => {
    // Save env vars
    savedTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    savedSlackAppToken = process.env.SLACK_APP_TOKEN
    savedSlackBotToken = process.env.SLACK_BOT_TOKEN
    savedZaloBotToken = process.env.ZALO_BOT_TOKEN
    savedConfigPath = process.env.CLISBOT_CONFIG_PATH

    // Clear env vars to start from a known state
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.SLACK_APP_TOKEN
    delete process.env.SLACK_BOT_TOKEN
    delete process.env.ZALO_BOT_TOKEN
    delete process.env.CLISBOT_CONFIG_PATH

    // Fresh temp dir for config isolation
    tempDir = mkdtempSync(join(tmpdir(), 'clisbot-chan-test-'))

    // Capture console.log
    logOutput = []
    originalConsoleLog = console.log
    console.log = (...args: unknown[]) => {
      logOutput.push(args.map(String).join(' '))
    }
  })

  afterEach(() => {
    // Restore env vars
    if (savedTelegramBotToken !== undefined) {
      process.env.TELEGRAM_BOT_TOKEN = savedTelegramBotToken
    } else {
      delete process.env.TELEGRAM_BOT_TOKEN
    }
    if (savedSlackAppToken !== undefined) {
      process.env.SLACK_APP_TOKEN = savedSlackAppToken
    } else {
      delete process.env.SLACK_APP_TOKEN
    }
    if (savedSlackBotToken !== undefined) {
      process.env.SLACK_BOT_TOKEN = savedSlackBotToken
    } else {
      delete process.env.SLACK_BOT_TOKEN
    }
    if (savedZaloBotToken !== undefined) {
      process.env.ZALO_BOT_TOKEN = savedZaloBotToken
    } else {
      delete process.env.ZALO_BOT_TOKEN
    }
    if (savedConfigPath !== undefined) {
      process.env.CLISBOT_CONFIG_PATH = savedConfigPath
    } else {
      delete process.env.CLISBOT_CONFIG_PATH
    }

    // Restore console.log
    console.log = originalConsoleLog

    // Clean up temp dir
    rmSync(tempDir, { recursive: true, force: true })

    // Restore all mocks
    mock.restore()
  })

  // -------------------------------------------------------------------------
  // CHANWIZ-01 — skips token prompt when env var is set
  // -------------------------------------------------------------------------

  test('CHANWIZ-01: skips token prompt when env var is set', async () => {
    // Set the Telegram token in env — wizard must detect and skip the prompt
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'

    // Mock readline: 'n' for all channel confirms except Telegram (which is skipped by env)
    mockReadline(['n', 'n', 'n'])

    await runChannelsWizard({ configPath: join(tempDir, 'clisbot.json') })

    const combinedOutput = logOutput.join('\n')

    // Must acknowledge that the env var was detected
    expect(combinedOutput).toMatch(/TELEGRAM_BOT_TOKEN|env|environment/i)

    // Must NOT prompt for a Telegram token (no token entry prompt)
    const tokenPromptLines = logOutput.filter(
      (l) => /enter.*token|paste.*token|token:/i.test(l) && /telegram/i.test(l),
    )
    expect(tokenPromptLines.length).toBe(0)
  })

  // -------------------------------------------------------------------------
  // CHANWIZ-02 — skips channel when user selects n
  // -------------------------------------------------------------------------

  test('CHANWIZ-02: skips channel when user selects n', async () => {
    const configPath = join(tempDir, 'clisbot.json')

    // Mock readline: decline all channel confirms
    mockReadline(['n', 'n', 'n', 'n'])

    await runChannelsWizard({ configPath })

    // When all channels are declined the config should either not be written
    // or written with no channel tokens present
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      const telegram = config?.channels?.telegram ?? {}
      expect(telegram.botToken ?? null).toBeNull()
    }
  })

  // -------------------------------------------------------------------------
  // CHANWIZ-03 — writes directMessagesPolicy pairing without prompting
  // -------------------------------------------------------------------------

  test('CHANWIZ-03: writes directMessagesPolicy pairing without prompting', async () => {
    const configPath = join(tempDir, 'clisbot.json')

    // Provide Telegram token via env so at least one channel is configured
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'

    // Accept Telegram, decline others, confirm review
    mockReadline(['y', 'n', 'n', 'y'])

    await runChannelsWizard({ configPath })

    expect(existsSync(configPath)).toBe(true)
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    const telegramBots = config?.channels?.telegram?.bots ?? []
    const bot = telegramBots[0] ?? {}

    // directMessagesPolicy must be "pairing" — written silently, no prompt
    expect(bot.directMessagesPolicy ?? config?.channels?.telegram?.directMessagesPolicy).toBe(
      'pairing',
    )

    // No DM policy question must appear in output
    const dmPromptLines = logOutput.filter(
      (l) => /dm policy|directmessages|pairing.*open|open.*pairing/i.test(l),
    )
    expect(dmPromptLines.length).toBe(0)
  })

  // -------------------------------------------------------------------------
  // CHANWIZ-04 — displays review screen before writing config
  // -------------------------------------------------------------------------

  test('CHANWIZ-04: displays review screen before writing config', async () => {
    const configPath = join(tempDir, 'clisbot.json')

    // Provide Telegram token via env
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'

    // Accept Telegram, decline others, then confirm review
    mockReadline(['y', 'n', 'n', 'y'])

    await runChannelsWizard({ configPath })

    const combinedOutput = logOutput.join('\n')

    // Review header must appear
    expect(combinedOutput).toMatch(/review/i)

    // Config file must be written (review was confirmed)
    expect(existsSync(configPath)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // CHANWIZ-05 — shows success screen naming clisbot setup agent
  // RED in Wave 0 — turns GREEN in Plan 06-05
  // -------------------------------------------------------------------------

  test('CHANWIZ-05: shows success screen naming clisbot setup agent', async () => {
    const configPath = join(tempDir, 'clisbot.json')

    // Mock startDetachedRuntime to avoid real process launch
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
    }))

    // Provide token via env so channel is configured
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'

    // Accept Telegram, decline others, confirm review
    mockReadline(['y', 'n', 'n', 'y'])

    await runChannelsWizard({ configPath })

    const combinedOutput = logOutput.join('\n')

    // Success screen must name the exact next command
    expect(combinedOutput).toContain('clisbot setup agent')
  })
})
