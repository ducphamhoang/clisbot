# Roadmap: Clisbot v0.2.0 — Pi CLI Integration

## Overview

Three phases deliver pi as a fully supported AI coding CLI runner. Phase 1 unblocks everything by adding the `newSessionCommand` schema field — without it, pi would receive `/new` as a literal prompt. Phase 2 wires up the complete runner and session config so operators can route conversations to pi. Phase 3 hardens the integration with startup blockers and clean transcript output. Phase 4 fixes critical correctness and security findings from the post-milestone adversarial review.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Schema Precondition** - Add `newSessionCommand` to `AgentToolTemplate` so CLIs can declare their own session-rotation command (completed 2026-05-26)
- [x] **Phase 2: Runner & Session Config** - Wire pi into the tmux runner with correct startup flags, ready pattern, active timer, and session identity model (completed 2026-05-26)
- [x] **Phase 3: Hardening** - Add startup blockers for missing models and tmux extended-keys, filter pi chrome from transcript output (completed 2026-05-26)
- [ ] **Phase 4: Pi Review Fixes** - Fix critical/high/medium findings from adversarial milestone review: broken /new rotation, silent session-continuity loss, missing prompt-echo stripping, chrome leakage, false-positive snapshot detection, template resume-args override

## Phase Details

### Phase 1: Schema Precondition
**Goal**: `AgentToolTemplate` supports a `newSessionCommand` field so pi (and future CLIs) never receive a hardcoded `/new` as a literal prompt
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01
**Success Criteria** (what must be TRUE):
  1. `AgentToolTemplate` has an optional `newSessionCommand` field that defaults to `"/new"` for existing CLIs
  2. `resolveNewSessionCommand` reads the field from the template rather than hardcoding `/new`
  3. Existing codex, claude, and gemini behavior is unchanged after the refactor
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Add newSessionCommand to AgentToolTemplate, ResolvedRunnerTemplate, schema, and resolve from template in RunnerService

### Phase 2: Runner & Session Config
**Goal**: Operators can set `cli: "pi"` and have pi spawned via the tmux runner with correct session identity, ready detection, and active-timer handling
**Depends on**: Phase 1
**Requirements**: RUNNER-01, RUNNER-02, RUNNER-03, RUNNER-04, RUNNER-05, SESSION-01, SESSION-02, SESSION-03, SCHEMA-02, SCHEMA-03
**Success Criteria** (what must be TRUE):
  1. Setting `cli: "pi"` in agent config causes clisbot to spawn pi in a tmux session with `--session {uuid}`
  2. Pi session resume passes the same `--session {uuid}` plus startup flags without re-creating a new session
  3. Run-monitor does not fire completion while pi displays the `Working...` spinner
  4. Pi startup is detected as ready when the `escape interrupt` help bar pattern appears
  5. `inferAgentCliToolId` returns `"pi"` for pi process strings and `SUPPORTED_AGENT_CLI_TOOLS` lists `"pi"`
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Add pi to SUPPORTED_AGENT_CLI_TOOLS, DEFAULT_AGENT_TOOL_TEMPLATES (explicit session mode, ready pattern, startup blockers), and inferAgentCliToolId
- [x] 02-02-PLAN.md — Add pi runner family defaults to schema.ts and pi entry to renderDefaultConfigTemplate in template.ts

### Phase 3: Hardening
**Goal**: Pi startup failures surface actionable operator messages and pi-specific noise is stripped from transcript output
**Depends on**: Phase 2
**Requirements**: BLOCK-01, BLOCK-02, NORM-01
**Success Criteria** (what must be TRUE):
  1. If pi starts with no models configured, startup is blocked and the operator sees a message directing them to configure a provider
  2. If pi detects `tmux extended-keys is off`, startup is blocked and the operator sees a message to add `set -g extended-keys on` to `~/.tmux.conf`
  3. Pi-specific chrome lines (startup warnings, `fd not found` noise, separator lines, status bar lines) are absent from transcript output sent to channel users
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Add looksLikePiSnapshot() and shouldDropPiChromeLine() to transcript-normalization.ts, integrate into cleanInteractionSnapshotInternal() (TDD)
- [x] 03-02-PLAN.md — Verify and test pi startup blocker config (BLOCK-01, BLOCK-02) in runner-service.integration.test.ts

### Phase 4: Pi Review Fixes
**Goal**: Fix all critical, high, and medium findings from the v0.2.0 adversarial milestone review so pi is production-safe
**Depends on**: Phase 3
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08
**Success Criteria** (what must be TRUE):
  1. `/new` command succeeds for pi — routes through restart path, no status-scrape timeout
  2. Pi crash recovery preserves stored `sessionId` and reuses it on next `ensureSessionReady`
  3. Pi response snapshots have `> user message` echoes stripped before channel delivery
  4. `Type your message` and `run /help` lines do not appear in cleaned pi output
  5. `Warning:` and `Note:` lines in pi AI responses survive chrome filtering intact
  6. A snapshot containing only `>` lines is not classified as pi
  7. `REQUIREMENTS.md` SESSION-03 documents `--resume {uuid}` correctly
  8. `buildRunnerFromToolTemplate` preserves template resume args for non-codex runners
**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md — Remove Warning/Note rule from shouldDropPiChromeLine and bare '>' from looksLikePiSnapshot; update tests (Fix 5, Fix 6)
- [x] 04-02-PLAN.md — Fix SESSION-03 doc: --session → --resume in REQUIREMENTS.md (Fix 7)
- [ ] 04-03-PLAN.md — Add dropPiPromptBlocks and wire into promptStripped dispatch; add help-bar drops to shouldDropPiChromeLine; tests (Fix 3, Fix 4)
- [ ] 04-04-PLAN.md — Fix buildRunnerFromToolTemplate non-codex resume.args to preserve template via applyTemplate; test (Fix 8)
- [ ] 04-05-PLAN.md — Add triggerNewSession pi guard; widen retryFreshStartAfterStoredResumeFailure gate; tests (Fix 1, Fix 2)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema Precondition | 1/1 | Complete    | 2026-05-26 |
| 2. Runner & Session Config | 2/2 | Complete    | 2026-05-26 |
| 3. Hardening | 2/2 | Complete    | 2026-05-26 |
| 4. Pi Review Fixes | 2/5 | In Progress|  |
