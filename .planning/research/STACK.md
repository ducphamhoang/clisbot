# Stack Research — Interactive CLI Wizard

**Project:** clisbot v0.3.0 — Interactive Setup Wizard
**Researched:** 2026-05-27
**Confidence:** HIGH (verified against Bun 1.3.8 docs and existing codebase usage)

---

## Recommended Approach

Use `node:readline/promises` exclusively — no new dependencies. The codebase already uses it in `src/channels/zalo-personal/login.ts` with `createInterface` + `rl.question()`. Bun 1.3.8 marks `node:readline` as fully implemented. Multi-select is implemented manually as a numbered-choice loop (ask a number, validate, re-prompt on invalid input) — there is no native multi-select in readline and no library needed for this project's scope.

---

## Core APIs

### Basic prompt (text input)

```typescript
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

// Usage
const token = await prompt('Telegram bot token: ')
```

### Prompt with default value

```typescript
async function promptWithDefault(question: string, defaultValue: string): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    const answer = await rl.question(`${question} [${defaultValue}]: `)
    return answer.trim() || defaultValue
  } finally {
    rl.close()
  }
}
```

### Hidden/password input (token masking)

The `_writeToOutput` override is the established Node.js pattern. Bun's readline is fully compatible with this approach — there is no native `hideEchoBack` option on either Node.js or Bun readline.

```typescript
async function promptSecret(question: string): Promise<string> {
  const rl = createInterface({ input, output })
  // suppress echo after the question line prints
  let questionPrinted = false
  ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (str: string) => {
    if (!questionPrinted) {
      output.write(str)
      questionPrinted = true
    }
    // swallow subsequent character echo
  }
  try {
    const answer = await rl.question(question)
    output.write('\n')
    return answer
  } finally {
    rl.close()
  }
}
```

Note: `_writeToOutput` is an internal property (not typed in `@types/node`). Cast via `as unknown as { _writeToOutput: ... }`. This is the only practical approach without adding a dependency, and is widely used in Node.js/Bun CLI tooling.

### Numbered multi-select (choose one of N options)

readline has no native multi-select. The pattern is a validated number loop:

```typescript
async function promptChoice(question: string, choices: string[]): Promise<number> {
  const rl = createInterface({ input, output })
  try {
    while (true) {
      const listing = choices.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
      const answer = await rl.question(`${question}\n${listing}\nEnter number: `)
      const n = parseInt(answer.trim(), 10)
      if (!isNaN(n) && n >= 1 && n <= choices.length) {
        return n - 1  // 0-indexed
      }
      output.write(`Please enter a number between 1 and ${choices.length}.\n`)
    }
  } finally {
    rl.close()
  }
}

// Usage
const idx = await promptChoice('Select AI CLI:', ['claude', 'codex', 'gemini', 'pi'])
// idx === 0 for 'claude'
```

### TTY detection guard

```typescript
function assertInteractiveTTY(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'This command requires an interactive terminal. ' +
      'Use --token <value> flags to supply values non-interactively.'
    )
  }
}
```

The codebase already uses `process.stdin.isTTY` in `src/channels/zalo-personal/login.ts` (line 33). Use the same pattern in setup wizards.

### Reusing one interface across multiple questions

For a multi-step wizard, create one `rl` instance and reuse it. This avoids repeated open/close overhead and is the correct pattern when asking several questions in sequence.

```typescript
async function runSetupWizard(): Promise<void> {
  assertInteractiveTTY()
  const rl = createInterface({ input, output })
  try {
    const telegramToken = await rl.question('Telegram bot token: ')
    const slackToken = await rl.question('Slack bot token (leave blank to skip): ')
    // ...
  } finally {
    rl.close()
  }
}
```

Note: `_writeToOutput` override must be re-applied per question if you need masking mid-session, because the override mutates the interface. Split into a separate `rl` instance for secret prompts within a wizard.

---

## Bun-Specific Notes

**readline is fully implemented in Bun 1.3.8.** Bun's reference docs mark `node:readline` as "Fully implemented" with no documented gaps vs Node.js. The `node:readline/promises` variant with `createInterface` and async `rl.question()` is confirmed supported.

**`process.stdin.isTTY` works correctly.** Already used in production in this codebase.

**`_writeToOutput` override works in Bun.** There is no Bun-specific API for hidden input (issue #17712 requests a native `prompt({ hideEchoBack })` but it is not shipped). The `_writeToOutput` monkey-patch is the only working approach without a library.

**`process.stdin.setRawMode` is implemented in Bun** (issue #2025 was closed as resolved). However, raw mode is not needed for this wizard — `_writeToOutput` suppression achieves token hiding without raw mode complexity.

**No Bun-native readline API.** `Bun.stdin` exists but is a `ReadableStream` / `BunFile` abstraction — it does not provide line-by-line interactive prompting. Do not use it for wizard flows; it requires manual buffering with no benefit here.

**Bun builds to `--target=node` for distribution** (see `package.json` build script). All `node:` stdlib imports work identically at build time and runtime.

**Windows/WSL2:** The README explicitly says Windows native is unsupported; WSL2 is supported. `process.stdin.isTTY` behaves correctly in WSL2 terminals.

---

## What NOT to Add

**Inquirer / Enquirer / Prompts — do not add.** These are 50–200 kB packages with full TUI widgets, keypress raw mode, and rendering engines. This project needs four prompt types (text, secret, choice, confirm). All four are trivially covered by `node:readline/promises`. Adding a dependency for this is disproportionate and conflicts with the project's no-external-CLI-framework stance.

**readline-sync — do not add.** Synchronous blocking; conflicts with Bun's async event loop and the async patterns in all existing control CLI code.

**Chalk / Kleur / picocolors — do not add for this milestone.** ANSI color in wizard output is cosmetic only. If prompt formatting needs color it can be added later; blocking wizard output on a color library adds a dependency with no functional value in v0.3.0.

**Commander / Yargs — do not add.** The codebase uses a custom `CommandTreeSpec` system (`src/control/commands/command-tree.ts`). The setup wizard commands (`setup`, `setup channels`, `setup agent`) are new nodes in the existing command tree, not a parallel CLI framework.

**Any package that pulls in `node_modules/` for interactive input — do not add.** The project has only 4 runtime dependencies today (`@slack/bolt`, `pngjs`, `proper-lockfile`, `zca-js`, `zod`). Keep it that way.

---

## Integration Points

**Command tree:** Add `setup` as a new `CommandTreeNodeSpec` node in `src/cli.ts`, with `children` for `channels` and `agent`. The `handler` returns a new `ParsedCliCommand` variant (`{ name: 'setup'; args: string[] }`). Follow the exact pattern of `init` and `start` nodes.

**Entrypoint dispatch:** `src/main.ts` dispatches on `ParsedCliCommand.name`. Add a `case 'setup':` that imports and calls the wizard runner, guarded by `assertInteractiveTTY()` before the readline instance opens.

**Config write:** Wizard output flows through the existing `writeEditableConfig(configPath, config)` in `src/config/core/config-file.ts`. The wizard builds/mutates a `ClisbotConfig` object and calls this function — no new persistence layer needed.

**TTY guard pattern:** Mirror `src/channels/zalo-personal/login.ts` lines 33-35: check `input.isTTY`, throw with an actionable message if false (tell the operator which flags to use instead).

**Env-var detection:** Use the existing `process.env` reads that config loading already does. Before prompting for a token, check whether the relevant env var is already set and offer it as the default in the prompt string (e.g., `Telegram bot token [$TELEGRAM_BOT_TOKEN]: `). Do not add a new env-scanning utility — `process.env` direct access is sufficient here.

**Import style:** Use `import { createInterface } from 'node:readline/promises'` — the `node:` prefix is the correct form for this codebase (see existing usage in `login.ts` line 1).

---

## Sources

- [Bun `node:readline` reference (fully implemented)](https://bun.com/reference/node/readline)
- [Bun `node:readline/promises` reference](https://bun.com/reference/node/readline/promises)
- [Bun issue #17712 — hidden input not natively supported](https://github.com/oven-sh/bun/issues/17712)
- [Bun issue #2025 — `setRawMode` implementation (closed/resolved)](https://github.com/oven-sh/bun/issues/2025)
- [Node.js readline official docs](https://nodejs.org/api/readline.html)
- Existing codebase: `src/channels/zalo-personal/login.ts` — production `readline/promises` usage in this repo
