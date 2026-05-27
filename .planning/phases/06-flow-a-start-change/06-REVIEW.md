---
phase: 06-flow-a-start-change
reviewed: 2026-05-27T16:26:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/control/commands/runtime-bootstrap-cli.ts
  - src/control/setup/setup-channels.ts
  - src/control/setup/setup-wizard-utils.ts
  - test/control/setup/setup-channels.test.ts
  - test/setup-wizard-utils.test.ts
  - test/startup-bootstrap.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-05-27T16:26:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The phase adds the `start`-with-channels-but-no-agent path (START-01), the `setup channels` wizard (`runChannelsWizard`), and wizard utilities. All 35 tests pass. The logic is functionally correct for the reviewed scenarios. Four warnings and three info items were found — no critical security or data-loss issues.

The most actionable warnings are: (1) a redundant wrapper function that is a DRY violation flagged by project rules, (2) a hardcoded env-var name string that will silently mislead operators for non-Telegram channels, (3) a config written to disk using un-migrated legacy `channels` shape that is stripped on next read, and (4) a `withWizardCleanup` SIGINT handler that is not removed when SIGINT fires (listener leak on abnormal exit).

---

## Warnings

### WR-01: `hasLiteralMemCredentials` is a one-line wrapper around `hasLiteralBootstrapCredentials` with no added behaviour

**File:** `src/control/commands/runtime-bootstrap-cli.ts:148-150`

**Issue:** `hasLiteralMemCredentials` does nothing beyond delegating directly to `hasLiteralBootstrapCredentials`. This introduces two names for one concept, which the project's DRY and naming rules treat as a refactoring trigger. The wrapper also obscures the fact that `hasLiteralBootstrapCredentials` (imported from `channel-bootstrap-flags.ts`) is already the canonical function.

**Fix:** Remove the wrapper and use `hasLiteralBootstrapCredentials` at both call sites (lines 228 and 434).

```typescript
// Before
function hasLiteralMemCredentials(flags: ParsedBootstrapFlags) {
  return hasLiteralBootstrapCredentials(flags);
}
// ... used at lines 228, 434

// After — call hasLiteralBootstrapCredentials directly
if (commandName === "init" && hasLiteralBootstrapCredentials(bootstrapFlags) && !bootstrapFlags.persist) {
// ...
const restartForLiteralBootstrap =
  runtimeStatus.running && hasLiteralBootstrapCredentials(bootstrapFlags);
```

---

### WR-02: Hardcoded `"TELEGRAM_BOT_TOKEN or equivalent"` message is inaccurate for Slack and Zalo Bot channels

**File:** `src/control/setup/setup-channels.ts:108-110`

**Issue:** When an env var is detected for any channel (the `availability[descriptor.channel]` branch), the wizard prints `"Token found in environment variable (TELEGRAM_BOT_TOKEN or equivalent)"` for every channel — including Slack and Zalo Bot. An operator configuring Slack via `SLACK_APP_TOKEN`/`SLACK_BOT_TOKEN` will see a message that names the wrong env var, which is misleading and will be confusing during debugging.

**Fix:** Surface the actual env var name(s) from the credential contract fields rather than a hardcoded string.

```typescript
// Before
console.log(
  `  Token found in environment variable (TELEGRAM_BOT_TOKEN or equivalent)`,
)

// After — use the contract field label which already names the env var
const envVarNames = contract.fields.map((f) => f.label).join(', ')
console.log(`  Token found in environment variable (${envVarNames})`)
```

---

### WR-03: `writeConfig` in `setup-channels.ts` writes a legacy `channels` shape that is silently stripped on next read

**File:** `src/control/setup/setup-channels.ts:168-186`

**Issue:** `writeConfig` constructs a `channelsSummary` object and writes it into the config JSON as `config.channels`. The in-file comment acknowledges that `readEditableConfig` strips this via legacy migration on the next read. This means the file on disk temporarily contains a shape that diverges from what the runtime actually parses. If the runtime reads the file before the next migration pass, it gets stale data. More importantly, writing a format that is immediately stripped is a latent correctness hazard — future changes to migration logic could make this persist unexpectedly or conflict with the canonical `bots` section that carries the actual runtime configuration.

**Fix:** Write the canonical config only (do not inject a `channels` key). If `directMessagesPolicy` needs to be read by tests, configure it through the canonical `bots` section instead.

```typescript
// Before
const jsonOutput = JSON.stringify({ ...config, channels: channelsSummary }, null, 2)
await writeEditableConfigAtomic(configResult.configPath, jsonOutput)

// After — write only the canonical config
const jsonOutput = JSON.stringify(config, null, 2)
await writeEditableConfigAtomic(configResult.configPath, jsonOutput)
```

If CHANWIZ-03 depends on reading `directMessagesPolicy` from the `channels` path, update that test to read from the canonical `bots` section instead.

---

### WR-04: `withWizardCleanup` SIGINT handler is not removed on abnormal exit (listener leak)

**File:** `src/control/setup/setup-wizard-utils.ts:41-57`

**Issue:** The `handleSigint` function calls `process.exit(130)`, which terminates the process before the `finally` block (`process.removeListener`) has a chance to run. While process exit cleans up in practice, if `withWizardCleanup` is ever called more than once in the same process (e.g., test suites or nested wizard calls), each call registers a new `SIGINT` listener that is never removed if SIGINT fires during execution. Node/Bun emit a `MaxListenersExceededWarning` after 11 listeners on the same event, and the stale handlers would each attempt to delete the same `.tmp` file and call `process.exit`.

**Fix:** Remove the listener inside `handleSigint` before calling `process.exit`, guaranteeing cleanup even on abnormal termination.

```typescript
const handleSigint = async () => {
  process.removeListener('SIGINT', handleSigint)   // remove before exit
  await unlink(tmpPath).catch(() => {})
  process.stdin.unref()
  process.exit(130)
}
```

---

## Info

### IN-01: Mixed quote style and missing semicolons in `ensureDefaultAgentBootstrap` (lines 269-284)

**File:** `src/control/commands/runtime-bootstrap-cli.ts:269-284`

**Issue:** The new block added in this phase (the START-01 path) uses single quotes and omits semicolons, while the rest of `runtime-bootstrap-cli.ts` uses double quotes and includes semicolons. The project style guide says to omit semicolons everywhere, but this file pre-exists with semicolons throughout. Regardless of which convention is correct for this file, the local inconsistency makes the block visually stand out and will create noise in future diffs.

**Fix:** Align the new block with the surrounding file style (double quotes and semicolons) while the file is being touched, or align the whole file with project style (single quotes, no semicolons) in a dedicated pass.

---

### IN-02: Suppression of unused imports via `void` casts is fragile documentation

**File:** `src/control/setup/setup-channels.ts:25-29`

**Issue:** `promptMasked` and the `Interface` type are imported but not used in `setup-channels.ts` itself. They are suppressed with `void (promptMasked as unknown)` and `void (null as unknown as Interface)` with a comment referencing ticket IDs (D-06, FOUND-03). This keeps the imports from causing type errors but the intent is unclear to future readers: is this a dead import, a forward reservation, or a cross-module marker? If `promptMasked` is genuinely not used here, it should not be imported. If it is reserved for a planned use, a `// TODO(D-06):` comment on the import itself is clearer.

**Fix:** Either remove both unused imports and the `void` suppressions, or replace the `void` suppression with a comment directly on the import line explaining the deferred use.

---

### IN-03: `withWizardCleanup` returns `result as T` where `result` may be `undefined` if `fn` returns `undefined` as `T`

**File:** `src/control/setup/setup-wizard-utils.ts:49-64`

**Issue:** `result` is declared as `T | undefined`. If `fn()` resolves to `undefined` (i.e., `T = void | undefined`), then `result as T` is sound. However, if `fn()` is typed to return a concrete value but throws synchronously inside the `try` block before assigning `result`, the function returns `undefined as T`, which is a type lie. This is a minor type unsoundness that exists only in the error-path, and the current callers all use `T = void`, so it has no runtime impact today.

**Fix:** Consider restructuring to avoid the `undefined` intermediate:

```typescript
export async function withWizardCleanup<T>(fn: () => Promise<T>, configPath?: string): Promise<T> {
  // ... setup ...
  process.on('SIGINT', handleSigint)
  try {
    return await fn()
  } catch (err) {
    throw err
  } finally {
    process.removeListener('SIGINT', handleSigint)
  }
}
```

This eliminates the `result as T` cast entirely.

---

_Reviewed: 2026-05-27T16:26:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
