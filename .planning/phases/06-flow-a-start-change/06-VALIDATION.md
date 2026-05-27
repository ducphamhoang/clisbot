---
phase: 6
slug: flow-a-start-change
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (`bun:test`) |
| **Config file** | none — Bun auto-detects `*.test.ts` |
| **Quick run command** | `bun test test/control/setup/setup-channels.test.ts` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds (unit tests); ~15 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `bun test test/control/setup/setup-channels.test.ts`
- **After every plan wave:** Run `bun run check` (full suite + typecheck)
- **Before `/gsd-verify-work`:** Full suite must be green + manual CLI integration tests
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | CHANWIZ-01,02,03,04 | T-06-01 / — | Test stubs only (RED state) | unit | `bun test test/control/setup/setup-channels.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 0 | START-01 | — | Test stub for warn-and-continue | unit | `bun test test/control/commands/runtime-bootstrap-cli.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | FOUND-03 | T-06-01 | promptMasked shows asterisks not plaintext | unit | `bun test test/control/setup/setup-wizard-utils.test.ts -t "promptMasked"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | START-01 | — | warn-and-continue, not exit | unit | `bun test test/control/commands/runtime-bootstrap-cli.test.ts -t "START-01"` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | CHANWIZ-01 | — | Env var pre-filled, prompt skipped | unit | `bun test test/control/setup/setup-channels.test.ts -t "env var detection"` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | CHANWIZ-02 | — | Per-channel confirm + skip works | unit | `bun test test/control/setup/setup-channels.test.ts -t "skip channels"` | ❌ W0 | ⬜ pending |
| 06-03-03 | 03 | 2 | CHANWIZ-03 | — | DM policy always writes `pairing` | unit | `bun test test/control/setup/setup-channels.test.ts -t "dm policy"` | ❌ W0 | ⬜ pending |
| 06-03-04 | 03 | 2 | CHANWIZ-04 | T-06-02 | Review screen renders + confirm logic | unit | `bun test test/control/setup/setup-channels.test.ts -t "review screen"` | ❌ W0 | ⬜ pending |
| 06-03-05 | 03 | 2 | CHANWIZ-05 | — | Runtime starts, success screen shown | integration | Manual: run `clisbot setup channels` in dev env | ❌ Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/control/setup/setup-channels.test.ts` — stubs for CHANWIZ-01 through CHANWIZ-05, FOUND-01, FOUND-02
- [ ] `test/control/commands/runtime-bootstrap-cli.test.ts` — add START-01 test stubs (warn-and-continue logic)

*Existing Phase 5 infrastructure in `test/control/setup/setup-wizard-utils.test.ts` covers FOUND-03 through FOUND-06 — no new stubs needed there.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Runtime starts in unrouted mode after wizard | CHANWIZ-05 | Requires live tmux session + detached process spawn | Run `clisbot setup channels` in dev env, confirm runtime starts, run `clisbot status` to verify unrouted mode |
| Success screen names `clisbot setup agent` | CHANWIZ-05 | Terminal output only | Inspect console output at wizard completion |
| `clisbot start` warns with channels/no agent in live runtime | START-01 | Requires real config + runtime lifecycle | Run `clisbot start` with channels-only config, observe warning message |
| Masked input shows `***` per character typed | FOUND-03 | Terminal output only (not capturable in unit tests) | Manually type token in wizard prompt, verify asterisks appear |
| Ctrl+C removes temp file | FOUND-05 | Signal handling in real TTY | Run wizard, press Ctrl+C during token prompt, verify no `.tmp` file remains |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
