---
phase: 05
slug: wizard-foundation
status: findings
reviewed: 2026-05-27
---

# Phase 05 — Code Review

## Summary

2 findings survived verification (1 confirmed, 1 plausible). No blockers — both are fixable with targeted edits.

## Findings

```json
[
  {
    "file": "src/control/setup/setup-wizard-utils.ts",
    "line": 42,
    "summary": "SIGINT handler is async but process.exit(130) fires before unlink completes — .tmp file is not deleted on Ctrl-C",
    "failure_scenario": "User presses Ctrl-C while wizard is mid-write. handleSigint is declared async and awaits unlink(tmpPath), but Node/Bun do not await the Promise returned by signal handlers. The runtime calls process.exit(130) before the unlink micro-task resolves, leaving the .tmp file on disk — the opposite of the intended cleanup invariant."
  },
  {
    "file": "src/control/setup/setup-wizard-utils.ts",
    "line": 38,
    "summary": "withWizardCleanup and writeEditableConfigAtomic resolve tmpPath independently — SIGINT handler may delete the wrong path",
    "failure_scenario": "Caller passes configPath to withWizardCleanup but a different (or no) configPath to writeEditableConfigAtomic. Each function independently expands and constructs its own tmpPath. On SIGINT, the handler deletes the path it computed, not the path where the actual .tmp was written. unlink silently swallows ENOENT and the real .tmp survives."
  }
]
```

## Fix guidance

**Finding 1 — make handleSigint synchronous:**
```typescript
const handleSigint = () => {
  try { unlinkSync(tmpPath) } catch {}
  process.stdin.unref()
  process.exit(130)
}
```
Import `unlinkSync` from `node:fs` (not `node:fs/promises`). This guarantees deletion completes before exit.

**Finding 2 — callers should pass consistent configPath:**
Document in JSDoc that `configPath` passed to `withWizardCleanup` MUST match the path passed to `writeEditableConfigAtomic` inside `fn`. Alternatively, have `fn` receive `tmpPath` as an argument so both functions share a single resolved path — but that is a larger API change. For Phase 5 scope, a JSDoc warning is sufficient since there are no callers yet.
