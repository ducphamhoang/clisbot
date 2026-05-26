# Roadmap: Clisbot v0.2.0 — Pi CLI Integration

## Overview

Three phases deliver pi as a fully supported AI coding CLI runner. Phase 1 unblocks everything by adding the `newSessionCommand` schema field — without it, pi would receive `/new` as a literal prompt. Phase 2 wires up the complete runner and session config so operators can route conversations to pi. Phase 3 hardens the integration with startup blockers and clean transcript output.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Schema Precondition** - Add `newSessionCommand` to `AgentToolTemplate` so CLIs can declare their own session-rotation command (completed 2026-05-26)
- [x] **Phase 2: Runner & Session Config** - Wire pi into the tmux runner with correct startup flags, ready pattern, active timer, and session identity model (completed 2026-05-26)
- [ ] **Phase 3: Hardening** - Add startup blockers for missing models and tmux extended-keys, filter pi chrome from transcript output

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
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema Precondition | 1/1 | Complete    | 2026-05-26 |
| 2. Runner & Session Config | 2/2 | Complete    | 2026-05-26 |
| 3. Hardening | 0/TBD | Not started | - |
