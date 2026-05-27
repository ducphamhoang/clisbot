import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ensureTTY,
  ensureDaemonNotRunning,
  writeEditableConfigAtomic,
  withWizardCleanup,
  promptMasked,
} from '../src/control/setup/setup-wizard-utils.ts'

// ---------------------------------------------------------------------------
// ensureTTY
// ---------------------------------------------------------------------------

describe('ensureTTY', () => {
  let originalIsTTY: boolean | undefined
  let exitSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    originalIsTTY = process.stdin.isTTY
    exitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      configurable: true,
    })
    exitSpy.mockRestore()
  })

  test('when process.stdin.isTTY is false, calls process.exit(1)', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    })
    expect(() => ensureTTY()).toThrow('process.exit called')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test('when process.stdin.isTTY is true, does not call process.exit', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    })
    expect(() => ensureTTY()).not.toThrow()
    expect(exitSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// ensureDaemonNotRunning
// ---------------------------------------------------------------------------

describe('ensureDaemonNotRunning', () => {
  let exitSpy: ReturnType<typeof spyOn>

  const minimalRuntimeStatus = {
    running: false,
    configPath: '',
    pidPath: '',
    logPath: '',
    tmuxSocketPath: '',
    monitorStatePath: '',
    serviceMode: 'monitor' as const,
  }

  beforeEach(() => {
    exitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    exitSpy.mockRestore()
    mock.restore()
  })

  test('when daemon is running, calls process.exit(1)', async () => {
    mock.module('../src/control/runtime/runtime-process.ts', () => ({
      getRuntimeStatus: mock(() =>
        Promise.resolve({ ...minimalRuntimeStatus, running: true }),
      ),
    }))

    await expect(ensureDaemonNotRunning()).rejects.toThrow('process.exit called')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test('when daemon is not running, resolves without calling process.exit', async () => {
    mock.module('../src/control/runtime/runtime-process.ts', () => ({
      getRuntimeStatus: mock(() =>
        Promise.resolve({ ...minimalRuntimeStatus, running: false }),
      ),
    }))

    await expect(ensureDaemonNotRunning()).resolves.toBeUndefined()
    expect(exitSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// writeEditableConfigAtomic
// ---------------------------------------------------------------------------

describe('writeEditableConfigAtomic', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'clisbot-wizard-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('writes to .tmp then renames to final path', async () => {
    const configPath = join(tmpDir, 'clisbot.json')
    await writeEditableConfigAtomic(configPath, 'test content')

    expect(existsSync(configPath)).toBe(true)
    const { readFileSync } = await import('node:fs')
    expect(readFileSync(configPath, 'utf8')).toBe('test content')

    // .tmp file must not exist after successful write
    expect(existsSync(`${configPath}.tmp`)).toBe(false)
  })

  test('parent directory is created if it does not exist', async () => {
    const configPath = join(tmpDir, 'nested', 'subdir', 'clisbot.json')
    await writeEditableConfigAtomic(configPath, '{}')

    expect(existsSync(configPath)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// withWizardCleanup
// ---------------------------------------------------------------------------

describe('withWizardCleanup', () => {
  test('runs the wrapped function and returns its result', async () => {
    const result = await withWizardCleanup(async () => 'hello')
    expect(result).toBe('hello')
  })

  test('re-throws errors from the wrapped function', async () => {
    await expect(
      withWizardCleanup(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
  })

  test('removes SIGINT handler after fn completes', async () => {
    const before = process.listenerCount('SIGINT')
    await withWizardCleanup(async () => {})
    const after = process.listenerCount('SIGINT')
    expect(after).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// promptMasked (FOUND-03)
// ---------------------------------------------------------------------------

describe('promptMasked', () => {
  function makeRl(answer: string): {
    rl: Parameters<typeof promptMasked>[0]
    calls: string[]
  } {
    const calls: string[] = []

    const rl = {
      question(_q: string): Promise<string> {
        return Promise.resolve(answer)
      },
      _writeToOutput(str: string) {
        calls.push(str)
      },
    } as unknown as Parameters<typeof promptMasked>[0]

    return { rl, calls }
  }

  test('returns the real answer value from rl.question', async () => {
    const { rl } = makeRl('my-secret-token')
    const result = await promptMasked(rl, 'Token: ')
    expect(result).toBe('my-secret-token')
  })

  test('replaces non-newline output with a single asterisk per call', async () => {
    const calls: string[] = []
    const rl = {
      question(_q: string): Promise<string> {
        // Simulate readline echoing one character per keystroke
        ;(rl as unknown as { _writeToOutput(s: string): void })._writeToOutput('a')
        ;(rl as unknown as { _writeToOutput(s: string): void })._writeToOutput('b')
        return Promise.resolve('ab')
      },
      _writeToOutput(str: string) {
        calls.push(str)
      },
    } as unknown as Parameters<typeof promptMasked>[0]

    await promptMasked(rl, 'Token: ')

    // Both echoed characters must have been replaced with asterisks
    expect(calls).toEqual(['*', '*'])
  })

  test('passes newlines through to the original _writeToOutput', async () => {
    const calls: string[] = []
    const rl = {
      question(_q: string): Promise<string> {
        ;(rl as unknown as { _writeToOutput(s: string): void })._writeToOutput('\n')
        ;(rl as unknown as { _writeToOutput(s: string): void })._writeToOutput('\r\n')
        return Promise.resolve('')
      },
      _writeToOutput(str: string) {
        calls.push(str)
      },
    } as unknown as Parameters<typeof promptMasked>[0]

    await promptMasked(rl, 'Token: ')

    expect(calls).toEqual(['\n', '\r\n'])
  })

  test('restores original _writeToOutput after successful call', async () => {
    const { rl } = makeRl('token')
    const original = (rl as unknown as { _writeToOutput(s: string): void })._writeToOutput

    await promptMasked(rl, 'Token: ')

    const restored = (rl as unknown as { _writeToOutput(s: string): void })._writeToOutput
    expect(restored).toBe(original)
  })

  test('restores original _writeToOutput even when rl.question throws', async () => {
    const calls: string[] = []
    const rl = {
      question(_q: string): Promise<string> {
        return Promise.reject(new Error('readline error'))
      },
      _writeToOutput(str: string) {
        calls.push(str)
      },
    } as unknown as Parameters<typeof promptMasked>[0]

    const original = (rl as unknown as { _writeToOutput(s: string): void })._writeToOutput

    await expect(promptMasked(rl, 'Token: ')).rejects.toThrow('readline error')

    const restored = (rl as unknown as { _writeToOutput(s: string): void })._writeToOutput
    expect(restored).toBe(original)
  })
})
