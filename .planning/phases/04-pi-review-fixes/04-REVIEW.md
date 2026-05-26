---
phase: 04-pi-review-fixes
reviewed: 2026-05-27T00:18:00+07:00
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/agents/runtime/runner-service.ts
  - src/config/runtime/agent-tool-presets.ts
  - src/runners/transcript/transcript-normalization.ts
  - test/runner-service.integration.test.ts
  - test/text/text-cleaning-chrome.suite.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-05-27T00:18:00+07:00
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 4 introduces six targeted fixes across three source files: session routing for pi in `runner-service.ts`, gate widening in `retryFreshStartAfterStoredResumeFailure`, and pi transcript normalization in `transcript-normalization.ts` and `agent-tool-presets.ts`. The test suite in `runner-service.integration.test.ts` and `text-cleaning-chrome.suite.ts` covers all six fixes.

The implementation is largely correct. One warning-level latent correctness risk was found in Fix 8 (`buildRunnerFromToolTemplate`), plus two info-level observations.

---

## Warnings

### WR-01: `applyTemplate` in non-codex `resume.args` build silently erases unknown keys

**File:** `src/config/runtime/agent-tool-presets.ts:277`

**Issue:** The non-codex branch builds `resume.args` as:

```ts
args: template.sessionId.resume.args.map((arg) => applyTemplate(arg, { sessionId: '{sessionId}' })),
```

`applyTemplate` replaces all `{key}` placeholders — any key not present in the values map is replaced with `""` (empty string), per the implementation at `src/infra/paths.ts:126`:

```ts
return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => values[key] ?? "");
```

The intent is to pass `{sessionId}` through literally so it is substituted at runner launch time. Passing `{ sessionId: '{sessionId}' }` achieves this for `{sessionId}` (it replaces `{sessionId}` with the identical string `{sessionId}`), but any other template variable in a resume arg — such as `{workspace}`, `{agentId}`, or `{sessionName}` — would be silently erased to an empty string.

All current non-codex resume args (`pi`, `claude`, `gemini`) only contain `{sessionId}`, so no current template is affected. The risk is latent: a future non-codex runner that adds `{workspace}` to resume args would silently produce a broken command with no error.

**Fix:** Replace the `applyTemplate` call with a simple shallow copy, which correctly preserves all template placeholders for later substitution at launch time:

```ts
args: [...template.sessionId.resume.args],
```

If the intent is specifically to validate that `{sessionId}` is present, that should be a separate guard rather than a silent substitution.

---

## Info

### IN-01: Optional chaining on non-optional `sessionId` in `triggerNewSession`

**File:** `src/agents/runtime/runner-service.ts:826-829`

**Issue:** The `skipLiveRotation` guard uses optional chaining on `resolved.runner.sessionId`:

```ts
const skipLiveRotation =
  resolved.runner.sessionId?.capture.mode === 'off' &&
  resolved.runner.sessionId?.create.mode === 'explicit'
```

`resolved.runner.sessionId` is typed as a required field on `ResolvedRunnerTemplate` (declared non-optional at `src/config/runtime/agent-tool-presets.ts:212`). The `?.` adds no safety and obscures that the field is always present. The known intentional deviation (mocked runners in tests) is handled elsewhere — the test config at `test/runner-service.integration.test.ts:51-67` provides a complete `sessionId` object.

**Fix:** Remove the optional chaining to match the type contract:

```ts
const skipLiveRotation =
  resolved.runner.sessionId.capture.mode === 'off' &&
  resolved.runner.sessionId.create.mode === 'explicit'
```

### IN-02: `dropPiPromptBlocks` shares the Gemini `> ` pattern without a comment

**File:** `src/runners/transcript/transcript-normalization.ts:369-371`

**Issue:** `dropPiPromptBlocks` uses the same marker regex as `dropGeminiPromptBlocks` (`/^\s*>\s/`), but there is no comment explaining the shared pattern is intentional and not an accidental copy:

```ts
function dropPiPromptBlocks(lines: string[]) {
  return dropPromptBlocks(lines, /^\s*>\s/)
}
```

The pi `>` prompt marker is documented nowhere in the function body, and without context a reader might wonder whether it should use a pi-specific pattern instead.

**Fix:** Add a brief comment:

```ts
function dropPiPromptBlocks(lines: string[]) {
  // Pi uses the same '> ' prompt marker as Gemini
  return dropPromptBlocks(lines, /^\s*>\s/)
}
```

---

## Fix Coverage Assessment

All six Phase 4 fixes are correctly implemented and have test coverage:

| Fix | Location | Status | Test coverage |
|-----|----------|--------|---------------|
| Fix 1: `triggerNewSession` pi/claude routing | `runner-service.ts:822-837` | Correct | `runner-service.integration.test.ts:278-309` |
| Fix 2: `retryFreshStartAfterStoredResumeFailure` gate widens for `explicit` | `runner-service.ts:352-356` | Correct | `runner-service.integration.test.ts:311-342` |
| Fix 3: `dropPiPromptBlocks` + `promptStripped` dispatch | `transcript-normalization.ts:369-371, 620-628` | Correct | `text-cleaning-chrome.suite.ts:599-610` |
| Fix 4: `shouldDropPiChromeLine` help-bar drops | `transcript-normalization.ts:562-564` | Correct | `text-cleaning-chrome.suite.ts:612-622` |
| Fix 5: Warning/Note rule removed | `transcript-normalization.ts:550-566` (absent) | Correct | `text-cleaning-chrome.suite.ts:498-508, 587-597` |
| Fix 6: Bare `'>'` removed from `looksLikePiSnapshot` | `transcript-normalization.ts:208-218` (absent) | Correct | `text-cleaning-chrome.suite.ts:474-491` |
| Fix 8: `buildRunnerFromToolTemplate` non-codex uses `.map()` | `agent-tool-presets.ts:277` | Latent risk (WR-01) | `runner-service.integration.test.ts:158-173` |

---

_Reviewed: 2026-05-27T00:18:00+07:00_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
