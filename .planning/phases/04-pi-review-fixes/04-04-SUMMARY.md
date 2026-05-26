---
phase: 04-pi-review-fixes
plan: "04"
subsystem: config/runtime
tags: [runner, template, resume-args, fix-8]
dependency_graph:
  requires: [04-02]
  provides: [non-codex-resume-args-template-preservation]
  affects: [src/config/runtime/agent-tool-presets.ts, test/runner-service.integration.test.ts]
tech_stack:
  added: []
  patterns: [applyTemplate per-element mapping for string arrays]
key_files:
  created: []
  modified:
    - src/config/runtime/agent-tool-presets.ts
    - test/runner-service.integration.test.ts
decisions:
  - "Use template.sessionId.resume.args.map(applyTemplate) instead of applyTemplate on the array directly — applyTemplate only accepts strings, not arrays"
  - "Codex special-case comment added at both the codex branch and the non-codex branch for clear cross-reference"
metrics:
  duration: ~8min
  completed: 2026-05-26
  tasks_completed: 1
  tasks_total: 1
---

# Phase 04 Plan 04: buildRunnerFromToolTemplate non-codex resume.args fix Summary

**One-liner:** Fix 8 — non-codex resume.args now preserves template declaration via per-element applyTemplate mapping instead of hardcoded reconstruction.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing test for template preservation | dddeddd | test/runner-service.integration.test.ts |
| 1 (GREEN) | Fix non-codex resume.args + import applyTemplate | 4e68092 | src/config/runtime/agent-tool-presets.ts |

## What Was Built

`buildRunnerFromToolTemplate` non-codex branch previously reconstructed `resume.args` as `["--resume", "{sessionId}", ...options]`, silently ignoring whatever the template declared.

The fix:
1. Added `import { applyTemplate } from '../../infra/paths.ts'` to `agent-tool-presets.ts`
2. Replaced the hardcoded array with `template.sessionId.resume.args.map((arg) => applyTemplate(arg, { sessionId: '{sessionId}' }))`
3. Added comment on the codex branch explaining why it special-cases resume args (adds workspace `-C {workspace}` not declared in template)
4. Added comment on the non-codex branch explaining the template-preservation approach

For pi specifically, the output is unchanged (`["--resume", "{sessionId}", "--dangerously-skip-permissions"]`) — but it now flows correctly through the template rather than being reconstructed from scratch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `applyTemplate` does not accept arrays**

- **Found during:** Task 1 (GREEN phase), first test run
- **Issue:** The plan's `<interfaces>` section showed `applyTemplate(template.sessionId.resume.args, { sessionId: '{sessionId}' }) as string[]` — but `applyTemplate` only accepts a `string`, not `unknown[]`. Calling it with an array throws `TypeError: template.replaceAll is not a function`.
- **Fix:** Used `template.sessionId.resume.args.map((arg) => applyTemplate(arg, { sessionId: '{sessionId}' }))` — applies substitution element-by-element, which is the correct approach.
- **Files modified:** `src/config/runtime/agent-tool-presets.ts`
- **Commit:** 4e68092

## Verification

- `bun test test/runner-service.integration.test.ts` — 34 pass, 0 fail
- `bunx tsc --noEmit` — clean (no type errors)
- `grep 'applyTemplate' src/config/runtime/agent-tool-presets.ts` — confirms import and usage in non-codex branch
- No hardcoded `["--resume", "{sessionId}", ...options]` reconstruction remains

## Known Stubs

None.

## Threat Flags

None — no new trust boundaries introduced. The fix narrows the attack surface by ensuring only template-declared args reach the runner launch, reducing silent override risk (T-04-04-01 mitigated).

## Self-Check: PASSED

- `src/config/runtime/agent-tool-presets.ts` — modified, import present, applyTemplate mapping present
- `test/runner-service.integration.test.ts` — template preservation test present and passing
- Commits dddeddd and 4e68092 confirmed in git log
