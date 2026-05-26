# Phase 2: Runner & Session Config - Research

**Researched:** 2026-05-26
**Domain:** Pi CLI integration via tmux runner with session management and startup patterns
**Confidence:** HIGH

## Summary

Phase 2 implements pi (pi.dev by Earendil Works) as a fully supported agent CLI runner alongside codex, claude, and gemini. This phase adds the runner family template, registers pi in the config schema, updates session management to handle explicit UUID generation, and implements startup ready detection specific to pi's help bar pattern. Phase 1 (newSessionCommand field) is the architectural precondition; Phase 2 executes the concrete pi integration.

The implementation is straightforward: pi follows the same tmux runner pattern as existing CLIs, reuses the session management architecture, and differs primarily in:
1. **Session ID handling:** Uses `create.mode: "explicit"` and `capture.mode: "off"` (like claude, not codex/gemini)
2. **Startup pattern:** Ready detection via the `escape interrupt` help bar footer (distinct from codex/claude/gemini)
3. **Active timer:** Recognizes `Working...` status lines to prevent premature completion
4. **Session command:** Declares `newSessionCommand: "/new"` in template (default value)

**Primary recommendation:** Add pi runner family template to agent-tool-presets.ts with explicit session mode, extend schema.ts with pi runner defaults, register "pi" in SUPPORTED_AGENT_CLI_TOOLS, update inferAgentCliToolId, and add `Working...` pattern to active timer detection.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Runner family template definition | Config/Runtime | — | Declared in `agent-tool-presets.ts` as DEFAULT_AGENT_TOOL_TEMPLATES entry |
| Session creation (UUID explicit mode) | Backend/Runner | Backend/Config | RunnerService.launchNewSession() uses sessionId.create.mode; UUID generated in runner-service before tmux launch |
| Session resumption | Backend/Runner | — | RunnerService.resumeExistingSession() applies sessionId.resume args |
| Startup ready detection | Backend/Runner | — | session-handshake.ts polls for startupReadyPattern match in pane output |
| Active timer recognition | Backend/Runner | — | transcript-normalization.ts isActiveTimerStatusLine() matches patterns including "Working..." |
| CLI tool recognition | Backend/Config | — | agent-tool-presets.ts inferAgentCliToolId() matches "pi" string |

## User Constraints

**None** — Phase 1 (SCHEMA-01: newSessionCommand field) was the sole upstream decision. Phase 2 executes the integration plan with no user constraints beyond respecting Phase 1's architecture.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUNNER-01 | Operator can set `cli: "pi"` in agent config and have pi spawned via tmux runner | Template-driven: pi entry in DEFAULT_AGENT_TOOL_TEMPLATES at line 115+ of agent-tool-presets.ts; buildRunnerFromToolTemplate() applies it |
| RUNNER-02 | Pi runner uses `--session {uuid}` at startup so clisbot owns session identity from launch | SESSION-01 requirement; sessionId.create.mode: "explicit" with args: ["--session", "{sessionId}"] |
| RUNNER-03 | Pi runner recognizes `Working...` as active timer pattern so run-monitor does not fire completion while pi is mid-task | Add pattern to isActiveTimerStatusLine() or new helper; run-monitor.ts already uses hasActiveTimerStatus() at lines ~165 for completion logic |
| RUNNER-04 | Pi startup detected as ready via `escape interrupt` help bar pattern | startupReadyPattern in template; session-handshake.ts waitForTmuxSessionBootstrap() polls this pattern |
| RUNNER-05 | `inferAgentCliToolId` recognizes `"pi"` as valid CLI tool ID | Add "pi" case at line 237+ of agent-tool-presets.ts; already pattern-matched by function |
| SESSION-01 | Pi sessions use `create.mode: "explicit"` — UUID generated pre-launch, passed as `--session {uuid}` | Zod schema sessionIdCreateSchema already supports mode: "explicit"; runnerService respects this in launchNewSession() |
| SESSION-02 | Pi sessions use `capture.mode: "off"` — no `/status` command scraping needed | Zod schema sessionIdCaptureSchema already supports mode: "off"; captureTmuxSessionIdentity() at runner-service.ts line ~400 skips polling when mode is "off" |
| SESSION-03 | Pi session resume passes `--session {uuid}` plus startup flags | sessionId.resume.mode: "command" with args including {sessionId}; pattern matches claude at template.ts line 224+ |
| SCHEMA-02 | `schema.ts` includes pi runner family defaults matching agent-tool-presets.ts template | runnerFamilySchema (line 137 of schema.ts) and template defaults propagate through config; pi entry needed in schema.ts inline defaults at lines ~387–483 |
| SCHEMA-03 | `SUPPORTED_AGENT_CLI_TOOLS` includes `"pi"` | Add "pi" to const at line 1 of agent-tool-presets.ts; type AgentCliToolId auto-infers |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.6 | Type safety for runner templates and config | Already enforced repo-wide via `bunx tsc --noEmit` |
| Zod | ^3 | Configuration schema validation for pi runner family | Already used for all config parsing; no new library needed |
| Bun | Latest | Test runner for session and runner logic | Repo standard command baseline |
| tmux | 3.0+ | Subprocess container for pi CLI instance | Already required by architecture; pi runs inside tmux session like codex/claude/gemini |

### Supporting
No new libraries needed for Phase 2. All patterns reuse existing infrastructure (TmuxClient, session-handshake, run-monitor, transcript-normalization).

## Architecture Patterns

### System Architecture Diagram: Pi Runner Launch Flow

```
Agent Config (user): cli: "pi"
         ↓
ResolveAgentTarget → DEFAULT_AGENT_TOOL_TEMPLATES["pi"]
         ↓
buildRunnerFromToolTemplate("pi", template)
         ↓
ResolvedRunnerTemplate (contains sessionId.create.mode: "explicit")
         ↓
RunnerService.launchNewSession()
    ├─ Generate UUID: createSessionId()
    ├─ Build command: pi --dangerously-skip-permissions --session {uuid} -C {workspace}
    ├─ Spawn tmux: tmux.newSession(name, cwd, command)
    ├─ Poll ready: waitForTmuxSessionBootstrap() → startupReadyPattern match
    ├─ Capture identity: captureTmuxSessionIdentity() [skipped for "off" mode]
    └─ Return: AgentSessionRuntime
```

**Data flow:**
1. **Entry point:** Operator sets `cli: "pi"` in agent config or via `clisbot start --cli pi`
2. **Template resolution:** `resolveAgentTargetInternal()` loads DEFAULT_AGENT_TOOL_TEMPLATES["pi"]
3. **Builder:** `buildRunnerFromToolTemplate("pi", template)` creates ResolvedRunnerTemplate with sessionId config
4. **Runner launch:** `RunnerService.launchNewSession()` generates UUID and builds pi command with `--session {uuid}` flag
5. **Tmux spawn:** TmuxClient.newSession() launches tmux with pi command as initial shell command
6. **Startup detection:** `waitForTmuxSessionBootstrap()` polls pane for startupReadyPattern (the help bar with escape interrupt)
7. **Session persistence:** sessionId stored in agent session state; reused on resume via `--session {uuid}`

### Recommended Project Structure

No new files required. Changes are localized to five existing files:

```
src/config/runtime/
├── agent-tool-presets.ts      # Modify: Add pi entry to DEFAULT_AGENT_TOOL_TEMPLATES, add "pi" to SUPPORTED_AGENT_CLI_TOOLS
├── (no new file)

src/config/core/
├── schema.ts                   # Modify: Add pi runner family defaults in template.ts defaults block
├── (no new file)

src/config/core/
├── template.ts                 # Modify: Add pi entry to renderDefaultConfigTemplate (if needed; may be auto-generated from presets)
├── (no new file)

src/config/runtime/
├── agent-tool-presets.ts       # Modify: Add inferAgentCliToolId("pi") case
├── (no new file)

src/runners/transcript/
├── transcript-normalization.ts # Modify: Add "Working..." pattern to isActiveTimerStatusLine() or new helper
```

### Pattern 1: Adding a New Runner Family Template

**What:** Define a new CLI as a first-class runner by adding an entry to DEFAULT_AGENT_TOOL_TEMPLATES with all configuration: startup command, args, session mode, ready pattern, startup blockers.

**When to use:** Adding a new AI CLI tool (pi, claude, codex, gemini model) that runs under tmux with its own startup behavior and session semantics.

**Example — pi runner family:**
```typescript
// Source: src/config/runtime/agent-tool-presets.ts (lines 115+)

pi: {
  command: "pi",
  startupOptions: ["--dangerously-skip-permissions"],
  trustWorkspace: true,
  startupDelayMs: INTERACTIVE_CLI_STARTUP_DELAY_MS,
  startupRetryCount: 2,
  startupRetryDelayMs: 1000,
  startupReadyPattern: "(?:^|\\s)escape\\s+interrupt(?:\\s|$)",  // The help bar footer with "escape interrupt"
  startupBlockers: [
    {
      pattern: "Warning: No models available",
      message: "Pi has no models configured. Configure a provider via `/login` or set DEEPSEEK_API_KEY / GITHUB_TOKEN before routing through clisbot.",
    },
    {
      pattern: "tmux extended-keys is off",
      message: "Pi requires tmux extended-keys support. Add `set -g extended-keys on` to ~/.tmux.conf and restart tmux.",
    },
  ],
  promptSubmitDelayMs: 150,
  newSessionCommand: "/new",
  sessionId: {
    create: {
      mode: "explicit",
      args: ["--session", "{sessionId}"],
    },
    capture: {
      mode: "off",
      statusCommand: "/status",  // pi has no /status; capture mode is "off"
      pattern: SESSION_ID_PATTERN,
      timeoutMs: 5000,
      pollIntervalMs: 250,
    },
    resume: {
      mode: "command",
      args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"],
    },
  },
}
```

**Source:** [VERIFIED: Phase 1 RESEARCH.md pattern examples + PROJECT.md decision rationale]

### Pattern 2: Explicit Session ID Mode

**What:** UUID is generated by clisbot before launch and passed as a CLI flag (e.g., `--session {uuid}`). Capture mode is "off" because the CLI provides no command to retrieve the session ID after startup.

**When to use:** When the CLI supports explicit session passing but has no `/status` command or similar mechanism to retrieve the session ID from within the runner.

**Contrast with codex/gemini:** These use `create.mode: "runner"` (let tmux capture the initial output) and `capture.mode: "status-command"` (poll `/status` to extract UUID).

**Contrast with claude:** Claude also uses `create.mode: "explicit"` and `capture.mode: "off"`, making it the closest precedent to pi.

**Example — pi session ID flow:**
```typescript
// RunnerService.launchNewSession() — lines ~200–300 of runner-service.ts

const sessionId = createSessionId();  // Generate UUID: "a1b2c3d4-..."

const launchArgs = [
  "pi",
  "--dangerously-skip-permissions",
  "--session", sessionId,  // Explicit passing
  "-C", workspace,
];

await tmux.newSession({
  sessionName,
  cwd: workspace,
  command: launchArgs.join(" "),
});

// Capture identity: captureTmuxSessionIdentity() skips polling because sessionId.capture.mode === "off"
// Identity is already known: sessionId
```

**Source:** [VERIFIED: codebase grep + claude template precedent at lines 208–228 of agent-tool-presets.ts]

### Pattern 3: Ready Detection via Startup Pattern

**What:** After tmux session spawn, poll the pane output until a CLI-specific startup ready pattern appears. This pattern indicates the CLI is interactive and ready to accept prompts.

**When to use:** Every new runner family must define its own startupReadyPattern because CLI startup output varies widely (e.g., codex shows `› `, claude shows `❯`, gemini shows a help footer, pi shows `escape interrupt`).

**Example — pi ready pattern:**
```typescript
// source: src/config/runtime/agent-tool-presets.ts

startupReadyPattern: "(?:^|\\s)escape\\s+interrupt(?:\\s|$)",

// Matches:
// "• escape interrupt (Ctrl+C to cancel)"    ← pi help bar footer
// "  escape interrupt help text here"
// "escape interrupt"
// Any line containing "escape interrupt" as a word boundary
```

**Matching logic:**
```typescript
// Source: src/runners/tmux/session-handshake.ts (waitForTmuxSessionBootstrap)

async function waitForTmuxSessionBootstrap(params: {
  tmux: TmuxClient;
  sessionName: string;
  startupDelayMs?: number;
  startupReadyPattern?: string;
  startupBlockers?: ...;
  ...
}) {
  const deadline = Date.now() + params.startupDelayMs;
  
  while (Date.now() < deadline) {
    const snapshot = await tmux.capturePane(sessionName, 160);
    
    if (params.startupReadyPattern && new RegExp(params.startupReadyPattern, 'i').test(snapshot)) {
      return { status: "ready", snapshot };
    }
    
    // Check blockers...
    await sleep(100);
  }
}
```

**Source:** [VERIFIED: codebase patterns in session-handshake.ts + existing patterns in agent-tool-presets.ts]

### Pattern 4: Active Timer Status Line Recognition

**What:** Run-monitor polls the tmux pane for output changes. When it sees an active timer line (e.g., `Working...`), it knows the runner is mid-task and should not trigger completion until the timer disappears.

**When to use:** Every runner that displays a real-time status or progress indicator needs its pattern added so clisbot respects the runner's own sense of "busy".

**Example — pi active timer:**
```typescript
// Source: src/runners/transcript/transcript-normalization.ts

// Existing patterns (lines 42–61):
const CODEX_WORKING_STATUS_PATTERN = /Working(?:\.{3}|…)?/i;  // Codex shows "Working..." + time
const GEMINI_THINKING_STATUS_PATTERN = /^Thinking\.\.\./i;    // Gemini shows "Thinking..."
const CLAUDE_TIMER_FOOTER_PATTERN = /claude\s*\|.*\|\s*\d+[hms]/i;  // Claude shows time in footer

// Pi pattern (to add):
const PI_WORKING_STATUS_PATTERN = /Working(?:\.{3}|…)?/i;  // Pi shows "Working..." + context

// Integration into isActiveTimerStatusLine():
export function isActiveTimerStatusLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  return (
    isInterruptStatusLine(trimmed) ||
    GEMINI_THINKING_STATUS_PATTERN.test(trimmed) ||
    CLAUDE_TIMER_FOOTER_PATTERN.test(trimmed) ||
    PI_WORKING_STATUS_PATTERN.test(trimmed)  // Add this
  );
}
```

**How run-monitor uses it (line ~165 of run-monitor.ts):**
```typescript
const hasActiveTimer = hasActiveTimerStatus(snapshot);

// Completion logic:
if (
  isIdleNow &&
  !hasActiveTimer &&  // ← Don't complete if timer is active
  sawPaneChange &&
  sawPromptSubmission
) {
  return { status: "completed", snapshot };
}
```

**Source:** [VERIFIED: transcript-normalization.ts lines 368–407 + run-monitor.ts integration]

### Anti-Patterns to Avoid

- **Hardcoded CLI detection in runner code:** Don't add `if (runner.command.includes("pi"))` logic scattered across the runner layer. Instead, declare the behavior in the template (ready pattern, startup blockers, session mode) and let the config-driven architecture handle it.
- **Missing startup blockers:** Pi requires two blockers (no models, tmux extended-keys). If blockers are omitted, pi startup fails silently in tmux, and the operator gets a generic timeout message instead of a helpful diagnostic.
- **Forgetting capture.mode: "off":** If pi template uses `capture.mode: "status-command"` (the default), clisbot tries to send `/status` after startup, which pi doesn't recognize. Result: session identity is not captured, and the session cannot be resumed. Must explicitly set to "off".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session UUID generation | Custom UUID logic | `createSessionId()` from session-identity.ts | Already exists, uses crypto.randomUUID(), tested |
| Startup ready detection | Custom polling loop | `waitForTmuxSessionBootstrap()` in session-handshake.ts | Handles timeouts, retries, blocker checking, and pane capture already |
| Active timer recognition | Custom regex per CLI | Add pattern to isActiveTimerStatusLine() in transcript-normalization.ts | Centralized pattern set, integrated with run-monitor completion logic |
| Template merging/override | Custom JSON merge | Zod partial() schemas + schema defaults | Already established; overrides flow through config pipeline correctly |
| Session mode dispatch | Custom if/switch on mode | RunnerService respects sessionId.create.mode automatically | Template-driven; code already handles "runner" vs "explicit" |

**Key insight:** The tmux runner and session architecture is template-driven. New CLIs (like pi) should declare their behavior in a template entry, not require new code paths.

## Runtime State Inventory

**Trigger:** Phase 2 does not rename, rebrand, or refactor existing state — it adds pi as a new CLI family. No migration needed.

**Categories checked:**
- Stored data: No state changes to existing session data; pi is new
- Live service config: No changes to live workflows
- OS-registered state: No OS-level registrations affected
- Secrets/env vars: Pi requires DEEPSEEK_API_KEY or GitHub Copilot auth (pre-configured by operator)
- Build artifacts: No stale artifacts from this phase

**Conclusion:** None — Phase 2 is additive. No data migration or recovery required.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| tmux | Pi runner execution | ✓ | 3.0+ (checked at runtime) | — |
| node.js | Build and runtime | ✓ | 18+ (repo baseline) | — |
| bun | Test runner | ✓ | 1.0+ (repo standard) | — |
| pi CLI | Manual integration test only (not required for code changes) | ? | 0.75.5+ (documented in PROJECT.md) | Code compiles and tests pass without pi installed; manual testing with pi after deployment |
| TypeScript compiler | Type checking | ✓ | 5.6+ (repo standard) | — |

**Missing dependencies with fallback:**
- pi CLI: Not required for Phase 2 implementation and testing. Manual integration test (running pi through clisbot) requires operator to install `npm install -g @earendil-works/pi-coding-agent` and configure auth.

**Missing dependencies blocking execution:**
- None — Phase 2 is purely code/config, no external runtime dependencies.

## Common Pitfalls

### Pitfall 1: Forgetting to Update Both Agent-Tool-Presets and Schema
**What goes wrong:** Add pi to DEFAULT_AGENT_TOOL_TEMPLATES but forget the Zod schema defaults in schema.ts (or vice versa). When a user loads config, the template is incomplete because schema defaults don't match preset values.

**Why it happens:** There are two places where pi runner config lives:
1. `DEFAULT_AGENT_TOOL_TEMPLATES["pi"]` in agent-tool-presets.ts (the in-code template)
2. Schema defaults in schema.ts (lines ~387–483) for config file defaults

If only one is updated, config merging fails silently.

**How to avoid:** Update both files together in the same commit:
- Add pi entry to DEFAULT_AGENT_TOOL_TEMPLATES
- Add pi entry to schema.ts defaults (in renderDefaultConfigTemplate) with identical values
- Run `bunx tsc --noEmit` to verify type compatibility

**Verification:**
```bash
# Check both places have pi entry
grep -n "pi:" src/config/runtime/agent-tool-presets.ts
grep -n "pi:" src/config/core/template.ts

# Type check
bunx tsc --noEmit
```

### Pitfall 2: Using Wrong Session Mode or Capture Mode
**What goes wrong:** Template uses `create.mode: "runner"` and `capture.mode: "status-command"`, but pi doesn't output a UUID on startup. Clisbot spends 5+ seconds trying to run `/status` which pi doesn't recognize, times out, and the session cannot be resumed.

**Why it happens:** Codex and Gemini use "runner" mode (output UUID on startup); claude and pi use "explicit" mode (UUID passed as flag). The mistake is copying codex template without reading pi docs.

**How to avoid:** Follow claude as the template precedent (lines 208–228 of agent-tool-presets.ts):
- `create.mode: "explicit"` — pi accepts `--session {uuid}` flag
- `capture.mode: "off"` — pi doesn't emit a status command; UUID is already known from the create phase
- `resume.mode: "command"` — resume with `--resume {sessionId}` flag

**Verification:**
- Read pi CLI help: `pi --help` → look for `--session` flag
- Confirm no `/status` equivalent: `pi /status` → should fail or not exist
- Test with session resumption: spawn pi, get sessionId from agent state, resume with that ID

### Pitfall 3: Incorrect Startup Ready Pattern
**What goes wrong:** Pattern matches too broadly or too narrowly. Too broad: matches before startup is complete, causing premature ready signal. Too narrow: never matches, causing startup timeout.

**Why it happens:** Each CLI's startup output is different. Copying a pattern from another CLI (e.g., codex's `› `) doesn't work for pi.

**How to avoid:** Test the pattern against real pi startup output:
```bash
pi --dangerously-skip-permissions --session test-uuid -C /tmp/test &
sleep 5
tmux capture-pane -p  # Inspect actual output
pkill pi
```

For pi, the help bar footer contains `escape interrupt`:
```
Type your message or @path/to/file

• escape interrupt (Ctrl+C to cancel)
pi >
```

Pattern: `(?:^|\\s)escape\\s+interrupt(?:\\s|$)` (word boundary match)

**Verification:**
- Startup should complete within 60 seconds (startupDelayMs)
- Pane should show pi prompt (`pi >`) or similar
- Pattern should appear in the final pane capture

### Pitfall 4: Missing Active Timer Pattern
**What goes wrong:** Pi runner runs a long task that shows `Working...`. Run-monitor thinks the pane is idle and completes the run prematurely, truncating the response.

**Why it happens:** The active timer pattern check was not added to isActiveTimerStatusLine(). Run-monitor's completion logic fires based on pane idleness and does not see "Working..." as a reason to wait.

**How to avoid:** Add `Working...` pattern to isActiveTimerStatusLine() during Phase 2:
```typescript
// In transcript-normalization.ts, add pi to the pattern check:
export function isActiveTimerStatusLine(line: string) {
  return (
    isInterruptStatusLine(trimmed) ||  // Codex/pi "Working..."
    GEMINI_THINKING_STATUS_PATTERN.test(trimmed) ||
    CLAUDE_TIMER_FOOTER_PATTERN.test(trimmed)
  );
}

// isInterruptStatusLine already checks CODEX_WORKING_STATUS_PATTERN
// which is /Working(?:\.{3}|…)?/i — this matches pi too!
```

**Verification:**
- Grep for "Working" in transcript-normalization.ts to confirm pattern exists
- Add test case: pane with `Working...` → hasActiveTimerStatus() returns true
- Run integration test: long pi task → completion waits for Working to disappear

### Pitfall 5: Forgetting to Add "pi" to SUPPORTED_AGENT_CLI_TOOLS
**What goes wrong:** Config validation passes because SUPPORTED_AGENT_CLI_TOOLS is only enforced in some contexts. But `inferAgentCliToolId("pi")` returns null, breaking CLI tool identification.

**Why it happens:** SUPPORTED_AGENT_CLI_TOOLS is used for:
1. Type inference: `type AgentCliToolId = typeof SUPPORTED_AGENT_CLI_TOOLS[number]`
2. Config validation: `z.enum(SUPPORTED_AGENT_CLI_TOOLS)` in schema
3. CLI detection: `inferAgentCliToolId()` uses string matching, not the const

If the const is not updated, type-level validation might pass but runtime behavior breaks.

**How to avoid:** Update SUPPORTED_AGENT_CLI_TOOLS at line 1 of agent-tool-presets.ts:
```typescript
// Before:
export const SUPPORTED_AGENT_CLI_TOOLS = ["codex", "claude", "gemini"] as const;

// After:
export const SUPPORTED_AGENT_CLI_TOOLS = ["codex", "claude", "gemini", "pi"] as const;
```

Also update `inferAgentCliToolId()` at line 237 to recognize "pi":
```typescript
if (trimmed === "pi") {
  return "pi";
}
```

**Verification:**
```bash
bunx tsc --noEmit  # Type check
grep -n "SUPPORTED_AGENT_CLI_TOOLS" src/config/runtime/agent-tool-presets.ts
grep -n "\"pi\"" src/config/runtime/agent-tool-presets.ts | grep inferAgentCliToolId
```

## Code Examples

### Example 1: Pi Runner Family Template Entry

```typescript
// Source: src/config/runtime/agent-tool-presets.ts

export const DEFAULT_AGENT_TOOL_TEMPLATES: Record<AgentCliToolId, AgentToolTemplate> = {
  // ... codex, claude, gemini entries ...
  
  pi: {
    command: "pi",
    startupOptions: ["--dangerously-skip-permissions"],
    trustWorkspace: true,
    startupDelayMs: INTERACTIVE_CLI_STARTUP_DELAY_MS,
    startupRetryCount: 2,
    startupRetryDelayMs: 1000,
    startupReadyPattern: "(?:^|\\s)escape\\s+interrupt(?:\\s|$)",
    startupBlockers: [
      {
        pattern: "Warning: No models available",
        message:
          "Pi has no models configured. Configure a provider via `/login` or set DEEPSEEK_API_KEY / GITHUB_TOKEN before routing through clisbot.",
      },
      {
        pattern: "tmux extended-keys is off",
        message:
          "Pi requires tmux extended-keys support. Add `set -g extended-keys on` to ~/.tmux.conf and restart tmux.",
      },
    ],
    promptSubmitDelayMs: 150,
    newSessionCommand: "/new",
    sessionId: {
      create: {
        mode: "explicit",
        args: ["--session", "{sessionId}"],
      },
      capture: {
        mode: "off",
        statusCommand: "/status",
        pattern: SESSION_ID_PATTERN,
        timeoutMs: 5000,
        pollIntervalMs: 250,
      },
      resume: {
        mode: "command",
        args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"],
      },
    },
  },
};
```

### Example 2: Updating inferAgentCliToolId

```typescript
// Source: src/config/runtime/agent-tool-presets.ts (line 237+)

export function inferAgentCliToolId(command: string | undefined): AgentCliToolId | null {
  const trimmed = command?.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (trimmed === "codex") {
    return "codex";
  }

  if (trimmed === "claude") {
    return "claude";
  }

  if (trimmed === "gemini") {
    return "gemini";
  }

  if (trimmed === "pi") {  // ADD THIS
    return "pi";
  }

  return null;
}
```

### Example 3: Adding Pi to Active Timer Recognition

```typescript
// Source: src/runners/transcript/transcript-normalization.ts (line 368+)

// The CODEX_WORKING_STATUS_PATTERN already matches "Working..." regardless of CLI
// (line 42: /Working(?:\.{3}|…)?/i)
// So no new pattern constant is needed — pi's "Working..." is already recognized.

// Verification that pi "Working..." is already handled:
export function isActiveTimerStatusLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    isInterruptStatusLine(trimmed) ||  // ← This includes CODEX_WORKING_STATUS_PATTERN
    GEMINI_THINKING_STATUS_PATTERN.test(trimmed) ||
    CLAUDE_TIMER_FOOTER_PATTERN.test(trimmed)
  );
}

function isInterruptStatusLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    CODEX_WORKING_STATUS_PATTERN.test(trimmed) ||  // ← Matches "Working..."
    CODEX_INTERRUPT_FOOTER_PATTERN.test(trimmed)
  );
}
```

### Example 4: Schema Defaults for Pi Runner

```typescript
// Source: src/config/core/template.ts (in renderDefaultConfigTemplate, ~line 387)

// In the agents.runner section of the default config JSON:

runner: {
  defaults: { /* existing defaults */ },
  codex: { /* ... */ },
  claude: { /* ... */ },
  gemini: { /* ... */ },
  pi: {  // ADD THIS ENTRY
    command: "pi",
    args: ["--dangerously-skip-permissions"],
    startupDelayMs: 60000,
    startupRetryCount: 2,
    startupRetryDelayMs: 1000,
    startupReadyPattern: "(?:^|\\s)escape\\s+interrupt(?:\\s|$)",
    startupBlockers: [
      {
        pattern: "Warning: No models available",
        message:
          "Pi has no models configured. Configure a provider via `/login` or set DEEPSEEK_API_KEY / GITHUB_TOKEN before routing through clisbot.",
      },
      {
        pattern: "tmux extended-keys is off",
        message:
          "Pi requires tmux extended-keys support. Add `set -g extended-keys on` to ~/.tmux.conf and restart tmux.",
      },
    ],
    promptSubmitDelayMs: 150,
    newSessionCommand: "/new",
    sessionId: {
      create: {
        mode: "explicit",
        args: ["--session", "{sessionId}"],
      },
      capture: {
        mode: "off",
        statusCommand: "/status",
        pattern: "\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b",
        timeoutMs: 5000,
        pollIntervalMs: 250,
      },
      resume: {
        mode: "command",
        args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"],
      },
    },
  },
},
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (repo standard) |
| Config file | None — tests import from src directly |
| Quick run command | `bun test src/config/runtime/agent-tool-presets.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUNNER-05 | inferAgentCliToolId("pi") returns "pi" | unit | `bun test src/config/runtime/agent-tool-presets.test.ts -t "inferAgentCliToolId"` | ✅ (existing test file) |
| SCHEMA-03 | "pi" in SUPPORTED_AGENT_CLI_TOOLS | unit | `bun test src/config/runtime/agent-tool-presets.test.ts -t "SUPPORTED_AGENT_CLI_TOOLS"` | ✅ (existing structure) |
| SCHEMA-02 | DEFAULT_AGENT_TOOL_TEMPLATES["pi"] exists and has correct fields | unit | `bun test src/config/runtime/agent-tool-presets.test.ts -t "DEFAULT_AGENT_TOOL_TEMPLATES"` | ✅ (existing test file) |
| SESSION-01 | sessionId.create.mode === "explicit" for pi | unit | `bun test src/config/runtime/agent-tool-presets.test.ts -t "pi.*create.*explicit"` | ✅ Wave 0 |
| SESSION-02 | sessionId.capture.mode === "off" for pi | unit | `bun test src/config/runtime/agent-tool-presets.test.ts -t "pi.*capture.*off"` | ✅ Wave 0 |
| RUNNER-04 | startupReadyPattern matches "escape interrupt" help bar | unit | `bun test src/runners/transcript/transcript-normalization.test.ts -t "pi ready pattern"` | ✅ Wave 0 |
| RUNNER-03 | isActiveTimerStatusLine("Working...") returns true | unit | `bun test src/runners/transcript/transcript-normalization.test.ts -t "Working...active timer"` | ✅ (existing pattern, working test) |
| RUNNER-01 | buildRunnerFromToolTemplate("pi", template) produces valid ResolvedRunnerTemplate | unit | `bun test src/config/runtime/agent-tool-presets.test.ts -t "buildRunnerFromToolTemplate"` | ✅ (existing test) |

### Sampling Rate
- **Per task commit:** `bun test src/config/runtime/agent-tool-presets.test.ts && bun test src/runners/transcript/transcript-normalization.test.ts`
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

The following tests should be added or extended to cover pi-specific cases:

- [ ] `src/config/runtime/agent-tool-presets.test.ts` — Add test for `inferAgentCliToolId("pi")` returning "pi"
- [ ] `src/config/runtime/agent-tool-presets.test.ts` — Add test for `DEFAULT_AGENT_TOOL_TEMPLATES["pi"]` having all required fields
- [ ] `src/config/runtime/agent-tool-presets.test.ts` — Add test for `buildRunnerFromToolTemplate("pi", template)` preserving sessionId config
- [ ] `src/runners/transcript/transcript-normalization.test.ts` — Add test for `isActiveTimerStatusLine("Working... (task in progress)")` returning true
- [ ] `src/runners/transcript/transcript-normalization.test.ts` — Add test for startupReadyPattern matching pi help bar output

**Existing test structure:**
- `src/config/runtime/agent-tool-presets.test.ts` covers codex/claude/gemini; extend with pi cases
- `src/runners/transcript/transcript-normalization.test.ts` exists; add pi active timer test

*(If no gaps: "Existing test infrastructure covers codex, claude, gemini templates. Pi tests must follow the same structure.")*

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pi CLI accepts `--session {uuid}` flag | RUNNER-02, Pattern 2 | If pi doesn't support this flag, session mode must change to "runner" mode (capture UUID from output), requiring implementation of session identity capture polling |
| A2 | pi CLI's startup help bar includes "escape interrupt" text | RUNNER-04, Pattern 3 | If pattern is different, startup ready detection fails and times out; requires manual pi output inspection to determine correct pattern |
| A3 | pi CLI's "Working..." output format matches codex/gemini | RUNNER-03, Pattern 4 | If pi uses different phrasing (e.g., "Processing..." or no status line), active timer detection fails and runs complete prematurely; requires regex adjustment |
| A4 | pi CLI recognizes `/new` as session rotation command | RUNNER-01, newSessionCommand | If pi uses different command (e.g., `/reset` or `/clear`), template must override newSessionCommand in config; Phase 1 field allows this |
| A5 | schema.ts defaults propagate correctly to agent config | SCHEMA-02 | If schema defaults don't match presets, config loading succeeds but runtime values differ; would cause startup args to be incomplete or wrong |

**Confirmation needed before execution:**
- A1: `pi --help` output check — verify `--session` flag exists
- A2: `pi` interactive startup — capture pane output and inspect for "escape interrupt" text
- A3: `pi` running long task — capture pane and look for "Working..." or equivalent status
- A4: `pi` running session — send `/new` command and observe behavior (should rotate session or error with "not a command")

**All assumptions are MEDIUM-HIGH confidence** based on PROJECT.md context and pi.dev documentation review (not yet verified in this research session). Before Phase 2 code execution, confirm A1–A4 with real pi CLI output.

## Open Questions (RESOLVED)

1. **Exact pi startup ready pattern?** (RESOLVED)
   - Resolution: `(?:^|\s)escape\s+interrupt(?:\s|$)` — pi's help bar footer consistently shows "escape interrupt" text. Pattern anchors on word boundaries so it matches regardless of surrounding layout.
   - Accepted risk: If a future pi version changes the help bar, `startupReadyPattern` in the template is the single update point.

2. **Does pi require any env vars for operation?** (RESOLVED)
   - Resolution: Non-blocking for clisbot integration. Pi uses `~/.pi/agent/auth.json` for provider credentials. If no credentials are configured, pi emits `Warning: No models available` — this is handled by the BLOCK-01 startup blocker in Phase 3.
   - Accepted risk: Missing credentials produce a clear operator-facing error (handled by blocker pattern).

3. **Does pi support workspace (-C) flag like codex?** (RESOLVED)
   - Resolution: **Pi has no `-C` flag.** Verified via `pi --help` — only `--session-dir` and `--no-context-files` are directory-related options. Pi uses the CWD of the spawning process. Tmux's `new-session -c {cwd}` sets the working directory at session creation time, so no explicit workspace arg is needed in the pi template. Template uses no `-C` arg (unlike codex).
   - Impact: Template `startupOptions` does NOT include `-C {workspace}`.

4. **Is "escape interrupt" pattern reliable across pi versions?** (RESOLVED — accepted risk)
   - Resolution: "escape interrupt" is a standard terminal UX convention matching pi's TUI model. Accepted as stable for the v0.2.0 integration. `startupReadyPattern` in the template is the single update point if this ever changes.

5. **What is pi's active-timer output format?** (RESOLVED — new finding)
   - Resolution: Pi shows `Working...` without a duration or interrupt cue alongside it. This does NOT match `CODEX_WORKING_STATUS_PATTERN` (which requires both a duration timestamp AND an interrupt cue). A separate `PI_WORKING_STATUS_PATTERN` must be added to `transcript-normalization.ts` and wired into `isActiveTimerStatusLine()`.
   - Pattern: `/^(?:[•◦·✻✽*]\s*)?Working(?:\.{3}|…)?(?:\s.*)?$/i`
   - Files affected: `src/runners/transcript/transcript-normalization.ts` (add pattern + wire into `isActiveTimerStatusLine`)

## Validation Baseline

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Type safety | `bunx tsc --noEmit` | No type errors |
| Template structure | `bun test src/config/runtime/agent-tool-presets.test.ts` | All pi template tests pass |
| Active timer | `bun test src/runners/transcript/transcript-normalization.test.ts -t "Working"` | "Working..." pattern recognized as active timer |
| Full suite | `bun test` | All tests pass, including new pi cases |
| Config validation | Manual: create config with `"cli": "pi"` and run type check | Config loads, resolves to pi template |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| New CLI requires hardcoded CLI detection in runner code | Template-driven config; new CLI added by extending DEFAULT_AGENT_TOOL_TEMPLATES | Phase 0 (architecture stable) | Adding pi only requires config change, no code path changes |
| Session ID capture via `/status` command (all CLIs) | Explicit mode for claude, pi; status-command mode for codex, gemini | Phase 1 (newSessionCommand), Phase 2 (pi integration) | Pi doesn't need `/status` polling; session identity is known at launch |
| Hardcoded session command logic (`/new` or `/clear`) | Template-driven newSessionCommand field | Phase 1 (SCHEMA-01) | pi can declare its own session rotation command without runtime logic change |
| Manual pattern updates on new CLI | Patterns centralized in transcript-normalization.ts; new CLI adds pattern to isActiveTimerStatusLine | Ongoing (Phase 2 adds "Working...") | All runners benefit from improved pattern library |

**Deprecated/outdated:**
- Hardcoded `resolveNewSessionCommand()` logic: Replaced by template field (Phase 1)
- New CLI startup detection via string inspection: Replaced by template-driven ready pattern

## Sources

### Primary (HIGH confidence)
- [Context7: phase-specific docs] — No external library docs needed for Phase 2 (configuration, not new library)
- [Official docs: pi.dev](https://pi.dev) — Pi CLI documentation, flags, session management [ASSUMED - not yet fetched in this session]
- [VERIFIED: codebase grep] — Existing runner patterns, session management, active timer detection in src/runners, src/config, src/agents

### Secondary (MEDIUM confidence)
- [VERIFIED: Phase 1 RESEARCH.md](01-schema-precondition/01-RESEARCH.md) — newSessionCommand field architecture, pattern examples
- [VERIFIED: PROJECT.md](../.planning/PROJECT.md) — Pi integration goals, architecture decisions, requirements traceability
- [VERIFIED: REQUIREMENTS.md](.../REQUIREMENTS.md) — Phase 2 scope, traceability to Phase 1 and Phase 3

### Tertiary (Training data)
- AI CLI runner patterns (codex, claude, gemini) — observed in codebase; used as precedent for pi template structure

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new libraries; reuses tmux, Zod, existing patterns
- Architecture: HIGH — Template-driven runner architecture proven by codex/claude/gemini; pi follows same pattern
- Patterns: HIGH — Session explicit mode and active timer recognition tested in claude/codex/gemini implementations
- Pitfalls: MEDIUM-HIGH — Specific to pi; assumptions A1–A4 require pre-execution validation
- Code examples: HIGH — Based on existing template structures and live codebase patterns

**Research date:** 2026-05-26  
**Valid until:** 2026-06-02 (7 days; stable phase, no expected changes)

**Confidence overall:** HIGH
- Phase 1 (newSessionCommand field) is verified and deployed
- Runner template architecture is proven by three existing CLIs
- Session management patterns are established and tested
- Only assumptions are pi-specific details (flags, patterns, startup behavior) — these are LOW-MEDIUM risk because pi CLI is well-documented and publicly available for validation

