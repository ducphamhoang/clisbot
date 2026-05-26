# Phase 4: Pi Review Fixes - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 5 modified, 2 new test files
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/agents/runtime/runner-service.ts` | controller | request-response | itself (intra-file pattern) | exact |
| `src/config/runtime/agent-tool-presets.ts` | config | request-response | itself (codex branch) | exact |
| `src/runners/transcript/transcript-normalization.ts` (Fix 3–6) | transform | transform | itself (dropGeminiPromptBlocks, shouldDropGeminiChromeLine) | exact |
| `test/runner-service.integration.test.ts` | test | request-response | existing pi runner template tests | exact |
| `test/text/text-cleaning-chrome.suite.ts` | test | transform | existing gemini and claude chrome tests | exact |

---

## Pattern Assignments

### Fix 1: triggerNewSession guard (src/agents/runtime/runner-service.ts, ~line 821)

**Analog context:** `src/agents/runtime/runner-service.ts` lines 115–120 (canRestartWithStoredSessionId guard pattern)

**Guard pattern reference** (lines 115–120):
```typescript
function canRestartWithStoredSessionId(resolved: ResolvedAgentTarget) {
  return (
    resolved.runner.sessionId.resume.mode === "command" ||
    resolved.runner.sessionId.create.mode === "explicit"
  );
}
```

**Insertion point** (current lines 821–827):
```typescript
async triggerNewSession(target: AgentSessionTarget) {
  const resolved = this.resolveTarget(target);
  if (!(await this.tmux.hasSession(resolved.sessionName))) {
    return this.restartRunnerWithFreshSessionIdForNewCommand(target);
  }
  return this.triggerNewSessionInLiveRunner(resolved);
}
```

**Guard to add at top of triggerNewSession (before hasSession check):**
```typescript
// For runners with explicit session IDs and no capture-mode, skip live
// rotation (which requires /status command) and restart with fresh ID instead.
// Pi has create.mode: "explicit" + capture.mode: "off".
const skipLiveRotation = (
  resolved.runner.sessionId.capture.mode === "off" &&
  resolved.runner.sessionId.create.mode === "explicit"
);
if (skipLiveRotation) {
  return this.restartRunnerWithFreshSessionIdForNewCommand(target);
}
```

---

### Fix 2: retryFreshStartAfterStoredResumeFailure gate (src/agents/runtime/runner-service.ts, ~line 351–356)

**Analog context:** `src/agents/runtime/runner-service.ts` lines 341–375 (retryFreshStartAfterStoredResumeFailure function)

**Current gate** (lines 351–356):
```typescript
if (
  resolved.runner.sessionId.resume.mode !== "command" ||
  resolved.runner.sessionId.create.mode !== "runner"
) {
  return null;
}
```

**Change to:**
```typescript
if (
  resolved.runner.sessionId.resume.mode !== "command" ||
  (resolved.runner.sessionId.create.mode !== "runner" &&
   resolved.runner.sessionId.create.mode !== "explicit")
) {
  return null;
}
```

**Rationale:** Explicit IDs are clisbot-owned like runner-created IDs; both can be preserved across resumption crashes.

---

### Fix 3: Add dropPiPromptBlocks (src/runners/transcript/transcript-normalization.ts, ~line 368)

**Direct analog:** `src/runners/transcript/transcript-normalization.ts` lines 366–368 (dropGeminiPromptBlocks)

**Analog code** (lines 307–368):
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

function dropCodexPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /^\s*›\s/);
}

function dropClaudePromptBlocks(lines: string[]) {
  // ... special handling ...
}

function dropGeminiPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /^\s*>\s/);
}
```

**New function to add after dropGeminiPromptBlocks:**
```typescript
function dropPiPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /^\s*>\s/);
}
```

**Wire into cleanInteractionSnapshotInternal** (lines 608–622):
Currently:
```typescript
const promptStripped = isCodex
  ? dropCodexPromptBlocks(lines)
  : isClaude
    ? dropClaudePromptBlocks(lines)
    : isGemini
      ? dropGeminiPromptBlocks(lines)
      : lines;
```

Change to:
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

---

### Fix 4: Add help-bar drops to shouldDropPiChromeLine (src/runners/transcript/transcript-normalization.ts, ~line 547–562)

**Analog context:** `src/runners/transcript/transcript-normalization.ts` lines 509–545 (shouldDropGeminiChromeLine)

**Current shouldDropPiChromeLine** (lines 547–562):
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

**Add these checks to the return statement (before final closing paren):**
```typescript
trimmed.includes('Type your message') ||
trimmed.includes('run /help') ||
```

These match the detection signals in `looksLikePiSnapshot` (lines 214–215) so they won't leak as output.

---

### Fix 5: Remove Warning/Note rule (src/runners/transcript/transcript-normalization.ts, line 554)

**Location:** `src/runners/transcript/transcript-normalization.ts` line 554

**Remove this line:**
```typescript
/^(?:Warning|Note):\s/i.test(trimmed) ||
```

**Reason:** These startup blockers are handled by `startupBlockers` in template before normalization runs. Filtering here strips legitimate AI content like "Warning: this command is destructive."

---

### Fix 6: Tighten looksLikePiSnapshot (src/runners/transcript/transcript-normalization.ts, lines 208–219)

**Analog context:** `src/runners/transcript/transcript-normalization.ts` lines 195–206 (looksLikeGeminiSnapshot)

**Current looksLikePiSnapshot** (lines 208–219):
```typescript
export function looksLikePiSnapshot(lines: string[]) {
  return lines.some((line) => {
    const trimmed = line.trim()
    return (
      trimmed.includes('Welcome to pi') ||
      /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
      trimmed.includes('Type your message') ||
      trimmed.includes('run /help') ||
      trimmed === '>'
    )
  })
}
```

**Remove the final condition:**
```typescript
trimmed === '>'
```

**Result:**
```typescript
export function looksLikePiSnapshot(lines: string[]) {
  return lines.some((line) => {
    const trimmed = line.trim()
    return (
      trimmed.includes('Welcome to pi') ||
      /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
      trimmed.includes('Type your message') ||
      trimmed.includes('run /help')
    )
  })
}
```

**Reason:** Bare `>` (Bash PS2, heredoc, markdown blockquote) is too ambiguous. Pi detection should rely on uniquely-pi markers (version header, welcome, help-bar). The `>` idle prompt is already handled by `dropPiPromptBlocks` (Fix 3) and `shouldDropPiChromeLine` (Fix 4).

---

### Fix 8: buildRunnerFromToolTemplate resume args (src/config/runtime/agent-tool-presets.ts, lines 249–275)

**Analog context:** `src/config/runtime/agent-tool-presets.ts` lines 220–247 (codex branch override pattern)

**Current non-codex branch** (lines 249–275):
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
      args: ["--resume", "{sessionId}", ...options],  // <-- PROBLEM: reconstructs from scratch
    },
  },
};
```

**Why codex special-cases** (lines 220–246):
```typescript
if (toolId === "codex") {
  // ... codex has a documented reason to override resume args ...
  resume: {
    ...template.sessionId.resume,
    args: ["resume", "{sessionId}", ...options, "-C", "{workspace}"],
  },
}
```

**Fix for non-codex (apply template substitution only, preserve template args):**
```typescript
resume: {
  ...template.sessionId.resume,
  args: template.sessionId.resume.args.map((arg) =>
    applyTemplate(arg, {
      agentId: "", // placeholder, not used in resume.args
      workspace: "", // placeholder, not used in resume.args
      sessionName: "", // placeholder, not used in resume.args
      sessionKey: "", // placeholder, not used in resume.args
      sessionId: "{sessionId}", // will be substituted at launch
    })
  ),
},
```

**Alternative simpler approach:** Call `applyTemplate` with minimal context on each arg. Pi's template declares `["--resume", "{sessionId}", "--dangerously-skip-permissions"]` and it should be preserved.

---

## Shared Patterns

### Guard Pattern: Mode and Create.mode Conditions
**Source:** `src/agents/runtime/runner-service.ts` lines 115–120
**Apply to:** Fix 1 (triggerNewSession guard)

```typescript
// Two-part condition checking both resume.mode and create.mode
const skipLiveRotation = (
  resolved.runner.sessionId.capture.mode === "off" &&
  resolved.runner.sessionId.create.mode === "explicit"
);
```

### Gate Expansion Pattern
**Source:** `src/agents/runtime/runner-service.ts` lines 351–356
**Apply to:** Fix 2 (retryFreshStartAfterStoredResumeFailure)

When a gate rejects a valid case, widen the condition using OR:
```typescript
if (
  resolved.runner.sessionId.resume.mode !== "command" ||
  (resolved.runner.sessionId.create.mode !== "runner" &&
   resolved.runner.sessionId.create.mode !== "explicit")
) {
  return null;
}
```

### Prompt Block Drop Pattern
**Source:** `src/runners/transcript/transcript-normalization.ts` lines 307–368
**Apply to:** Fix 3 (dropPiPromptBlocks)

All prompt drops follow the same structure:
1. Helper function `dropPromptBlocks(lines, marker)` handles recursion
2. Language-specific function calls helper with language-specific regex
3. Wired into `cleanInteractionSnapshotInternal` dispatch block

```typescript
function dropPromptBlocks(lines: string[], marker: RegExp) {
  // Generic logic that skips block + continuations
}

function dropXxxPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /pattern/);
}
```

### Chrome Line Drop Pattern
**Source:** `src/runners/transcript/transcript-normalization.ts` lines 509–545 (shouldDropGeminiChromeLine)
**Apply to:** Fix 4 (shouldDropPiChromeLine additions)

Return block of OR'd conditions, each testing a chrome marker:
```typescript
function shouldDropXxxChromeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  return (
    trimmed.includes("pattern1") ||
    trimmed.includes("pattern2") ||
    /^regex/.test(trimmed) ||
    // ... more conditions
  );
}
```

### Snapshot Detection Pattern
**Source:** `src/runners/transcript/transcript-normalization.ts` lines 195–219
**Apply to:** Fix 6 (looksLikePiSnapshot tightening)

Detection should use high-confidence unique markers:
- Version strings (`pi v`, `claude code v`, `gemini cli v`)
- Welcome banners
- Help-bar text
- NOT bare single characters like `>`

---

## Test Patterns

### Runner Service Integration Test Pattern
**Source:** `test/runner-service.integration.test.ts` lines 100–174 (pi runner template tests)

**Describe block pattern:**
```typescript
describe('pi runner template', () => {
  test('template property exists and has correct value', () => {
    expect(DEFAULT_AGENT_TOOL_TEMPLATES['pi']).toBeDefined()
    expect(DEFAULT_AGENT_TOOL_TEMPLATES['pi'].command).toBe('pi')
  })

  test('nested property structure matches expectation', () => {
    expect(DEFAULT_AGENT_TOOL_TEMPLATES['pi'].sessionId.create.mode).toBe('explicit')
  })

  test('deepEqual array or object properties', () => {
    expect(DEFAULT_AGENT_TOOL_TEMPLATES['pi'].sessionId.create.args)
      .toEqual(['--session', '{sessionId}'])
  })

  test('regex pattern compilation works', () => {
    const pattern = template.startupReadyPattern
    expect(new RegExp(pattern!).test('test string')).toBe(true)
  })
})
```

**For Fix 1 + Fix 2 tests:** Follow the existing `ensureSessionReady` pattern in runner-service tests, adding:
- Negative case: pi runner with no session (should call restartRunnerWithFreshSessionIdForNewCommand directly)
- Positive case: recovery after resume failure (should preserve explicit sessionId)

### Chrome Test Pattern
**Source:** `test/text/text-cleaning-chrome.suite.ts` lines 24–234

**Test structure for chrome stripping:**
```typescript
describe("snapshot shaping", () => {
  test("drops xxxxx chrome while keeping meaningful content", () => {
    const cleaned = cleanInteractionSnapshot(`
[raw snapshot with chrome and response]
    `);

    expect(cleaned).toContain("meaningful response");
    expect(cleaned).not.toContain("chrome marker");
  });
})
```

**For Fix 3–6 tests:**
- Positive: pi snapshot with prompt echo (`> message`) — should be dropped (Fix 3)
- Positive: pi snapshot with help-bar text — should be dropped (Fix 4)
- Negative: legitimate AI response with "Warning:" or "Note:" — should be kept (Fix 5)
- Negative: non-pi snapshot with bare `>` — should NOT be classified as pi (Fix 6)

---

## No Analog Found

All patterns found in existing codebase. No files required external pattern references.

---

## Metadata

**Analog search scope:** src/agents/runtime/, src/config/runtime/, src/runners/transcript/, test/
**Files scanned:** 5 source files, 2 test files
**Pattern extraction date:** 2026-05-26

---

## Implementation Notes

### Fix 1 Execution Order
1. Read current `triggerNewSession` (line 821–827)
2. Add guard check at top (before `hasSession` check)
3. Early return to `restartRunnerWithFreshSessionIdForNewCommand` if guard matches
4. Fallthrough to `triggerNewSessionInLiveRunner` for other runners

### Fix 2 Execution Order
1. Read `retryFreshStartAfterStoredResumeFailure` (line 341–375)
2. Locate gate condition (line 351–356)
3. Expand OR condition to include `create.mode === "explicit"`
4. No change to surrounding code

### Fix 3–6 Execution Order
These can run in parallel (same file, non-overlapping):
- **Wave 1:** Fix 5 (remove line 554) + Fix 6 (remove line 216) — removals only
- **Wave 2:** Fix 3 (add dropPiPromptBlocks after line 368, wire into dispatch) + Fix 4 (add help-bar checks to shouldDropPiChromeLine)

### Fix 8 Execution Order
1. Read `buildRunnerFromToolTemplate` function (line 213–275)
2. Understand codex branch special-case (line 220–246)
3. Modify non-codex resume.args from reconstruction to template preservation
4. Add comment explaining why codex needs override

### Test Ordering
- **Fix 1 + Fix 2 tests:** Add to `test/runner-service.integration.test.ts`, new describe block for guard/gate scenarios
- **Fix 3–6 tests:** Add to `test/text/text-cleaning-chrome.suite.ts`, new describe block for pi chrome validation
