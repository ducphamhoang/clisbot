---
phase: 5
slug: wizard-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | none — existing infrastructure |
| **Quick run command** | `bun test src/control/setup/` |
| **Full suite command** | `bun run check` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/control/setup/`
- **After every plan wave:** Run `bun run check`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | FOUND-01 | — | TTY guard exits non-zero in non-TTY env | unit | `bun test src/control/setup/setup-wizard-utils.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 0 | FOUND-02 | — | Daemon check exits non-zero when running | unit | `bun test src/control/setup/setup-wizard-utils.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | FOUND-04 | — | Atomic write: .tmp created, then renamed | unit | `bun test src/control/setup/setup-wizard-utils.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | FOUND-05 | — | SIGINT removes .tmp and exits 130 | unit | `bun test src/control/setup/setup-wizard-utils.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | FOUND-06 | — | No new npm dependencies in package.json | static | `grep -v node_modules package.json` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/control/setup/setup-wizard-utils.test.ts` — stubs/skeletons for FOUND-01, FOUND-02, FOUND-04, FOUND-05 test cases

*Note: Bun test framework is already installed — no additional setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Error message names `clisbot init` as flag-based alternative | FOUND-01 | Message copy requires human review | Run in non-TTY (`echo "" \| bun run start`), verify output contains "clisbot init" |
| Stop message names exact stop command | FOUND-02 | Message copy requires human review | Mock getRuntimeStatus to return running, capture stdout, verify it contains stop command |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
