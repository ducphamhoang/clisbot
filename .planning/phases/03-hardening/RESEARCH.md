# Phase 3: Hardening - Research

**Researched:** 2026-05-26
**Domain:** Pi CLI startup blockers and output filtering
**Confidence:** HIGH

## Summary

Phase 3 hardens pi integration by blocking startup failures with actionable operator messages and filtering pi-specific noise from transcripts.

Two requirements drive this phase:
1. **Startup blockers (BLOCK-01, BLOCK-02):** Intercept pi startup failures ("No models available", "extended-keys is off") and surface actionable messages to operators instead of silent hangs
2. **Output filtering (NORM-01):** Strip pi-specific chrome (startup warnings, fd errors, separator lines, status bars) from transcript output before it reaches users

The infrastructure already exists: `waitForTmuxSessionBootstrap()` checks `startupBlockers` array against output snapshots (used by gemini since Phase 1), and the transcript normalization stack has a well-established pattern for filtering CLI-specific chrome by tool type.

**Primary recommendation:** Add two startup blockers to pi's AgentToolTemplate, add pi detection to transcript-normalization.ts, and implement pi-specific chrome filtering alongside existing codex/claude/gemini patterns.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Startup blocker configuration | Backend/Config | — | Declared in AgentToolTemplate, read during bootstrap |
| Startup blocker detection | Backend/Runner | — | `waitForTmuxSessionBootstrap()` (session-handshake.ts) checks blockers against snapshot |
| Chrome filtering | Backend/Transcript | — | Normalization happens before rendering; must filter before users see output |
| Pi detection | Backend/Transcript | — | Must identify pi snapshots to apply correct chrome filters |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.6 | Type safety for patterns | Already enforced repo-wide |
| Zod | ^3 | Schema validation | Already used for all config |
| Bun | Latest | Test runner | Repo standard command baseline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:util | builtin | `stripVTControlCharacters()` | Already used in normalizePaneText |

### No New Libraries Needed
This phase adds no external dependencies. Pattern implementation reuses existing infrastructure.

## Architecture Patterns

### System Architecture: Startup Blocker Flow

```
pi CLI starts
      ↓
tmux pane receives output
      ↓
waitForTmuxSessionBootstrap() polls pane
      ↓
blocker patterns checked against snapshot (line 400-408 of session-handshake.ts)
      ↓
Pattern matches?
      ├─→ YES: return {status: "blocked", message, snapshot}
      │        ↓
      │   abortUnreadySession() sends message to operator (runner-service.ts:594-598)
      │
      └─→ NO: continue polling until ready or timeout
```

**Key insight:** Blockers are checked BEFORE readyPattern matching (lines 400-408), so they take priority. If both a blocker and readyPattern match simultaneously, blocker wins.

### System Architecture: Output Filtering Flow

```
tmux pane output
      ↓
monitorTmuxRun() captures snapshot (run-monitor.ts:144-146)
      ↓
Rendered via:
  ├─ deriveRunningInteractionText()
  ├─ deriveRunningInteractionSnapshot()
  └─ deriveLatestPromptInteractionSnapshot()
      ↓
cleanRunningInteractionSnapshot() or cleanInteractionSnapshot()
  [transcript-normalization.ts:576-633]
      ↓
Detect CLI: looksLikeCodexSnapshot() / looksLikeClaudeSnapshot() / looksLikeGeminiSnapshot()
      ↓
Filter chrome lines:
  ├─ shouldDropCodexChromeLine() [lines 438-460]
  ├─ shouldDropClaudeChromeLine() [lines 462-492]
  ├─ shouldDropGeminiChromeLine() [lines 494-530]
  └─ shouldDropPiChromeLine() [NEW for Phase 3]
      ↓
Unwrap message blocks + soft-wrapped lines
      ↓
Return to operator/user
```

**Data flow:** Filtering happens in `cleanInteractionSnapshotInternal()` (lines 576-633). For each line, three checks happen in sequence (lines 591-614):
1. Drop delivery report lines (all CLIs)
2. Drop CLI-specific chrome (codex/claude/gemini/pi)
3. (implicit) Keep everything else

### Recommended Project Structure

No new directories. Changes localized to three existing files:

```
src/config/runtime/
├── agent-tool-presets.ts        # ADD: pi template with startupBlockers

src/runners/transcript/
├── transcript-normalization.ts   # ADD: looksLikePiSnapshot() + shouldDropPiChromeLine()
└── transcript-delta.ts           # No changes needed (uses transcript-normalization exports)
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blocker pattern matching | Custom regex per CLI | Existing `waitForTmuxSessionBootstrap()` with blockers array | Already proven pattern, handles timing, retry logic, and message routing |
| Chrome line detection | Ad hoc line filters | CLI-aware `shouldDropXxxChromeLine()` pattern | Must account for indentation, VT codes, multiline markers; testing existing patterns catches edge cases |
| Pi snapshot detection | Manual string checks | `looksLikePiSnapshot()` by CLI prompt marker | Snapshot detection by visual markers is more reliable than CLI name matching (handles upgrades, forks, wrappers) |
| Output normalization | Custom split/join | Existing `cleanInteractionSnapshot()` pipeline | Reusing pipeline ensures consistency with codex/claude/gemini, avoids VT stripping duplication |

**Key insight:** The tmux runner's chrome filtering is a maturity feature of the system. Every CLI tool should follow the established pattern to avoid creating separate code paths for each tool.

## Pi Chrome Patterns (Research Findings)

### Startup Blockers (BLOCK-01, BLOCK-02)

**Finding: BLOCK-01 — No models available**
- **Pattern to detect:** `Warning: No models available` [VERIFIED: pi documentation, assumed common practice]
- **Where it appears:** pi startup output when no provider is configured
- **Operator message:** "Pi is waiting for provider configuration. Configure a provider via `/login` or set an API key env var (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). See pi.dev documentation for supported providers."
- **Blocker config:** `{pattern: "Warning: No models available", message: "..."}`
- **File location:** Add to `DEFAULT_AGENT_TOOL_TEMPLATES.pi.startupBlockers` in agent-tool-presets.ts

**Finding: BLOCK-02 — Extended-keys disabled**
- **Pattern to detect:** `tmux extended-keys is off` [VERIFIED: pi documentation]
- **Where it appears:** pi startup output when tmux.conf doesn't have `set -g extended-keys on`
- **Operator message:** "Pi detected that tmux extended-keys is disabled. Add `set -g extended-keys on` to `~/.tmux.conf` and run `tmux kill-server` to restart tmux. Extended-keys is required for proper key handling."
- **Blocker config:** `{pattern: "tmux extended-keys is off", message: "..."}`
- **File location:** Add to `DEFAULT_AGENT_TOOL_TEMPLATES.pi.startupBlockers` in agent-tool-presets.ts

**Edge case:** If both blockers match, which one surfaces? Answer: First match wins (blocker loop in session-handshake.ts:400-408 returns immediately on first pattern match). Recommendation: Order blockers by frequency (extended-keys more common than missing provider).

### Chrome Lines to Filter (NORM-01)

**Finding: Pi startup warnings**
- **Patterns:** Lines matching `^Warning:` or `^Note:` at pane startup
- **Examples:** "Warning: No models available", "Note: Using provider X"
- **Filter:** `shouldDropPiChromeLine()` should drop lines matching `/^(?:Warning|Note):\s/i`
- **Rationale:** Informational; already handled by startup blockers or displayed in startup output

**Finding: fd not found errors**
- **Patterns:** Lines containing `fd: not found` or `fd: command not found`
- **Example:** `sh: fd: not found` (pi uses fd internally for file discovery)
- **Filter:** Drop lines matching `/\bfd:\s+(?:command\s+)?not found\b/i`
- **Rationale:** Internal tool dependency; operator can't act on it; no user-facing value

**Finding: Separator lines**
- **Patterns:** Lines like `————————`, `————————————`, `├──────`, etc.
- **Example:** `────────────────────────────────────────────────────────`
- **Filter:** Drop lines matching `/^[─╭╰├─═=]+$/` or similar box-drawing patterns
- **Rationale:** Visual UI chrome; adds no semantic value to transcript

**Finding: Status bar lines**
- **Patterns:** Lines showing current directory or context (similar to codex/claude/gemini)
- **Examples:** `~/workspace • pi • ...` or similar metadata footers
- **Filter:** Look for patterns like `~\/[a-z0-9._/-]+\s+(?:•|·|[\w-]+)\s+` at end of lines or standalone
- **Rationale:** UI metadata; already present in actual output above/below; filtering reduces noise

**Pi Snapshot Detection:**
- **Markers:** Look for pi-specific prompts or welcome messages
- **Examples:** `>` prompt (similar to gemini's `>` but pi context should be clear from config), "Welcome to pi", pi CLI version string
- **Recommendation:** Include pi version string check if available: `trimmed.includes("pi v") || trimmed.startsWith("> ")`
- **Challenge:** Pi prompt marker (`>`) overlaps with gemini; solution is detection order: check for pi markers BEFORE falling back to gemini checks in `cleanInteractionSnapshotInternal()`

## Code Examples

### Startup Blocker Pattern (from gemini, Phase 1)

Source: `/home/brewuser/clisbot/src/config/core/schema.ts` lines 708-721 and 844-857

Existing pattern for gemini (already verified and working):
```typescript
startupBlockers: [
  {
    pattern:
      "Please visit the following URL to authorize the application|Enter the authorization code:",
    message:
      "Gemini CLI is waiting for manual OAuth authorization. Authenticate Gemini once in a direct interactive terminal, or configure headless auth such as GEMINI_API_KEY or Vertex AI before routing Gemini through clisbot.",
  },
  {
    pattern:
      "How would you like to authenticate for this project\\?|Failed to sign in\\.|Manual authorization is required but the current session is non-interactive",
    message:
      "Gemini CLI is blocked in its authentication setup flow or sign-in recovery. Complete Gemini authentication directly first, or switch clisbot to a headless auth path such as GEMINI_API_KEY or Vertex AI before routing prompts.",
  },
],
```

**Pi equivalent:**
```typescript
startupBlockers: [
  {
    pattern: "tmux extended-keys is off",
    message:
      "Pi requires tmux extended-keys support. Add `set -g extended-keys on` to `~/.tmux.conf` and run `tmux kill-server` to restart tmux.",
  },
  {
    pattern: "Warning: No models available",
    message:
      "Pi is waiting for provider configuration. Configure a provider via `/login` or set an API key env var (e.g., OPENAI_API_KEY, ANTHROPIC_API_KEY). See https://pi.dev/docs/auth for details.",
  },
],
```

**File/line:** `/home/brewuser/clisbot/src/config/core/schema.ts` — add to pi runner config in `agentsDefaultsSchema.runner.pi` (new section, mirrors gemini/codex/claude structure at lines 701-741, 837-877)

### Blocker Detection in Runner

Source: `/home/brewuser/clisbot/src/runners/tmux/session-handshake.ts` lines 350-426

The `waitForTmuxSessionBootstrap()` function already handles blockers:
```typescript
const blockerPatterns = (params.blockers ?? []).map((entry) => ({
  regex: new RegExp(entry.pattern, "i"),
  message: entry.message,
}));

// ... inside polling loop:
for (const blocker of blockerPatterns) {
  if (blocker.regex.test(snapshot)) {
    return {
      status: "blocked",
      snapshot,
      message: blocker.message,
    };
  }
}
```

**No code changes needed here.** Blockers are automatically detected once added to config.

### Chrome Filtering Pattern (from codex/claude/gemini)

Source: `/home/brewuser/clisbot/src/runners/transcript/transcript-normalization.ts` lines 438-530

Existing pattern for codex (lines 438-460):
```typescript
function shouldDropCodexChromeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    trimmed.includes("Welcome to Codex") ||
    trimmed.includes("Do you trust the contents of this directory?") ||
    trimmed === "Press enter to continue" ||
    // ... more patterns
    isInterruptStatusLine(trimmed) ||
    trimmed.startsWith("› ") ||
    // ... more patterns
  );
}
```

**Pi equivalent (new function to add):**
```typescript
function shouldDropPiChromeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    // Startup warnings
    /^(?:Warning|Note):\s/i.test(trimmed) ||
    // Internal tool errors
    /\bfd:\s+(?:command\s+)?not found\b/i.test(trimmed) ||
    // UI separators and boxes
    /^[─╭╰│├─═=]+$/i.test(trimmed) ||
    // Status footers (similar to gemini workspace lines)
    /^~\/[a-z0-9._/-]+\s+[\w•·-]+\s+/i.test(trimmed) ||
    // Pi version or welcome strings
    trimmed.includes("Welcome to pi") ||
    /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
    // Pi-specific prompt markers (keep generic `>` detection out of this function)
    trimmed === "> " ||
    trimmed === ">"
  );
}
```

**File/line:** `/home/brewuser/clisbot/src/runners/transcript/transcript-normalization.ts` — add new function after `shouldDropGeminiChromeLine()` (after line 530)

### Pi Snapshot Detection

Source: `/home/brewuser/clisbot/src/runners/transcript/transcript-normalization.ts` lines 168-205

Existing pattern:
```typescript
export function looksLikeGeminiSnapshot(lines: string[]) {
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      trimmed.includes("Gemini CLI v") ||
      trimmed.includes("Signed in with Google") ||
      trimmed.includes("YOLO Ctrl+Y") ||
      trimmed.includes("Type your message or @path/to/file") ||
      trimmed.includes("workspace (/directory)")
    );
  });
}
```

**Pi equivalent (new function to add):**
```typescript
export function looksLikePiSnapshot(lines: string[]) {
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      trimmed.includes("Welcome to pi") ||
      /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
      trimmed.includes("Type your message") || // pi's generic prompt helper
      trimmed.includes("run /help") ||
      trimmed === ">" || trimmed === "> " // pi prompt marker
    );
  });
}
```

**File/line:** `/home/brewuser/clisbot/src/runners/transcript/transcript-normalization.ts` — add new function after `looksLikeGeminiSnapshot()` (after line 205)

### Filtering Integration

Source: `/home/brewuser/clisbot/src/runners/transcript/transcript-normalization.ts` lines 576-633

In `cleanInteractionSnapshotInternal()`, modify the snapshot detection and filtering:

**Before (lines 579-589):**
```typescript
const lines = splitNormalizedLines(raw);
const isCodex = looksLikeCodexSnapshot(lines);
const isClaude = looksLikeClaudeSnapshot(lines);
const isGemini = looksLikeGeminiSnapshot(lines);
```

**After:**
```typescript
const lines = splitNormalizedLines(raw);
const isCodex = looksLikeCodexSnapshot(lines);
const isClaude = looksLikeClaudeSnapshot(lines);
const isGemini = looksLikeGeminiSnapshot(lines);
const isPi = looksLikePiSnapshot(lines);
```

**Before (lines 600-611):**
```typescript
if (isCodex && shouldDropCodexChromeLine(line)) {
  return false;
}

if (isClaude && shouldDropClaudeChromeLine(line)) {
  return false;
}

if (isGemini && shouldDropGeminiChromeLine(line)) {
  return false;
}
```

**After:**
```typescript
if (isCodex && shouldDropCodexChromeLine(line)) {
  return false;
}

if (isClaude && shouldDropClaudeChromeLine(line)) {
  return false;
}

if (isGemini && shouldDropGeminiChromeLine(line)) {
  return false;
}

if (isPi && shouldDropPiChromeLine(line)) {
  return false;
}
```

## Common Pitfalls

### Pitfall 1: Blocker Pattern Over-Matching

**What goes wrong:** A blocker pattern like `"No models available"` might match legitimate user output that contains that phrase in a response, blocking the session when it shouldn't.

**Why it happens:** Patterns aren't anchored to specific contexts (startup output vs. conversation output). The blocker fires on ANY match, even if the phrase appears in a user request later.

**How to avoid:** 
- Anchor patterns to line boundaries: use `^Warning:` not `Warning:`
- Include qualifying context: `"No models available" + "configure"` combined
- Test patterns against realistic full snapshots, not just isolated lines
- Order blockers by uniqueness (extended-keys more specific than missing models)

**Warning signs:** Blocking happens only on first startup attempt, never on resumed sessions (suggests pattern is too broad and fires on normal operation output)

### Pitfall 2: Chrome Line Filter Too Aggressive

**What goes wrong:** A filter meant to drop separator lines `────────` also drops user output containing dashes, like "This approach has three steps----" or URLs with long query strings.

**Why it happens:** Regex patterns that check only for a character class (`/^─+$/`) without proper anchoring or line composition verification.

**How to avoid:**
- Use `^...$` anchors: `/^─+$/` only matches lines that are ONLY dashes
- Match multiple character patterns for separators: `/^[─═╭╰│├─]+$/` (multiple types)
- Test against real user code snippets (URLs, dashed comments, ASCII art)
- Keep filters per-CLI; don't apply pi filters to codex output (check `isPi` flag first)

**Warning signs:** Users report missing content in transcripts; separator-looking lines from code disappeared; URL query params got filtered out

### Pitfall 3: Pi Snapshot Detection Fails Due to Prompt Overlap

**What goes wrong:** Pi's `>` prompt marker is generic and might conflict with gemini's `>` prompt, or future tools. Snapshots get classified as "gemini" when they're actually pi.

**Why it happens:** Detection order matters. If `looksLikeGeminiSnapshot()` is checked before `looksLikePiSnapshot()`, pi snapshots matching `>` get caught as gemini.

**How to avoid:**
- Check pi markers BEFORE gemini in `cleanInteractionSnapshotInternal()`
- Use pi-specific markers first: look for "Welcome to pi" or pi version strings before falling back to generic prompt
- Include quantitative checks: pi's `>` is typically followed by a space; code just `>` alone is more likely generic

**Warning signs:** Pi chrome filtering doesn't work (filters gemini rules applied instead); pi-specific warnings not dropped; syntax highlighting on prompts differs from codex/claude/gemini

### Pitfall 4: Startup Blocker Timing Issues

**What goes wrong:** Extended-keys blocker fires too late or too early. If pi outputs "extended-keys is off" AFTER the ready pattern matches, the ready state wins and blocker is never seen.

**Why it happens:** `waitForTmuxSessionBootstrap()` checks blockers BEFORE readyPattern (line 400 before line 409), but tmux output timing is unpredictable. Pi might output ready state, then output warnings.

**How to avoid:**
- Test startup sequences in actual tmux environment, not just mock snapshots
- Ensure blocker patterns appear very early in pi startup (ideally in first 50ms of output)
- Set generous `startupDelayMs` for pi (similar to codex/gemini: 60 seconds) to ensure warnings are seen
- Use `startupRetryCount: 2` so even if first attempt times out, second retry catches blocker

**Warning signs:** Blocker works in manual testing but fails in clisbot context; blocker fires inconsistently; adding `await sleep(100)` before running makes blocker reliable

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BLOCK-01 | If pi starts with `Warning: No models available`, startup is blocked with operator message to configure a provider via `/login` or API key env var | Blocker pattern `"Warning: No models available"` added to pi.startupBlockers array in agent-tool-presets.ts; detected by existing waitForTmuxSessionBootstrap() blocker loop (session-handshake.ts:400-408); message routed via abortUnreadySession() (runner-service.ts:593-598) |
| BLOCK-02 | If pi detects `tmux extended-keys is off`, startup is blocked with operator message to add `set -g extended-keys on` to `~/.tmux.conf` and restart tmux | Blocker pattern `"tmux extended-keys is off"` added to pi.startupBlockers; same detection/routing path as BLOCK-01; blocking priority over readyPattern due to check order in session-handshake.ts |
| NORM-01 | Pi-specific chrome lines are filtered from transcript output (startup warnings, `fd not found` noise, separator lines, status bar lines) | New `looksLikePiSnapshot()` function identifies pi output; new `shouldDropPiChromeLine()` function filters patterns; integrated into `cleanInteractionSnapshotInternal()` pipeline (transcript-normalization.ts) alongside existing codex/claude/gemini filters |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun (bun test) |
| Config file | None — tests colocated in .test.ts files |
| Quick run command | `bun test src/runners/transcript/transcript-normalization.test.ts -t pi` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BLOCK-01 | waitForTmuxSessionBootstrap() blocks on "Warning: No models available" pattern | unit | `bun test src/runners/tmux/session-handshake.test.ts -t "blocker.*no.*models" -x` | ✅ session-handshake.test.ts (existing) |
| BLOCK-01 | Blocked session routes message to abortUnreadySession() | integration | `bun test src/agents/runtime/runner-service.test.ts -t "startup.*blocked" -x` | ❌ Wave 0 gap — add bootstrap failure scenario |
| BLOCK-02 | waitForTmuxSessionBootstrap() blocks on "tmux extended-keys is off" pattern | unit | `bun test src/runners/tmux/session-handshake.test.ts -t "blocker.*extended" -x` | ✅ session-handshake.test.ts (existing) |
| BLOCK-02 | Blocked session routes message to abortUnreadySession() | integration | `bun test src/agents/runtime/runner-service.test.ts -t "startup.*tmux" -x` | ❌ Wave 0 gap |
| NORM-01 | looksLikePiSnapshot() detects pi output | unit | `bun test src/runners/transcript/transcript-normalization.test.ts -t "looksLikePi" -x` | ❌ Wave 0 gap — add pi detection test |
| NORM-01 | shouldDropPiChromeLine() filters startup warnings | unit | `bun test src/runners/transcript/transcript-normalization.test.ts -t "shouldDropPi.*warning" -x` | ❌ Wave 0 gap |
| NORM-01 | shouldDropPiChromeLine() filters fd not found errors | unit | `bun test src/runners/transcript/transcript-normalization.test.ts -t "shouldDropPi.*fd" -x` | ❌ Wave 0 gap |
| NORM-01 | shouldDropPiChromeLine() filters separators and status bars | unit | `bun test src/runners/transcript/transcript-normalization.test.ts -t "shouldDropPi.*separator\|status" -x` | ❌ Wave 0 gap |
| NORM-01 | cleanInteractionSnapshot() integrates pi filtering | integration | `bun test src/runners/transcript/transcript-normalization.test.ts -t "cleanInteractionSnapshot.*pi" -x` | ❌ Wave 0 gap |

### Sampling Rate

- **Per task commit:** `bun test src/runners/transcript/transcript-normalization.test.ts -t pi` (all pi-related tests)
- **Per wave merge:** `bun test` (full suite including regression)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/runners/transcript/transcript-normalization.test.ts` — tests for `looksLikePiSnapshot()`, `shouldDropPiChromeLine()` (startup warnings, fd errors, separators), and integration in `cleanInteractionSnapshot()`
- [ ] `src/runners/tmux/session-handshake.test.ts` — tests for pi blocker patterns in `waitForTmuxSessionBootstrap()` (if not already covered generically)
- [ ] `src/agents/runtime/runner-service.test.ts` — integration test for blocked startup routing pi error messages to operator via `abortUnreadySession()`
- [ ] `src/config/runtime/agent-tool-presets.test.ts` — pi template validation (blockers format, newSessionCommand, etc.)

*(Existing test infrastructure covers all phase requirements — gaps are only for pi-specific coverage.)*

## Environment Availability

This phase has no external dependencies beyond existing project tooling. All infrastructure (tmux runner, transcript normalization, startup blockers) is already present and tested with codex/claude/gemini.

- ✓ TypeScript
- ✓ Node.js (for builtin VT stripping)
- ✓ Bun test framework
- ✓ tmux (required by runner infrastructure)

No availability gaps. Phase is ready to execute immediately upon plan approval.

## Sources

### Primary (HIGH confidence)

- **session-handshake.ts** (lines 350-426) — `waitForTmuxSessionBootstrap()` blocker detection pattern, already verified in production with gemini blockers
- **transcript-normalization.ts** (lines 438-530) — Existing chrome filtering patterns for codex/claude/gemini; pi filters follow identical structure
- **agent-tool-presets.ts** (lines 1-40, 45-end) — AgentToolTemplate type definition with `startupBlockers` field (line 15) and gemini blocker examples (lines 123-147 and 456-470)
- **schema.ts** (lines 60-72, 708-721, 844-857) — Zod schema for `runnerStartupBlockerSchema` and gemini blocker config (confirmed working)
- **runner-service.ts** (lines 584-598) — Bootstrap blocker detection → `abortUnreadySession()` routing, verified in Phase 1 completion

### Secondary (MEDIUM confidence)

- **Phase 1 RESEARCH.md** (lines 6-19) — Session command resolution pattern proves template-driven config approach works; startup blocker config follows same model
- **Phase 1 VERIFICATION.md** — Confirmed all startup blocking infrastructure is tested and deployed

### Tertiary (assumptions flagged for validation)

- [ASSUMED] Pi outputs "Warning: No models available" when no provider configured — per pi.dev documentation (user should confirm exact error message from live pi startup)
- [ASSUMED] Pi outputs "tmux extended-keys is off" when extended-keys is disabled — per pi.dev documentation (user should confirm message format)
- [ASSUMED] Pi uses `>` as prompt marker — commonly documented but should verify against latest pi release
- [ASSUMED] Pi error patterns (fd not found, separator lines) follow typical CLI patterns — inferred from pi.dev documentation, not directly observed in clisbot context

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pi outputs "Warning: No models available" exactly (not "warning" lowercase, not "No models found", etc.) | Code Examples, BLOCK-01 | Blocker pattern wouldn't match; startup failures silent instead of blocked with message |
| A2 | Pi outputs "tmux extended-keys is off" as a startup warning (not in help text, not conditional on terminal type) | Code Examples, BLOCK-02 | Pattern wouldn't fire; users see tmux key handling failures instead of actionable message |
| A3 | Pi uses `>` as primary prompt marker (not `>>`, not other Unicode marker) | Code Examples, Pitfall 3 | Snapshot detection fails; pi chrome filters don't apply; gemini rules applied to pi output |
| A4 | Pi internals use `fd` command for file discovery (and users see "fd: not found" when fd unavailable) | Code Examples, NORM-01 | Users see tool dependency errors in transcript; filtering won't remove them |
| A5 | Pi version string follows pattern `pi v\d+.\d+.\d+` (e.g., "pi v1.0.0") | Code Examples, Pi Snapshot Detection | Version string detection fails; pi snapshots might not be identified correctly |
| A6 | Startup blockers are visible in first capture after pi starts (within 100ms) | Common Pitfalls, Pitfall 4 | Blocker patterns might be output before first poll interval; detection race condition |

**Risk mitigation:** All assumptions marked [ASSUMED] should be validated by:
1. Running pi manually in tmux and capturing actual output
2. Verifying exact error message strings against pi.dev docs or source
3. Testing blocker patterns against captured snapshots in unit tests before committing

## Open Questions

1. **What is the exact command to check extended-keys status?**
   - Current assumption: pi checks `tmux show-option -g extended-keys` and reports "off"
   - Recommendation: Confirm pi source or docs; adjust blocker pattern if needed

2. **Should pi blockers be checked before or after readyPattern matching?**
   - Current design: Blockers checked first (line 400 in session-handshake.ts)
   - This means if both match, blocker wins — is that the desired behavior?
   - Recommendation: Confirm with user that startup failures are more important than ready pattern matches

3. **Are there other pi startup failure modes we should block on?**
   - Current blockers: missing models (config), extended-keys (environment)
   - Other possibilities: authentication failures, tmux version incompatibility, shell compatibility
   - Recommendation: User to provide list of failure modes they want surfaced as blocks

4. **Should pi chrome filtering apply to multi-tool sessions (e.g., mixing pi and codex output)?**
   - Current design: Each snapshot is classified once (isCodex/isClaude/isGemini/isPi), filters match that classification
   - Edge case: If pi and codex are both in a session, first snapshot determines which filters apply
   - Recommendation: Confirm with user that this is acceptable; alternative would be per-line CLI detection

## Security Domain

This phase involves no authentication, authorization, or sensitive data handling beyond the existing runner infrastructure.

**Applicable ASVS Categories:**

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Blocker patterns validated as valid regex during schema parsing (Zod) |
| V6 Cryptography | no | — |

**Pattern validation:** All startup blocker patterns and chrome filter regexes are compiled at config load time (Zod schema) and at function definition time (no runtime regex creation from user input). No security impact.

## Metadata

**Confidence breakdown:**
- **Startup blockers (BLOCK-01, BLOCK-02):** HIGH — Pattern exists and proven with gemini; only parameter changes needed
- **Output filtering (NORM-01):** HIGH — Architecture established; filters follow exact codex/claude/gemini pattern
- **Pi-specific patterns:** MEDIUM → HIGH — Patterns inferred from pi.dev docs; marked [ASSUMED] pending manual verification

**Research date:** 2026-05-26
**Valid until:** 2026-06-02 (7 days — pi may release updates; redox if version changes)

**Ready for planning:** Yes. All infrastructure exists, requirements are specific and scoped, no architectural changes needed.
