import { createInterface } from 'node:readline'
import { readEditableConfig } from '../../config/core/config-file.ts'
import { ensureConfigFile } from '../runtime/runtime-process.ts'
import { withWizardCleanup, ensureTTY } from './setup-wizard-utils.ts'
import { runChannelsWizard } from './setup-channels.ts'
import { runAgentWizard } from './setup-agent.ts'
import { expandHomePath, getDefaultConfigPath } from '../../infra/paths.ts'
import type { ClisbotConfig } from '../../config/core/schema.ts'

// Suppress unused-import lint: all symbols used in GREEN implementation (Wave 2)
void (createInterface as unknown)
void (readEditableConfig as unknown)
void (ensureConfigFile as unknown)
void (withWizardCleanup as unknown)
void (ensureTTY as unknown)
void (runChannelsWizard as unknown)
void (runAgentWizard as unknown)
void (expandHomePath as unknown)
void (getDefaultConfigPath as unknown)

function hasChannelsConfigured(_config: ClisbotConfig): boolean {
  throw new Error('not implemented')
}

function hasAgentConfigured(_config: ClisbotConfig): boolean {
  throw new Error('not implemented')
}

export async function runSetupRouter(_options?: { configPath?: string }): Promise<void> {
  throw new Error('not implemented')
}
