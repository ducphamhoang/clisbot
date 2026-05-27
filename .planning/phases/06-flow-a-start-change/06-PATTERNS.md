# Phase 6: Flow A + start() Change — Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 4 new/modified files
**Analogs found:** 4 / 4 files with matches

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/control/setup/setup-channels.ts` | wizard/CLI | request-response (interactive prompts) | `src/control/setup/setup-wizard-utils.ts` + `src/control/commands/runtime-bootstrap-cli.ts` | exact |
| `test/control/setup/setup-channels.test.ts` | test | unit test | `test/startup-bootstrap.test.ts` | exact |
| `src/control/setup/setup-wizard-utils.ts` (modify) | utility | request-response | same file (Phase 5) | exact |
| `src/control/commands/runtime-bootstrap-cli.ts` (modify) | CLI command | request-response | same file (Phase 5) | exact |

## Pattern Assignments

### `src/control/setup/setup-channels.ts` (wizard/CLI, interactive request-response)

**Primary Analogs:**
1. `src/control/setup/setup-wizard-utils.ts` — Phase 5 wizard utilities (guards, cleanup, atomic write)
2. `src/control/commands/runtime-bootstrap-cli.ts` — interactive CLI with config application pattern

#### Imports Pattern

**Source:** `src/control/setup/setup-wizard-utils.ts` (lines 1–5)
```typescript
import { rename, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { expandHomePath, getDefaultConfigPath, ensureDir } from '../../infra/paths.ts'
import { writeTextFile } from '../../infra/fs.ts'
import { getRuntimeStatus } from '../../control/runtime/runtime-process.ts'
```

**Source:** `src/control/commands/runtime-bootstrap-cli.ts` (lines 1–52)
```typescript
import { addAgentToEditableConfig } from "./agents-cli.ts";
import {
  collectLiteralBootstrapBotIds,
  hasLiteralBootstrapCredentials,
  parseBootstrapFlags,
  type ParsedBootstrapFlags,
} from "./channel-bootstrap-flags.ts";
import {
  ensureConfigFile,
  getRuntimeStatus,
  startDetachedRuntime,
  stopDetachedRuntime,
} from "../runtime/runtime-process.ts";
```

**Apply to `setup-channels.ts`:** Use both patterns. `setup-channels.ts` will:
- Import Phase 5 utils: `ensureTTY`, `ensureDaemonNotRunning`, `writeEditableConfigAtomic`, `withWizardCleanup`
- Import readline: `createInterface` from `node:readline`
- Import config functions: `applyBootstrapBotsToConfig`, `startDetachedRuntime`
- Import channel utilities: `getDefaultChannelAvailability`, `listStartupChannelDescriptors`

#### Guard Pattern (TTY, Daemon Check)

**Source:** `src/control/setup/setup-wizard-utils.ts` (lines 7–24)
```typescript
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
```

**Apply to `setup-channels.ts`:** Call these at the start of the main wizard function to ensure interactive mode and daemon not running.

#### Wizard Cleanup Pattern (Ctrl+C Handler)

**Source:** `src/control/setup/setup-wizard-utils.ts` (lines 34–64)
```typescript
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
```

**Apply to `setup-channels.ts`:** Wrap the main wizard logic inside `withWizardCleanup()` to ensure Ctrl+C cleanup and proper process exit. Call `process.stdin.unref()` after `rl.close()` in the finally block (CRITICAL for Bun).

#### Atomic Config Write Pattern

**Source:** `src/control/setup/setup-wizard-utils.ts` (lines 26–32)
```typescript
export async function writeEditableConfigAtomic(configPath: string, text: string): Promise<void> {
  const expandedConfigPath = expandHomePath(configPath)
  await ensureDir(dirname(expandedConfigPath))
  const tmpPath = `${expandedConfigPath}.tmp`
  await writeTextFile(tmpPath, text)
  await rename(tmpPath, expandedConfigPath)
}
```

**Apply to `setup-channels.ts`:** After collecting channels and applying tokens to config, use `writeEditableConfigAtomic` (not direct file write).

#### Sequential Channel Loop & Token Collection Pattern

**Source:** `src/control/commands/startup-bootstrap.ts` (lines 71–92)
```typescript
export function getDefaultChannelAvailability(
  env: NodeJS.ProcessEnv = process.env,
): DefaultChannelAvailability {
  return Object.fromEntries(
    listStartupChannelDescriptors().map((descriptor) => [
      descriptor.channel,
      descriptor.getDefaultAvailability(env),
    ]),
  ) as DefaultChannelAvailability;
}
```

**Apply to `setup-channels.ts`:** Call `getDefaultChannelAvailability(process.env)` at start of wizard. Then iterate `listStartupChannelDescriptors()` in order (Telegram, Slack, Zalo-bot) and skip prompts when env var detected.

#### Config Application Pattern

**Source:** `src/control/commands/runtime-bootstrap-cli.ts` (lines 164–206)
```typescript
async function applyBootstrapStateToConfig(params: {
  config: Awaited<ReturnType<typeof readEditableConfig>>["config"];
  configPath: string;
  bootstrapFlags: ParsedBootstrapFlags;
  commandName: "init" | "start";
  firstRun: boolean;
  runtimeRunning: boolean;
  runtimeCredentialsPath: string;
}) {
  const { config, configPath, bootstrapFlags, commandName, firstRun, runtimeRunning, runtimeCredentialsPath } =
    params;
  if (!firstRun && !bootstrapFlags.sawCredentialFlags) {
    return {
      lifecycleLines: [],
      persistenceLines: [],
    };
  }

  applyBootstrapBotsToConfig(
    config,
    bootstrapFlags.bots,
    { firstRun },
  );

  // ... credential handling ...
  await writeEditableConfig(configPath, config);

  return {
    lifecycleLines,
    persistenceLines,
  };
}
```

**Apply to `setup-channels.ts`:** Call `applyBootstrapBotsToConfig(config, collectedBots, { firstRun: true })` to apply collected channel tokens to config object before writing.

#### Runtime Start Pattern

**Source:** `src/control/commands/runtime-bootstrap-cli.ts` (lines 469–486)
```typescript
const result = await startDetachedRuntime({
  scriptPath: process.argv[1]!,
  configPath: state.configResult.configPath,
  extraEnv: restartForLiteralBootstrap || !runtimeStatus.running ? runtimeMemEnv : undefined,
  runtimeCredentialsPath: getDefaultRuntimeCredentialsPath(),
});

if (result.alreadyRunning) {
  await printAlreadyRunningStartSummary(result.pid, result.configPath, result.logPath);
  return;
}

if (state.configResult.created) {
  console.log(`Created ${result.configPath}`);
}

await printStartedRuntimeSummary(result.pid, result.configPath, result.logPath);
```

**Apply to `setup-channels.ts`:** After writing config, call `startDetachedRuntime` with the config path. Check `result.alreadyRunning` and print appropriate success message with next-step guidance.

---

### `src/control/setup/setup-wizard-utils.ts` (utility, add `promptMasked`)

**Analog:** Same file (Phase 5)

#### Existing Exports (Reuse)

**Source:** Lines 7–64
- `ensureTTY()` — check TTY is available
- `ensureDaemonNotRunning(configPath?)` — check daemon not running
- `writeEditableConfigAtomic(configPath, text)` — atomic file write
- `withWizardCleanup<T>(fn, configPath?)` — Ctrl+C cleanup handler

**Apply in Phase 6:** Keep these unchanged. Add new `promptMasked` function below them.

#### New: `promptMasked` Function

**Pattern Source:** RESEARCH.md Pattern 1 (readline `_writeToOutput` monkey-patch), CONTEXT.md D-01 through D-03

**Implementation template:**
```typescript
import { Interface } from 'node:readline'

export async function promptMasked(
  rl: Interface,
  question: string,
): Promise<string> {
  // Get reference to readline's internal _writeToOutput method
  const originalWrite = (rl as unknown as { _writeToOutput(str: string): void })._writeToOutput
  
  // Monkey-patch to show asterisks instead of actual characters
  ;(rl as unknown as { _writeToOutput(str: string): void })._writeToOutput = (str: string) => {
    // Echo prompt text normally, mask input characters as asterisks
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
    // Restore original _writeToOutput method
    ;(rl as unknown as { _writeToOutput(str: string): void })._writeToOutput = originalWrite
  }
}
```

**Notes:**
- Add to `src/control/setup/setup-wizard-utils.ts` after `withWizardCleanup`
- Import `Interface` from `node:readline`
- Type cast to access private `_writeToOutput` method (standard pattern in Node.js CLIs)
- Restore original method in finally block (safe for multiple prompts in one session)
- Use `rl.question()` (from readline/promises) which is async and works with this patch

---

### `test/control/setup/setup-channels.test.ts` (test, unit tests)

**Analog:** `test/startup-bootstrap.test.ts` (lines 1–100)

#### Test Framework & Setup Pattern

**Source:** `test/startup-bootstrap.test.ts` (lines 1–63)
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setRenderedCliName } from "../src/control/commands/cli-name.ts";

describe("startup bootstrap helpers", () => {
  let previousCliName: string | undefined;
  let previousHome: string | undefined;
  let previousTelegramBotToken: string | undefined;

  beforeEach(() => {
    previousCliName = process.env.CLISBOT_CLI_NAME;
    delete process.env.CLISBOT_CLI_NAME;
    setRenderedCliName();
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  afterEach(() => {
    process.env.CLISBOT_CLI_NAME = previousCliName;
    setRenderedCliName(previousCliName);
    process.env.TELEGRAM_BOT_TOKEN = previousTelegramBotToken;
  });
```

**Apply to `setup-channels.test.ts`:**
- Use `bun:test` (describe, test, beforeEach, afterEach, expect)
- Create temporary directories with `mkdtempSync(join(tmpdir(), "clisbot-setup-channels-"))`
- Save/restore env vars and process state in beforeEach/afterEach
- Capture `console.log` output by storing original and mocking in tests
- Clean up temp directories in afterEach

#### Test Case Pattern

**Source:** `test/startup-bootstrap.test.ts` (lines 39–85)
```typescript
test("adds an agent with cli defaults, bootstrap files, and bindings", async () => {
  tempDir = mkdtempSync(join(tmpdir(), "clisbot-agents-cli-"));
  previousConfigPath = process.env.CLISBOT_CONFIG_PATH;
  process.env.CLISBOT_CONFIG_PATH = join(tempDir, "clisbot.json");
  const output: string[] = [];
  console.log = ((value: string) => {
    output.push(value);
  }) as typeof console.log;

  // Call function under test
  await runAgentsCli([...args]);

  // Validate outputs
  expect(output.join("\n")).toContain("expected text");
  expect(existsSync(expectedPath)).toBe(true);
});
```

**Apply to `setup-channels.test.ts`:** Each test case should:
1. Create temp config dir
2. Mock console.log to capture output
3. Call the wizard function with test inputs
4. Assert on captured output and config state

#### Example Test Cases for Phase 6

**Recommended coverage per RESEARCH.md Validation Architecture:**

| Requirement | Test Name |
|-------------|-----------|
| CHANWIZ-01 | "detects env var pre-filled status correctly" |
| CHANWIZ-02 | "skips channels when user selects no" |
| CHANWIZ-03 | "always writes pairing DM policy without prompting" |
| CHANWIZ-04 | "displays review screen and confirms with y/Enter" |
| CHANWIZ-05 | "starts runtime and displays success message" |
| FOUND-01 | "exits with error when not in TTY" |
| FOUND-02 | "exits with error when daemon is running" |

---

### `src/control/commands/runtime-bootstrap-cli.ts` (modify for START-01)

**Analog:** Same file (Phase 5), lines 121–146

#### Location: `printMissingBootstrapOptions` Function

**Source:** Lines 121–146
```typescript
function printMissingBootstrapOptions(commandName: "init" | "start") {
  if (commandName === "start") {
    printCommandOutcomeBanner("failure");
  }
  console.log("");
  console.log(`warning!!! no default agent is configured yet, so clisbot did not ${commandName}.`);
  console.log("First run requires both `--cli` and `--bot-type`.");
  console.log("");
  console.log("Choose one bot type:");
  console.log("  personal = one assistant for one human");
  console.log("  team     = one shared assistant for a team or channel");
  console.log("Prepare with one of these commands:");
  // ... render example commands ...
  if (commandName === "start") {
    printCommandOutcomeFooter("failure");
  }
}
```

#### Modification Strategy (START-01 Decision Point)

**Context:** Lines 259–273 in `ensureDefaultAgentBootstrap`
```typescript
async function ensureDefaultAgentBootstrap(
  state: PreparedBootstrapState,
  options: ParsedBootstrapFlags,
  commandName: "init" | "start",
) {
  if (state.config.agents.list.length > 0) {
    return true;
  }

  if (!options.cliTool || !options.bootstrap) {
    if (commandName === "start") {
      printMissingBootstrapOptions(commandName);  // <-- MODIFY BEHAVIOR HERE
    }
    return false;
  }
  // ...
}
```

**Apply START-01 change:** Add condition inside `ensureDefaultAgentBootstrap` before calling `printMissingBootstrapOptions`:

```typescript
if (!options.cliTool || !options.bootstrap) {
  // NEW: Check if channels are configured (unrouted mode is valid)
  if (commandName === "start") {
    const hasChannels =
      state.config.bots.telegram.defaults.enabled ||
      state.config.bots.slack.defaults.enabled ||
      state.config.bots['zalo-bot'].defaults.enabled
    
    if (hasChannels) {
      // START-01: warn but continue (allow unrouted mode)
      console.log('warning: no agent configured — starting in unrouted mode.')
      console.log('Run clisbot setup agent to add an AI agent.')
      return true  // Signal: continue to startDetachedRuntime
    }
  }
  
  // For init, or start with no channels, show full help and fail
  if (commandName === "start") {
    printMissingBootstrapOptions(commandName);
  }
  return false
}
```

**Key points:**
- Only applies to `start`, not `init` (init still requires explicit `--cli` and `--bot-type`)
- Only applies when at least one channel is configured (checks `defaults.enabled` per channel)
- Prints warning to stdout (not error banner)
- Returns `true` to signal "continue" rather than "fail"
- Message matches CONTEXT.md D-13 exactly

---

## Shared Patterns

### Readline Interactive Pattern (All Wizard Functions)

**Source:** `src/control/setup/setup-wizard-utils.ts` (lines 34–64) + Phase 5 learnings

**Apply to:** `setup-channels.ts` main wizard function

**Pattern:**
```typescript
import { createInterface } from 'node:readline'

// Single readline interface per session
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

try {
  // ... use rl.question() for prompts ...
  // ... use promptMasked(rl, ...) for sensitive input ...
} finally {
  rl.close()
  process.stdin.unref()  // CRITICAL for Bun #21189
}
```

**Critical safeguards:**
- One `rl` instance per wizard session (no multiple interfaces)
- Always call `rl.close()` in finally block
- Always call `process.stdin.unref()` after close (Bun-specific)
- Wrapped in `withWizardCleanup()` for Ctrl+C handling

### Console Output Pattern (No Logger Abstraction)

**Source:** `src/control/commands/runtime-bootstrap-cli.ts` (throughout)

**Apply to:** `setup-channels.ts` success/review screens

**Pattern:**
```typescript
console.log('')  // blank line
console.log('=== Section Header ===')
console.log('')
console.log('  Item 1')
console.log('  Item 2')
console.log('')
```

**Convention:**
- Plain `console.log()` with string arguments (no logger)
- No colored output, no ANSI codes (plain text only)
- Blank lines for readability
- Indentation with spaces for nested content

---

## No Analog Found

Files with proven patterns in existing codebase:
- ✅ All 4 files have matching analogs
- ✅ `promptMasked` pattern documented in RESEARCH.md Pattern 1 (proven Node.js idiom)
- ✅ Interactive flow pattern matches `runtime-bootstrap-cli.ts` wizard pattern

---

## Metadata

**Analog search scope:**
- `src/control/setup/` — Phase 5 wizard utilities
- `src/control/commands/` — interactive CLI commands (bootstrap, agents)
- `src/control/runtime/` — detached process startup
- `src/config/` — config application and write patterns
- `src/channels/catalog/` — channel registry and availability detection
- `test/` — unit test framework and patterns

**Files scanned:** 15 analog candidates
**Pattern extraction date:** 2026-05-27
**Architecture alignment:** All patterns conform to project CLI conventions (no TUI libs, no colored output, plain readline + config application)

