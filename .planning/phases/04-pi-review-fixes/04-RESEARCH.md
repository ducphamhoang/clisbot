# Phase 4: Pi Review Fixes — Research

**Researched:** 2026-05-26
**Domain:** Pi CLI integration correctness and security fixes (post-milestone adversarial review)
**Confidence:** HIGH

## Summary

Phase 4 fixes 8 critical and high-priority findings from the v0.2.0 Pi CLI Integration adversarial milestone review. All architectural decisions are locked in CONTEXT.md; this research documents the exact change sites, call graphs, and implementation patterns needed to execute the fixes.

The fixes span two core files: `runner-service.ts` (session routing and recovery), `transcript-normalization.ts` (output filtering), and `agent-tool-presets.ts` (template argument reconstruction). All fixes are narrowly scoped with minimal cross-file impact.

**Primary recommendation:** Execute fixes in the wave order suggested by CONTEXT.md (Wave 1: removals, Wave 2: additions to transcript-normalization, Wave 3: template args, Wave 4: runner-service). This order minimizes merge conflicts and allows parallel execution within waves.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fix 1 — FIX-01: `/new` command broken for pi (LOCKED)**
- Add guard at top of `triggerNewSession` in runner-service.ts
- Condition: `resolved.runner.sessionId.capture.mode === "off"` AND `resolved.runner.sessionId.create.mode === "explicit"`
- When both true: skip `triggerNewSessionInLiveRunner` entirely, call `restartRunnerWithFreshSessionIdForNewCommand` directly
- Restart path already clears stored ID; next `ensureSessionReady` generates fresh UUID via explicit-create

**Fix 2 — FIX-02: Crash recovery silently drops pi session ID (LOCKED)**
- Widen gate in `retryFreshStartAfterStoredResumeFailure` (runner-service.ts)
- Current gate: `create.mode !== "runner"` — blocks pi (`create.mode: "explicit"`)
- Decision: Allow `create.mode === "explicit"` as valid continuation case alongside `create.mode === "runner"`
- Explicit IDs are clisbot-owned and reusable; no reason to discard on crash recovery

**Fix 3 — FIX-03: No `dropPiPromptBlocks` — user prompt echoes in responses (LOCKED)**
- Add `dropPiPromptBlocks` using shared `dropPromptBlocks` helper with pattern `/^\s*>\s/`
- Structurally identical to `dropGeminiPromptBlocks` (both use `>` marker)
- Place after `dropGeminiPromptBlocks` (~line 368)
- Wire into `cleanInteractionSnapshotInternal` at `promptStripped` dispatch: add `isPi ? dropPiPromptBlocks(lines) :` before final `lines` fallback
- `isPi` guard already excludes gemini (`!isGemini`), safe for both

**Fix 4 — FIX-04: Pi chrome filter leaks detection markers into output (LOCKED)**
- Add explicit drop rules in `shouldDropPiChromeLine` for help-bar phrases
- Lines containing `Type your message`
- Lines containing `run /help`
- Any other ready-bar text used as detection signal in `looksLikePiSnapshot`

**Fix 5 — FIX-05: `Warning:`/`Note:` rule strips legitimate AI content (LOCKED)**
- Remove `/^(?:Warning|Note):\s/i` rule entirely from `shouldDropPiChromeLine`
- Startup blockers (`Warning: No models available`, `tmux extended-keys is off`) handled at launch by `startupBlockers` before normalization runs
- Do not need second filter in transcript cleanup

**Fix 6 — FIX-06: `looksLikePiSnapshot` false-positive on bare `>` (LOCKED)**
- Remove `trimmed === '>'` as standalone sufficient condition from `looksLikePiSnapshot`
- Bare `>` idle prompt already handled by `dropPiPromptBlocks` and `shouldDropPiChromeLine`
- Does not need to be classification signal; can misclassify Bash PS2, heredoc, markdown blockquote
- Pi detection should rely only on markers uniquely pi: version header (`pi v`), `Welcome to pi`, or escape-interrupt help bar

**Fix 7 — FIX-07: REQUIREMENTS.md SESSION-03 doc error (LOCKED)**
- Update SESSION-03 from `--session {uuid}` to `--resume {uuid}`
- Implementation correctly uses `--resume {sessionId}` (pi CLI semantics: `--session` is create, `--resume` is resume)
- Matches claude pattern: same distinction applies

**Fix 8 — FIX-08: `buildRunnerFromToolTemplate` overwrites non-codex resume args (LOCKED)**
- Non-codex branch always reconstructs resume args as `["--resume", "{sessionId}", ...options]`
- Silently overrides whatever template declares; pi's template resume args ignored
- Decision: Preserve template's `resume.args` for non-codex runners
- Apply `applyTemplate` for `{sessionId}` placeholder substitution only — do not reconstruct array
- Non-codex path should call `applyTemplate(template.sessionId.resume.args, { sessionId })`
- Add comment explaining why codex requires special-casing (codex has documented reason for override)

### Claude's Discretion

- Wave assignment and plan count — determined by planner based on file conflict analysis
- Exact line numbers for insertion — planner reads current file state
- Test fixture design — planner follows existing test patterns in `test/text/text-cleaning-chrome.suite.ts` and `test/runner-service.integration.test.ts`

### Deferred Ideas (OUT OF SCOPE)

- ARCH-01: Pi defaults duplicated 3× in schema.ts — DRY violation, pre-existing, out of scope
- REG-01: `isRunnerIdlePromptLine` `"> "` match could misclassify markdown for all runners — pre-existing, low priority
- SEC-03: UUID format guard before `{sessionId}` substitution — requires broader runner-service audit
- CRIT-05: `shouldDropPiChromeLine` drops `│`-starting lines that may be real response content — shared risk with gemini, needs broader cross-runner design

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIX-01 | `/new` command must not throw for pi | Exact call graph and guard condition mapped below |
| FIX-02 | Crash recovery for pi preserves `sessionId` | Gate condition identified; widening strategy clear |
| FIX-03 | Pi response snapshots strip `> user message` echoes | `dropPromptBlocks` pattern and wiring point documented |
| FIX-04 | Help-bar phrases dropped from pi output | `shouldDropPiChromeLine` expansion points identified |
| FIX-05 | `Warning:` and `Note:` lines survive filtering | Exact regex line identified for removal |
| FIX-06 | Bare `>` not sole pi detector | `looksLikePiSnapshot` condition identified for removal |
| FIX-07 | REQUIREMENTS.md documents `--resume {uuid}` | Line 15: single-line doc edit |
| FIX-08 | Template resume args preserved for non-codex | `buildRunnerFromToolTemplate` non-codex branch line 249–275 |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session routing for `/new` | Backend (Runner Service) | Agent Service | RunnerService decides route (live vs. restart); SessionService owns continuity |
| Crash recovery session preservation | Backend (Runner Service) | Session Service | RunnerService initiates retry; SessionService stores final state |
| Output filtering (chrome removal) | Backend (Runners/Transcript) | — | Transcript normalization is runner-owned output processing |
| Session ID template args | Backend (Config) | Runner Service | Config builds template; RunnerService applies it at launch |

## Standard Stack

### Core Files Modified

| File | Purpose | Scope |
|------|---------|-------|
| `src/agents/runtime/runner-service.ts` | Session routing, crash recovery | Fix 1 (triggerNewSession guard), Fix 2 (retryFreshStartAfterStoredResumeFailure gate) |
| `src/runners/transcript/transcript-normalization.ts` | Output filtering | Fix 3 (dropPiPromptBlocks), Fix 4 (shouldDropPiChromeLine help-bar), Fix 5 (remove Warning/Note), Fix 6 (looksLikePiSnapshot) |
| `src/config/runtime/agent-tool-presets.ts` | Template resolution | Fix 8 (buildRunnerFromToolTemplate non-codex branch) |
| `.planning/REQUIREMENTS.md` | Documentation | Fix 7 (SESSION-03 line 15 — single edit) |

### Test Files

| File | Pattern | Coverage |
|------|---------|----------|
| `test/runner-service.integration.test.ts` | Existing pi template tests (lines 100–245) | Add tests for Fix 1 `/new` routing and Fix 2 session preservation |
| `test/text/text-cleaning-chrome.suite.ts` | Existing pi chrome tests (lines 456–612) | Add tests for Fix 3–6 (dropPiPromptBlocks, help-bar filtering, Warning/Note preservation, bare `>` non-detection) |

## Exact Code Locations

### Fix 1: triggerNewSession Call Graph

**File:** `src/agents/runtime/runner-service.ts`

**Current code (lines 821–827):**
```typescript
async triggerNewSession(target: AgentSessionTarget) {
  const resolved = this.resolveTarget(target);
  if (!(await this.tmux.hasSession(resolved.sessionName))) {
    return this.restartRunnerWithFreshSessionIdForNewCommand(target);
  }
  return this.triggerNewSessionInLiveRunner(resolved);
}
```

**Related function (lines 841–882):**
```typescript
private async triggerNewSessionInLiveRunner(resolved: ResolvedAgentTarget) {
  const oldSessionId = (await this.sessionMapping.get(resolved.sessionKey))?.sessionId;
  const command = this.resolveNewSessionCommand(resolved);
  // ... calls submitNewSessionCommand(resolved, command)
  // ... then calls captureNewSessionIdentityAfterTrigger(resolved, oldSessionId)
  //     which calls captureSessionIdFromRunner(resolved, { forceStatusCommand: true })
}
```

**captureNewSessionIdentityAfterTrigger (lines 911–927):**
```typescript
private async captureNewSessionIdentityAfterTrigger(
  resolved: ResolvedAgentTarget,
  oldSessionId?: string,
) {
  for (let attempt = 0; attempt < SESSION_READY_CAPTURE_RETRY_COUNT; attempt += 1) {
    const sessionId = await this.captureSessionIdFromRunner(resolved, {
      forceStatusCommand: true,  // ← This bypasses capture.mode: "off" guard
    });
    // ...
  }
}
```

**captureSessionIdFromRunner (lines 272–291):**
```typescript
private async captureSessionIdFromRunner(
  resolved: ResolvedAgentTarget,
  options: { forceStatusCommand?: boolean } = {},
) {
  const capture = resolved.runner.sessionId.capture;
  if (capture.mode !== "status-command" && !options.forceStatusCommand) {
    return null;
  }
  // ... attempts to run statusCommand (pi has no /status)
}
```

**Target function (lines 884–896):**
```typescript
private async restartRunnerWithFreshSessionIdForNewCommand(target: AgentSessionTarget) {
  const { resolved } = await this.restartRunnerWithFreshSessionId(target);
  const entry = await this.sessionMapping.get(resolved.sessionKey);
  return {
    agentId: resolved.agentId,
    sessionKey: resolved.sessionKey,
    sessionName: resolved.sessionName,
    workspacePath: resolved.workspacePath,
    command: "(fresh runner)",
    sessionId: entry?.sessionId,
    restartedRunner: true,
  };
}
```

**restartRunnerWithFreshSessionId (lines 803–819):**
```typescript
async restartRunnerWithFreshSessionId(
  target: AgentSessionTarget,
  timingContext?: LatencyDebugContext,
) {
  const resolved = this.resolveTarget(target);
  await this.tmux.killSession(resolved.sessionName).catch(() => undefined);
  console.log(
    `clisbot clearing stored sessionId for explicit fresh session ${resolved.sessionName}`,
  );
  await this.sessionMapping.clearActive(resolved, {
    runnerCommand: resolved.runner.command,
  });
  return this.ensureRunnerReady(target, {
    allowFreshRetryBeforePrompt: false,
    timingContext,
  });
}
```

**Decision point:** Insert guard at line 822 (after `const resolved = ...`) before checking `hasSession`:
```typescript
// Check if pi (explicit + off-capture) needs fresh restart instead of live rotation
if (
  resolved.runner.sessionId.capture.mode === "off" &&
  resolved.runner.sessionId.create.mode === "explicit"
) {
  return this.restartRunnerWithFreshSessionIdForNewCommand(target);
}
```

### Fix 2: retryFreshStartAfterStoredResumeFailure Gate

**File:** `src/agents/runtime/runner-service.ts`

**Current code (lines 341–375):**
```typescript
private async retryFreshStartAfterStoredResumeFailure(
  target: AgentSessionTarget,
  resolved: ResolvedAgentTarget,
  error: unknown,
  remainingFreshRetries: number,
) {
  if (!isRecoverableStartupSessionLoss(error)) {
    return null;
  }

  if (
    resolved.runner.sessionId.resume.mode !== "command" ||
    resolved.runner.sessionId.create.mode !== "runner"  // ← Pi fails here (mode is "explicit")
  ) {
    return null;
  }

  const existing = await this.sessionMapping.get(resolved.sessionKey);
  if (!existing?.sessionId) {
    return null;
  }

  const exitRecord = await readRunnerExitRecord(this.loadedConfig.stateDir, resolved.sessionName);
  if (!exitRecord || exitRecord.exitCode === 0) {
    return null;
  }

  console.log(
    `clisbot preserved stored sessionId after failed runner resume startup ${resolved.sessionName}`,
  );
  await this.sessionMapping.touch(resolved, {
    runnerCommand: resolved.runner.command,
  });
  throw new Error(PRESERVED_SESSION_ID_RETRY_MESSAGE);
}
```

**Decision point:** Change line 353 from:
```typescript
resolved.runner.sessionId.create.mode !== "runner"
```
to:
```typescript
resolved.runner.sessionId.create.mode !== "runner" &&
resolved.runner.sessionId.create.mode !== "explicit"
```

This allows both `"runner"` (codex) and `"explicit"` (pi, claude) to proceed to stored session reuse.

### Fix 3: dropPiPromptBlocks Implementation

**File:** `src/runners/transcript/transcript-normalization.ts`

**Reference pattern (lines 366–368):**
```typescript
function dropGeminiPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /^\s*>\s/);
}
```

**Helper function (lines 307–337):**
```typescript
function dropPromptBlocks(lines: string[], marker: RegExp) {
  const filtered: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!marker.test(line.trimStart())) {
      filtered.push(line);
      continue;
    }

    let end = index + 1;
    while (end < lines.length) {
      const candidate = lines[end] ?? "";
      if (!candidate.trim()) {
        end += 1;
        continue;
      }

      if (/^\s{2,}\S/.test(candidate)) {
        end += 1;
        continue;
      }

      break;
    }

    index = end - 1;
  }

  return filtered;
}
```

**Insertion point:** After line 368, add:
```typescript
function dropPiPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /^\s*>\s/);
}
```

**Wiring point (lines 608–622):**
```typescript
function cleanInteractionSnapshotInternal(raw: string, options?: {
  preserveTimerStatusLines?: boolean;
}) {
  const lines = splitNormalizedLines(raw);
  const isCodex = looksLikeCodexSnapshot(lines);
  const isClaude = looksLikeClaudeSnapshot(lines);
  const isGemini = looksLikeGeminiSnapshot(lines);
  const isPi = !isCodex && !isClaude && !isGemini && looksLikePiSnapshot(lines);
  const promptStripped = isCodex
    ? dropCodexPromptBlocks(lines)
    : isClaude
      ? dropClaudePromptBlocks(lines)
      : isGemini
        ? dropGeminiPromptBlocks(lines)
        : lines;  // ← Insert here
```

**Change to:**
```typescript
const promptStripped = isCodex
  ? dropCodexPromptBlocks(lines)
  : isClaude
    ? dropClaudePromptBlocks(lines)
    : isGemini
      ? dropGeminiPromptBlocks(lines)
      : isPi
        ? dropPiPromptBlocks(lines)
        : lines;
```

### Fix 4: shouldDropPiChromeLine Help-Bar Additions

**File:** `src/runners/transcript/transcript-normalization.ts`

**Current code (lines 547–562):**
```typescript
function shouldDropPiChromeLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }

  return (
    /^(?:Warning|Note):\s/i.test(trimmed) ||
    /\bfd:\s+(?:command\s+)?not\s+found\b/i.test(trimmed) ||
    /^─+$/.test(trimmed) ||
    /^[╭╰│]/.test(trimmed) ||
    trimmed.includes('Welcome to pi') ||
    /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
    trimmed === '>'
  )
}
```

**Add help-bar conditions:** After the existing box-drawing checks, before line 558, add:
```typescript
trimmed.includes('Type your message') ||
trimmed.includes('run /help') ||
```

These match the detection markers in `looksLikePiSnapshot` (lines 214–215).

### Fix 5: Remove Warning/Note Rule

**File:** `src/runners/transcript/transcript-normalization.ts`

**Current code (line 554):**
```typescript
/^(?:Warning|Note):\s/i.test(trimmed) ||
```

**Action:** Delete this line entirely from `shouldDropPiChromeLine`. The rule must be removed because:
- Startup blockers (`Warning: No models available`, `tmux extended-keys is off`) are caught at launch by `startupBlockers` config (Phase 3), before transcript normalization
- Legitimate AI response content like "Warning: this command is destructive" or "Note: you need sudo" should survive
- No other runner chrome filter has a blanket Warning/Note rule

### Fix 6: Remove Bare `>` from looksLikePiSnapshot

**File:** `src/runners/transcript/transcript-normalization.ts`

**Current code (lines 208–219):**
```typescript
export function looksLikePiSnapshot(lines: string[]) {
  return lines.some((line) => {
    const trimmed = line.trim()
    return (
      trimmed.includes('Welcome to pi') ||
      /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
      trimmed.includes('Type your message') ||
      trimmed.includes('run /help') ||
      trimmed === '>'  // ← Remove this condition
    )
  })
}
```

**Action:** Delete line 216 (`trimmed === '>'`). Pi detection now relies only on:
1. `Welcome to pi` — unique pi welcome header
2. `pi v1.2.3` — unique version string
3. `Type your message` — pi ready bar
4. `run /help` — pi help bar

The bare `>` is handled by `dropPiPromptBlocks` pattern matching and is too prone to false positives (Bash PS2, heredocs, markdown blockquotes).

### Fix 7: REQUIREMENTS.md Session-03 Documentation

**File:** `.planning/REQUIREMENTS.md`

**Current code (line 15):**
```
- [ ] **SESSION-03:** Pi session resume passes `--session {uuid}` plus startup flags
```

**Change to:**
```
- [ ] **SESSION-03:** Pi session resume passes `--resume {uuid}` plus startup flags
```

**Rationale:** Implementation in `agent-tool-presets.ts` line 193 correctly uses `--resume`:
```typescript
resume: {
  mode: "command",
  args: ["--resume", "{sessionId}", "--dangerously-skip-permissions"],
},
```

### Fix 8: buildRunnerFromToolTemplate Non-Codex Resume Args

**File:** `src/config/runtime/agent-tool-presets.ts`

**Current code (lines 249–275):**
```typescript
return {
  command: template.command,
  args: [...options],
  trustWorkspace: template.trustWorkspace,
  startupDelayMs: template.startupDelayMs,
  startupRetryCount: template.startupRetryCount,
  startupRetryDelayMs: template.startupRetryDelayMs,
  startupReadyPattern: template.startupReadyPattern,
  startupBlockers: template.startupBlockers?.map((entry) => ({ ...entry })),
  promptSubmitDelayMs: template.promptSubmitDelayMs,
  newSessionCommand: template.newSessionCommand,
  sessionId: {
    ...template.sessionId,
    create: {
      ...template.sessionId.create,
      args: [...template.sessionId.create.args],
    },
    capture: {
      ...template.sessionId.capture,
    },
    resume: {
      ...template.sessionId.resume,
      args: ["--resume", "{sessionId}", ...options],  // ← Overwrites template
    },
  },
};
```

**Decision point:** Change lines 269–272 from:
```typescript
resume: {
  ...template.sessionId.resume,
  args: ["--resume", "{sessionId}", ...options],
},
```

to:
```typescript
resume: {
  ...template.sessionId.resume,
  args: applyTemplate(template.sessionId.resume.args, { sessionId: "{sessionId}" }),
},
```

**Context:** `applyTemplate` is imported at line 4 from `"../../infra/paths.ts"`. It replaces `{placeholder}` strings in arrays/strings:
```typescript
// From src/infra/paths.ts — used throughout for variable substitution
export function applyTemplate(value: unknown, context: Record<string, string>): unknown
```

**Why codex needs special-casing:** Codex has a documented reason — it requires special args (`resume`, `-C`, `{workspace}`) that are not in the template, so the override is intentional. This is already handled in the `if (toolId === "codex")` branch (lines 220–246).

**Comment to add:** Above the resume block in the non-codex branch, add:
```typescript
// Non-codex runners: preserve template's resume args and apply {sessionId} substitution
// Codex is special-cased above to add workspace and resume-specific args
```

## Common Pitfalls

### Pitfall 1: Confusing `capture.mode: "off"` with Session Preservation

**What goes wrong:** Developers might think "off" means "don't preserve the session" when it actually means "don't run a status command to scrape the ID — we already have it."

**Why it happens:** The naming `"off"` refers to the capture mechanism, not session continuity.

**How to avoid:** Remember the distinction: `capture.mode: "off"` means "clisbot-generated or runner-supplied ID, not scraped." Pi uses `create.mode: "explicit"` (clisbot generates) + `capture.mode: "off"` (no scraping), so IDs are always preserved.

**Warning signs:** Seeing code that tries to scrape an ID from pi's `/status` (which doesn't exist) or code that discards pi's session on crash recovery.

### Pitfall 2: Applying Pi Filters to Non-Pi Snapshots

**What goes wrong:** If `looksLikePiSnapshot` is overly broad, pi filters get applied to codex, claude, or gemini output, stripping legitimate content.

**Why it happens:** False positives in detection (e.g., bare `>` matching Bash prompts or markdown blockquotes).

**How to avoid:** Use `isPi` guard in `cleanInteractionSnapshotInternal` line 615: `!isCodex && !isClaude && !isGemini && looksLikePiSnapshot(lines)` — this short-circuits exclusion of other runners first.

**Warning signs:** Test failures where codex responses with "warning" in the body are stripped, or where user prompt text starting with `>` disappears.

### Pitfall 3: Removing `>` Bare Line Too Broadly

**What goes wrong:** If `dropPiPromptBlocks` is invoked for all runners, legitimate markdown blockquotes (`> quoted text`) get stripped from claude or gemini responses.

**Why it happens:** The `>` prompt pattern is pi-specific but the filtering function is generic.

**How to avoid:** Ensure `isPi` guard is evaluated before `dropPiPromptBlocks` is called. The `promptStripped` dispatch (lines 616–622) explicitly checks runner type.

**Warning signs:** Markdown blockquotes disappearing from claude or gemini output after normalization.

### Pitfall 4: `/new` Command Success Criteria Misunderstanding

**What goes wrong:** Implementing the guard but then testing `/new` against a running live-runner session and expecting it to rotate the session ID in-place (which it should for codex but cannot for pi).

**Why it happens:** Pi's `create.mode: "explicit"` means new sessions always start fresh — there is no in-process session-rotation command.

**How to avoid:** Remember: for pi, `/new` triggers `restartRunnerWithFreshSessionIdForNewCommand`, which kills the old session and starts a new one with a fresh UUID. Test success is "no timeout error" and "new session ID generated," not "in-place ID rotation."

**Warning signs:** Expecting pi's `/new` to behave like codex's `/new`; they have different semantics.

### Pitfall 5: Template Args Not Applied After Substitution

**What goes wrong:** If `applyTemplate` is not called in Fix 8, the `{sessionId}` placeholder remains a literal string in the args, causing pi to receive `--resume "{sessionId}"` instead of an actual UUID.

**Why it happens:** Forgetting that config templates use placeholders that must be substituted at runtime.

**How to avoid:** Always call `applyTemplate` on template args that contain placeholders. Check caller sites (`RunnerService` line 825 area) to see how `{sessionId}` is substituted into args.

**Warning signs:** Pi launch failing with "unrecognized session ID format" or similar error from pi CLI.

## Code Examples

### Pattern: dropPromptBlocks Helper (Fix 3 Reference)

[VERIFIED: src/runners/transcript/transcript-normalization.ts lines 307–337, 339–368]

The `dropPromptBlocks` helper is used by all prompt-echo-stripping functions. It:
1. Iterates through lines
2. When marker regex matches, skips the matching line + indented continuation lines
3. Resumes after blank or unindented line

```typescript
function dropPromptBlocks(lines: string[], marker: RegExp) {
  const filtered: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!marker.test(line.trimStart())) {
      filtered.push(line);
      continue;
    }

    let end = index + 1;
    while (end < lines.length) {
      const candidate = lines[end] ?? "";
      if (!candidate.trim()) {
        end += 1;
        continue;
      }

      if (/^\s{2,}\S/.test(candidate)) {
        end += 1;
        continue;
      }

      break;
    }

    index = end - 1;
  }

  return filtered;
}

// Pi's prompt echo uses > marker, identical to Gemini
function dropPiPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /^\s*>\s/);
}
```

### Pattern: Detection + Filtering Guard (Fix 4 Reference)

[VERIFIED: src/runners/transcript/transcript-normalization.ts lines 615, 646–648]

Detection happens once in `cleanInteractionSnapshotInternal`:

```typescript
const isPi = !isCodex && !isClaude && !isGemini && looksLikePiSnapshot(lines);
```

Then filtering is guarded:

```typescript
if (isPi && shouldDropPiChromeLine(line)) {
  return false;
}
```

This ensures pi filters are only applied to pi snapshots.

### Pattern: Gate Condition Widening (Fix 2 Reference)

[VERIFIED: src/agents/runtime/runner-service.ts lines 351–356]

Current gate (blocks pi):
```typescript
if (
  resolved.runner.sessionId.resume.mode !== "command" ||
  resolved.runner.sessionId.create.mode !== "runner"
) {
  return null;
}
```

Widened gate (allows pi):
```typescript
if (
  resolved.runner.sessionId.resume.mode !== "command" ||
  (resolved.runner.sessionId.create.mode !== "runner" &&
   resolved.runner.sessionId.create.mode !== "explicit")
) {
  return null;
}
```

### Pattern: Call Guard (Fix 1 Reference)

[VERIFIED: src/agents/runtime/runner-service.ts lines 821–827]

Current code paths all sessions through live-runner rotation (which fails for pi):

```typescript
async triggerNewSession(target: AgentSessionTarget) {
  const resolved = this.resolveTarget(target);
  if (!(await this.tmux.hasSession(resolved.sessionName))) {
    return this.restartRunnerWithFreshSessionIdForNewCommand(target);
  }
  return this.triggerNewSessionInLiveRunner(resolved); // ← Fails for pi
}
```

Guard-based path:

```typescript
async triggerNewSession(target: AgentSessionTarget) {
  const resolved = this.resolveTarget(target);
  
  // Pi cannot rotate in-process; must restart with fresh session
  if (
    resolved.runner.sessionId.capture.mode === "off" &&
    resolved.runner.sessionId.create.mode === "explicit"
  ) {
    return this.restartRunnerWithFreshSessionIdForNewCommand(target);
  }
  
  if (!(await this.tmux.hasSession(resolved.sessionName))) {
    return this.restartRunnerWithFreshSessionIdForNewCommand(target);
  }
  return this.triggerNewSessionInLiveRunner(resolved);
}
```

### Pattern: Template Placeholder Substitution (Fix 8 Reference)

[VERIFIED: src/config/runtime/agent-tool-presets.ts line 4, 213–275]

Template substitution is already used in codex branch (line 243):

```typescript
resume: {
  ...template.sessionId.resume,
  args: ["resume", "{sessionId}", ...options, "-C", "{workspace}"],
},
```

At runtime, `RunnerService` calls `applyTemplate` on these args to expand `{sessionId}` and `{workspace}` placeholders.

For non-codex, apply same pattern:

```typescript
resume: {
  ...template.sessionId.resume,
  args: applyTemplate(template.sessionId.resume.args, { sessionId: "{sessionId}" }),
},
```

## Test Patterns

### Pi Chrome Filtering Tests (Existing Reference)

[VERIFIED: test/text/text-cleaning-chrome.suite.ts lines 456–612]

**Existing pattern:**

```typescript
describe("pi chrome filtering", () => {
  describe("looksLikePiSnapshot()", () => {
    test("detects pi via 'Welcome to pi' marker", () => {
      expect(looksLikePiSnapshot(["Welcome to pi", "some user response"])).toBe(true);
    });
    
    test("returns false for gemini snapshot (not pi)", () => {
      expect(looksLikePiSnapshot(["Gemini CLI v1.0", "some text"])).toBe(false);
    });
  });

  describe("pi chrome line filtering via cleanInteractionSnapshot()", () => {
    const piHeader = "Welcome to pi\npi v1.2.3\n\n";

    test("drops Warning: startup lines", () => {
      const cleaned = cleanInteractionSnapshot(`${piHeader}Warning: No models available\n\nActual response`);
      expect(cleaned).not.toContain("Warning:");
      expect(cleaned).toContain("Actual response");
    });
  });
});
```

**For Fix 3, add:**
```typescript
test("drops pi prompt echo lines (> user message)", () => {
  const cleaned = cleanInteractionSnapshot(`${piHeader}> explain this code\n\nThe code does X`);
  expect(cleaned).not.toContain("> explain");
  expect(cleaned).toContain("The code does X");
});

test("keeps actual response text that starts with '>' but is not a prompt line", () => {
  const cleaned = cleanInteractionSnapshot(`${piHeader}> is a right-shift operator in Rust`);
  expect(cleaned).toContain("is a right-shift operator");
});
```

**For Fix 4, add:**
```typescript
test("drops 'Type your message' help-bar line", () => {
  const cleaned = cleanInteractionSnapshot(`${piHeader}Type your message\n\nResponse`);
  expect(cleaned).not.toContain("Type your message");
  expect(cleaned).toContain("Response");
});

test("drops 'run /help for shortcuts' help-bar line", () => {
  const cleaned = cleanInteractionSnapshot(`${piHeader}run /help for shortcuts\n\nResponse`);
  expect(cleaned).not.toContain("run /help");
  expect(cleaned).toContain("Response");
});
```

**For Fix 5, add:**
```typescript
test("keeps 'Warning:' lines that are legitimate AI response content (not stripped)", () => {
  const cleaned = cleanInteractionSnapshot(`${piHeader}Warning: this command is destructive`);
  expect(cleaned).toContain("Warning: this command is destructive");
});

test("keeps 'Note:' lines that are legitimate AI response content (not stripped)", () => {
  const cleaned = cleanInteractionSnapshot(`${piHeader}Note: you need sudo privileges`);
  expect(cleaned).toContain("Note: you need sudo privileges");
});
```

**For Fix 6, add:**
```typescript
test("does NOT classify snapshot as pi based on bare '>' alone (negative test)", () => {
  const bashSnapshot = ["> bash command", "output"];
  expect(looksLikePiSnapshot(bashSnapshot)).toBe(false);
});

test("requires pi-specific marker even if bare '>' is present", () => {
  const mixedSnapshot = [">", "Welcome to pi", "output"];
  expect(looksLikePiSnapshot(mixedSnapshot)).toBe(true); // true because of Welcome to pi
  
  const justBareAngle = [">", "some output"];
  expect(looksLikePiSnapshot(justBareAngle)).toBe(false); // false without Welcome to pi
});
```

### Pi Runner Service Tests (Existing Reference)

[VERIFIED: test/runner-service.integration.test.ts lines 100–245]

**Existing pattern:**

```typescript
describe('pi runner template', () => {
  test('sessionId.create.mode === "explicit"', () => {
    expect(DEFAULT_AGENT_TOOL_TEMPLATES['pi'].sessionId.create.mode).toBe('explicit')
  })

  test('sessionId.capture.mode === "off"', () => {
    expect(DEFAULT_AGENT_TOOL_TEMPLATES['pi'].sessionId.capture.mode).toBe('off')
  })
})
```

**For Fix 1, add (in new `describe` block):**
```typescript
describe('pi /new command routing', () => {
  test('triggerNewSession for pi routes through restartRunnerWithFreshSessionIdForNewCommand', () => {
    // This requires a full integration test with a mock runner
    // Test setup: create agent with pi runner, call triggerNewSession
    // Expected: function calls restartRunnerWithFreshSessionId (not triggerNewSessionInLiveRunner)
    // Verify: new sessionId generated, no timeout error thrown
  });
});
```

**For Fix 2, add (in new `describe` block):**
```typescript
describe('pi crash recovery session preservation', () => {
  test('retryFreshStartAfterStoredResumeFailure allows create.mode: explicit', () => {
    // This requires inspecting the gate condition in unit testing
    // Or full integration test: simulate runner crash, verify session ID is preserved
    // Expected: sessionId reused, no "session discarded" message
  });
});
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | No config file; tests run via `bun test <file>` |
| Quick run command | `bun test test/text/text-cleaning-chrome.suite.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | `/new` command succeeds for pi without timeout | integration | `bun test test/runner-service.integration.test.ts` | ✅ exists, add new tests |
| FIX-02 | Crash recovery preserves pi `sessionId` | integration | `bun test test/runner-service.integration.test.ts` | ✅ exists, add new tests |
| FIX-03 | Pi prompt echoes `> user message` stripped | unit | `bun test test/text/text-cleaning-chrome.suite.ts` | ✅ exists, add new tests |
| FIX-04 | Help-bar phrases dropped from pi output | unit | `bun test test/text/text-cleaning-chrome.suite.ts` | ✅ exists, add new tests |
| FIX-05 | `Warning:` and `Note:` lines survive filtering | unit | `bun test test/text/text-cleaning-chrome.suite.ts` | ✅ exists, add new tests |
| FIX-06 | Bare `>` not sole pi detector | unit | `bun test test/text/text-cleaning-chrome.suite.ts` | ✅ exists, add new tests |
| FIX-07 | REQUIREMENTS.md SESSION-03 documents `--resume` | doc | manual inspection | ✅ exists, 1-line edit |
| FIX-08 | Template resume args preserved for non-codex | unit | `bun test test/runner-service.integration.test.ts` | ✅ exists, add new tests |

### Sampling Rate
- **Per task commit:** `bun test test/text/text-cleaning-chrome.suite.ts && bun test test/runner-service.integration.test.ts`
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- None — existing test infrastructure covers all phase requirements

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: .planning/phases/04-pi-review-fixes/04-CONTEXT.md] — All 8 locked architectural decisions
- [VERIFIED: .planning/REQUIREMENTS.md] — FIX-01 through FIX-08 requirements
- [VERIFIED: src/agents/runtime/runner-service.ts] — Call graphs, gate conditions, insertion points for Fix 1 and Fix 2
- [VERIFIED: src/runners/transcript/transcript-normalization.ts] — Helper functions, detection logic, filtering, insertion points for Fix 3–6
- [VERIFIED: src/config/runtime/agent-tool-presets.ts] — Template structure, buildRunnerFromToolTemplate non-codex branch for Fix 8
- [VERIFIED: test/text/text-cleaning-chrome.suite.ts] — Pi chrome filtering test patterns (lines 456–612)
- [VERIFIED: test/runner-service.integration.test.ts] — Pi template test patterns (lines 100–245)
- [VERIFIED: docs/architecture/runtime-architecture.md] — Session and runner ownership model
- [VERIFIED: docs/architecture/domain-language.md] — Canonical vocabulary for sessionId, capture, create modes

### Secondary (MEDIUM confidence)
- [CITED: src/infra/paths.ts applyTemplate function] — Used for template placeholder substitution

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All core files physically inspected with exact line numbers
- Architecture: HIGH — CONTEXT.md locks decisions; runtime-architecture.md defines ownership
- Pitfalls: HIGH — Based on actual code patterns and test existing patterns
- Test patterns: HIGH — Existing tests in suite reviewed and documented

**Research date:** 2026-05-26
**Valid until:** 2026-06-09 (14 days — typescript/tooling stack is stable)

**No assumptions tagged [ASSUMED]** — All code locations verified against current source files.
