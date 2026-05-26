# Phase 1: Schema Precondition - Research

**Researched:** 2026-05-26
**Domain:** Agent CLI tool configuration schema and session command resolution
**Confidence:** HIGH

## Summary

Phase 1 adds a `newSessionCommand` field to `AgentToolTemplate` so pi (and future CLIs) can declare their own session-rotation command instead of receiving a hardcoded `/new` as a literal prompt.

Currently, `resolveNewSessionCommand()` in `runner-service.ts` hardcodes the logic:
- gemini CLI → `/clear`
- codex, claude → `/new`

This coupling prevents new CLIs from declaring their preferred session command. Adding an optional `newSessionCommand` field to `AgentToolTemplate` with a default of `"/new"` will unblock pi, which needs a different command per the pi documentation.

The refactor is minimal: add the schema field, update the three existing template definitions (codex, claude, gemini), and replace the hardcoded logic in `resolveNewSessionCommand()` with a template lookup.

**Primary recommendation:** Add `newSessionCommand?: string` (optional) to `AgentToolTemplate`, default existing CLIs to `"/new"` (gemini explicitly to `"/clear"`), and update `resolveNewSessionCommand()` to read from the template instead of hardcoding.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session command configuration | Backend/Config | — | Declared at CLI template definition time, not runtime |
| Session command resolution | Backend/Runner | — | The runner's `resolveNewSessionCommand()` owns the decision logic |
| New session trigger | Backend/Runner | — | `triggerNewSessionInLiveRunner()` uses resolved command to send input |

## User Constraints

**None** — This is the first phase. No upstream decisions exist yet.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | `AgentToolTemplate` has a `newSessionCommand` field (optional string, defaults to `"/new"`) so pi (and future CLIs) can declare their own session-rotation command rather than receiving a hardcoded `/new` | Core finding: `resolveNewSessionCommand()` at lines 968-970 of `runner-service.ts` currently hardcodes this logic inline. Field should live in `AgentToolTemplate` type (lines 7-38 of `agent-tool-presets.ts`) and be read during resolution. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.6 | Type safety for config schemas | Already enforced repo-wide via `bunx tsc --noEmit` |
| Zod | ^3 (in package.json) | Configuration schema validation | Already used for all config parsing |
| Bun | Latest | Test runner | Repo standard command baseline |

### Supporting
No new libraries needed for this phase.

## Architecture Patterns

### System Architecture: Session Command Flow

```
Agent Config (user) → AgentToolTemplate (default or override)
                          ↓
                 template.newSessionCommand
                          ↓
         runnerService.resolveNewSessionCommand()
                          ↓
       submitTmuxSessionInput() → tmux pane
```

**Data flow:**
1. **Entry point:** User command `/new` received by agent command handler
2. **Template lookup:** `RunnerService.triggerNewSessionInLiveRunner()` calls `resolveNewSessionCommand(resolved)` to get the actual command string
3. **Resolution:** `resolveNewSessionCommand()` reads `resolved.runner` (which contains the hydrated `AgentToolTemplate`) and returns the `newSessionCommand` field
4. **Execution:** Command is sent to tmux via `submitTmuxSessionInput()`
5. **Capture:** `captureNewSessionIdentityAfterTrigger()` polls the runner's status to confirm session rotation

### Recommended Project Structure

No new files or directories required. Changes are localized to three existing files:

```
src/config/runtime/
├── agent-tool-presets.ts        # Modify: AgentToolTemplate type + DEFAULT_AGENT_TOOL_TEMPLATES
├── (no new file)

src/agents/runtime/
├── runner-service.ts             # Modify: resolveNewSessionCommand() method (lines 968-970)
└── (no new file)
```

### Pattern 1: Optional Template Field with Default

**What:** Adding an optional field to a config template that defaults based on the CLI tool ID, ensuring backward compatibility.

**When to use:** When a new capability should be CLI-specific but most CLIs share a common default (e.g., codex and claude both use `/new`, but gemini uses `/clear`, pi may use something different).

**Example:**
```typescript
// Before (hardcoded):
private resolveNewSessionCommand(resolved: ResolvedAgentTarget) {
  return resolved.runner.command.toLowerCase().includes("gemini") ? "/clear" : "/new";
}

// After (template-driven):
private resolveNewSessionCommand(resolved: ResolvedAgentTarget) {
  return resolved.runner.newSessionCommand ?? "/new";
}

// Template definition:
const DEFAULT_AGENT_TOOL_TEMPLATES: Record<AgentCliToolId, AgentToolTemplate> = {
  codex: {
    // ...
    newSessionCommand: "/new",
  },
  claude: {
    // ...
    newSessionCommand: "/new",
  },
  gemini: {
    // ...
    newSessionCommand: "/clear",
  },
};
```

**Source:** [VERIFIED: codebase grep]

### Anti-Patterns to Avoid

- **CLI ID string inspection at runtime:** Avoid patterns like `if (resolved.runner.command.includes("gemini"))` for behavior that should be declared in the template. This couples the runner logic to CLI naming conventions.
- **Implicit defaults:** Always document the default value (here: `"/new"`) so operators understand what new CLIs get if they don't override.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config schema validation | Custom JSON validation | Zod schema (already in use) | Zod provides type inference, parsing, defaults, and error reporting. The schema layer already uses it exclusively. |
| Template merging/override logic | Custom merge function | Zod `default()` and `partial()` | Schema defaults handle CLI-level defaults; override logic uses partial schemas for per-agent overrides. This is already established in the codebase. |

**Key insight:** The codebase already has a complete schema-driven config story. Leverage Zod defaults and the existing template resolution pipeline rather than inventing runtime logic.

## Common Pitfalls

### Pitfall 1: Forgetting to Update Default Templates
**What goes wrong:** Adding the schema field but forgetting to set `newSessionCommand` on the existing three template definitions. When codex, claude, or gemini are used, the field is `undefined` and resolution falls back to the default, making the change invisible.

**Why it happens:** The three templates are defined in `DEFAULT_AGENT_TOOL_TEMPLATES` (lines 44–153 of `agent-tool-presets.ts`) and also in the Zod schema defaults (lines 387–483 of `schema.ts`). It's easy to miss one.

**How to avoid:** Update all four locations together:
1. `DEFAULT_AGENT_TOOL_TEMPLATES.codex` (preset)
2. `DEFAULT_AGENT_TOOL_TEMPLATES.claude` (preset)
3. `DEFAULT_AGENT_TOOL_TEMPLATES.gemini` (preset)
4. Verify the schema defaults in `schema.ts` match the presets

**Verification steps:**
- Run `bun test` to ensure no existing behavior breaks
- Manually test each CLI (`codex`, `claude`, `gemini`) with `/new` command to confirm it still works
- Add a test that explicitly checks `newSessionCommand` is set on resolved templates

### Pitfall 2: Schema Field Lives in Zod But Not the TypeScript Type
**What goes wrong:** The field is added to the Zod schema but the `AgentToolTemplate` TypeScript interface is not updated. TypeScript compilation passes, but at runtime the field is `undefined`.

**Why it happens:** `AgentToolTemplate` is a manual TypeScript type (lines 7–38 of `agent-tool-presets.ts`), and the schema in `schema.ts` is a Zod schema that drives the JSON config format. They must stay in sync.

**How to avoid:** Update both:
```typescript
// agent-tool-presets.ts — the source of truth for runtime types
export type AgentToolTemplate = {
  // ... existing fields ...
  newSessionCommand?: string;  // ADD THIS
};

// Then verify the Zod schema in schema.ts has the field too
const runnerFamilySchema = runnerLaunchSchema;  // Uses runnerLaunchSchema
// runnerLaunchSchema should have: newSessionCommand: z.string().min(1).optional()
```

**Verification:** After changing, run `bunx tsc --noEmit` and confirm no type errors.

### Pitfall 3: Hardcoded CLI Detection Still Present Elsewhere
**What goes wrong:** You update `resolveNewSessionCommand()` but another place in the codebase still does `if (command.includes("gemini"))` to pick the command, so the template field is ignored.

**Why it happens:** The `/new` vs `/clear` split is currently implemented in one place (`resolveNewSessionCommand()` at line 969), but error messages or recovery logic might have redundant copies of this decision.

**How to avoid:** Search the codebase for all references to `/new`, `/clear`, and `gemini` command detection:
```bash
grep -rn "'/new'\|'/clear'\|include.*gemini" src/ --include="*.ts"
```

Review each result to confirm only `resolveNewSessionCommand()` makes the decision.

**Current findings:** [VERIFIED: grep]
- Line 35, 38 of `run-recovery.ts`: Messages mentioning `/new` (informational only, no decision logic)
- Line 57 of `runner-service.ts`: PRESERVED_SESSION_ID_RETRY_MESSAGE mentioning `/new` (informational only)
- Lines 605 of `commands.ts`: Help text mentioning `/new` (documentation, no logic)
- Line 969 of `runner-service.ts`: **The only place making the decision** ✓

## Code Examples

### Adding the Optional Field to AgentToolTemplate
```typescript
// Source: src/config/runtime/agent-tool-presets.ts (lines 7–38)

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
  newSessionCommand?: string;  // ADD THIS LINE
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

### Setting the Field in DEFAULT_AGENT_TOOL_TEMPLATES
```typescript
// Source: src/config/runtime/agent-tool-presets.ts (lines 44–153)

const DEFAULT_AGENT_TOOL_TEMPLATES: Record<AgentCliToolId, AgentToolTemplate> = {
  codex: {
    command: "codex",
    startupOptions: ["--dangerously-bypass-approvals-and-sandbox", "--no-alt-screen"],
    // ... other fields ...
    promptSubmitDelayMs: 150,
    newSessionCommand: "/new",  // ADD THIS LINE
    sessionId: { /* ... */ },
  },
  claude: {
    command: "claude",
    startupOptions: ["--dangerously-skip-permissions"],
    // ... other fields ...
    promptSubmitDelayMs: 150,
    newSessionCommand: "/new",  // ADD THIS LINE
    sessionId: { /* ... */ },
  },
  gemini: {
    command: "gemini",
    startupOptions: ["--approval-mode=yolo", "--sandbox=false"],
    // ... other fields ...
    promptSubmitDelayMs: 200,
    newSessionCommand: "/clear",  // ADD THIS LINE (gemini uses /clear not /new)
    sessionId: { /* ... */ },
  },
};
```

### Updating resolveNewSessionCommand()
```typescript
// Source: src/agents/runtime/runner-service.ts (lines 968–970)

// BEFORE:
private resolveNewSessionCommand(resolved: ResolvedAgentTarget) {
  return resolved.runner.command.toLowerCase().includes("gemini") ? "/clear" : "/new";
}

// AFTER:
private resolveNewSessionCommand(resolved: ResolvedAgentTarget) {
  return resolved.runner.newSessionCommand ?? "/new";
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `/new` for all CLIs | Gemini special-cased to `/clear` | Pre-Phase-1 | The current split exists only in `resolveNewSessionCommand()` runtime logic, not in schema. This blocks pi and future CLIs from declaring their own command. |
| Single hardcoded command | Per-CLI template field | This phase | Moves decision from runtime logic to schema, enabling new CLIs to declare their preference without code changes. |

**Deprecated/outdated:**
- None — this is a fresh schema field, no deprecation needed.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pi will use a non-standard session command different from `/new` and `/clear` | Phase description, roadmap | If pi uses `/new` same as codex/claude, the field is still correct (defaults to `/new`), so no functional risk. |
| A2 | The `newSessionCommand` field will remain optional (not required) | Schema design | If made required, existing configs without the field would fail validation. Keeping it optional ensures backward compatibility with configs loaded before the schema change. |

## Open Questions

1. **What command will pi use for session rotation?**
   - What we know: The roadmap mentions pi needs to declare its own command, not receive `/new` as a hardcoded literal prompt.
   - What's unclear: The exact command string pi will use (e.g., `/new`, `/fresh`, `/reset`, something else?).
   - Recommendation: Phase 2 or 3 can add the pi template definition once the command is confirmed. Phase 1 just needs the schema field ready.

2. **Should the field be documented in help text or CLI commands?**
   - What we know: The `/new` command is documented in `commands.ts` help text (line 605).
   - What's unclear: Whether operators should see the per-CLI command name (e.g., "use `/clear` for gemini") or if the generic `/new` alias should continue to work for all CLIs.
   - Recommendation: This is a Phase 2+ operator experience question. Phase 1 just unblocks the schema.

## Environment Availability

**Skipped** — Phase 1 is a schema-only change with no external dependencies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test runner (built-in) |
| Config file | None — tests import from source directly |
| Quick run command | `bun test test/runner-service.integration.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-01 (part 1) | `AgentToolTemplate` has `newSessionCommand` field | unit | `bunx tsc --noEmit` | ✅ (types checked by compiler) |
| SCHEMA-01 (part 2) | `resolveNewSessionCommand()` reads template field, defaults to `"/new"` | unit + integration | `bun test test/runner-service.integration.test.ts` | ✅ (test file exists) |
| SCHEMA-01 (part 3) | Existing codex, claude, gemini behavior unchanged | integration | `bun test test/runner-service.integration.test.ts` | ✅ (covers all three CLIs) |

### Sampling Rate
- **Per task commit:** `bunx tsc --noEmit` (catch type errors immediately)
- **Per wave merge:** `bun run check` (full typecheck + tests)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- **None** — The test framework and fixtures are already in place. `test/runner-service.integration.test.ts` exercises all three CLI templates and can be extended with a specific assertion on `newSessionCommand` field presence and behavior.

*Existing test infrastructure covers all phase requirements. No setup work needed.*

## Security Domain

**Skipped** — This phase has no security implications. The `newSessionCommand` field is configuration-only (read from template at startup), not user-controlled input. It's already scoped to admins who control the config file.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** (grep and file read):
  - `AgentToolTemplate` type definition: `src/config/runtime/agent-tool-presets.ts` lines 7–38
  - `DEFAULT_AGENT_TOOL_TEMPLATES`: `src/config/runtime/agent-tool-presets.ts` lines 44–153
  - `resolveNewSessionCommand()`: `src/agents/runtime/runner-service.ts` lines 968–970
  - `ResolvedRunnerTemplate` usage: `src/agents/runtime/runner-service.ts` line 843 (calls `this.resolveNewSessionCommand()`)
  - Zod schema: `src/config/core/schema.ts` lines 387–483 (runner defaults for each CLI)
  - Test fixtures: `test/runner-service.integration.test.ts` (existing test coverage for all three CLIs)

### Secondary (MEDIUM confidence)
- **Project instructions (CLAUDE.md):**
  - Design defaults: "prefer one shared implementation path over parallel wrappers" — this refactor aligns with DRY principle
  - Hard limits: File size target <500 lines (both affected files are well under this)
  - Code style: semicolons omitted, single quotes, 2-space indentation (already applied in codebase)

### Tertiary (LOW confidence)
- **Roadmap decision log:** Noted "newSessionCommand field identified as required precondition before pi ships" — confirms Phase 1 scope

## Metadata

**Confidence breakdown:**
- **Standard stack (HIGH):** TypeScript and Zod are already the repo's config layer; no new dependencies needed.
- **Architecture (HIGH):** The template system is well-established; adding one optional field follows existing patterns.
- **Pitfalls (HIGH):** Identified specific lines in the codebase where the change must occur; test coverage already in place.

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (30 days — stable domain, no fast-moving dependencies)
