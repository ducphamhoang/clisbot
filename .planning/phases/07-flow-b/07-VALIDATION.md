---
phase: 7
slug: flow-b
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-28
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test + mock |
| **Config file** | bun.toml (repo-wide) |
| **Quick run command** | `bun test test/control/setup/setup-agent.test.ts` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test test/control/setup/setup-agent.test.ts`
- **After every plan wave:** Run `bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | AGTWIZ-01..05 | — | N/A | unit | `bun test test/control/setup/setup-agent.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | AGTWIZ-01 | — | Channel summary shown before agent choices | unit | `bun test test/control/setup/setup-agent.test.ts -t "AGTWIZ-01"` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 1 | AGTWIZ-02 | — | Missing binary shows install instructions | unit | `bun test test/control/setup/setup-agent.test.ts -t "AGTWIZ-02"` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 1 | AGTWIZ-03 | — | Bot-type descriptions shown before selection | unit | `bun test test/control/setup/setup-agent.test.ts -t "AGTWIZ-03"` | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 1 | AGTWIZ-04..05 | — | Channel linking + runtime reload verified | unit+integration | `bun test test/control/setup/setup-agent.test.ts -t "AGTWIZ-04|AGTWIZ-05"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/control/setup/setup-agent.test.ts` — scaffolds AGTWIZ-01 through AGTWIZ-05 in RED state (mocked readline, mocked config, assertions for console output)
- [ ] Reuse readline mock pattern from `test/control/setup/setup-channels.test.ts`
- [ ] Mock config files with channels pre-populated
- [ ] Mock for `execSync` to simulate missing vs. present binaries

*Pattern reference: `test/control/setup/setup-channels.test.ts` — established readline mocking and test structure from Phase 6.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Runtime actually reloads after agent config write | AGTWIZ-05 | Requires live daemon + config watcher | Start daemon, run `clisbot setup agent`, verify routing chain displayed |
| Binary check with real missing CLI | AGTWIZ-02 | PATH manipulation in tests is unreliable | Temporarily unset PATH, run wizard, observe install instructions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
