# Phase 2: Runner & Session Config - Pattern Map

**Mapped:** 2026-05-26  
**Files analyzed:** 5 (all modifications to existing files)  
**Analogs found:** 5 / 5 (100% coverage)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/config/runtime/agent-tool-presets.ts` | config | config-driven-template | Self (claude entry) | exact |
| `src/config/core/schema.ts` | config | config-driven-schema | Self (claude schema defaults) | exact |
| `src/config/core/template.ts` | config | config-driven-template | Self (claude template entry) | exact |
| `src/runners/transcript/transcript-normalization.ts` | utility | pattern-matching | Self (CODEX_WORKING_STATUS_PATTERN) | exact |
| `src/runners/tmux/session-handshake.ts` | service | request-response | Self (waitForTmuxSessionBootstrap) | exact |

## Pattern Assignments

### `src/config/runtime/agent-tool-presets.ts` (config, config-driven-template)

**Closest Analog:** Lines 84-114 (claude entry in DEFAULT_AGENT_TOOL_TEMPLATES)

**Type Definition** (lines 7-39):
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
  newSessionCommand?: string;
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

**Constants** (lines 41-43):
```typescript
const SESSION_ID_PATTERN =
  "\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b";
export const INTERACTIVE_CLI_STARTUP_DELAY_MS = 60_000;
```

**Claude Template Pattern** (lines 84-114):
```typescript
claude: {
  command: "claude",
  startupOptions: ["--dangerously-skip-permissions"],
  trustWorkspace: true,
  startupDelayMs: INTERACTIVE_CLI_STARTUP_DELAY_MS,
  startupRetryCount: 2,
  startupRetryDelayMs: 1000,
  promptSubmitDelayMs: 150,
  newSessionCommand: '/new',
  sessionId: {
    create: {
      mode: "explicit",
      args: ["--session-id", "{sessionId}"],
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
      args: [
        "--resume",
        "{sessionId}",
        "--dangerously-skip-permissions",
      ],
    },
  },
},
```

**Action:** Add pi entry to DEFAULT_AGENT_TOOL_TEMPLATES using claude as template (explicit session mode, no capture pattern needed).

**SUPPORTED_AGENT_CLI_TOOLS Update** (lines 1-2):
```typescript
export const SUPPORTED_AGENT_CLI_TOOLS = ["codex", "claude", "gemini"] as const;
export type AgentCliToolId = (typeof SUPPORTED_AGENT_CLI_TOOLS)[number];
```

**Action:** Add "pi" to const array; type will auto-infer.

**inferAgentCliToolId Function** (lines 237-256):
```typescript
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

  return null;
}
```

**Action:** Add case for "pi" → "pi" before final return null.

**buildRunnerFromToolTemplate Function** (lines 173-235):
```typescript
export function buildRunnerFromToolTemplate(
  toolId: AgentCliToolId,
  template: AgentToolTemplate,
  startupOptions: string[] | undefined,
): ResolvedRunnerTemplate {
  const options = startupOptions?.length ? startupOptions : template.startupOptions;

  if (toolId === "codex") {
    // Special case: codex uses -C {workspace} in args and resume
    return { /* ... */ };
  }

  // Default case (used by claude, gemini, pi): no special -C handling
  return {
    command: template.command,
    args: [...options],
    // ... rest of fields copied from template ...
    resume: {
      ...template.sessionId.resume,
      args: ["--resume", "{sessionId}", ...options],
    },
  };
}
```

**Action:** Pi uses default return path (same as claude/gemini). No special handling needed.

---

### `src/config/core/schema.ts` (config, config-driven-schema)

**Closest Analog:** Lines 426-448 (claude schema defaults)

**Session Mode Schemas** (lines 23-58):
```typescript
const runnerSessionIdCreateSchema = z.object({
  mode: z.enum(["runner", "explicit"]).default("runner"),
  args: z.array(z.string()).default([]),
});

const runnerSessionIdCaptureSchema = z.object({
  mode: z.enum(["off", "status-command"]).default("off"),
  statusCommand: z.string().min(1).default("/status"),
  pattern: z.string().min(1).default(defaultSessionIdPattern),
  timeoutMs: z.number().int().positive().default(5000),
  pollIntervalMs: z.number().int().positive().default(250),
});

const runnerSessionIdResumeSchema = z.object({
  mode: z.enum(["off", "command"]).default("off"),
  command: z.string().min(1).optional(),
  args: z.array(z.string()).default([]),
});

const runnerSessionIdSchema = z.object({
  create: runnerSessionIdCreateSchema.default({
    mode: "runner",
    args: [],
  }),
  capture: runnerSessionIdCaptureSchema.default({
    mode: "status-command",
    statusCommand: "/status",
    pattern: defaultSessionIdPattern,
    timeoutMs: 5000,
    pollIntervalMs: 250,
  }),
  resume: runnerSessionIdResumeSchema.default({
    mode: "command",
    args: [],
  }),
});
```

**Runner Family Schema** (lines 137, 139-157):
```typescript
const runnerFamilySchema = runnerLaunchSchema;

const runnerFamilyOverrideSchema = z.object({
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  startupDelayMs: z.number().int().positive().optional(),
  // ... other optional fields ...
  sessionId: z.object({
    create: runnerSessionIdCreateSchema.partial().optional(),
    capture: runnerSessionIdCaptureSchema.partial().optional(),
    resume: runnerSessionIdResumeSchema.partial().optional(),
  }).optional(),
});
```

**Agents Defaults with Runner Family Configs** (lines 359-491):
```typescript
const agentsDefaultsSchema = z.object({
  defaultAgentId: z.string().min(1).default("default"),
  workspace: z.string().default("~/.clisbot/workspaces/{agentId}"),
  cli: z.enum(SUPPORTED_AGENT_CLI_TOOLS).default("codex"),
  bootstrap: agentBootstrapSchema.default({
    botType: "personal-assistant",
  }),
  runner: z.object({
    defaults: runnerDefaultsSchema.default({ /* ... */ }),
    codex: runnerFamilySchema.default({ /* codex config */ }),
    claude: runnerFamilySchema.default({
      command: "claude",
      args: ["--dangerously-skip-permissions"],
      startupDelayMs: INTERACTIVE_CLI_STARTUP_DELAY_MS,
      newSessionCommand: "/new",
      sessionId: {
        create: {
          mode: "explicit",
          args: ["--session-id", "{sessionId}"],
        },
        capture: {
          mode: "off",
          statusCommand: "/status",
          pattern: defaultSessionIdPattern,
          timeoutMs: 5000,
          pollIntervalMs: 250,
        },
        resume: {
          mode: "command",
          args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"],
        },
      },
    }),
    gemini: runnerFamilySchema.default({ /* ... */ }),
  }),
  auth: agentAuthSchema.default(defaultAgentAuthConfig),
});
```

**Action:** Add pi entry after gemini using claude as template (explicit create mode, off capture mode, command resume mode).

---

### `src/config/core/template.ts` (config, config-driven-template)

**Closest Analog:** Lines 208-229 (claude template entry in renderDefaultConfigTemplate)

**Template Structure** (lines 208-229):
```typescript
claude: {
  command: "claude",
  args: ["--dangerously-skip-permissions"],
  sessionId: {
    create: {
      mode: "explicit",
      args: ["--session-id", "{sessionId}"],
    },
    capture: {
      mode: "off",
      statusCommand: "/status",
      pattern:
        "\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b",
      timeoutMs: 5000,
      pollIntervalMs: 250,
    },
    resume: {
      mode: "command",
      args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"],
    },
  },
},
```

**Action:** Add pi entry to agents.runner section (after gemini, before closing brace) with matching structure to claude but pi-specific command and flags.

---

### `src/runners/transcript/transcript-normalization.ts` (utility, pattern-matching)

**Closest Analog:** Lines 42-61 (existing working status patterns)

**Pattern Definitions** (lines 40-61):
```typescript
const DURATION_STATUS_PATTERN = String.raw`(?:\d+(?:h|m|s))(?:\s+\d+(?:h|m|s)){0,2}`;
const CODEX_WORKING_STATUS_PATTERN = new RegExp(
  String.raw`^(?=.*\b${DURATION_STATUS_PATTERN}\b)(?=.*(?:esc\s+to\s+(?:interrupt|cancel)|interrupt|cancel|ctrl\+c))(?:[•◦·✻✽*]\s*)?Working(?:\.{3}|…)?\s*.*\)?$`,
  "i",
);
const CODEX_INTERRUPT_FOOTER_PATTERN = new RegExp(
  String.raw`^(?:[•◦·]\s*)?${DURATION_STATUS_PATTERN}\s*[•◦·]?\s*esc to interrupt\)?$`,
  "i",
);
const GEMINI_THINKING_STATUS_PATTERN = new RegExp(
  String.raw`^Thinking\.\.\. \(esc to cancel,\s*${DURATION_STATUS_PATTERN}\)$`,
  "i",
);
const CLAUDE_WORKED_STATUS_PATTERN = new RegExp(
  String.raw`^(?:[✻✽*]\s*)?(?:Worked|Cooked) for ${DURATION_STATUS_PATTERN}$`,
  "i",
);
const CLAUDE_TIMER_FOOTER_PATTERN = new RegExp(
  String.raw`\|\s*claude\s*\|.*\|\s*${DURATION_STATUS_PATTERN}\s*$`,
  "i",
);
```

**Active Timer Recognition Function** (lines 368-379):
```typescript
export function isActiveTimerStatusLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    isInterruptStatusLine(trimmed) ||
    GEMINI_THINKING_STATUS_PATTERN.test(trimmed) ||
    CLAUDE_TIMER_FOOTER_PATTERN.test(trimmed)
  );
}
```

**Helper: isInterruptStatusLine** (lines 356-366):
```typescript
function isInterruptStatusLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    CODEX_WORKING_STATUS_PATTERN.test(trimmed) ||
    CODEX_INTERRUPT_FOOTER_PATTERN.test(trimmed)
  );
}
```

**Action:** Pi's "Working..." pattern is already matched by `isInterruptStatusLine()` → `CODEX_WORKING_STATUS_PATTERN` (line 42-45). No code change needed; the pattern is already generic enough to match pi's output. Verify via test.

---

### `src/runners/tmux/session-handshake.ts` (service, request-response)

**Closest Analog:** Lines 350-426 (waitForTmuxSessionBootstrap function)

**Bootstrap Function** (lines 350-426):
```typescript
export async function waitForTmuxSessionBootstrap(params: {
  tmux: TmuxClient;
  sessionName: string;
  captureLines: number;
  startupDelayMs: number;
  trustWorkspace?: boolean;
  readyPattern?: string;
  blockers?: Array<{
    pattern: string;
    message: string;
  }>;
}): Promise<TmuxSessionBootstrapResult> {
  const deadline = Date.now() + Math.max(params.startupDelayMs, SESSION_BOOTSTRAP_POLL_INTERVAL_MS);
  const readyRegex = params.readyPattern ? new RegExp(params.readyPattern, "i") : null;
  const blockerPatterns = (params.blockers ?? []).map((entry) => ({
    regex: new RegExp(entry.pattern, "i"),
    message: entry.message,
  }));
  let lastSnapshot = "";

  while (Date.now() <= deadline) {
    let snapshot = "";
    try {
      snapshot = normalizePaneText(
        await params.tmux.capturePane(params.sessionName, params.captureLines),
      );
    } catch (error) {
      // Handle retryable and fatal errors
      if (isRetryableBootstrapTargetError(error)) {
        await sleep(SESSION_BOOTSTRAP_POLL_INTERVAL_MS);
        continue;
      }
      if (isBootstrapSessionGoneError(error)) {
        throw buildBootstrapSessionLostError(params.sessionName, error);
      }
      throw error;
    }
    if (snapshot) {
      lastSnapshot = snapshot;
      // Check for startup continue prompt (workspace trust)
      if (tmuxPaneHasStartupContinuePrompt(snapshot, {
        trustWorkspace: params.trustWorkspace,
      })) {
        // Auto-accept for trustWorkspace
        await acceptStartupContinuePrompt({...});
        await sleep(SESSION_BOOTSTRAP_POLL_INTERVAL_MS);
        continue;
      }
      // Check for startup blockers
      for (const blocker of blockerPatterns) {
        if (blocker.regex.test(snapshot)) {
          return {
            status: "blocked",
            snapshot,
            message: blocker.message,
          };
        }
      }
      // Check for ready pattern
      if (readyRegex && !snapshotHasActiveReadyPattern(snapshot, readyRegex)) {
        await sleep(SESSION_BOOTSTRAP_POLL_INTERVAL_MS);
        continue;
      }
      return {
        status: "ready",
        snapshot,
      };
    }

    await sleep(SESSION_BOOTSTRAP_POLL_INTERVAL_MS);
  }

  return {
    status: "timeout",
    snapshot: lastSnapshot,
  };
}
```

**Capture Session Identity Function** (lines 160-246):
```typescript
export async function captureTmuxSessionIdentity(params: {
  tmux: TmuxClient;
  sessionName: string;
  promptSubmitDelayMs: number;
  captureLines: number;
  statusCommand: string;
  pattern: string;
  timeoutMs: number;
  pollIntervalMs: number;
}) {
  // Only called when capture.mode === "status-command"
  // For pi with capture.mode === "off", this is skipped entirely
  await acceptTmuxStartupContinuePromptIfPresent({...});
  let statusSubmission = await submitTmuxSessionInput({
    tmux: params.tmux,
    sessionName: params.sessionName,
    text: params.statusCommand,
    promptSubmitDelayMs: params.promptSubmitDelayMs,
    timingContext: undefined,
  });
  // ... poll for pattern match ...
  return sessionId; // or null if timeout
}
```

**Action:** No code changes needed. These functions are already template-driven. The pi runner will:
1. Call `waitForTmuxSessionBootstrap()` with `readyPattern: "(?:^|\\s)escape\\s+interrupt(?:\\s|$)"` and pi's startup blockers
2. Skip `captureTmuxSessionIdentity()` because pi template has `capture.mode: "off"` (checked at runner-service.ts line 277)
3. Use the pre-generated UUID directly

---

### `src/agents/runtime/runner-service.ts` (service, session-management)

**Reference Analog:** Lines 272-291 (captureSessionIdFromRunner function)

**Capture Mode Check** (lines 272-291):
```typescript
private async captureSessionIdFromRunner(
  resolved: ResolvedAgentTarget,
  options: { forceStatusCommand?: boolean } = {},
) {
  const capture = resolved.runner.sessionId.capture;
  if (capture.mode !== "status-command" && !options.forceStatusCommand) {
    return null;  // ← Early exit for capture.mode === "off"
  }

  return captureTmuxSessionIdentity({
    tmux: this.tmux,
    sessionName: resolved.sessionName,
    promptSubmitDelayMs: resolved.runner.promptSubmitDelayMs,
    captureLines: resolved.stream.captureLines,
    statusCommand: capture.statusCommand,
    pattern: capture.pattern,
    timeoutMs: capture.timeoutMs,
    pollIntervalMs: capture.pollIntervalMs,
  });
}
```

**Action:** No code changes needed. Pi's `capture.mode: "off"` is already handled by this check at line 277.

---

## Shared Patterns

### Template-Driven Runner Architecture
**Applied to:** All five files

The pi runner integration follows the existing template-driven pattern established by codex, claude, and gemini. No new code paths are added; pi is configured purely through template entries in:
- `DEFAULT_AGENT_TOOL_TEMPLATES` (agent-tool-presets.ts)
- Schema defaults (schema.ts)
- Default config template (template.ts)

All runtime logic (bootstrap polling, capture mode dispatch, session resumption) is already generic and template-aware.

### Session Mode: Explicit + Off
**Applied to:** agent-tool-presets.ts, schema.ts, template.ts

Pi uses:
- `sessionId.create.mode: "explicit"` — UUID generated by clisbot, passed as `--session {uuid}` flag
- `sessionId.capture.mode: "off"` — No need to poll `/status` or equivalent; UUID is known from create phase
- `sessionId.resume.mode: "command"` — Reuse UUID on resume via `--resume {sessionId}` flag

This is identical to claude (lines 84-114 of agent-tool-presets.ts), making claude the best precedent.

### Startup Ready Pattern Matching
**Applied to:** session-handshake.ts (no code change required)

Pi's startup ready pattern is declared in the template and passed to `waitForTmuxSessionBootstrap()` at runtime. The function treats all ready patterns the same way: compile to RegExp with "i" flag and poll until match found.

Pattern: `"(?:^|\\s)escape\\s+interrupt(?:\\s|$)"` — matches pi's help bar footer containing "escape interrupt".

### Startup Blockers
**Applied to:** session-handshake.ts (no code change required)

Pi declares two startup blockers in the template:
1. `"Warning: No models available"` — pi has no configured providers
2. `"tmux extended-keys is off"` — tmux needs extended-keys support

These are passed to `waitForTmuxSessionBootstrap()` and checked against pane output during bootstrap polling. Already supported by existing code.

### Active Timer Pattern Recognition
**Applied to:** transcript-normalization.ts (no code change required)

Pi's "Working..." status is already matched by `CODEX_WORKING_STATUS_PATTERN` at line 42-45, which is used by `isInterruptStatusLine()`. Pi therefore automatically participates in active timer detection without code change.

---

## No Analog Found

No files require analog search beyond the codebase. All modifications are purely additive (pi entry) or reuse existing patterns (session handling, bootstrap, active timer).

---

## Metadata

**Analog search scope:**
- `src/config/runtime/agent-tool-presets.ts` (templates for codex, claude, gemini)
- `src/config/core/schema.ts` (schema defaults)
- `src/config/core/template.ts` (rendered default config)
- `src/runners/transcript/transcript-normalization.ts` (pattern matching)
- `src/runners/tmux/session-handshake.ts` (bootstrap and capture)
- `src/agents/runtime/runner-service.ts` (session lifecycle)

**Files scanned:** 6 primary, plus supporting context from session-identity.ts, run-monitor.ts

**Pattern extraction date:** 2026-05-26

**Confidence:** HIGH — All analogs are in the same codebase; claude serves as exact precedent for pi (explicit session mode, no capture, command resume). No external library changes; all patterns are established and proven by three existing CLI runners.
