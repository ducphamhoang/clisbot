# Phase 1: Schema Precondition - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 3 new/modified files
**Analogs found:** 3 / 3 (100%)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/config/runtime/agent-tool-presets.ts` | config/type | request-response | itself (template type) | exact |
| `src/agents/runtime/runner-service.ts` | service | request-response | itself (resolveNewSessionCommand method) | exact |
| `src/config/core/schema.ts` | config/schema | validation | itself (optional field patterns) | exact |

## Pattern Assignments

### 1. Type Definition Pattern

**File:** `src/config/runtime/agent-tool-presets.ts`

**Current AgentToolTemplate type** (lines 7-38):
```typescript
export type AgentToolTemplate = {
  command: string;
  startupOptions: string[];
  trustWorkspace: boolean;
  startupDelayMs: number;
  startupRetryCount: number;
  startupRetryDelayMs: number;
  startupReadyPattern?: string;
  startupBlockers?: Array<{
    pattern: string;
    message: string;
  }>;
  promptSubmitDelayMs: number;
  sessionId: {
    create: {
      mode: "runner" | "explicit";
      args: string[];
    };
    capture: {
      mode: "off" | "status-command";
      statusCommand: string;
      pattern: string;
      timeoutMs: number;
      pollIntervalMs: number;
    };
    resume: {
      mode: "off" | "command";
      command?: string;
      args: string[];
    };
  };
};
```

**Pattern:** Add optional field at template type level with optional chaining (`?`). This mirrors the optional fields already in the type: `startupReadyPattern?`, `startupBlockers?`, and nested `command?` in `sessionId.resume`.

---

### 2. Default Value Assignment Pattern

**File:** `src/config/runtime/agent-tool-presets.ts`

**DEFAULT_AGENT_TOOL_TEMPLATES structure** (lines 44-153):
```typescript
export const DEFAULT_AGENT_TOOL_TEMPLATES: Record<AgentCliToolId, AgentToolTemplate> = {
  codex: {
    command: "codex",
    startupOptions: [
      "--dangerously-bypass-approvals-and-sandbox",
      "--no-alt-screen",
    ],
    trustWorkspace: true,
    startupDelayMs: INTERACTIVE_CLI_STARTUP_DELAY_MS,
    // ... other fields
    sessionId: {
      create: { mode: "runner", args: [] },
      capture: {
        mode: "status-command",
        statusCommand: "/status",
        pattern: SESSION_ID_PATTERN,
        timeoutMs: 5000,
        pollIntervalMs: 250,
      },
      resume: {
        mode: "command",
        args: [
          "resume",
          "{sessionId}",
          // ...
        ],
      },
    },
  },
  claude: { /* ... */ },
  gemini: { /* ... */ },
};
```

**Pattern:** Each CLI tool (codex, claude, gemini) has a complete template object. Add the optional field to each of the three template objects with the appropriate default value. For `newSessionCommand`:
- codex: `"/new"`
- claude: `"/new"`
- gemini: `"/clear"` (because Gemini uses `/clear` instead of `/new`)

---

### 3. Hardcoded Command Location

**File:** `src/agents/runtime/runner-service.ts`

**Current hardcoded /new resolution** (lines 968-970):
```typescript
private resolveNewSessionCommand(resolved: ResolvedAgentTarget) {
  return resolved.runner.command.toLowerCase().includes("gemini") ? "/clear" : "/new";
}
```

**Usage context** (line 843):
```typescript
private async triggerNewSessionInLiveRunner(resolved: ResolvedAgentTarget) {
  const oldSessionId = (await this.sessionMapping.get(resolved.sessionKey))?.sessionId;
  const command = this.resolveNewSessionCommand(resolved);
  // ... rest of method
```

**Pattern:** Replace the hardcoded ternary logic with a lookup: `resolved.runner.newSessionCommand ?? (resolved.runner.command.toLowerCase().includes("gemini") ? "/clear" : "/new")`. This preserves backward compatibility (defaults to current behavior if field is missing) while allowing template-level override.

---

### 4. Schema Validation Pattern

**File:** `src/config/core/schema.ts`

**Optional field with default in Zod** (lines 38, 68-74):
```typescript
const runnerSessionIdResumeSchema = z.object({
  mode: z.enum(["off", "command"]).default("off"),
  command: z.string().min(1).optional(),
  args: z.array(z.string()).default([]),
});

const runnerLaunchSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  startupDelayMs: z.number().int().positive().optional(),
  startupRetryCount: z.number().int().min(0).optional(),
  startupRetryDelayMs: z.number().int().min(0).optional(),
  startupReadyPattern: z.string().min(1).optional(),
  startupBlockers: z.array(runnerStartupBlockerSchema).optional(),
  promptSubmitDelayMs: z.number().int().min(0).optional(),
  sessionId: runnerSessionIdSchema.optional(),
});
```

**Pattern for newSessionCommand:** Add to `runnerLaunchSchema` as:
```typescript
newSessionCommand: z.string().min(1).optional(),
```

This matches the pattern of other optional CLI configuration fields. No `.default()` is needed here because the schema layer validates presence, and the runtime layer handles the fallback in `resolveNewSessionCommand()`.

---

### 5. Template Merging/Inheritance Pattern

**File:** `src/config/core/persisted-config.ts`

**How optional template fields are inherited** (lines 62-68, 85-100):
```typescript
function defaultRunner(toolId: AgentCliToolId) {
  return buildRunnerFromToolTemplate(
    toolId,
    DEFAULT_AGENT_TOOL_TEMPLATES[toolId],
    undefined,
  );
}

function pruneDefaultOwnedFields(params: {
  target: MutableRecord;
  toolId: AgentCliToolId;
  force: boolean;
}) {
  const defaults = defaultRunner(params.toolId) as unknown as MutableRecord;
  for (const field of defaultOwnedRunnerFields[params.toolId] ?? []) {
    if (
      params.force ||
      (Object.hasOwn(params.target, field) &&
        areJsonEqual(params.target[field], defaults[field]))
    ) {
      delete params.target[field];
    }
  }
}
```

**Pattern:** The `buildRunnerFromToolTemplate()` function (lines 168-228 in agent-tool-presets.ts) merges user-provided overrides with the template defaults. The optional field `newSessionCommand` will:
1. Be read from `DEFAULT_AGENT_TOOL_TEMPLATES[toolId].newSessionCommand`
2. Be included in the merged `ResolvedRunnerTemplate` passed to `RunnerService`
3. Be available in `resolved.runner.newSessionCommand` at runtime

Note: `newSessionCommand` should be added to `defaultOwnedRunnerFields` for the relevant CLI tools if persisted config should prune it when it matches the default.

---

### 6. Test Pattern

**File:** `test/runner-service.test.ts`

**Existing test structure** (lines 22-78):
```typescript
describe("RunnerService new session handling", () => {
  test("submits the new-session command once and retries capture until the session id changes", async () => {
    const resolved = {
      agentId: "default",
      sessionKey: "agent:default:slack:channel:c1:thread:new",
      sessionName: "session",
      workspacePath: "/tmp/workspace",
      runner: {
        command: "codex",
      },
    } as any;
    const runner = new RunnerService(
      {} as any,
      {
        hasSession: async () => true,
      } as unknown as TmuxClient,
      (() => resolved) as any,
      {} as SessionMapping,
    );
    // ... test setup and assertions
  });
});
```

**Pattern for new tests:** Add test cases to verify:
1. `resolveNewSessionCommand()` returns the template's `newSessionCommand` when present
2. Fallback behavior still works (returns hardcoded value) when `newSessionCommand` is absent
3. Gemini-specific defaults are respected (test with Gemini command, verify `/clear` is used)
4. Codex/Claude defaults use `/new`

---

## Shared Patterns

### Optional Field with Runtime Fallback

**Source:** `src/agents/runtime/runner-service.ts` (resolveNewSessionCommand)
**Apply to:** All runtime resolution logic

Pattern: When adding optional fields to templates, use the null-coalescing operator to provide fallback:
```typescript
const value = resolved.runner.optionalField ?? fallbackValue;
```

This ensures backward compatibility—existing configs without the field still work with the old hardcoded behavior.

---

### Optional Type Definition and Schema Validation

**Source:** `src/config/runtime/agent-tool-presets.ts` (AgentToolTemplate type) + `src/config/core/schema.ts`
**Apply to:** All new optional configuration fields

Pattern:
1. Add `fieldName?: FieldType` to the TypeScript type (no default needed)
2. Add `fieldName: z.string().optional()` (or appropriate Zod type) to the schema
3. Handle the default in runtime code, not in the schema

This separates concerns: schema validates what's present, type reflects possibility of absence, runtime provides sensible defaults.

---

## No Analog Found

All implementation patterns found direct analogs in the codebase.

---

## Files to Create/Modify

### New Files
None—this is a schema precondition that modifies existing files.

### Modified Files

1. **`src/config/runtime/agent-tool-presets.ts`**
   - Add `newSessionCommand?: string` to `AgentToolTemplate` type
   - Add `newSessionCommand: "/new"` to `DEFAULT_AGENT_TOOL_TEMPLATES.codex`
   - Add `newSessionCommand: "/new"` to `DEFAULT_AGENT_TOOL_TEMPLATES.claude`
   - Add `newSessionCommand: "/clear"` to `DEFAULT_AGENT_TOOL_TEMPLATES.gemini`
   - Include field in `ResolvedRunnerTemplate` type (lines 155-166)

2. **`src/agents/runtime/runner-service.ts`**
   - Modify `resolveNewSessionCommand()` (lines 968-970) to use template field with fallback
   - Change from: `return resolved.runner.command.toLowerCase().includes("gemini") ? "/clear" : "/new";`
   - Change to: `return resolved.runner.newSessionCommand ?? (resolved.runner.command.toLowerCase().includes("gemini") ? "/clear" : "/new");`

3. **`src/config/core/schema.ts`**
   - Add `newSessionCommand: z.string().min(1).optional()` to `runnerLaunchSchema` (after `promptSubmitDelayMs`)
   - Add same field to `runnerFamilyOverrideSchema` for override/customization support

4. **`src/config/core/persisted-config.ts`** (optional, for cleanup)
   - Consider adding `newSessionCommand` to `defaultOwnedRunnerFields` if persisted configs should prune the field when it matches the template default

5. **`test/runner-service.test.ts`**
   - Add tests for `resolveNewSessionCommand()` resolution logic

---

## Metadata

**Analog search scope:** `src/config/runtime/`, `src/agents/runtime/`, `src/config/core/`
**Files scanned:** 10 (agent-tool-presets.ts, runner-service.ts, schema.ts, persisted-config.ts, and related test files)
**Pattern extraction date:** 2026-05-26

## Key Patterns Identified

- All three CLI backends (codex, claude, gemini) are supported via `DEFAULT_AGENT_TOOL_TEMPLATES`
- Hardcoded `/new` command logic is centralized in one method (`resolveNewSessionCommand`) for easy refactoring
- Optional fields use TypeScript optionality (`?`) combined with Zod `.optional()` in schema
- Runtime fallback logic is separated from schema validation
- Backward compatibility is maintained via null-coalescing (`??`) at runtime
- Existing test structure tests the method behavior directly via mocked dependencies
