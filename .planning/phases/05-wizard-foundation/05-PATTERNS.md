# Phase 5: Wizard Foundation - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 1 new file
**Analogs found:** 5 strong matches

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/control/setup/setup-wizard-utils.ts` | utility | request-response + file-I/O | `src/infra/process.ts` | exact |

---

## Pattern Assignments

### `src/control/setup/setup-wizard-utils.ts` (utility, request-response + file-I/O)

**Primary Analog:** `src/infra/process.ts` (lines 1-99)

This file exports standalone utility functions with async/await patterns. The setup-wizard-utils file follows the same structure: type exports at the top, then pure exported functions with clear responsibilities.

**Imports pattern** (lines 1-3):
```typescript
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";

// Applied to setup-wizard-utils:
// Import from node:fs/promises, node:path, node:os
// Import from local utilities: ../../infra/fs.ts, ../../infra/paths.ts, ../../control/runtime/runtime-process.ts
```

**Function structure pattern** (lines 10-15):
```typescript
export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<CommandResult> {
  // Implementation
}

// Applied to setup-wizard-utils:
// - Export synchronous guard functions (ensureTTY) without wrapping in Promise
// - Export async wrapper functions (ensureDaemonNotRunning, writeEditableConfigAtomic, withWizardCleanup)
// - Use simple parameter objects with optional properties for config path
```

---

### Secondary Analog: `src/infra/fs.ts` (lines 1-32)

**File operations pattern:**

```typescript
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

export async function ensureDir(pathname: string) {
  await mkdir(pathname, { recursive: true });
}

export async function writeTextFile(pathname: string, text: string) {
  await writeFile(pathname, text, "utf8");
}
```

**Applied to setup-wizard-utils for atomic write:**
- Import `writeTextFile` from `../../infra/fs.ts` (already abstracts writeFile)
- Import `rename, unlink` from `node:fs/promises` for atomic operations
- Use `ensureDir` from `../../infra/fs.ts` before writing to ensure parent directories exist

---

### Tertiary Analog: `src/infra/paths.ts` (lines 7-15, 28-38)

**Path resolution pattern:**

```typescript
export function expandHomePath(rawPath: string): string {
  if (rawPath === "~") {
    return homedir();
  }
  if (rawPath.startsWith("~/")) {
    return join(homedir(), rawPath.slice(2));
  }
  return rawPath;
}

export function resolveAppHomeDir(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.CLISBOT_HOME?.trim();
  if (configured) {
    return expandHomePath(configured);
  }
  return join(homedir(), DEFAULT_APP_HOME_BASENAME);
}

export function getDefaultConfigPath(env: NodeJS.ProcessEnv = process.env) {
  return join(resolveAppHomeDir(env), "clisbot.json");
}
```

**Applied to setup-wizard-utils:**
- Use `expandHomePath` from `../../infra/paths.ts` for resolving config paths
- When deriving temp file path, use pattern: `${expandedConfigPath}.tmp`
- For optional config path parameters, follow `getDefaultConfigPath()` fallback pattern

---

### Reference: `src/control/runtime/runtime-process.ts` (lines 35-81, 582-622)

**Async pattern with optional parameters:**

```typescript
function resolveConfigPath(configPath?: string) {
  return expandHomePath(configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath());
}

// Usage pattern:
export async function getRuntimeStatus(params: {
  configPath?: string;
  pidPath?: string;
  logPath?: string;
  monitorStatePath?: string;
} = {}): Promise<RuntimeStatus> {
  const configPath = resolveConfigPath(params.configPath);
  // ... rest of implementation
  return {
    running: liveMonitorPid != null,
    // ... other properties
  };
}
```

**Applied to setup-wizard-utils:**
- For `ensureDaemonNotRunning(configPath?: string)`, use the same optional parameter + fallback pattern
- Call `getRuntimeStatus({ configPath })` directly (already imported from runtime-process)
- Check `.running` property on the returned status object
- Throw error if `status.running === true`

---

## Shared Patterns

### Error Handling Pattern
**Source:** `src/control/commands/operator-errors.ts` (lines 7-14)

```typescript
export function renderOperatorErrorLines(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return [`error ${message}`];
}
```

**Apply to:** All error exit paths in setup-wizard-utils

For TTY guard and daemon check, use:
```typescript
export function ensureTTY() {
  if (!process.stdin.isTTY) {
    console.error(
      'Setup wizard requires an interactive terminal.\n' +
      'In non-interactive environments, use: clisbot init'
    )
    process.exit(1)
  }
}

export async function ensureDaemonNotRunning(configPath?: string) {
  const status = await getRuntimeStatus({ configPath })
  if (status.running) {
    console.error(
      `Cannot run setup wizard while clisbot daemon is running.\n` +
      `Stop the daemon with: clisbot stop`
    )
    process.exit(1)
  }
}
```

### Atomic File Write Pattern
**Sources:** 
- `src/infra/fs.ts` (writeTextFile)
- `src/config/core/config-file.ts` (lines 52-68, writeEditableConfig)

**Pattern:**
```typescript
import { writeTextFile } from "../../infra/fs.ts";
import { expandHomePath } from "../../infra/paths.ts";
import { rename } from "node:fs/promises";
import { dirname } from "node:path";
import { ensureDir } from "../../infra/fs.ts";

export async function writeEditableConfigAtomic(
  configPath: string,
  text: string,
) {
  const expandedConfigPath = expandHomePath(configPath);
  await ensureDir(dirname(expandedConfigPath));
  
  const tmpPath = `${expandedConfigPath}.tmp`;
  await writeTextFile(tmpPath, text);
  await rename(tmpPath, expandedConfigPath);
}
```

**Key differences from writeEditableConfig:**
- Does NOT normalize/sanitize config (caller is responsible)
- Does NOT add metadata (caller handles)
- Wraps write with temp-file + rename for atomicity
- Caller must ensure valid JSON string before calling

---

## Control+C Cleanup Wrapper Pattern

**Source:** Standard Node.js signal handling + Bun #21189 mitigation

**Pattern:**
```typescript
import { unlink } from "node:fs/promises";

export async function withWizardCleanup<T>(
  fn: () => Promise<T>,
  configPath?: string,
): Promise<T> {
  const expandedConfigPath = expandHomePath(
    configPath ?? process.env.CLISBOT_CONFIG_PATH ?? getDefaultConfigPath()
  );
  const tmpPath = `${expandedConfigPath}.tmp`;
  
  let result: T | undefined;
  let thrownError: Error | undefined;
  
  const handleSigint = async () => {
    try {
      await unlink(tmpPath).catch(() => {
        // File may not exist; that's okay
      });
    } finally {
      // Bun #21189 mitigation: explicit stdin.unref() before exit
      process.stdin.unref();
      process.exit(130);
    }
  };
  
  process.on('SIGINT', handleSigint);
  
  try {
    result = await fn();
  } catch (err) {
    thrownError = err as Error;
  } finally {
    process.removeListener('SIGINT', handleSigint);
  }
  
  if (thrownError) throw thrownError;
  return result!;
}
```

**Key invariants:**
- SIGINT handler is installed before fn() runs and removed after it completes
- All errors in the handler are caught (`.catch()`) so `process.exit(130)` always runs
- `process.stdin.unref()` is called before exit (required for Bun #21189 mitigation)
- Exit code 130 is POSIX standard for SIGINT termination

---

## Code Style Conventions

**Source:** Repository style rules from CLAUDE.md

Apply these to all new functions:
- **Indentation:** 2 spaces (no tabs)
- **Semicolons:** Omit
- **Trailing commas:** Include in multi-line structures
- **Quotes:** Single quotes unless string contains single quote
- **Function length:** Target under 30 lines; hard limit 50
- **Nesting depth:** Maximum 3 levels

---

## No Analog Found

All files in Phase 5 scope have strong analogs in the codebase. No gaps identified.

---

## Metadata

**Analog search scope:**
- `src/infra/*.ts` — utility modules with exported functions
- `src/control/commands/*.ts` — CLI command structures
- `src/control/runtime/*.ts` — runtime utilities and guards

**Files scanned:** 5 primary analogs + 6 reference files

**Pattern extraction date:** 2026-05-27

---

## Summary of Extracted Patterns

1. **Utility module structure:** Follow `src/infra/process.ts` pattern of standalone exported functions
2. **Path resolution:** Use `expandHomePath` from `src/infra/paths.ts`; support optional configPath with env var fallback
3. **Async file operations:** Import from `node:fs/promises` and wrap with `ensureDir` from `src/infra/fs.ts`
4. **Guard functions:** Synchronous checks (ensureTTY); throw or exit(1) on failure with actionable error messages
5. **Async guards:** Await single check (ensureDaemonNotRunning); call existing `getRuntimeStatus()`
6. **Atomic write:** Write to temp file, then `fs.rename()` for atomicity; never touch final path until write completes
7. **SIGINT cleanup:** Install handler before operation; remove after; always call `process.stdin.unref()` before exit
8. **Exit codes:** Use 1 for setup failures, 130 for SIGINT (POSIX standard)
9. **Error output:** Use `console.error()` with plain strings; include actionable next steps in error message
10. **Imports order:** Node stdlib → local infra → local control → types

All patterns are from existing production code in the repository. No new conventions introduced.
