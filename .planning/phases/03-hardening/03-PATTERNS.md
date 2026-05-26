# Phase 3: Hardening - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 3 files (2 modifications, 1 verify-only)
**Analogs found:** 3 / 3

## Summary

Phase 3 hardens pi integration by adding startup blocker detection and output filtering. The infrastructure for blocker detection already exists and is generic (Phase 2 added pi blockers to agent-tool-presets.ts). Phase 3 only requires:

1. **Verify agent-tool-presets.ts** — Blockers already declared (Phase 2 completed)
2. **Add pi chrome filtering to transcript-normalization.ts** — Two new functions + integration
3. **Verify session-handshake.ts** — Blocker detection is generic, no changes needed

## File Classification

| File | Role | Data Flow | Status | Closest Analog |
|------|------|-----------|--------|----------------|
| `src/config/runtime/agent-tool-presets.ts` | config | request-response | ✅ Already modified (Phase 2) | Gemini blockers (lines 123-136) |
| `src/runners/transcript/transcript-normalization.ts` | utility (filtering) | transform | ⚠️ Needs modification | Codex/Claude/Gemini chrome filters (lines 440-532) |
| `src/runners/tmux/session-handshake.ts` | runner infrastructure | request-response | ✅ Verify only | Generic blocker loop (lines 364-408) |

## Pattern Assignments

### `src/config/runtime/agent-tool-presets.ts` (config, request-response)

**Status:** ✅ **ALREADY MODIFIED IN PHASE 2** (commit d8deb63)

**Analog:** `src/config/runtime/agent-tool-presets.ts` lines 123-136 (Gemini blockers)

**Current pi blockers (lines 165-176):**
```typescript
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
```

**Pattern to copy from:** Gemini blockers structure (lines 123-135) — simple array of `{pattern, message}` objects, patterns are regex-compatible strings compiled at config load time.

**No further changes needed** — Phase 2 already completed this work.

---

### `src/runners/transcript/transcript-normalization.ts` (utility, transform)

**Status:** ⚠️ **NEEDS MODIFICATION** — Add pi snapshot detection and chrome filtering

**Analogs:**
1. Chrome filter pattern: `shouldDropCodexChromeLine()` (lines 440-462)
2. Chrome filter pattern: `shouldDropGeminiChromeLine()` (lines 496-532)
3. Snapshot detection: `looksLikeGeminiSnapshot()` (lines 195-206)
4. Integration pattern: `cleanInteractionSnapshotInternal()` (lines 578-635)

---

#### **Pattern 1: Add looksLikePiSnapshot() detection function**

**Analog:** `looksLikeGeminiSnapshot()` (lines 195-206)

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

**Pi equivalent to add after line 206:**
```typescript
export function looksLikePiSnapshot(lines: string[]) {
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      trimmed.includes("Welcome to pi") ||
      /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
      trimmed.includes("Type your message") ||
      trimmed.includes("run /help") ||
      trimmed === ">" ||
      trimmed === "> "
    );
  });
}
```

**Key pattern:** Check for CLI-specific markers in the snapshot lines. Must be exported for use in `cleanInteractionSnapshotInternal()`.

---

#### **Pattern 2: Add shouldDropPiChromeLine() filtering function**

**Analog:** `shouldDropGeminiChromeLine()` (lines 496-532)

```typescript
function shouldDropGeminiChromeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    trimmed.includes("Gemini CLI v") ||
    trimmed.includes("Signed in with Google") ||
    trimmed.includes("Plan:") ||
    /^[▝▜▄▗▟▀ ]+$/.test(trimmed) ||
    trimmed.includes("We're making changes to Gemini CLI") ||
    // ... more patterns
  );
}
```

**Pi equivalent to add after line 532:**
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
    // Status footers
    /^~\/[a-z0-9._/-]+\s+[\w•·-]+\s+/i.test(trimmed) ||
    // Pi version or welcome strings
    trimmed.includes("Welcome to pi") ||
    /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
    // Pi-specific prompt markers
    trimmed === "> " ||
    trimmed === ">"
  );
}
```

**Key pattern:** Return early if line is empty; test multiple regex and string patterns; order by frequency (most common matches first). Not exported — private to this module.

---

#### **Pattern 3: Integrate pi detection and filtering into cleanInteractionSnapshotInternal()**

**Analog:** `cleanInteractionSnapshotInternal()` (lines 578-635)

**Current code (lines 581-584):**
```typescript
const lines = splitNormalizedLines(raw);
const isCodex = looksLikeCodexSnapshot(lines);
const isClaude = looksLikeClaudeSnapshot(lines);
const isGemini = looksLikeGeminiSnapshot(lines);
```

**Change to:**
```typescript
const lines = splitNormalizedLines(raw);
const isCodex = looksLikeCodexSnapshot(lines);
const isClaude = looksLikeClaudeSnapshot(lines);
const isGemini = looksLikeGeminiSnapshot(lines);
const isPi = looksLikePiSnapshot(lines);
```

**Current code (lines 603-613):**
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

**Change to:**
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

**Key pattern:** Snapshot detection happens once at function start; filtering uses the boolean flag in the per-line filter loop; add pi checks after gemini (order doesn't matter for correctness since each is independent).

---

### `src/runners/tmux/session-handshake.ts` (runner infrastructure, request-response)

**Status:** ✅ **VERIFY ONLY — NO CHANGES NEEDED**

**Analog:** `waitForTmuxSessionBootstrap()` (lines 350-426)

**Current blocker detection pattern (lines 364-408):**
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

**Why no changes needed:**
- Blocker detection is already generic — accepts any array of `{pattern, message}` objects from the config
- Phase 2 added pi's blockers to `DEFAULT_AGENT_TOOL_TEMPLATES["pi"].startupBlockers` (agent-tool-presets.ts lines 165-176)
- `buildRunnerFromToolTemplate()` (agent-tool-presets.ts lines 213-275) passes blockers to the runner, which feeds them to `waitForTmuxSessionBootstrap()`
- No additional code changes required — system detects pi blockers automatically

---

## Shared Patterns

### Blocker Detection Flow (Generic Infrastructure)

**Source:** `src/runners/tmux/session-handshake.ts` (lines 364-408)
**Used by:** All CLI tools (codex, claude, gemini, pi)

```typescript
// 1. Parse blocker patterns at bootstrap time
const blockerPatterns = (params.blockers ?? []).map((entry) => ({
  regex: new RegExp(entry.pattern, "i"),
  message: entry.message,
}));

// 2. Check blockers BEFORE ready pattern in polling loop
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

**Applied to:** All files using `waitForTmuxSessionBootstrap()` (runner-service.ts, etc.)

---

### Chrome Filtering Architecture

**Source:** `src/runners/transcript/transcript-normalization.ts` (lines 440-635)
**Pattern:** Three-tier filtering system per CLI type

```typescript
// 1. Detect CLI type once at function start
const isCodex = looksLikeCodexSnapshot(lines);
const isClaude = looksLikeClaudeSnapshot(lines);
const isGemini = looksLikeGeminiSnapshot(lines);

// 2. Drop delivery report lines (all CLIs)
if (shouldDropDeliveryReportLine(line)) {
  return false;
}

// 3. Drop CLI-specific chrome (per-CLI type flag)
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

**Applied to:** All files calling `cleanInteractionSnapshot()` or `cleanRunningInteractionSnapshot()` (transcript-rendering.ts, transcript-delta.ts, etc.)

---

## Test Coverage Expectations

**Test framework:** Bun (bun:test)
**Test location:** `/home/brewuser/clisbot/test/runner-service.integration.test.ts`
**Existing pattern:** Tests for pi template already present (lines 100-167)

### Wave 0 Gaps (from RESEARCH.md lines 489-493)

Tests to be added during execution:

| Test | File | Pattern |
|------|------|---------|
| `looksLikePiSnapshot()` detects pi output | `runner-service.integration.test.ts` | Copy from gemini snapshot detection tests |
| `shouldDropPiChromeLine()` filters startup warnings | `runner-service.integration.test.ts` | Copy from gemini chrome filter tests |
| `shouldDropPiChromeLine()` filters fd errors | `runner-service.integration.test.ts` | Copy from gemini chrome filter tests |
| `shouldDropPiChromeLine()` filters separators | `runner-service.integration.test.ts` | Copy from gemini chrome filter tests |
| `cleanInteractionSnapshot()` integrates pi filtering | `runner-service.integration.test.ts` | Copy from gemini integration tests |

**Test execution command:** `bun test test/runner-service.integration.test.ts -t pi`

---

## No Analog Found

None — all code patterns already exist in the codebase (codex/claude/gemini filters serve as exact analogs for pi).

---

## Implementation Summary

| Change | File | Type | Lines | Analog |
|--------|------|------|-------|--------|
| Add `looksLikePiSnapshot()` | `transcript-normalization.ts` | New function | Insert after 206 | `looksLikeGeminiSnapshot()` |
| Add `shouldDropPiChromeLine()` | `transcript-normalization.ts` | New function | Insert after 532 | `shouldDropGeminiChromeLine()` |
| Integrate pi detection | `transcript-normalization.ts` | Modify | Line 584 (add isPi detection) | `cleanInteractionSnapshotInternal()` |
| Integrate pi filtering | `transcript-normalization.ts` | Modify | Line 613 (add isPi filter check) | `cleanInteractionSnapshotInternal()` |
| **Blockers (agent-tool-presets.ts)** | `agent-tool-presets.ts` | **ALREADY DONE (Phase 2)** | Lines 165-176 | Gemini blockers |
| **Blocker detection (session-handshake.ts)** | `session-handshake.ts` | **VERIFY ONLY** | Lines 364-408 | Generic blocker loop |

---

## Metadata

**Pattern extraction date:** 2026-05-26
**Scope:** Phase 3 hardening (startup blockers + output filtering)
**Confidence:** HIGH (all patterns proven in Phase 1-2 with codex/claude/gemini)
**Ready for planning:** Yes

