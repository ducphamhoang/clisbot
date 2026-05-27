import { rename, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Interface } from 'node:readline/promises'
import { expandHomePath, getDefaultConfigPath, ensureDir } from '../../infra/paths.ts'
import { writeTextFile } from '../../infra/fs.ts'
import { getRuntimeStatus } from '../../control/runtime/runtime-process.ts'

export function ensureTTY(): void {
  if (!process.stdin.isTTY) {
    console.error(
      'Setup wizard requires an interactive terminal.\nIn non-interactive environments, use: clisbot init',
    )
    process.exit(1)
  }
}

export async function ensureDaemonNotRunning(configPath?: string): Promise<void> {
  const status = await getRuntimeStatus({ configPath })
  if (status.running) {
    console.error(
      'Cannot run setup wizard while clisbot daemon is running.\nStop the daemon with: clisbot stop',
    )
    process.exit(1)
  }
}

export async function writeEditableConfigAtomic(configPath: string, text: string): Promise<void> {
  const expandedConfigPath = expandHomePath(configPath)
  await ensureDir(dirname(expandedConfigPath))
  const tmpPath = `${expandedConfigPath}.tmp`
  await writeTextFile(tmpPath, text)
  await rename(tmpPath, expandedConfigPath)
}

export async function withWizardCleanup<T>(fn: () => Promise<T>, configPath?: string): Promise<T> {
  const resolvedConfig = expandHomePath(
    configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
  )
  const tmpPath = `${resolvedConfig}.tmp`

  const handleSigint = async () => {
    await unlink(tmpPath).catch(() => {})
    process.stdin.unref()
    process.exit(130)
  }

  process.on('SIGINT', handleSigint)

  let result: T | undefined
  let thrownError: unknown

  try {
    result = await fn()
  } catch (err) {
    thrownError = err
  } finally {
    process.removeListener('SIGINT', handleSigint)
  }

  if (thrownError !== undefined) {
    throw thrownError
  }

  return result as T
}

export async function promptMasked(
  rl: Interface,
  question: string,
): Promise<string> {
  const original = (rl as unknown as { _writeToOutput(str: string): void })._writeToOutput

  ;(rl as unknown as { _writeToOutput(str: string): void })._writeToOutput = (str: string) => {
    if (str === '\n' || str === '\r\n') {
      original.call(rl, str)
    } else if (str.length > 0) {
      original.call(rl, '*')
    }
  }

  try {
    return await rl.question(question)
  } finally {
    ;(rl as unknown as { _writeToOutput(str: string): void })._writeToOutput = original
  }
}
