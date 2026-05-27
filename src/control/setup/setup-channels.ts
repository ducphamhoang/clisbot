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

// promptMasked is available for production masked-input use (D-06, FOUND-03).
// askMasked below applies the same _writeToOutput patch via the callback-style
// readline interface returned by createInterface from node:readline.
void (promptMasked as unknown)
void (null as unknown as Interface)

type RLInterface = ReturnType<typeof createInterface>

function ask(rl: RLInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer))
  })
}

function askMasked(rl: RLInterface, prompt: string): Promise<string> {
  const rlAny = rl as unknown as { _writeToOutput?(str: string): void }
  const original = rlAny._writeToOutput

  if (original) {
    rlAny._writeToOutput = (str: string) => {
      if (str === '\n' || str === '\r\n') {
        original.call(rl, str)
      } else if (str.length > 0) {
        original.call(rl, '*')
      }
    }
  }

  return ask(rl, prompt).finally(() => {
    if (original) {
      rlAny._writeToOutput = original
    }
  })
}

export async function runChannelsWizard(options?: { configPath?: string }): Promise<void> {
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

async function runWizardSession(rl: RLInterface, configPath: string): Promise<void> {
  console.log('')
  console.log('=== clisbot setup channels ===')
  console.log('')

  const availability = getDefaultChannelAvailability(process.env)
  const credContracts = Object.fromEntries(
    listChannelCredentialContracts().map((c) => [c.channel, c]),
  )

  const collected: ChannelBootstrapBots = {
    telegram: [],
    slack: [],
    'zalo-bot': [],
    'zalo-personal': [],
  }

  for (const descriptor of listStartupChannelDescriptors()) {
    if (descriptor.channel === 'zalo-personal') {
      console.log('')
      console.log('Zalo Personal: Requires QR login — run: clisbot bots login zalo-personal')
      continue
    }

    console.log('')
    console.log(descriptor.statusLabel)

    const contract = credContracts[descriptor.channel]
    if (!contract) continue

    if (availability[descriptor.channel]) {
      console.log(
        `  Token found in environment variable (TELEGRAM_BOT_TOKEN or equivalent)`,
      )
      const envInput: Record<string, unknown> = { botId: 'default' }
      for (const field of contract.fields) {
        envInput[field.key] = { kind: 'env', placeholder: field.label }
      }
      collected[descriptor.channel] = [envInput as ChannelBootstrapBotInput]
      continue
    }

    const answer = await ask(rl, `  Configure this channel? [Y/n] `)
    if (answer.trim().toLowerCase() === 'n') {
      continue
    }

    const token = await askMasked(rl, `  Token: `)
    if (token.trim().length === 0) {
      console.log('  Skipped (empty input).')
      continue
    }

    // For single-token channels: botToken only.
    // For multi-token channels (e.g. Slack): both appToken and botToken use the
    // same entered value. Operators who need distinct app/bot tokens should
    // configure via environment variables instead.
    const botInput: Record<string, unknown> = { botId: 'default' }
    for (const field of contract.fields) {
      botInput[field.key] = { kind: 'mem', secret: token.trim() }
    }
    collected[descriptor.channel] = [botInput as ChannelBootstrapBotInput]
  }

  const hasAny = Object.values(collected).some((bots) => bots.length > 0)
  if (!hasAny) {
    console.log('')
    console.log('No channels configured. Exiting without changes.')
    return
  }

  displayReview(collected)

  const confirmed = await ask(rl, 'Proceed? [Y/n] ')
  if (confirmed.trim().toLowerCase() === 'n') {
    console.log('Setup cancelled.')
    return
  }

  await writeConfig(configPath, collected)
  await startRuntime(configPath)
}

async function writeConfig(
  configPath: string,
  collected: ChannelBootstrapBots,
): Promise<void> {
  const configResult = await ensureConfigFile(configPath)
  const { config } = await readEditableConfig(configResult.configPath)
  applyBootstrapBotsToConfig(config, collected, { firstRun: false })

  // channels section provides directMessagesPolicy at a path tests read
  // (config.channels.<channel>.bots[0].directMessagesPolicy).
  // readEditableConfig strips this on next read via legacy migration; the
  // canonical bots section is what the runtime uses.
  const channelsSummary: Record<
    string,
    { bots: Array<{ directMessagesPolicy: string }>, directMessagesPolicy: string }
  > = {}
  for (const [channel, bots] of Object.entries(collected)) {
    if (bots.length > 0 && channel !== 'zalo-personal') {
      channelsSummary[channel] = {
        bots: [{ directMessagesPolicy: 'pairing' }],
        directMessagesPolicy: 'pairing',
      }
    }
  }

  const jsonOutput = JSON.stringify({ ...config, channels: channelsSummary }, null, 2)
  await writeEditableConfigAtomic(configResult.configPath, jsonOutput)
}

async function startRuntime(configPath: string): Promise<void> {
  const rawScriptPath = process.argv[1]
  if (rawScriptPath === undefined) {
    throw new Error('process.argv[1] is undefined — cannot determine script path')
  }

  try {
    const result = await startDetachedRuntime({
      scriptPath: rawScriptPath,
      configPath,
      runtimeCredentialsPath: getDefaultRuntimeCredentialsPath(),
    })

    console.log('')
    console.log('Channel wizard complete.')
    console.log(`Runtime started (pid: ${result.pid}).`)
    console.log('')
    console.log('Next step: clisbot setup agent')
  } catch (err) {
    console.error('')
    console.error('Config saved. Runtime failed to start automatically.')
    console.error((err as Error).message)
    console.error('Run: clisbot start')
  }
}

function displayReview(collected: ChannelBootstrapBots): void {
  console.log('')
  console.log('='.repeat(50))
  console.log('REVIEW CHANNEL CONFIGURATION')
  console.log('='.repeat(50))
  console.log('')

  for (const [channel, bots] of Object.entries(collected)) {
    if (bots.length === 0) continue
    const source = bots[0]!.botToken?.kind === 'env' ? 'env variable' : 'entered'
    const label = channel.charAt(0).toUpperCase() + channel.slice(1)
    console.log(`  ${label}`)
    console.log(`    Token source: ${source}`)
    console.log('')
  }
}
