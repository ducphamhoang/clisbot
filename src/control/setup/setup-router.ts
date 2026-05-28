import { createInterface } from 'node:readline'
import { readEditableConfig } from '../../config/core/config-file.ts'
import { ensureConfigFile } from '../runtime/runtime-process.ts'
import { withWizardCleanup, ensureTTY } from './setup-wizard-utils.ts'
import { runChannelsWizard } from './setup-channels.ts'
import { runAgentWizard } from './setup-agent.ts'
import { expandHomePath, getDefaultConfigPath } from '../../infra/paths.ts'
import { listStartupChannelDescriptors } from '../../channels/catalog/registry.ts'
import type { ClisbotConfig } from '../../config/core/schema.ts'

type RLInterface = ReturnType<typeof createInterface>

function ask(rl: RLInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer))
  })
}

function hasChannelsConfigured(config: ClisbotConfig): boolean {
  return listStartupChannelDescriptors().some((d) => d.isEnabled(config))
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
      const enabledChannels = listStartupChannelDescriptors()
        .filter((d) => d.isEnabled(config))
        .map((d) => d.channel)
      const agentId = config.agents.list[0]?.id ?? '(none)'

      console.log('')
      console.log('=== clisbot setup ===')
      console.log('')
      console.log('Current configuration:')
      console.log('  Channels: ' + (enabledChannels.length > 0 ? enabledChannels.join(', ') : '(none)'))
      console.log('  Agent: ' + agentId)
      console.log('')
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
      }
    } finally {
      rl.close()
      process.stdin.unref?.()
    }
  }, configPath)
}

export async function runSetupRouter(options?: { configPath?: string; args?: string[] }): Promise<void> {
  const configPath = expandHomePath(
    options?.args?.[0] ?? options?.configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
  )

  ensureTTY()

  const configResult = await ensureConfigFile(configPath)
  const { config } = await readEditableConfig(configResult.configPath)

  if (!hasChannelsConfigured(config)) {
    // ROUTER-01: no channels configured — go straight to Flow A
    await runChannelsWizard({ configPath })
  } else if (!hasAgentConfigured(config)) {
    // ROUTER-02: channels configured but no agent — brief preamble then Flow B
    console.log('')
    console.log('Channels configured. Now set up your AI agent...')
    console.log('')
    await runAgentWizard({ configPath })
  } else {
    // ROUTER-03: both configured — show status summary and offer choice
    await displayStatusAndChooseFlow(config, configPath)
  }
}
