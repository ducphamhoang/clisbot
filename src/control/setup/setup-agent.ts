import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { withWizardCleanup } from './setup-wizard-utils.ts'
import {
  SUPPORTED_AGENT_CLI_TOOLS,
  type AgentCliToolId,
  type AgentBootstrapMode,
} from '../../config/runtime/agent-tool-presets.ts'
import { addAgentToEditableConfig } from '../commands/agents-cli.ts'
import {
  getRuntimeStatus,
  startDetachedRuntime,
  ensureConfigFile,
} from '../runtime/runtime-process.ts'
import { readEditableConfig } from '../../config/core/config-file.ts'
import type { ClisbotConfig } from '../../config/core/schema.ts'
import { listStartupChannelDescriptors } from '../../channels/catalog/registry.ts'
import {
  expandHomePath,
  getDefaultConfigPath,
  getDefaultRuntimeCredentialsPath,
} from '../../infra/paths.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RLInterface = ReturnType<typeof createInterface>

class WizardCancelled extends Error {
  constructor() {
    super('wizard cancelled')
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(rl: RLInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer))
  })
}

function isSupportedCliTool(tool: string): tool is AgentCliToolId {
  return (SUPPORTED_AGENT_CLI_TOOLS as readonly string[]).includes(tool)
}

function checkBinaryExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' })
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Install instructions per CLI tool
// ---------------------------------------------------------------------------

const INSTALL_INSTRUCTIONS: Record<string, string> = {
  codex: 'npm install -g @openai/codex',
  claude: 'npm install -g @anthropic-ai/claude-code',
  gemini: 'npm install -g @google/gemini-cli',
  pi: 'see https://pi.ai/install',
}

// ---------------------------------------------------------------------------
// Wizard steps
// ---------------------------------------------------------------------------

function getConfiguredChannelNames(config: ClisbotConfig): string[] {
  return listStartupChannelDescriptors()
    .filter((d) => d.isEnabled(config))
    .map((d) => d.channel)
}

function displayConfiguredChannels(config: ClisbotConfig): void {
  console.log('Configured Channels:')
  console.log('')
  const channelNames = getConfiguredChannelNames(config)
  if (channelNames.length === 0) {
    console.log('  (none yet — run clisbot setup channels first)')
  } else {
    for (const channel of channelNames) {
      console.log(`  • ${channel}`)
    }
  }
  console.log('')
}

async function selectCliToolWithVerification(rl: RLInterface): Promise<AgentCliToolId> {
  while (true) {
    console.log('Available CLI tools:')
    for (const tool of SUPPORTED_AGENT_CLI_TOOLS) {
      console.log(`  • ${tool}`)
    }
    console.log('')
    const input = await ask(rl, 'Select AI CLI: ')
    const tool = input.trim().toLowerCase()
    if (tool === '') {
      throw new WizardCancelled()
    }
    if (!isSupportedCliTool(tool)) {
      console.log('  Invalid selection. Try again.')
      console.log('')
      continue
    }
    if (!checkBinaryExists(tool)) {
      console.log(`  Binary not found: ${tool}`)
      const installCmd = INSTALL_INSTRUCTIONS[tool] ?? `install ${tool}`
      console.log(`  Install: ${installCmd}`)
      console.log('  Try again after installation.')
      console.log('')
      continue
    }
    return tool
  }
}

async function selectBotType(rl: RLInterface): Promise<AgentBootstrapMode> {
  console.log('')
  console.log('Bot Type:')
  console.log('  1. personal-assistant — single operator, focused workspace')
  console.log('  2. team-assistant     — shared team workflows, explicit routes required')
  console.log('')
  while (true) {
    const choice = await ask(rl, 'Choose bot type [1/2]: ')
    const trimmed = choice.trim()
    if (trimmed === '') {
      throw new WizardCancelled()
    }
    if (trimmed === '1') return 'personal-assistant'
    if (trimmed === '2') return 'team-assistant'
    console.log('  Invalid selection. Enter 1 or 2.')
  }
}

async function selectChannelsForAgent(
  rl: RLInterface,
  config: ClisbotConfig,
): Promise<string[]> {
  console.log('')
  console.log('Link to channels:')
  const channelNames = getConfiguredChannelNames(config)
  if (channelNames.length === 0) {
    console.log('  No channels configured. Run clisbot setup channels first.')
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
  const channelSummary = selectedChannels.length > 0 ? selectedChannels.join(', ') : '(none)'
  console.log(`  Channels: ${channelSummary}`)
  console.log('')
}

function displaySuccessMessage(): void {
  console.log('')
  console.log('Agent wizard complete.')
  console.log('')
  console.log('Routing chain active. Verify by sending a message to a configured channel.')
  console.log('Next step: clisbot routes add  (to set explicit message routes)')
  console.log('')
}

async function activateConfiguration(configPath: string): Promise<void> {
  const status = await getRuntimeStatus({ configPath })
  if (status.running) {
    console.log('')
    console.log('Runtime is running — config will reload automatically.')
  } else {
    console.log('')
    console.log('Runtime not running — starting...')
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
      console.log(`Runtime started (pid: ${result.pid}).`)
    } catch (err) {
      console.error('Config saved. Runtime failed to start automatically.')
      console.error((err as Error).message)
      console.error('Run: clisbot start')
    }
  }
  displaySuccessMessage()
}

// ---------------------------------------------------------------------------
// Session orchestrator
// ---------------------------------------------------------------------------

async function runWizardSession(rl: RLInterface, configPath: string): Promise<void> {
  console.log('')
  console.log('=== clisbot setup agent ===')
  console.log('')

  const configResult = await ensureConfigFile(configPath)
  const { config } = await readEditableConfig(configResult.configPath)

  displayConfiguredChannels(config)

  let cliTool: AgentCliToolId
  let botType: AgentBootstrapMode
  let selectedChannels: string[]

  try {
    cliTool = await selectCliToolWithVerification(rl)
    botType = await selectBotType(rl)
    selectedChannels = await selectChannelsForAgent(rl, config)
  } catch (err) {
    if (err instanceof WizardCancelled) {
      console.log('Setup cancelled.')
      return
    }
    throw err
  }

  displayReview(cliTool, botType, selectedChannels)

  const confirmed = await ask(rl, 'Proceed? [Y/n] ')
  if (confirmed.trim().toLowerCase() === 'n') {
    console.log('Setup cancelled.')
    return
  }

  const workspace = join(dirname(configResult.configPath), 'workspaces', 'default')
  await addAgentToEditableConfig({
    configPath: configResult.configPath,
    agentId: 'default',
    cliTool,
    workspace,
    bootstrap: botType,
  })

  await activateConfiguration(configResult.configPath)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

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
