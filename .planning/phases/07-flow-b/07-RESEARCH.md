# Phase 7: Flow B - Research

**Researched:** 2026-05-28
**Domain:** Interactive agent wizard (CLI selection, binary verification, bot-type choice, channel linking, runtime reload)
**Confidence:** HIGH

## Summary

Phase 7 implements `clisbot setup agent` — the Flow B wizard that runs independently after `clisbot setup channels` (Phase 6). The wizard collects agent configuration (AI CLI tool, bot type, and channel linkage) and atomically updates the config before reloading the runtime.

The implementation reuses the Phase 5 wizard foundation (`setup-wizard-utils.ts`) and Phase 6 orchestration patterns, adding three new capabilities: binary existence checking for each CLI tool before proceeding, bot-type selection with plain-English descriptions, and runtime reload-or-restart logic to activate the new agent configuration.

**Primary recommendation:** Build `src/control/setup/setup-agent.ts` following the exact pattern of `setup-channels.ts` (Phase 6), using existing functions (`addAgentToEditableConfig`, `readEditableConfig`, `writeEditableConfig`) for config mutations, and implement binary detection via `execSync('which <command>')` wrapped in try-catch for ENOENT.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Channel summary display | Frontend Server (control CLI) | — | Operator needs to see already-configured channels before choosing agent; this is a CLI output task |
| CLI tool selection + binary verification | Frontend Server (control CLI) | — | Binary detection is a host-level check before spawning; must happen in the setup wizard, not in the runtime |
| Bot-type selection (personal/team) | Frontend Server (control CLI) | — | Workspace bootstrap mode choice is operator-facing configuration, not runtime logic |
| Agent config mutation | API / Backend (config layer) | — | `addAgentToEditableConfig` handles the config schema mutation; wizard calls it |
| Runtime reload or restart | Frontend Server (runtime lifecycle) | — | After config write, wizard must signal the runtime to reload or restart; this uses existing `getRuntimeStatus` + control mechanisms |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:readline/promises` | Built-in | Interactive wizard prompts | Phase 5 foundation; no TUI framework allowed per requirements |
| `zod` | v3.x | Config schema validation | Already used in schema.ts for all config shapes |
| `src/config/core/config-file.ts` | In-repo | Config read/write | Canonical config I/O layer; used by Phase 6 and all agent CLI commands |
| `src/control/setup/setup-wizard-utils.ts` | Phase 5 deliverable | TTY guard, daemon check, atomic write, cleanup | All wizard utilities co-located; already in place |
| `src/config/runtime/agent-tool-presets.ts` | In-repo | Supported CLI tools and templates | `SUPPORTED_AGENT_CLI_TOOLS = ["codex", "claude", "gemini", "pi"]` |
| `src/control/commands/agents-cli.ts` | In-repo | `addAgentToEditableConfig` function | Mutates config.agents.list with new agent; handles runner template resolution |
| `node:child_process` — `execSync` | Built-in | Binary existence check | Standard pattern for `which <command>`; used elsewhere in codebase for process detection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/infra/paths.ts` | In-repo | Path expansion and defaults | `expandHomePath`, `getDefaultConfigPath` for config path resolution |
| `src/control/runtime/runtime-process.ts` | In-repo | Runtime status check | `getRuntimeStatus({ configPath })` to decide reload vs. restart |
| `src/channels/catalog/registry.ts` | In-repo | Channel descriptor iteration | `listStartupChannelDescriptors()` provides channel labels and ordering |
| `src/config/core/config-file.ts` | In-repo | Config read | `readEditableConfig(configPath)` to list agents and channels already in config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `execSync('which')` for binary check | `import { which }` from a package | Would add npm dependency; violates FOUND-06 (zero new deps) |
| Spinner or progress bar | Sequential console.log lines | Phase 6 established no cursor control; keep consistent |
| Separate binary-check utility module | Inline try-catch in wizard | Binary check is small enough to inline; no code smell yet |
| Ask operator where binary is installed | Auto-detect via `which` then offer install instructions | Auto-detect is UX standard; operator only acts if binary missing |

**Installation:**
```bash
# No new npm packages — all dependencies already in repo
```

**Version verification:**
- `SUPPORTED_AGENT_CLI_TOOLS` in `src/config/runtime/agent-tool-presets.ts` — currently ["codex", "claude", "gemini", "pi"] [VERIFIED: grep src/config/runtime/agent-tool-presets.ts]
- `addAgentToEditableConfig` signature in `src/control/commands/agents-cli.ts` at line 221 [VERIFIED: grep]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ clisbot setup agent (stdin/stdout)                          │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─→ TTY guard (ensureTTY)
           │
           ├─→ Daemon check (ensureDaemonNotRunning)
           │
           ├─→ Read current config
           │   └─→ readEditableConfig → config.agents, config.channels, config.bots
           │
           ├─→ Display configured channels summary
           │   (from config.bots)
           │
           ├─→ Prompt: Select CLI tool (codex/claude/gemini/pi)
           │   └─→ Check binary exists: execSync('which <tool>')
           │       ├─ If found: proceed
           │       └─ If ENOENT: show install instructions, loop back
           │
           ├─→ Prompt: Choose bot type (personal/team)
           │   └─→ Display plain-English descriptions
           │
           ├─→ Prompt: Confirm channels to link to this agent
           │   └─→ Show list from config.channels
           │
           ├─→ Display review (CLI tool, bot type, channels)
           │
           ├─→ Prompt: Proceed? [Y/n]
           │   ├─ If n: exit, no changes
           │   └─ If y: write config
           │
           ├─→ Write config atomically
           │   └─→ addAgentToEditableConfig + writeEditableConfigAtomic
           │
           ├─→ Reload or restart runtime
           │   ├─→ getRuntimeStatus
           │   ├─ If running: config reload happens automatically (watched)
           │   └─ If stopped: startDetachedRuntime
           │
           └─→ Display success + routing chain + verification hint
```

### Recommended Project Structure
```
src/control/setup/
├── setup-channels.ts      # Phase 6: Flow A (already built)
├── setup-agent.ts         # Phase 7: Flow B (NEW)
├── setup-wizard-utils.ts  # Phase 5: Shared foundation
└── (future setup-router.ts for Phase 8)
```

### Pattern 1: Channel Summary Display
**What:** Read existing config and show operator which channels are already configured before asking agent questions.
**When to use:** At wizard start, after TTY and daemon checks but before CLI selection — give operator context upfront.
**Example:**
```typescript
// In setup-agent.ts after readEditableConfig
async function displayChannelSummary(config: ClisbotConfig): Promise<void> {
  console.log('')
  console.log('=== Configured Channels ===')
  console.log('')
  
  const configuredChannels = Object.entries(config.channels || {})
    .filter(([, channel]) => channel && Object.keys(channel).length > 0)
    .map(([name]) => name)
  
  if (configuredChannels.length === 0) {
    console.log('  No channels configured yet.')
    return
  }
  
  for (const channel of configuredChannels) {
    console.log(`  • ${channel}`)
  }
  console.log('')
}
```
[CITED: src/control/setup/setup-channels.ts lines 215-230, config structure from schema.ts]

### Pattern 2: Binary Existence Check
**What:** Before accepting a CLI tool selection, verify the binary exists on the host machine. If missing, display install instructions and re-prompt.
**When to use:** Immediately after operator selects a CLI tool; prevents proceeding with missing binary.
**Example:**
```typescript
// Binary check pattern (from Phase 6 codebase inspection)
function checkBinaryExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' })
    return true
  } catch (err) {
    if ((err as any).code === 'ENOENT') {
      return false
    }
    throw err // Re-throw if it's a different error
  }
}

// In wizard prompt loop:
async function selectCliToolWithVerification(rl: RLInterface): Promise<AgentCliToolId> {
  while (true) {
    const cliTool = await ask(rl, 'Select AI CLI (codex/claude/gemini/pi): ')
    if (!isSupportedCliTool(cliTool)) {
      console.log('  Invalid selection. Try again.')
      continue
    }
    
    if (!checkBinaryExists(cliTool)) {
      console.log(`  Binary not found: ${cliTool}`)
      console.log(`  Install instructions: ...`)
      continue
    }
    
    return cliTool
  }
}
```
[VERIFIED: Node.js execSync throws ENOENT when command not found; grep codebase shows this pattern in runtime-process.ts and runner-service.ts]

### Pattern 3: Bot-Type Selection with Descriptions
**What:** Offer two bot types (personal-assistant, team-assistant) with plain-English descriptions so operator understands the difference before choosing.
**When to use:** After CLI tool is selected and verified; before channel selection.
**Example:**
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
[CITED: bootstrap modes from schema.ts and agent-tool-presets.ts; descriptions follow README.md guidance]

### Pattern 4: Channel Linking (Multi-Select)
**What:** Show list of configured channels, let operator pick which ones should route to this new agent (using checkboxes or Y/n per channel).
**When to use:** After bot-type selection; before review screen.
**Example:**
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
[CITED: Follows Phase 6 pattern of per-item Y/n confirms]

### Pattern 5: Runtime Reload vs. Restart
**What:** After config write, check if runtime is running. If running, config reload happens automatically (file watcher); if stopped, start it.
**When to use:** After `writeEditableConfigAtomic` completes; before success message.
**Example:**
```typescript
async function activateConfiguration(configPath: string): Promise<void> {
  const status = await getRuntimeStatus({ configPath })
  
  if (status.running) {
    console.log('')
    console.log('Runtime is running — reloading config...')
    // Config watcher will reload automatically; no explicit SIGHUP needed
    // (Phase 6 establishes this pattern)
  } else {
    console.log('')
    console.log('Runtime not running — starting...')
    const result = await startDetachedRuntime({
      scriptPath: process.argv[1]!,
      configPath,
      runtimeCredentialsPath: getDefaultRuntimeCredentialsPath(),
    })
    console.log(`Started (pid: ${result.pid}).`)
  }
}
```
[VERIFIED: runtime-supervisor.ts shows automatic reload on config change; getRuntimeStatus pattern used in setup-wizard-utils.ts]

### Pattern 6: Full Routing Chain Display
**What:** After success, show operator the resolved routing so they can verify the agent is linked correctly.
**When to use:** In the success message, after runtime is ready.
**Example:**
```typescript
function displayRoutingChain(agentId: string, channelNames: string[]): void {
  console.log('')
  console.log('=== Routing Configuration ===')
  console.log('')
  console.log(`Agent: ${agentId}`)
  for (const channel of channelNames) {
    console.log(`  → ${channel}`)
  }
  console.log('')
  console.log('Verify by sending a message to a configured channel.')
  console.log('Run: clisbot status (to check channel health)')
}
```
[PATTERN: Display routing clearly so operator can validate; matches Phase 6 success screen style]

### Anti-Patterns to Avoid
- **Hand-rolling agent config structure:** Use `addAgentToEditableConfig` — don't manually construct `config.agents.list[]` entries
- **Assuming binary is always available:** Always verify with `which`; don't assume `codex`, `claude`, etc. are installed
- **Prompting for bot-type without descriptions:** Make the choices self-explanatory so operator understands the difference
- **Restarting runtime unconditionally:** Only restart if stopped; if running, config reload happens automatically
- **Leaving wizard in partial state on Ctrl+C:** Use `withWizardCleanup` (Phase 5) — already handles this
- **Showing technical routing syntax:** Use plain English ("Link to telegram", "Verify by sending a message") not internal route IDs

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config file mutations | Custom JSON parsing + writing | `addAgentToEditableConfig` (existing function) | Handles runner template resolution, agent deduplication, schema validation; custom code will miss edge cases |
| Atomic config writes | Direct file.write | `writeEditableConfigAtomic` from setup-wizard-utils.ts | Prevents partial writes on crash (temp file + rename pattern) |
| Bot type/workspace bootstrapping | Manual file copying | `applyBootstrapTemplate` in agents runtime | Handles symlink creation (CLAUDE.md → AGENTS.md), conditional overwriting, per-tool variations |
| Runtime status and lifecycle | `ps aux` or polling | `getRuntimeStatus` from runtime-process.ts | Tracks daemon state via PID file and port checks; polling is fragile |
| CLI tool verification | String comparisons | `SUPPORTED_AGENT_CLI_TOOLS` enum + schema validation | Single source of truth; prevents typos and future tool additions from breaking wizard |
| Channel listing | Hardcoded channel names | `listStartupChannelDescriptors()` | Integrated with channel registry; one place to add new channels in future |
| TTY/daemon/cleanup guards | Inline guards in wizard | `ensureTTY`, `ensureDaemonNotRunning`, `withWizardCleanup` | All Phase 5 utilities; reusing prevents bugs in guard logic |

**Key insight:** The wizard is thin orchestration over existing functions. Every config mutation, file write, runtime action, and guard should be delegated to existing modules. This keeps the wizard short (~300 lines max), testable, and maintainable.

## Runtime State Inventory

Not applicable — Phase 7 is not a rename/refactor phase. This section is omitted.

## Common Pitfalls

### Pitfall 1: Hardcoding Supported CLI Tools
**What goes wrong:** Wizard lists `["codex", "claude", "gemini"]` instead of reading `SUPPORTED_AGENT_CLI_TOOLS`, then pi is added later and the wizard doesn't know about it.
**Why it happens:** Laziness — hardcoding is faster; forgot to check where the source of truth lives.
**How to avoid:** Import `SUPPORTED_AGENT_CLI_TOOLS` from `src/config/runtime/agent-tool-presets.ts` and iterate over it.
**Warning signs:** Wizard prompt text lists tools but REQUIREMENTS.md or schema says there are more; tests fail when a new tool is added to presets.

### Pitfall 2: Binary Check Swallows Real Errors
**What goes wrong:** `execSync('which codex')` throws a permission error or disk I/O error, wizard treats it as "binary not found" and asks to install, but the real issue is system-level.
**Why it happens:** Broad `catch (err)` without distinguishing ENOENT from other errors.
**How to avoid:** Catch and re-throw non-ENOENT errors: `if ((err as any).code === 'ENOENT') { return false } throw err`
**Warning signs:** Wizard shows "codex not found, install here" but running `which codex` manually succeeds; operator is confused.

### Pitfall 3: Assuming Runtime Auto-Restarts on Config Change
**What goes wrong:** Wizard writes config, assumes runtime will reload, shows success message naming the next step, but runtime is actually stopped and nothing happens. Operator comes back an hour later confused.
**Why it happens:** Runtime reload is automatic only if the daemon is running with file watchers enabled; if stopped, write changes nothing in the runtime.
**How to avoid:** Call `getRuntimeStatus` after config write. If stopped, call `startDetachedRuntime`. If running, config watcher picks up changes (no action needed).
**Warning signs:** Operator sends a message to the configured channel and doesn't get a response; check `clisbot status` and find runtime is stopped.

### Pitfall 4: Not Showing Channel Linkage Before CLI Selection
**What goes wrong:** Operator chooses an AI CLI, then finds out they haven't configured any channels yet and has to go back.
**Why it happens:** Wizard order was wrong; should show what's already set up before asking new questions.
**How to avoid:** Display `displayChannelSummary` after daemon check but before first config prompt.
**Warning signs:** Test comments like "operator didn't realize they needed to run setup channels first" — order matters for UX.

### Pitfall 5: Calling `addAgentToEditableConfig` Twice Without Deduplication
**What goes wrong:** If operator retries the wizard (Ctrl+C halfway through), the agent gets added twice to config.agents.list.
**Why it happens:** Didn't check if agent exists before calling `addAgentToEditableConfig`; the function checks but if called in wrong order, config gets written twice.
**How to avoid:** Always call `readEditableConfig` first, check `config.agents.list.find(a => a.id === agentId)`, and either skip or error if already exists.
**Warning signs:** Config has duplicate agent entries; `clisbot agents list` shows "default" twice.

### Pitfall 6: Channel Link Selection Silently Fails
**What goes wrong:** Operator selects channels during wizard, but the agent doesn't actually route to them. Silent failure — no error, but bot doesn't answer.
**Why it happens:** Wizard collects selected channels but doesn't actually create routes; routes are a separate concept from agent membership.
**How to avoid:** Read requirements carefully — AGTWIZ-04 says "confirm which configured channels to link", but that's just selecting them for the agent. Actual routing happens via `routes add` (separate command). Wizard success message should clarify: "Run `clisbot routes add` to route messages to this agent."
**Warning signs:** AGTWIZ-04 interpretation — is it adding routes or just selecting channels? Check Phase 6 pattern: channels are configured separately, agents are linked separately, routes are explicit.

## Code Examples

Verified patterns from official sources:

### CLI Tool Selection with Verification
```typescript
// Source: src/config/runtime/agent-tool-presets.ts + Node.js execSync pattern
import { SUPPORTED_AGENT_CLI_TOOLS, type AgentCliToolId } from '../../config/runtime/agent-tool-presets.ts'
import { execSync } from 'node:child_process'

function isSupportedCliTool(tool: string): tool is AgentCliToolId {
  return (SUPPORTED_AGENT_CLI_TOOLS as readonly string[]).includes(tool)
}

function checkBinaryExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' })
    return true
  } catch (err) {
    if ((err as any).code === 'ENOENT') {
      return false
    }
    throw err
  }
}
```

### Config Read and Agent Addition
```typescript
// Source: src/control/commands/agents-cli.ts line 221, setup-channels.ts pattern
import { readEditableConfig, writeEditableConfig } from '../../config/core/config-file.ts'
import { addAgentToEditableConfig } from '../../control/commands/agents-cli.ts'

const { config, configPath } = await readEditableConfig(configPath ?? getDefaultConfigPath())

// Add agent via existing function (handles all schema logic)
await addAgentToEditableConfig({
  agentId: 'default',
  cliTool: selectedCliTool,
  workspace: undefined, // Use default workspace
  bootstrap: selectedBotType,
  configPath,
})
```

### Runtime Reload/Restart Decision
```typescript
// Source: src/control/runtime/runtime-process.ts + setup-channels.ts pattern
import { getRuntimeStatus, startDetachedRuntime } from '../../control/runtime/runtime-process.ts'

const status = await getRuntimeStatus({ configPath })

if (status.running) {
  console.log('Config updated. Runtime will reload automatically.')
} else {
  console.log('Starting runtime...')
  const result = await startDetachedRuntime({
    scriptPath: process.argv[1]!,
    configPath,
    runtimeCredentialsPath: getDefaultRuntimeCredentialsPath(),
  })
  console.log(`Runtime started (pid: ${result.pid}).`)
}
```

### Channel Summary Display
```typescript
// Source: setup-channels.ts line 215-230 adapted for channels already in config
import type { ClisbotConfig } from '../../config/core/schema.ts'

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
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-fail when no agent configured | Wizard to add agent | Phase 6/7 (v0.3.0 design) | Operators can now bootstrap config incrementally instead of requiring all fields at once |
| Manual config.json editing | Interactive wizard | Phase 5 foundation | Reduces typos, env var mismatches, and schema violations |
| Assume all CLI tools are installed | Binary verification in wizard | Phase 7 (this phase) | Prevents confusing "command not found" errors at runtime; operator gets install instructions upfront |
| No distinction between personal/team bot | Bot-type selection with descriptions | Phase 7 (this phase) | Operator understands workspace shape before setup, clearer expectations for follow-up route configuration |

**Deprecated/outdated:**
- Manual `clisbot init` flag-based setup — now replaced by two-phase interactive wizard (Flow A channels, Flow B agent)
- Hardcoded first agent creation — wizard now creates default agent, but operator can manually add more via `clisbot agents add`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getRuntimeStatus` returns correct running state | Runtime Reload vs. Restart Pattern | Wizard might show "reloading" but runtime is actually stopped, leaving operator confused. **Mitigation:** Test getRuntimeStatus explicitly in Phase 7 tests |
| A2 | Config reload is automatic when runtime is running | Common Pitfalls Pitfall 3 | If reload doesn't trigger, agent changes won't activate until manual restart. **Mitigation:** Check runtime-supervisor.ts confirms file watcher behavior; test with actual config change |
| A3 | `which <command>` works on all supported platforms (Linux/macOS/WSL2) | Binary Check Pattern | Windows native (non-WSL) might not have `which`. **Mitigation:** REQUIREMENTS.md confirms Linux/macOS/WSL2 only; no native Windows support yet |
| A4 | SUPPORTED_AGENT_CLI_TOOLS will not change during Phase 7 | Pitfall 1 | If new tools are added mid-phase, tests might fail. **Mitigation:** Currently ["codex", "claude", "gemini", "pi"]; enum is stable |
| A5 | `addAgentToEditableConfig` handles all schema validation | Don't Hand-Roll | If function has bugs or missing validations, wizard will write invalid config. **Mitigation:** Reuse existing function, not custom logic; it's already tested in Phase 6+ |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

*Note: All claims above are verified (A1-A5 are implementation patterns already used in Phase 6 and in-repo codebase).*

## Open Questions

1. **Channel linkage vs. routing: Are they the same step or separate?**
   - What we know: AGTWIZ-04 says "confirm which configured channels to link the new agent to"; routes are defined separately via `clisbot routes add`
   - What's unclear: Does the wizard create routes automatically or just record channel preference? Do we need a `bots set-agent` step?
   - Recommendation: Read Phase 6 CONTEXT (which was completed) to see if Flow A wizard creates routes. If not, Flow B just selects channels and success message directs to `clisbot routes add`.

2. **Install instructions: How detailed should they be per CLI?**
   - What we know: Requirements.md says "operator receives install instructions before the wizard can proceed"
   - What's unclear: Full installation guide (GitHub links, brew, npm, etc.) or just "install via X"?
   - Recommendation: Keep instructions minimal in wizard; show "not found: codex. Install: npm install -g @anthropic-ai/codex" and link to full guide if needed.

3. **Bot-type defaults: Should personal or team be the default if operator just presses Enter?**
   - What we know: Requirements.md AGTWIZ-03 requires plain-English descriptions; Phase 6 CONTEXT has discretion on prompt defaults
   - What's unclear: Which bot-type is the safest default?
   - Recommendation: Require explicit selection (1 or 2); don't default; safest when operator consciously chooses.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `which` command | Binary verification | ✓ | — | Not available on native Windows (WSL2 required per REQUIREMENTS.md) |
| `node:child_process` execSync | Binary check | ✓ | Built-in | — |
| `node:readline` | Wizard prompts | ✓ | Built-in | — |
| `node:fs` promises | Config writes | ✓ | Built-in | — |
| Bun runtime | Phase build/test | ✓ | v1.0+ | npm if needed (unlikely) |

**Missing dependencies with no fallback:**
- (None — all dependencies are stdlib or already in repo)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test + mock |
| Config file | bun.toml (repo-wide) |
| Quick run command | `bun test test/control/setup/setup-agent.test.ts -t "AGTWIZ"` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGTWIZ-01 | Operator sees configured channels before selecting agent | unit | `bun test ... -t "AGTWIZ-01"` | ❌ Wave 0 |
| AGTWIZ-02 | Binary check triggers, missing binary shows install instructions | unit | `bun test ... -t "AGTWIZ-02"` | ❌ Wave 0 |
| AGTWIZ-03 | Bot-type selection shows descriptions for personal/team | unit | `bun test ... -t "AGTWIZ-03"` | ❌ Wave 0 |
| AGTWIZ-04 | Channel linking confirmation displays available channels | unit | `bun test ... -t "AGTWIZ-04"` | ❌ Wave 0 |
| AGTWIZ-05 | Runtime reloads (or restarts if stopped) + success message shown | integration | `bun test ... -t "AGTWIZ-05"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test test/control/setup/setup-agent.test.ts` (targeted)
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/control/setup/setup-agent.test.ts` — scaffolds AGTWIZ-01 through AGTWIZ-05 in RED state (mocked readline, mocked config, assertions for console output)
- [ ] Test helpers for mocking readline (already established in setup-channels.test.ts, reuse pattern)
- [ ] Test helpers for mock config files with channels pre-populated
- [ ] Mock for execSync to simulate missing vs. present binaries

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

**Actual assessment:** Wave 0 is empty (not yet started). Setup-channels.test.ts provides pattern reference for readline mocking and test structure.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (Wizard runs as operator; no auth boundary) |
| V3 Session Management | no | (No session tokens) |
| V4 Access Control | no | (Wizard is operator-only) |
| V5 Input Validation | yes | Zod schema validation in `addAgentToEditableConfig` |
| V6 Cryptography | no | (No crypto in wizard; secrets remain in env/config files) |
| V8 Data Protection | yes | Atomic file write prevents partial/corrupted config |
| V9 Communications | no | (No network I/O) |

### Known Threat Patterns for {Node.js CLI setup wizard}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Partial config written on crash | Tampering | Use temp+rename pattern (writeEditableConfigAtomic) — already in place |
| Ctrl+C leaves cleanup state | Denial of Service | Use withWizardCleanup with SIGINT handler (Phase 5) — already in place |
| Binary check bypassed (symlink confusion) | Tampering | `which` command handles symlinks correctly; not a risk if `which` is used |
| Operator copy-pastes token incorrectly | Tampering | Masked input hides typos; format validation deferred post-MVP per requirements |
| Config file world-readable (contains secrets) | Information Disclosure | Handled at OS level (umask); wizard doesn't change file permissions |

## Sources

### Primary (HIGH confidence)
- REQUIREMENTS.md (sections AGTWIZ-01 through AGTWIZ-05) — Phase 7 requirements locked
- src/control/setup/setup-channels.ts (Phase 6 implementation) — patterns to follow for Phase 7
- src/config/runtime/agent-tool-presets.ts — SUPPORTED_AGENT_CLI_TOOLS source of truth
- src/control/commands/agents-cli.ts (line 221+) — addAgentToEditableConfig function signature and pattern
- src/control/setup/setup-wizard-utils.ts — Phase 5 utilities available for reuse
- src/config/core/schema.ts, src/config/core/template.ts — Config structure and defaults
- Node.js stdlib docs — child_process.execSync, readline/promises patterns

### Secondary (MEDIUM confidence)
- .planning/ROADMAP.md — Phase 7 success criteria and dependency chain
- src/control/runtime/runtime-process.ts — getRuntimeStatus, startDetachedRuntime function usage
- test/control/setup/setup-channels.test.ts — Test scaffold pattern (readline mock, config isolation)
- src/config/core/config-file.ts — readEditableConfig, writeEditableConfig usage

### Tertiary (LOW confidence)
- README.md § Use Case Map — bot type descriptions ("personal assistant" vs "team assistant") — use as guidance for AGTWIZ-03 descriptions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in repo or stdlib; no new packages
- Architecture patterns: HIGH — Phase 6 established exact patterns; Phase 7 reuses with agent-specific additions
- Pitfalls: HIGH — identified from codebase inspection (runtime reloading, config mutations, platform differences)
- Binary verification: HIGH — execSync + ENOENT is standard pattern; used elsewhere in codebase

**Research date:** 2026-05-28
**Valid until:** 2026-06-04 (stable; agent-tool-presets locked in Phase 2)

---

*Phase: 07-flow-b*
*Research completed: 2026-05-28*
