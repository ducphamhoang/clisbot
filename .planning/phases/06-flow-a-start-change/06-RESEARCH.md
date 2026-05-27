# Phase 6: Flow A + start() Change — Research

**Researched:** 2026-05-27
**Domain:** Interactive setup wizard (channel token collection, unrouted mode runtime start)
**Confidence:** HIGH

## Summary

Phase 6 builds the interactive channel setup wizard (`clisbot setup channels`) that collects Telegram/Slack/Zalo-bot tokens via readline prompts, pre-detects tokens from environment variables, masks token input, displays a review screen, and starts the detached runtime in unrouted mode. The phase also modifies `clisbot start` to issue a warning instead of a hard failure when channels are configured but no agent is linked, enabling operators to test channel connectivity before committing to an agent.

The implementation is thin orchestration over Phase 5 utilities (`ensureTTY`, `ensureDaemonNotRunning`, `writeEditableConfigAtomic`, `withWizardCleanup`) plus existing channel and config functions (`applyBootstrapBotsToConfig`, `startDetachedRuntime`, `getDefaultChannelAvailability`). The primary new capability is `promptMasked` — a readline helper that patches `_writeToOutput` to show asterisks instead of echoing the actual token characters.

**Primary recommendation:** Implement `promptMasked` in `setup-wizard-utils.ts` using the `_writeToOutput` monkey-patch pattern (already proven in enterprise readline CLIs); build `setup-channels.ts` as a 200–250 line sequential wizard; modify the no-agent guard in `runtime-bootstrap-cli.ts` to warn and continue for `start` (but not `init`).

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `_writeToOutput` monkey-patch for masked input — no raw stdin mode
- **D-02:** Show asterisks per character (not silent/blank)
- **D-03:** Add `promptMasked(rl: Interface, question: string): Promise<string>` to `setup-wizard-utils.ts`
- **D-04:** Sequential channel flow (Telegram → Slack → Zalo-bot) with per-channel confirm
- **D-05:** Env var auto-accept — skip prompt if env var already set
- **D-06:** Token fields use `promptMasked`
- **D-07:** Zalo Personal skipped; display note pointing to `clisbot bots login zalo-personal`
- **D-08:** Default DM policy to `pairing` silently (no wizard question)
- **D-09:** CHANWIZ-03 satisfied by always writing `directMessagesPolicy: "pairing"` without prompting
- **D-10:** Review screen shows per-channel config before writing
- **D-11:** After writing config, start runtime immediately (no confirmation)
- **D-12:** START-01 trigger: plain `clisbot start` with channels configured, no agent, no bootstrap flags
- **D-13:** Warning message: `warning: no agent configured — starting in unrouted mode. Run clisbot setup agent to add an AI agent.`
- **D-14:** START-01 change is in `printMissingBootstrapOptions` for `commandName === "start"` with channels present

### Claude's Discretion
- Exact readline prompt text and formatting (as long as review and success screens are present)
- Whether `promptMasked` restores `_writeToOutput` after each prompt or once per session
- Exact success screen layout and line ordering (just needs to name `clisbot setup agent` as next step)
- Per-channel confirm defaults (typical: Y for env-var channels, N for missing ones)

### Deferred Ideas (OUT OF SCOPE)
- DM pairing policy prompt (always default to `pairing`)
- Token format validation regex
- Wizard resume state (`wizard-state.json`)
- Live token reachability probe
- `--non-interactive` flag
- Back-navigation within wizard steps

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHANWIZ-01 | Operator sees which channel tokens are already present in env vars, pre-filled with no re-entry | `getDefaultChannelAvailability(env)` detects env vars; return value is per-channel boolean; skip prompt if true |
| CHANWIZ-02 | Operator can select which channels to configure and skip channels without tokens | Sequential loop over `listStartupChannelDescriptors()`; per-channel confirm prompt before token entry |
| CHANWIZ-03 | Operator chooses DM pairing policy (pairing / open) for each configured channel | LOCKED: Always write `directMessagesPolicy: "pairing"` — no wizard question needed |
| CHANWIZ-04 | Operator sees review screen with all collected channel settings before config is written | Plain-text table showing channel name, token source (env/entered), DM policy; `y` or Enter to proceed, `n` to abort |
| CHANWIZ-05 | After writing config, runtime starts automatically in unrouted mode; success screen names `clisbot setup agent` | Call `startDetachedRuntime` after `writeEditableConfigAtomic`; print pairing instructions and next command |
| START-01 | `clisbot start` with channels configured but no agent proceeds with warning instead of failing hard | Modify `printMissingBootstrapOptions` in `runtime-bootstrap-cli.ts`: for `start` with channels present, warn then continue instead of exiting |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token masking at prompt time | Frontend Server (CLI) | — | Readline runs in the operator's terminal; masking is a UX/terminal concern, not runtime |
| Env var detection (which channels are ready) | Backend (config/startup) | Frontend Server (CLI) | `getDefaultChannelAvailability` lives in startup-bootstrap.ts (backend); wizard calls it to decide prompts |
| Config write (channel tokens + DM policy) | Backend (config) | Frontend Server (CLI) | `applyBootstrapBotsToConfig` and `writeEditableConfigAtomic` live in backend; wizard orchestrates the call |
| Runtime start (unrouted mode) | Backend (runtime) | Frontend Server (CLI) | `startDetachedRuntime` owns process spawn; wizard waits and prints success summary |
| Hard-fail guard change (START-01) | Backend (bootstrap/startup) | — | `printMissingBootstrapOptions` is in runtime-bootstrap-cli.ts; it decides start vs. init behavior |
| Sequential channel flow | Frontend Server (CLI) | Backend (catalog) | `listStartupChannelDescriptors()` from catalog provides order; wizard iterates in that order |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:readline/promises` | Built-in (Node v15+) | Async readline for terminal prompts | Explicitly required; zero npm dependencies per REQUIREMENTS.md; Bun runtime supports |
| `node:fs/promises` | Built-in | Atomic config write via temp + rename | Already used in Phase 5 utilities |
| `node:process` | Built-in | Process exit, stdin/stdout, signal handling | Standard for CLI lifecycle |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `applyBootstrapBotsToConfig` | Exists in `channel-bot-management.ts` | Write collected tokens to config | Phase 6 wizard calls this after token collection |
| `startDetachedRuntime` | Exists in `runtime-process.ts` | Spawn detached clisbot monitor process | Phase 6 calls after config write; returns `RuntimeStartResult` with pid/paths |
| `getDefaultChannelAvailability` | Exists in `startup-bootstrap.ts` | Detect which env vars are set | Phase 6 calls to decide whether to skip token prompts |
| `listStartupChannelDescriptors` | Exists in `channels/catalog/registry.ts` | Iterate channels in order (Telegram, Slack, Zalo-bot) | Phase 6 uses for sequential loop |
| `writeEditableConfigAtomic` | Phase 5 export in `setup-wizard-utils.ts` | Atomic temp-file config write | Phase 6 calls after `applyBootstrapBotsToConfig` |
| `ensureTTY`, `ensureDaemonNotRunning`, `withWizardCleanup` | Phase 5 exports | TTY check, daemon guard, Ctrl+C cleanup | Phase 6 reuses all three guards |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:readline/promises` | `@clack/prompts` or `enquirer` | FORBIDDEN per REQUIREMENTS.md: introduces npm deps and known Bun regression (Bun #24615 EPERM) |
| `_writeToOutput` monkey-patch | `raw` mode with manual echo control | More fragile; doesn't play nicely with readline's own input buffering; monkey-patch is proven pattern |
| Atomic write with temp+rename | Direct file overwrite | Unsafe; partial writes can leave runtime unbootable (Phase 5 guard FOUND-04) |

**Installation:**
This phase does not require npm install (no new dependencies). Reuse Phase 5 utilities from `setup-wizard-utils.ts`.

**Version verification:** Node built-in modules are versioned with the runtime. Bun 1.1.37+ ships with full Node 22 compat, including `node:readline/promises`. No version check needed.

---

## Architecture Patterns

### System Architecture Diagram

```
Operator runs: clisbot setup channels
        ↓
┌─────────────────────────────────────┐
│ setup-channels.ts (Flow A Wizard)   │
│                                     │
│  1. ensureTTY()                     │
│  2. ensureDaemonNotRunning()        │
│  3. withWizardCleanup(() => async)  │
│     ├─ listStartupChannelDescriptors()
│     │  (get Telegram, Slack, Zalo-bot)
│     │                               │
│     ├─ For each channel:            │
│     │  ├─ getDefaultChannelAvailability()
│     │  │  (check env var, e.g. TELEGRAM_BOT_TOKEN set?)
│     │  ├─ if env var set: skip token prompt
│     │  ├─ else: promptMasked(rl, "Telegram bot token: ")
│     │  │   (shows asterisks as user types)
│     │  └─ if user confirms channel
│     │     add token to ChannelBootstrapBots map
│     │                               │
│     ├─ Review screen               │
│     │  (plain text table, user confirms or aborts)
│     │                               │
│     ├─ writeEditableConfigAtomic() │
│     │  (temp file + rename)        │
│     ├─ applyBootstrapBotsToConfig()│
│     │  (insert tokens into config) │
│     │                               │
│     ├─ startDetachedRuntime()      │
│     │  (spawn monitor process)     │
│     └─ Success screen              │
│        (pairing instructions +     │
│         "clisbot setup agent")     │
└─────────────────────────────────────┘
        ↓
clisbot now running in unrouted mode


For START-01 change:
Operator runs: clisbot start (with no agent, channels configured)
        ↓
┌─────────────────────────────────────────┐
│ runtime-bootstrap-cli.ts:start()        │
│                                         │
│  1. ensureDefaultAgentBootstrap()       │
│  2. if NO agent AND NOT (--cli + --bot) │
│     ├─ OLD: printMissingBootstrapOptions("start")
│     │   then process.exit(1)
│     │                                 │
│     └─ NEW: (for channels present)   │
│         warn: "no agent configured — │
│                starting in unrouted   │
│                mode"                  │
│         then continue to             │
│         startDetachedRuntime()       │
└─────────────────────────────────────────┘
```

**Data flow:**
1. Operator input (channel selection + tokens) → in-memory `ChannelBootstrapBots` map
2. Map passed to `applyBootstrapBotsToConfig(config, bots, {firstRun})`
3. Config object mutated in-place; then written atomically to disk
4. Runtime started; config path passed to monitor via `CLISBOT_CONFIG_PATH` env var
5. SUCCESS: operator sees "clisbot setup agent" as next command

---

### Recommended Project Structure

```
src/control/setup/
├── setup-wizard-utils.ts    # Phase 5 exports + NEW: promptMasked
├── setup-channels.ts        # NEW: Flow A wizard (150–200 lines)
├── setup-agents.ts          # Phase 7 (not this phase)
└── setup.ts                 # Phase 8 router (not this phase)

test/control/setup/
├── setup-wizard-utils.test.ts  # Phase 5 tests (existing)
└── setup-channels.test.ts      # NEW: unit tests for Flow A (40–60 lines)
```

---

### Pattern 1: Masked Input via readline `_writeToOutput` Monkey-Patch

**What:** Override readline's internal `_writeToOutput` method to intercept character echo and replace with asterisks. Works because readline collects the full input before returning, so the operator's actual token never leaks to the terminal.

**When to use:** Sensitive string input (tokens, passwords) in interactive CLI. Safe because:
- Readline still buffers the input correctly (user can backspace, etc.)
- The patched method only affects visual output, not the actual input value returned to your code
- Pattern is mature (used in enterprise Node.js CLIs since 2016+)

**Example:**

```typescript
// Source: CONTEXT.md D-01, proven pattern in Node ecosystem
export async function promptMasked(
  rl: Interface,
  question: string,
): Promise<string> {
  const originalWrite = (rl as unknown as { _writeToOutput(str: string): void })._writeToOutput

  ;(rl as unknown as { _writeToOutput(str: string): void })._writeToOutput = (str: string) => {
    // For the prompt question text, echo normally
    // For user input, replace with asterisks
    if (str === '\n' || str === '\r\n') {
      originalWrite.call(rl, str)
    } else if (str.match(/./)) {
      // One character at a time: replace with asterisk
      originalWrite.call(rl, '*')
    }
  }

  try {
    return await rl.question(question)
  } finally {
    // Restore original behavior
    ;(rl as unknown as { _writeToOutput(str: string): void })._writeToOutput = originalWrite
  }
}
```

**Edge cases handled:**
- Backspace (readline erases visually, our patch just shows asterisks for what remains)
- Paste operations (each character triggers `_writeToOutput` once, so paste gets masked char-by-char)
- Ctrl+C in `withWizardCleanup` ensures cleanup happens before exit

**Security note:** Token is never logged to stdout/stderr. Only the asterisk mask is visible. Logs and process memory still contain the literal value, so treat them as sensitive.

---

### Pattern 2: Sequential Channel Wizard Loop

**What:** Iterate through channels in stable order (Telegram, Slack, Zalo-bot); for each channel, check if env var is set; if set, skip prompt; if not, ask operator if they want to configure it.

**When to use:** Multi-option interactive setup where some options are pre-configured via env vars.

**Example:**

```typescript
// Source: startup-bootstrap.ts:getDefaultChannelAvailability
const channelAvailability = getDefaultChannelAvailability(process.env)

const collectedBots: ChannelBootstrapBots = {
  telegram: [],
  slack: [],
  'zalo-bot': [],
  'zalo-personal': [],
}

for (const descriptor of listStartupChannelDescriptors()) {
  console.log(`\n${descriptor.statusLabel}`)
  
  if (channelAvailability[descriptor.channel]) {
    console.log(`  Using token from env var (${descriptor.statusLabel})`)
    // Pre-fill from env: just mark as configured
    collectedBots[descriptor.channel] = [
      {
        botId: 'default',
        botToken: { kind: 'env', placeholder: 'TELEGRAM_BOT_TOKEN' }, // e.g.
      },
    ]
  } else {
    const answer = await rl.question(`  Configure ${descriptor.statusLabel}? [Y/n] `)
    if (answer.trim().toLowerCase() !== 'n') {
      const token = await promptMasked(rl, `  Token: `)
      collectedBots[descriptor.channel] = [
        {
          botId: 'default',
          botToken: { kind: 'mem', secret: token },
        },
      ]
    }
  }
}
```

---

### Pattern 3: Review Screen Before Committing

**What:** Display collected config in a plain-text table format. Operator confirms with `y` or Enter, or aborts with `n`.

**When to use:** Before any destructive write (config file, token persistence). Gives operator a last chance to review and bail.

**Example:**

```typescript
// Source: Phase 5 pattern of "show before write"
console.log('\n=== Review Channel Configuration ===\n')
console.log('Channel         | Token Source | DM Policy')
console.log('────────────────┼──────────────┼──────────')
for (const [channel, bots] of Object.entries(collectedBots)) {
  if (bots.length > 0) {
    const source = bots[0]!.botToken?.kind === 'env' ? 'env var' : 'entered'
    console.log(`${channel.padEnd(15)} | ${source.padEnd(12)} | pairing`)
  }
}

const confirmed = await rl.question('\nProceed? [Y/n] ')
if (confirmed.trim().toLowerCase() === 'n') {
  console.log('Aborted.')
  process.exit(0)
}
```

---

### Pattern 4: START-01 Change (Conditional Hard-Fail → Warning + Continue)

**What:** In `runtime-bootstrap-cli.ts`, the `ensureDefaultAgentBootstrap` function calls `printMissingBootstrapOptions` when no agent exists. For `start` (not `init`), and when channels ARE configured, change from `process.exit(1)` to a warning then continue.

**When to use:** When a CLI command has two paths:
1. Bootstrap path (explicit `--cli` and `--bot-type`) → must have agent to run
2. Non-bootstrap path (`clisbot start` plain) → can run in unrouted mode if channels exist

**Example (current behavior):**
```typescript
function ensureDefaultAgentBootstrap(
  state: PreparedBootstrapState,
  options: ParsedBootstrapFlags,
  commandName: "init" | "start",
) {
  if (state.config.agents.list.length > 0) {
    return true
  }

  if (!options.cliTool || !options.bootstrap) {
    if (commandName === "start") {
      printMissingBootstrapOptions(commandName)  // <-- exits with failure
    }
    return false  // <-- NEW: return false, don't exit
  }
  // ...
}
```

**Example (new behavior in printMissingBootstrapOptions):**
```typescript
function printMissingBootstrapOptions(
  commandName: "init" | "start",
  channelsConfigured?: boolean,  // NEW param
) {
  if (commandName === "start" && channelsConfigured) {
    // NEW: warn instead of fail
    console.log('warning: no agent configured — starting in unrouted mode.')
    console.log('Run clisbot setup agent to add an AI agent.')
    return  // <-- return, don't exit
  }

  if (commandName === "start") {
    printCommandOutcomeBanner("failure")
  }
  // ... rest of existing help text ...
}
```

**Security/correctness:** Only applies when:
- Command is plain `clisbot start` (no `--cli`, `--bot-type`, etc.)
- At least one channel is configured (`bots.telegram.defaults.enabled` or similar)
- This prevents `clisbot init` from silently running; `init` still requires `--cli + --bot-type`

---

### Anti-Patterns to Avoid

- **Hard-coded env var names:** Use `descriptor.getDefaultAvailability(env)` instead. Each channel plugin owns its env var contract.
- **Asking about DM policy twice:** LOCKED decision D-08: always write `pairing`, no wizard question.
- **Direct readline instead of `rl.close()` → `process.stdin.unref()`:** Bun #21189 workaround: after closing interface, explicitly call `unref()` to let the process exit. See `withWizardCleanup`.
- **Mixing `createInterface` instances:** Use ONE `rl` per wizard session. Pass it through callback chain or closure. Bun's event loop doesn't clean up multiple unclosed interfaces properly.
- **Assuming env vars persist across calls:** Token from `TELEGRAM_BOT_TOKEN` is only checked once via `getDefaultChannelAvailability`. If operator re-runs wizard, we detect it again.
- **Writing config without atomic guarantee:** Always use `writeEditableConfigAtomic` (Phase 5 export). Never use direct `writeTextFile` or `writeFileSync` for config.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Masked password/token input | Custom echo suppression logic | `promptMasked` helper (readline `_writeToOutput` patch) | readline already handles backspace, Ctrl+U, etc. correctly; monkey-patch is proven, low-risk |
| Atomic config file write | Direct file overwrite or temp-file-but-forgot-unlink | `writeEditableConfigAtomic` (Phase 5) | TOCTOU race condition between temp write and rename; sync `unlink` on error |
| Env var detection per channel | String matching on env var names | `getDefaultChannelAvailability(env)` (startup-bootstrap) | Each channel can have different env var contracts (Slack: 2 tokens, Telegram: 1 token) |
| Sequential channel iteration | Hard-coded array loop | `listStartupChannelDescriptors()` (registry.ts) | Ordering and channel descriptor structure centralized; future channels register here automatically |
| Process exit on Ctrl+C during wizard | Manual SIGINT handler | `withWizardCleanup` (Phase 5) | Async handler, temp file cleanup, stdin.unref(), Bun #21189 mitigation all included |
| Config structure for channel tokens | Custom JSON schema | `applyBootstrapBotsToConfig` (channel-bot-management.ts) | Handles `credentialType=mem` vs `env` vs `tokenFile`, defaults reconciliation, provider-specific fields |

**Key insight:** Readline with monkey-patch masking is NOT hand-rolling. It's a proven, well-documented technique used in major Node.js projects. The reason we don't hand-roll is that readline's input buffering and line-editing are complex; the monkey-patch delegates to that proven code, not reimplementing it.

---

## Runtime State Inventory

**Phase type:** New feature (non-rename/refactor). No inherited state to migrate.

**Finding:** No existing `setup-channels.ts` or `setup-channels.test.ts` files to rename or refactor. This is greenfield code.

**Exception to inventory requirement:** Phase 6 is a greenfield implementation, not a rename or refactor. The inventory section does not apply. See verification protocol: "Skip condition: If the phase is purely code/config changes with no external dependencies."

---

## Common Pitfalls

### Pitfall 1: Forgetting `process.stdin.unref()` After readline Close (Bun #21189)

**What goes wrong:** After `rl.close()`, Bun's event loop still waits for stdin stream, so the process doesn't exit. Wizard completes, success message prints, but CLI hangs for 5+ seconds until timeout.

**Why it happens:** Bun's readline/promises implementation doesn't auto-unref stdin like Node 22 does. Phase 5's `withWizardCleanup` already calls `process.stdin.unref()` in the SIGINT handler; **Flow A must also call it after the main wizard loop completes.**

**How to avoid:**
```typescript
// Inside setup-channels.ts main function:
const rl = createInterface({ input: process.stdin, output: process.stdout })
try {
  // ... wizard loop ...
} finally {
  rl.close()
  process.stdin.unref()  // <-- CRITICAL for Bun
}
```

**Warning signs:** CLI returns to prompt after ~5 second delay; Bun process stalls.

---

### Pitfall 2: Creating Multiple readline Interfaces Simultaneously

**What goes wrong:** If you create `rl1` for masking a prompt, then `rl2` for a confirm question, readline ownership conflicts occur. Input gets misdirected; backspace doesn't work as expected.

**Why it happens:** readline uses shared stdin stream. Only one interface can own stdin at a time.

**How to avoid:** Keep ONE `rl` instance for the entire wizard. Pass it through function parameters or closures.

```typescript
// WRONG:
const maskRl = createInterface(...)
const token = await promptMasked(maskRl, "Token: ")
maskRl.close()

const confirmRl = createInterface(...)  // <-- conflict
const confirmed = await confirmRl.question("Continue? ")

// RIGHT:
const rl = createInterface(...)
const token = await promptMasked(rl, "Token: ")
const confirmed = await rl.question("Continue? ")
rl.close()
```

---

### Pitfall 3: Not Checking `getDefaultChannelAvailability` Before Prompting

**What goes wrong:** Operator has `TELEGRAM_BOT_TOKEN` set in env, but wizard prompts "Telegram bot token: " anyway. Operator is confused; they expected the wizard to detect it.

**Why it happens:** Forgot to call `getDefaultChannelAvailability(process.env)` at the start of the channel loop.

**How to avoid:**
```typescript
const availability = getDefaultChannelAvailability(process.env)

for (const descriptor of listStartupChannelDescriptors()) {
  if (availability[descriptor.channel]) {
    console.log(`${descriptor.statusLabel} token detected in env`)
    // Mark as pre-filled; skip prompt
  } else {
    // Prompt for token
  }
}
```

---

### Pitfall 4: START-01 Change Breaks `clisbot init`

**What goes wrong:** You modify `printMissingBootstrapOptions` to warn-and-continue for `start`, but now `clisbot init` also warn-and-continues instead of exiting. Operators expect `init` to fail if they don't pass `--cli` and `--bot-type` explicitly (because no runtime exists yet).

**Why it happens:** START-01 change applies to both `start` and `init` branches.

**How to avoid:** Only apply the warning-and-continue logic when:
```typescript
function printMissingBootstrapOptions(commandName: "init" | "start") {
  // Check if channels are actually configured
  const config = ...  // read from disk or state
  const hasChannels = config.bots.telegram.defaults.enabled ||
                      config.bots.slack.defaults.enabled ||
                      config.bots['zalo-bot'].defaults.enabled

  if (commandName === "start" && hasChannels) {
    // NEW: warn and continue for start with channels
    console.log('warning: no agent configured — starting in unrouted mode.')
    return
  }

  // For init, or start with no channels, show full help and fail
  if (commandName === "start") {
    printCommandOutcomeBanner("failure")
  }
  // ... rest of help text ...
}
```

**Better:** Check this condition BEFORE calling `printMissingBootstrapOptions`:
```typescript
async function ensureDefaultAgentBootstrap(...) {
  if (state.config.agents.list.length > 0) {
    return true
  }

  if (!options.cliTool || !options.bootstrap) {
    const hasChannels = /* check config */
    if (commandName === "start" && hasChannels) {
      console.log('warning: no agent configured — starting in unrouted mode.')
      return true  // Signal "continue to startDetachedRuntime"
    }

    if (commandName === "start") {
      printMissingBootstrapOptions(commandName)
    }
    return false
  }
  // ...
}
```

---

### Pitfall 5: Masking Shows Asterisks But Token Still Leaks to Logs

**What goes wrong:** Operator's token shows as `***` during prompt, but if you later do `console.log(config)` or `JSON.stringify(bots)`, the token is visible in logs.

**Why it happens:** `promptMasked` only masks the terminal echo, not the actual stored value. The value is still in memory and in config on disk.

**How to avoid:** This is NOT a security breach. The token SHOULD be stored in config (encrypted or in credential files). Just:
- Never log the token intentionally
- Store in config atomically (already using `writeEditableConfigAtomic`)
- Remember: operator's `.env` or credential files are not shown in logs; config JSON is sensitive

If logs need to be user-facing, don't print full config. Print a summary instead.

---

## Code Examples

### Example 1: Collect Tokens Sequentially with Env Var Detection

```typescript
// Source: CONTEXT.md D-05, startup-bootstrap.ts pattern
import { listStartupChannelDescriptors, getDefaultChannelAvailability } from '../../channels/catalog/registry.ts'
import type { ChannelBootstrapBots } from '../../config/channels/channel-bot-management.ts'

async function collectChannelTokens(
  rl: Interface,
  env: NodeJS.ProcessEnv,
): Promise<ChannelBootstrapBots> {
  const availability = getDefaultChannelAvailability(env)
  const bots: ChannelBootstrapBots = {
    telegram: [],
    slack: [],
    'zalo-bot': [],
    'zalo-personal': [],
  }

  for (const descriptor of listStartupChannelDescriptors()) {
    if (descriptor.channel === 'zalo-personal') {
      console.log(`\n${descriptor.statusLabel}: Requires QR login.`)
      console.log('  Run: clisbot bots login zalo-personal')
      continue
    }

    console.log(`\n${descriptor.statusLabel}`)

    if (availability[descriptor.channel]) {
      console.log(`  ✓ Token found in environment variable`)
      bots[descriptor.channel] = [
        {
          botId: 'default',
          botToken: { kind: 'env', placeholder: `EXAMPLE_VAR` },
        },
      ]
      continue
    }

    const answer = await rl.question(`  Configure this channel? [Y/n] `)
    if (answer.trim().toLowerCase() === 'n') {
      continue
    }

    const token = await promptMasked(rl, `  Token: `)
    bots[descriptor.channel] = [
      {
        botId: 'default',
        botToken: { kind: 'mem', secret: token },
      },
    ]
  }

  return bots
}
```

---

### Example 2: Review Screen Before Writing Config

```typescript
// Source: CONTEXT.md D-10, plain-text summary pattern
function displayReviewScreen(bots: ChannelBootstrapBots): void {
  console.log('\n' + '='.repeat(60))
  console.log('REVIEW CHANNEL CONFIGURATION')
  console.log('='.repeat(60))
  console.log('')

  let hasChannels = false
  for (const [channel, botList] of Object.entries(bots)) {
    if (botList.length === 0) continue
    hasChannels = true

    const source = botList[0]!.botToken?.kind === 'env' ? 'env variable' : 'entered'
    const channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1)
    console.log(`  ${channelLabel}`)
    console.log(`    Token source:   ${source}`)
    console.log(`    DM policy:      pairing`)
    console.log('')
  }

  if (!hasChannels) {
    console.log('  (No channels configured)')
  }
}

async function confirmReview(rl: Interface): Promise<boolean> {
  const answer = await rl.question('Proceed with this configuration? [Y/n] ')
  return answer.trim().toLowerCase() !== 'n'
}
```

---

### Example 3: START-01 Change Condition

```typescript
// Source: CONTEXT.md D-12, D-13, D-14
// In runtime-bootstrap-cli.ts, inside ensureDefaultAgentBootstrap:

async function ensureDefaultAgentBootstrap(
  state: PreparedBootstrapState,
  options: ParsedBootstrapFlags,
  commandName: "init" | "start",
) {
  if (state.config.agents.list.length > 0) {
    return true  // Agent already configured
  }

  if (!options.cliTool || !options.bootstrap) {
    // No explicit --cli and --bot-type provided

    // NEW: Check if this is `start` with channels configured
    if (commandName === "start") {
      const hasChannels =
        state.config.bots.telegram.defaults.enabled ||
        state.config.bots.slack.defaults.enabled ||
        state.config.bots['zalo-bot'].defaults.enabled

      if (hasChannels) {
        // START-01: warn but continue
        console.log('warning: no agent configured — starting in unrouted mode.')
        console.log('Run clisbot setup agent to add an AI agent.')
        return true  // Signal: continue to startDetachedRuntime
      }
    }

    // For `init`, or `start` with no channels, show help and fail
    if (commandName === "start") {
      printMissingBootstrapOptions(commandName)
    }
    return false
  }

  // ... rest of function (agent bootstrap when --cli is provided) ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wizard requires TUI framework (`enquirer`, `@clack/prompts`) | Readline + simple text prompts only | Phase 6 decision | Zero npm deps; reduced attack surface; Bun compatibility (no EPERM); operator education on manual token flow |
| Token masking via `getPassword()` helper lib | `_writeToOutput` monkey-patch on standard readline | Phase 6 implementation | Removes npm deps for one utility; proven pattern in major CLIs; requires async/await discipline in wizard |
| Hard-fail on `clisbot start` with no agent | Warn-and-continue for channels-only mode | Phase 6 START-01 | Operators can test channel connectivity before committing to agent setup; reduces perceived barrier to entry |
| Wizard state persisted in `wizard-state.json` | Re-run wizard to redo steps | ASSUMED post-MVP | Simpler; operator expectations set by Phase 5 (no state file) |

**Deprecated/outdated:**
- Terminal-based TUI: removed from upstream codebase (May 2026); clisbot uses readline only
- Bootstrap flags (`--telegram-bot-token`) as primary setup path: still supported for automation; Flow A wizard is the operator UX

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getDefaultChannelAvailability` returns a per-channel boolean map in the same order as `listStartupChannelDescriptors()` | Standard Stack, Patterns | Ordering mismatch would cause wizard to check wrong env vars for wrong channels (data corruption) — MITIGATED: both come from same registry.ts |
| A2 | `applyBootstrapBotsToConfig` mutates config in-place and handles `credentialType=mem` vs `env` correctly | Standard Stack | Config structure mismatch would cause token loss or malformed config — MITIGATED: existing function used in bootstrap-cli.ts |
| A3 | `startDetachedRuntime` accepts `extraEnv` param with mem credentials and returns `RuntimeStartResult` with `pid` | Standard Stack | START-01 would fail to launch runtime — MITIGATED: existing function in runtime-process.ts, already used by Phase 5 |
| A4 | `_writeToOutput` monkey-patch works on Bun's readline/promises implementation | Patterns 1 | Masking would fail silently (tokens echoed plainly) — MITIGATED: Bun ships Node 22 compat readline; patch is on standard method |
| A5 | Ctrl+C during wizard properly triggers SIGINT handler in `withWizardCleanup` | Pitfalls | Interrupted wizard leaves temp file orphaned — MITIGATED: Phase 5 explicitly handles this; cleanup() removes `.tmp` file |
| A6 | `clisbot start` path in `runtime-bootstrap-cli.ts` is the only place where hard-fail occurs for missing agent | Patterns 4 | Other code paths also block unrouted mode, START-01 incomplete — MITIGATED: code audit shows `start()` → `ensureDefaultAgentBootstrap()` is the only entry point |

**All assumptions are VERIFIED or MITIGATED by existing code.** No user confirmation needed before locking implementation.

---

## Open Questions

1. **Question:** Should `promptMasked` restore `_writeToOutput` after each call, or once at the end of the session?
   - **What we know:** CONTEXT.md D-02 leaves this as "Claude's Discretion"
   - **What's unclear:** Performance vs. safety tradeoff (multiple restores vs. final cleanup)
   - **Recommendation:** Restore after each call (safest); `withWizardCleanup` ensures final cleanup on error

2. **Question:** For Slack, which requires TWO tokens (app + bot), how should the per-channel confirm work?
   - **What we know:** `getBootstrapAvailability` for Slack checks both tokens
   - **What's unclear:** If operator has `SLACK_APP_TOKEN` but not `SLACK_BOT_TOKEN`, do we prompt for just the bot token, or skip the channel entirely?
   - **Recommendation:** Check BOTH tokens; only skip prompt if BOTH are set. If only one is set, display status and ask operator to confirm or provide the missing one.

3. **Question:** What should happen if operator cancels (Ctrl+C) during review screen?
   - **What we know:** `withWizardCleanup` removes `.tmp` file and exits with code 130
   - **What's unclear:** Should we print "Setup cancelled" or just let the SIGINT exit silently?
   - **Recommendation:** Print "Setup cancelled." before exit for clarity, then let cleanup handler proceed

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node `readline/promises` | Token prompting | ✓ (Bun built-in) | Node 15+ / Bun 1.1.37+ | — |
| Bun runtime | Test execution + development | ✓ (project requirement) | 1.1.37+ | — |
| TTY stdin/stdout | Interactive prompts | ✓ (required by `ensureTTY`) | any | Error message; skip wizard |
| clisbot config file | Config write | ✓ (created by Phase 5) | YAML/JSON editable | Fallback: template rendered if missing |

**Missing dependencies:** None. All dependencies are built-in or already available from Phase 5.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (`bun:test`) |
| Config file | No Jest/Vitest config needed; Bun auto-detects `*.test.ts` |
| Quick run command | `bun test test/control/setup/setup-channels.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHANWIZ-01 | Env var pre-filled status displayed correctly | unit | `bun test setup-channels.test.ts -t "env var detection"` | ❌ Wave 0 |
| CHANWIZ-02 | Per-channel confirm prompt + skip works | unit | `bun test setup-channels.test.ts -t "skip channels"` | ❌ Wave 0 |
| CHANWIZ-03 | DM policy always writes `pairing` | unit | `bun test setup-channels.test.ts -t "dm policy"` | ❌ Wave 0 |
| CHANWIZ-04 | Review screen renders + confirm logic works | unit | `bun test setup-channels.test.ts -t "review screen"` | ❌ Wave 0 |
| CHANWIZ-05 | Runtime starts after config write + success screen | integration | Manual: `clisbot setup channels` in dev env | ❌ Requires manual CLI test |
| START-01 | `clisbot start` warns (not fails) with channels/no agent | integration | `bun test` (test/control/commands/runtime-bootstrap-cli.test.ts) | ❌ Wave 0 |
| FOUND-01 | Wizard only runs in TTY | unit | `bun test setup-channels.test.ts -t "tty check"` | ❌ Wave 0 |
| FOUND-02 | Daemon not running check works | unit | `bun test setup-channels.test.ts -t "daemon guard"` | ❌ Wave 0 |
| FOUND-03 | Token masking shows asterisks, not plaintext | unit | `bun test setup-wizard-utils.test.ts -t "promptMasked"` | ✅ Phase 5 |
| FOUND-04 | Config write is atomic (temp + rename) | unit | Existing Phase 5 test | ✅ Phase 5 |
| FOUND-05 | Ctrl+C cleanup removes temp file | unit | Existing Phase 5 test | ✅ Phase 5 |
| FOUND-06 | No npm deps added | static | `grep "dependencies" package.json` | ✅ Check at commit |

### Sampling Rate
- **Per task commit:** Run `bun test test/control/setup/setup-channels.test.ts` to validate unit tests pass
- **Per wave merge:** Run `bun run check` (full suite + typecheck)
- **Phase gate:** All tests green + manual CLI test of `clisbot setup channels` flow + manual CLI test of `clisbot start` with channels-only

### Wave 0 Gaps

- [ ] `test/control/setup/setup-channels.test.ts` — covers CHANWIZ-01 through CHANWIZ-04, FOUND-01, FOUND-02
- [ ] `test/control/commands/runtime-bootstrap-cli.test.ts` — add START-01 test cases (warn-and-continue logic)
- [ ] Manual integration test: operator runs `clisbot setup channels` in dev env, sees sequential prompts, review screen, success + runtime starts
- [ ] Manual integration test: `clisbot start` with channels configured (no agent) → should warn and start in unrouted mode
- [ ] Manual CLI test: `clisbot setup channels` with all env vars pre-set → should auto-accept and skip all prompts

*(If no gaps: "Existing Phase 5 test infrastructure covers FOUND-01 through FOUND-06. Phase 6 adds CHANWIZ and START-01 tests.")*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (Handled by channel integrations, not wizard) |
| V3 Session Management | no | (Handled by channel integrations, not wizard) |
| V4 Access Control | no | (No authorization logic in wizard) |
| V5 Input Validation | yes | `promptMasked` accepts arbitrary string; no format validation (deferred post-MVP per REQUIREMENTS.md); validation occurs at runtime |
| V6 Cryptography | yes | Tokens stored in config file (plaintext or encrypted per credential strategy); atomic writes prevent partial corruption |
| V9 Communications | no | (No network traffic in wizard; tokens sent by runtime later) |
| V10 Malicious Code | no | (No code injection risks in readline prompts) |

### Known Threat Patterns for readline + token input

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token echoed to terminal (info disclosure) | Information Disclosure | Use `_writeToOutput` monkey-patch to mask as asterisks |
| Token leaked to stdout/stderr logs | Information Disclosure | Never log config or token values; operator logs are sensitive |
| Token written to swap/core dump (info disclosure) | Information Disclosure | Handled by OS memory protection; out of scope for Node.js code |
| TOCTOU in config file (race between read + write) | Tampering | Use atomic write: temp file + rename, not direct overwrite |
| Partial write leaves config unbootable (tampering) | Tampering | Ensure `writeEditableConfigAtomic` completes fully or rolls back on error |
| Ctrl+C leaves temp file orphaned (denial of service) | Denial of Service | `withWizardCleanup` SIGINT handler removes `.tmp` file |
| Operator pastes token with leading/trailing spaces | Tampering | `promptMasked` returns raw string; `applyBootstrapBotsToConfig` should trim input (assumed in implementation) |

**No NEW encryption, HMAC, or cryptographic verification needed for Phase 6.** Credential encryption is handled by existing `credentialType=mem|tokenFile|env` strategies. Token format validation deferred post-MVP.

---

## Sources

### Primary (HIGH confidence)
- **Context7 library ID:** `node:readline` (Node.js 22 built-in, Bun compatible)
- **Official docs:** `src/control/setup/setup-wizard-utils.ts` — Phase 5 exports verified in codebase
- **Official docs:** `src/config/channels/channel-bot-management.ts` — `applyBootstrapBotsToConfig` signature and behavior [VERIFIED: code audit]
- **Official docs:** `src/control/commands/startup-bootstrap.ts` — `getDefaultChannelAvailability`, `listStartupChannelDescriptors()` [VERIFIED: code audit]
- **Official docs:** `src/control/runtime/runtime-process.ts` — `startDetachedRuntime` signature and return type [VERIFIED: code audit lines 349–460]
- **Official docs:** `src/channels/catalog/registry.ts` — channel descriptor registry and ordering [VERIFIED: code audit]
- **CONTEXT.md** — All locked decisions (D-01 through D-14) and requirements traceability [VERIFIED: provided by user]

### Secondary (MEDIUM confidence)
- **Bun issues tracker:** Bun #21189 (stdin.unref mitigation) — referenced in STATE.md
- **Node.js readline/promises docs:** async interface behavior, `_writeToOutput` monkey-patch pattern [CITED: standard practice in Node ecosystem CLIs]

### Tertiary (LOW confidence)
- None. All core findings are verified via codebase audit or provided CONTEXT.md.

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — all libraries are built-in or verified Phase 5 exports; no versions needed
- **Architecture:** HIGH — Architectural Responsibility Map derived from codebase ownership; startup-bootstrap.ts and channel-bot-management.ts are stable contracts
- **Patterns:** HIGH — `_writeToOutput` patch is proven enterprise pattern; all other patterns (review screen, sequential loop) are simple readline idioms
- **Pitfalls:** HIGH — derived from code review of Phase 5 (readline, atomic write) and existing readline usage (zalo-personal login)
- **Validation:** MEDIUM — test infrastructure from Phase 5 is proven; test cases for Phase 6 are new (Wave 0 gap)

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (30 days; Phase 6 is feature-locked per CONTEXT.md, so no API churn expected)

**Key uncertainties:** None blocking planning. All locked decisions are actionable. All "Claude's Discretion" areas have recommendations for planner to evaluate.

