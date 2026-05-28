---
phase: 08-setup-router
reviewed: 2026-05-28T02:51:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/control/setup/setup-router.ts
  - test/control/setup/setup-router.test.ts
  - src/cli.ts
  - src/main.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-28T02:51:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 8 introduces the smart setup router (`clisbot setup`) wired through `cli.ts` and `main.ts`. The overall design is sound: injectable deps avoid Bun mock leakage, dynamic import keeps startup lean, and the three routing branches (ROUTER-01/02/03) match the stated intent.

Three warnings found — all logic correctness issues, none security-related. Three info items for style and coverage gaps.

---

## Warnings

### WR-01: `clisbot setup channels` and `clisbot setup agent` subcommand shortcuts are silently ignored

**File:** `src/control/setup/setup-router.ts:90-124`

The CLI help text (cli.ts:285-291) advertises:

```
setup [channels|agent]
Pass `channels` to skip detection and go straight to channel setup.
Pass `agent` to skip detection and go straight to agent setup.
```

`args` is passed via `options.args` and the only use of `args[0]` is as a config-path override:

```ts
const configPath = expandHomePath(
  options?.args?.[0] ?? options?.configPath ?? ...
)
```

`args[0]` is consumed as a path, not as a subcommand token. Running `clisbot setup channels` would pass `"channels"` to `expandHomePath`, which would silently resolve it to a relative path like `<cwd>/channels` or an equivalent, then attempt to read/create a config file there. The router would then always land on ROUTER-01 (no channels configured at that bogus path) and call the channels wizard — which happens to be the right wizard, but for the wrong reason, and it would write config to the wrong path.

Running `clisbot setup agent` would write config to `<cwd>/agent` instead of the real config path.

**Fix:** Detect the subcommand token before consuming `args[0]` as a path:

```ts
export async function runSetupRouter(options?: SetupRouterOptions): Promise<void> {
  const rawArgs = options?.args ?? []
  const subcommand = rawArgs[0] === 'channels' || rawArgs[0] === 'agent'
    ? rawArgs[0]
    : undefined
  const pathArg = subcommand !== undefined ? undefined : rawArgs[0]

  const configPath = expandHomePath(
    pathArg ?? options?.configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath(),
  )

  // ... resolve deps, ensureTTY, ensureConfigFile, readEditableConfig ...

  if (subcommand === 'channels') {
    await channelsWizard({ configPath })
    return
  }
  if (subcommand === 'agent') {
    await agentWizard({ configPath })
    return
  }

  // existing ROUTER-01/02/03 logic
}
```

---

### WR-02: `EnsureConfigFileFn` type is narrower than the real `ensureConfigFile` signature — type error masked by structural compatibility

**File:** `src/control/setup/setup-router.ts:17`

The injected type is declared as:

```ts
type EnsureConfigFileFn = (p: string) => Promise<{ configPath: string }>
```

The real `ensureConfigFile` from `runtime-process.ts` has the signature:

```ts
async function ensureConfigFile(configPath?: string, options: ConfigBootstrapOptions = {})
  : Promise<{ configPath: string; created: boolean }>
```

The declared type loses the `created` field from the return type and constrains the first parameter to `string` (non-optional) while the real implementation accepts `string | undefined`. This works structurally at call sites because the router only uses `configResult.configPath`, but the narrowed type hides `created` from callers and will silently fail a strict type check if the injected type is ever widened.

More importantly, the type annotation `(p: string) => Promise<{ configPath: string }>` does not match the real function's return type structurally in the strict direction — TypeScript will accept a function returning `{ configPath: string; created: boolean }` where `{ configPath: string }` is expected (excess property in return is fine), so no runtime error. But the inverse is not safe: if the type were tightened further or a mock returned exactly `{ configPath: string }` without `created`, any refactor that later reads `created` would break silently in tests.

**Fix:** Align the type with the real signature:

```ts
type EnsureConfigFileFn = (p: string) => Promise<{ configPath: string; created: boolean }>
```

---

### WR-03: readline mock in tests patches `node:readline` after `setup-router.ts` has already imported `createInterface` — mock may not intercept the router's readline usage

**File:** `test/control/setup/setup-router.test.ts:14-27`

`setup-router.ts` imports `createInterface` at the top level:

```ts
import { createInterface } from 'node:readline'
```

The test file calls `mockReadline()` (which does `mock.module('node:readline', ...)`) at test runtime, after the module is already evaluated and `createInterface` is already bound. In Bun's module system, `mock.module()` replaces the module's exports for future `import` calls, but the already-imported binding `createInterface` inside `setup-router.ts` is a live binding only if the module uses named imports from a namespace — static ES imports are typically captured at evaluation time.

This means the readline mock likely has no effect on ROUTER-03 tests where `displayStatusAndChooseFlow` calls `createInterface(...)`. The test for ROUTER-03 (line 158) passes `mockReadline(['2'])` and expects `runAgentWizard called` — but if the mock is not intercepted, `createInterface` would try to use real `process.stdin`, which in a test worker is not a TTY and would hang or produce an empty response (defaulting to the `''` path, which matches neither `'1'` nor `'2'`, so neither wizard runs). The test may be passing for the wrong reason (no assertion that exactly one wizard runs) or may be flaky in CI.

**Fix — option A (preferred):** Move readline creation inside `displayStatusAndChooseFlow` into an injectable dep, consistent with the existing pattern:

```ts
// In SetupRouterOptions:
_createInterface?: typeof createInterface

// In displayStatusAndChooseFlow signature, add:
createInterfaceFn: typeof createInterface

// In runSetupRouter:
const createInterfaceFn = options?._createInterface ?? createInterface
```

**Fix — option B:** Switch to `readline/promises` and pass the `rl` object itself as an injectable, which is already how `setup-wizard-utils.ts` (`promptMasked`) and the wizard files are structured.

---

## Info

### IN-01: ROUTER-03 test does not assert that the channels wizard was NOT called

**File:** `test/control/setup/setup-router.test.ts:158-176`

The ROUTER-03 test (both configured, user selects `'2'`) asserts:

```ts
expect(output).toContain('Current configuration')
expect(output).toContain('runAgentWizard called')
```

It does not assert `expect(output).not.toContain('runChannelsWizard called')`. Minor omission — both ROUTER-01 and ROUTER-02 tests have the inverse assertion. Consistent negative assertions make regression clearer when routing logic changes.

**Fix:** Add:

```ts
expect(output).not.toContain('runChannelsWizard called')
```

---

### IN-02: ROUTER-01 test label comment says "no config" but the test stub always creates the file

**File:** `test/control/setup/setup-router.test.ts:110-127`

The test comment says `no config — routes directly to channels wizard` and the intent is to test an empty/missing config. The stub `ensureConfigFile` returns `{ configPath: p }` without creating the file, and no `writeConfig()` call is made — so `readEditableConfig` will be called on a non-existent path. `readEditableConfig` calls `ensureEditableConfigFile` internally, which creates a default config. The default config has no channels enabled, so the test hits ROUTER-01 as expected.

The test works, but the description "no config" is slightly misleading — it is really "default config (no channels enabled)". The distinction matters because if `readEditableConfig`'s default template ever enables a channel by default, this test would silently stop covering ROUTER-01.

**Fix:** Either write an empty config explicitly in the test, or update the comment to "default config — no channels enabled".

---

### IN-03: Unhandled invalid menu input in ROUTER-03 — user sees blank response with no feedback

**File:** `src/control/setup/setup-router.ts:61-67`

In `displayStatusAndChooseFlow`, if the user enters anything other than `'1'` or `'2'` (including empty string on Ctrl-D), the code silently falls through with no feedback:

```ts
const choice = answer.trim()
if (choice === '1') {
  await channelsWizard({ configPath })
} else if (choice === '2') {
  await agentWizard({ configPath })
}
// else: silent exit
```

This is not a crash risk, but results in confusing UX — the wizard exits with no message after an invalid entry.

**Fix:** Add an else clause:

```ts
} else {
  console.log('No change made.')
}
```

---

_Reviewed: 2026-05-28T02:51:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
