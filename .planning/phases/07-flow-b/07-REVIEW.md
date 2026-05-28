---
phase: 07-flow-b
reviewed: 2026-05-28T01:47:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/control/setup/setup-agent.ts
  - test/control/setup/setup-agent.test.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-28T01:47:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Two files reviewed: the `setup-agent` wizard implementation and its companion test suite. The implementation is well-structured and within line/nesting limits, but contains a security vulnerability (command injection surface in `checkBinaryExists`) paired with a correctness bug in the same function (wrong error code check means binary-not-found re-throws instead of returning `false`). The test suite has a mock ordering issue that may cause AGTWIZ-05 to skip its mock in Bun's static module system, and AGTWIZ-02's mock is wired to the wrong error shape, meaning it exercises a dead code branch rather than the real failure path. Three info-level items cover a misleading test comment, uncaptured `console.error`, and a function approaching the project's 50-line hard limit.

---

## Critical Issues

### CR-01: Command injection via shell interpolation in `checkBinaryExists`

**File:** `src/control/setup/setup-agent.ts:53`
**Issue:** `command` is interpolated directly into a shell string passed to `execSync`. Although the current call site validates the value through `isSupportedCliTool` first, `checkBinaryExists` itself accepts any `string`. A future call with unsanitized input, or a tool name containing shell metacharacters entering the allowlist, would allow OS command injection.
**Fix:**
```ts
import { execFileSync } from 'node:child_process'

function checkBinaryExists(command: string): boolean {
  try {
    execFileSync('which', [command], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}
```
Use `execFileSync` with an argument array. This eliminates shell expansion entirely and also resolves WR-01 below.

---

## Warnings

### WR-01: `checkBinaryExists` re-throws on binary-not-found instead of returning `false`

**File:** `src/control/setup/setup-agent.ts:55-59`
**Issue:** `execSync('which <tool>')` throws an `Error` with `status: 1` (no `code` property) when the binary is absent. The catch guard checks for `code === 'ENOENT'`, which only fires when `which` itself is missing from the OS — a case that never occurs in practice. For the real binary-not-found case, the error is re-thrown, causing an unhandled exception inside `selectCliToolWithVerification` instead of showing the install instructions.
**Fix:** The `execFileSync` replacement in CR-01 catches all non-zero exits and returns `false`, which is the correct behavior. If keeping `execSync`, replace the guard:
```ts
} catch {
  // execSync throws on any non-zero exit; that means binary not found
  return false
}
```

### WR-02: AGTWIZ-02 test mock throws with wrong error shape, exercising a dead code branch

**File:** `test/control/setup/setup-agent.test.ts:39-40`
**Issue:** The mock throws `Object.assign(new Error('not found'), { code: 'ENOENT' })`. In the current production code this hits the `code === 'ENOENT'` branch and returns `false` — making the test pass. But that is the branch that handles `which` being missing from the OS, not the binary-not-found case. The real `execSync` error for a missing binary has `status: 1` and no `code`. The test is validating a path that production never takes for this scenario.
**Fix:** Update the mock to emit the real error shape, and update the catch in production to handle it (see WR-01/CR-01):
```ts
const err = Object.assign(new Error('Command failed: which codex'), { status: 1 })
throw err
```

### WR-03: `mock.module` for `runtime-process.ts` called inside test body may not intercept static import

**File:** `test/control/setup/setup-agent.test.ts:152-164`
**Issue:** `runAgentWizard` is imported at the top of the test file (line 6). By the time the test body runs, `setup-agent.ts` has already resolved its static import of `runtime-process.ts`. Calling `mock.module` inside the test body patches the registry for future imports but may not replace the already-bound reference in the loaded `setup-agent` module. In Bun, this means `getRuntimeStatus`, `startDetachedRuntime`, and `ensureConfigFile` may not be mocked when AGTWIZ-05 runs, risking real subprocess or filesystem calls in CI.
**Fix:** Move the `mock.module` call for `runtime-process.ts` to the top of the file (before any imports that transitively load it) or use a dynamic import to load `runAgentWizard` after mocks are established:
```ts
// At top of file, before static imports of the module under test:
mock.module('../../../src/control/runtime/runtime-process.ts', () => ({ ... }))
```

### WR-04: `selectChannelsForAgent` silently links on Enter (empty answer treated as Yes)

**File:** `src/control/setup/setup-agent.ts:159`
**Issue:** `answer.trim().toLowerCase() !== 'n'` means any input other than `'n'` — including empty string — links the channel. A user who presses Enter intending to skip will accidentally link the channel. The `[Y/n]` prompt convention implies default-yes, which is consistent, but the lack of an explicit `'y'` check makes the behavior opaque.
**Fix:** Accept only explicit `'y'` or empty string as confirmation, and treat any other input as "no" or loop for clarification. At minimum, accept `''` and `'y'` as yes, everything else as no:
```ts
const normalized = answer.trim().toLowerCase()
if (normalized === 'y' || normalized === '') {
  selected.push(channel)
}
```

---

## Info

### IN-01: AGTWIZ-01 test comment is mechanically wrong — `'n'` does not abort at first prompt

**File:** `test/control/setup/setup-agent.test.ts:89-90`
**Issue:** The comment says `'n' to abort at the first prompt`. In `selectCliToolWithVerification`, `'n'` is not a supported tool name, so it loops back to "Invalid selection." The queue then exhausts and the next `ask()` call returns `''` (the fallback), which throws `WizardCancelled`. The test passes for the right observable reason but via the wrong mechanical path. The abort signal is `''` (empty string), not `'n'`.
**Fix:**
```ts
mockReadline([''])  // empty string is the documented WizardCancelled trigger
```

### IN-02: `console.error` not captured in test harness

**File:** `test/control/setup/setup-agent.test.ts:66-69`
**Issue:** Only `console.log` is intercepted and stored in `logOutput`. `activateConfiguration` in the source emits failure messages via `console.error` (lines 212-214). If a future test asserts on error-path output, the harness will miss it, making the assertion silently pass or fail unexpectedly.
**Fix:** Also intercept `console.error` in `beforeEach`:
```ts
let errorOutput: string[]
let originalConsoleError: typeof console.error

// in beforeEach:
errorOutput = []
originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  errorOutput.push(args.map(String).join(' '))
}

// in afterEach:
console.error = originalConsoleError
```

### IN-03: `runWizardSession` approaching the 50-line function hard limit

**File:** `src/control/setup/setup-agent.ts:224-268`
**Issue:** `runWizardSession` is 44 lines, 6 lines below the project's hard limit. It orchestrates config loading, three wizard steps, review display, confirmation prompt, config write, and runtime activation. Any further extension will breach the limit.
**Fix:** Extract the input-gathering block into a `gatherAgentInputs(rl, config)` helper returning `{ cliTool, botType, selectedChannels }`. This reduces `runWizardSession` to ~25 lines and provides clear growth headroom.

---

_Reviewed: 2026-05-28T01:47:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
