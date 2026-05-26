---
phase: 03-hardening
reviewed: 2026-05-26T14:40:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/runners/transcript/transcript-normalization.ts
  - test/runner-service.integration.test.ts
  - test/text/text-cleaning-chrome.suite.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-26T14:40:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the three files carrying Phase 3 (Hardening) changes: the transcript normalization
module, the runner-service integration test, and the new pi chrome filtering test suite.

The review was conducted against the worktree commits (`21a9142`, `8d69f97`, `47ceda9`) since
all three files on `main` predate the phase 3 implementation. The analysis confirms the pi
chrome filtering logic and test coverage are broadly sound, but three warning-level issues need
attention before merge:

1. A dead condition (`trimmed === '> '`) appears in both `looksLikePiSnapshot` and
   `shouldDropPiChromeLine` — `trimmed` is always `line.trim()` so the trailing-space variant
   is unreachable and the behavior relies silently on the preceding `trimmed === '>'` check.
2. The bare `'>'` pi detection signal is weak enough to cause spurious double-filtering when
   a Gemini snapshot contains a bare `>` prompt line, because `isPi` and `isGemini` flags are
   independent and both chrome-drop filters fire when both are true.
3. `cleanInteractionSnapshotInternal` grows to 62 lines after the pi additions, exceeding the
   50-line hard limit stated in CLAUDE.md.

---

## Warnings

### WR-01: Dead condition `trimmed === '> '` in `looksLikePiSnapshot` and `shouldDropPiChromeLine`

**File:** `src/runners/transcript/transcript-normalization.ts` (commit 21a9142, added lines)

**Issue:** Both `looksLikePiSnapshot` and `shouldDropPiChromeLine` compare `trimmed === '> '`
(with a trailing space). But `trimmed` is always assigned as `line.trim()`, which strips all
trailing whitespace, so this branch is permanently unreachable. The input `'> '` becomes `'>'`
after `.trim()`, and `'>' === '> '` is `false`. The intended match for a bare prompt with
trailing space already succeeds via the adjacent `trimmed === '>'` check, so the behaviour is
accidentally correct, but the dead branch is a maintainability hazard.

**Fix:** Remove the unreachable `'> '` variants from both functions:

```typescript
// looksLikePiSnapshot — remove the '> ' line:
trimmed === '>'       // keep this
// trimmed === '> '  // remove — unreachable after trim()

// shouldDropPiChromeLine — same:
trimmed === '>'       // keep this
// trimmed === '> '  // remove — unreachable after trim()
```

---

### WR-02: Weak `'>'` pi detection signal — potential double-filter collision with Gemini

**File:** `src/runners/transcript/transcript-normalization.ts` (commit 21a9142, `looksLikePiSnapshot`)

**Issue:** `looksLikePiSnapshot` returns `true` when any line trims to exactly `'>'`. Gemini
also uses `'>'` as its prompt prefix; a Gemini snapshot with an empty prompt line (just `>`)
would satisfy both `looksLikeGeminiSnapshot` and `looksLikePiSnapshot` simultaneously. In
`cleanInteractionSnapshotInternal` the `isGemini` and `isPi` checks are independent `if`
blocks (not `else if`), so both `shouldDropGeminiChromeLine` and `shouldDropPiChromeLine` fire
in parallel on that snapshot. The pi filter's `/^(?:Warning|Note):\s/i` pattern would then
silently drop lines in Gemini output that happen to start with `Warning:` or `Note:`, which
are legitimate in assistant responses.

**Fix:** Either (a) remove `'>'` as a pi detection signal and rely on the three unambiguous
markers (`'Welcome to pi'`, `pi v\d+...`, `'Type your message'`, `'run /help'`), or (b)
make the detection mutually exclusive via early-return:

```typescript
// Option A — remove the weak signal
export function looksLikePiSnapshot(lines: string[]) {
  return lines.some((line) => {
    const trimmed = line.trim()
    return (
      trimmed.includes('Welcome to pi') ||
      /^pi\s+v\d+\.\d+\.\d+/i.test(trimmed) ||
      trimmed.includes('Type your message') ||
      trimmed.includes('run /help')
      // Remove: trimmed === '>' and trimmed === '> '
    )
  })
}

// Option B — guard isPi with !isGemini in cleanInteractionSnapshotInternal
const isPi = !isGemini && !isCodex && !isClaude && looksLikePiSnapshot(lines)
```

Option A is preferred (KISS); it also aligns with how `looksLikeGeminiSnapshot` uses
unambiguous markers only.

---

### WR-03: `cleanInteractionSnapshotInternal` exceeds the 50-line function hard limit

**File:** `src/runners/transcript/transcript-normalization.ts:578` (commit 21a9142)

**Issue:** After the pi additions the function is 62 lines (measured from `function` to closing
`}`), exceeding the 50-line hard limit stated in CLAUDE.md. The function was already 57 lines
before this phase.

**Fix:** Extract the chrome-filter predicate into a named helper to restore the function to
under 50 lines:

```typescript
function shouldDropChromeLine(
  line: string,
  flags: { isCodex: boolean; isClaude: boolean; isGemini: boolean; isPi: boolean },
): boolean {
  if (flags.isCodex && shouldDropCodexChromeLine(line)) return true
  if (flags.isClaude && shouldDropClaudeChromeLine(line)) return true
  if (flags.isGemini && shouldDropGeminiChromeLine(line)) return true
  if (flags.isPi && shouldDropPiChromeLine(line)) return true
  return false
}
```

Then in `cleanInteractionSnapshotInternal`:

```typescript
const filtered = promptStripped.filter((line) => {
  if (shouldDropDeliveryReportLine(line)) return false
  if (options?.preserveTimerStatusLines && isTimerDrivenStatusLine(line)) {
    timerStatusLines.push(line.trim())
    return false
  }
  if (shouldDropChromeLine(line, { isCodex, isClaude, isGemini, isPi })) return false
  return true
})
```

---

## Info

### IN-01: `transcript-normalization.ts` file length exceeds the 500-line target

**File:** `src/runners/transcript/transcript-normalization.ts` (682 lines after phase 3 commit)

**Issue:** The file grows to 682 lines with the pi additions, well above the 500-line target
(hard limit is 700). The target is a refactoring trigger, not a hard stop. The phase 3 additions
are modest in isolation, but the file is accumulating chrome-filter logic for each new runner.
Splitting per-runner chrome functions into a `transcript-chrome-filters.ts` module would keep
both files within the 500-line target.

**Fix:** Defer to a follow-on refactor task. No immediate action required for this phase, but
log it in `docs/tasks/backlog.md` to split the file before adding a fifth runner.

---

### IN-02: Mixed quote styles between new pi code and pre-existing file body

**File:** `src/runners/transcript/transcript-normalization.ts` (new pi functions, commit 21a9142)

**Issue:** The new `looksLikePiSnapshot` and `shouldDropPiChromeLine` functions use single
quotes and omit semicolons, which correctly follows CLAUDE.md. The pre-existing code in the
same file uses double quotes and includes semicolons throughout. This creates visible
inconsistency within the file, even though the new code is technically correct per project
rules.

**Fix:** No action required for the new code itself — it conforms to CLAUDE.md. The pre-existing
style drift is a pre-existing condition. If the file is refactored (see IN-01), normalise the
whole file to single quotes / no semicolons at that time.

---

_Reviewed: 2026-05-26T14:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
