---
phase: 05-wizard-foundation
subsystem: control/setup
tags:
  - wizard
  - tty-guard
  - atomic-write
  - sigint-cleanup
  - daemon-check
  - FOUND-06
dependency_graph:
  requires:
    - src/control/runtime/runtime-process.ts (getRuntimeStatus)
    - src/infra/paths.ts (expandHomePath, getDefaultConfigPath, ensureDir)
    - src/infra/fs.ts (writeTextFile)
  provides:
    - src/control/setup/setup-wizard-utils.ts (four wizard utility exports)
    - test/setup-wizard-utils.test.ts (9 passing tests)
  affects:
    - Phase 6 (Flow A interactive wizard) — imports ensureTTY, ensureDaemonNotRunning, withWizardCleanup
    - Phase 7 (Flow B CLI wizard) — imports writeEditableConfigAtomic, withWizardCleanup
tech_stack:
  added:
    - src/control/setup/ directory (new)
  patterns:
    - temp+rename atomic write (POSIX atomic, T-05-03 mitigation)
    - SIGINT cleanup with stdin.unref() (Bun #21189 mitigation, D-10)
    - Verification-only gate plan pattern (05-03)
key_files:
  created:
    - src/control/setup/setup-wizard-utils.ts
    - test/setup-wizard-utils.test.ts
  modified: []
decisions:
  - "D-01: writeEditableConfigAtomic takes raw text string, not ClisbotConfig; config-file.ts not modified"
  - "D-02: Atomic write uses temp+rename pattern; final path only exists after successful rename"
  - "D-03: SIGINT handler removes orphaned .tmp before exit(130)"
  - "D-08: SIGINT exits with code 130 (POSIX convention)"
  - "D-10: process.stdin.unref() called before exit to mitigate Bun #21189 dangling process bug"
  - "D-11: Single readline interface per session — no readline used in setup-wizard-utils.ts"
requirements_delivered:
  - FOUND-01
  - FOUND-02
  - FOUND-04
  - FOUND-05
  - FOUND-06
requirements_deferred:
  - FOUND-03
metrics:
  plans_total: 3
  plans_completed: 3
  duration_total: "~45 minutes"
  completed: "2026-05-27"
  files_created: 2
  files_modified: 0
---

# Phase 05: Wizard Foundation Summary

**One-liner:** Four named utility exports (ensureTTY, ensureDaemonNotRunning, writeEditableConfigAtomic, withWizardCleanup) implementing the wizard safety foundation — TTY guard, daemon pre-check, atomic config write, and SIGINT cleanup — with no new npm dependencies.

## Plans Executed

| Plan | Name | Type | Status |
|------|------|------|--------|
| 05-01 | Wizard utils test scaffold | TDD RED | Complete |
| 05-02 | Implement setup-wizard-utils.ts | TDD GREEN | Complete |
| 05-03 | Phase gate verification | Verification | Complete |

## Files Created

| File | Purpose |
|------|---------|
| `src/control/setup/setup-wizard-utils.ts` | Four wizard utility exports |
| `test/setup-wizard-utils.test.ts` | 9 passing tests (RED then GREEN) |

## Requirements Delivered

| Requirement | Description | Status |
|-------------|-------------|--------|
| FOUND-01 | TTY guard — rejects non-interactive environments | Delivered |
| FOUND-02 | Daemon pre-check — blocks wizard when daemon is running | Delivered |
| FOUND-04 | Atomic config write — temp+rename, no partial writes | Delivered |
| FOUND-05 | SIGINT cleanup — removes .tmp, exits 130 | Delivered |
| FOUND-06 | No new npm deps — only node: stdlib + local src/ | Delivered |
| FOUND-03 | Masked input — deferred to Phase 6 | Deferred |

## Key Decisions Locked

| Decision | Description |
|----------|-------------|
| D-01 | `writeEditableConfigAtomic` takes raw text string; `config-file.ts` not modified |
| D-08 | `withWizardCleanup` is the SIGINT wrapper pattern for all wizard flows |
| D-10 | `process.stdin.unref()` before `process.exit(130)` mitigates Bun #21189 |
| D-11 | Single readline interface per session — setup-wizard-utils.ts uses zero readline |

## Integration Contract for Phase 6

```typescript
import {
  ensureTTY,
  ensureDaemonNotRunning,
  writeEditableConfigAtomic,
  withWizardCleanup,
} from '../setup/setup-wizard-utils.ts'
```

**ensureTTY()** — Call at wizard entry. Exits(1) if not TTY.

**ensureDaemonNotRunning(configPath?)** — Call after ensureTTY. Exits(1) if daemon running.

**writeEditableConfigAtomic(configPath, text)** — Write final config. Atomic via temp+rename.

**withWizardCleanup(fn, configPath?)** — Wrap wizard body. Installs SIGINT handler that cleans .tmp and exits 130.

## Threat Surface

All T-05-03 through T-05-10 mitigations implemented and verified:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-05-09 | FOUND-06: no npm packages in imports | Verified |
| T-05-10 | TypeScript clean: bunx tsc --noEmit exits 0 | Verified |
| T-05-03 | temp+rename atomic write | Implemented |
| T-05-04 | ensureDaemonNotRunning pre-check | Implemented |
| T-05-05 | ensureTTY rejects non-interactive | Implemented |
| T-05-06 | stdin.unref() before exit | Implemented |
| T-05-07 | unlink(tmpPath).catch(() => {}) in SIGINT | Implemented |

## Deferred Items

Three pre-existing test failures are out-of-scope for Phase 5:

1. `zalo-personal zca-js wrapper > refreshes the stored session after session login succeeds`
2. `tmux runner latency behavior > waitForTmuxSessionBootstrap honors a ready pattern` (x2)

These were introduced before Phase 5 and are not caused by wizard foundation code.
