# Roadmap: Clisbot

## Milestones

- ✅ **v0.2.0 Pi CLI Integration** - Phases 1-4 (shipped 2026-05-26)
- 🚧 **v0.3.0 Interactive Setup Wizard** - Phases 5-8 (in progress)

## Phases

<details>
<summary>✅ v0.2.0 Pi CLI Integration (Phases 1-4) - SHIPPED 2026-05-26</summary>

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
- [x] 04-03-PLAN.md — Add dropPiPromptBlocks and wire into promptStripped dispatch; add help-bar drops to shouldDropPiChromeLine; tests (Fix 3, Fix 4)
- [x] 04-04-PLAN.md — Fix buildRunnerFromToolTemplate non-codex resume.args to preserve template via applyTemplate; test (Fix 8)
- [x] 04-05-PLAN.md — Add triggerNewSession pi guard; widen retryFreshStartAfterStoredResumeFailure gate; tests (Fix 1, Fix 2)

</details>

### 🚧 v0.3.0 Interactive Setup Wizard (In Progress)

**Milestone Goal:** Replace the hard-stop first-run error flow with two independent readline-based wizard commands (`clisbot setup channels`, `clisbot setup agent`) and a smart router (`clisbot setup`) that auto-detects what is missing.

#### Phase 5: Wizard Foundation
**Goal**: Shared wizard utilities exist that all flow files can import — TTY guard, daemon check, masked input, and atomic config write are all in place before any UI is built
**Depends on**: Phase 4
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Running any setup wizard in a non-TTY environment (CI, piped shell) prints a clear error naming the flag-based alternative and exits without hanging
  2. Running any setup wizard while the clisbot daemon is active prints an actionable stop message and exits before opening any readline interface
  3. Token prompts in the wizard do not echo characters to the terminal as the operator types
  4. A wizard killed mid-write leaves no partial or corrupted config file on disk — the previous valid config is intact
  5. Pressing Ctrl+C at any wizard prompt exits cleanly with no partial config written and no dangling process
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Write failing test scaffold for all four wizard utilities (RED state)
- [ ] 05-02-PLAN.md — Implement setup-wizard-utils.ts with ensureTTY, ensureDaemonNotRunning, writeEditableConfigAtomic, withWizardCleanup
- [ ] 05-03-PLAN.md — Verification gate: FOUND-06 no-new-deps check and full bun run check

#### Phase 6: Flow A + start() Change
**Goal**: Operators can run `clisbot setup channels` to configure channel tokens interactively and then start the runtime in unrouted mode; `clisbot start` no longer hard-fails when channels are present but no agent is linked
**Depends on**: Phase 5
**Requirements**: CHANWIZ-01, CHANWIZ-02, CHANWIZ-03, CHANWIZ-04, CHANWIZ-05, START-01
**Success Criteria** (what must be TRUE):
  1. Operator sees pre-filled defaults for any channel tokens already present in env vars and is not re-prompted for values already in config
  2. Operator can skip channels they do not have tokens for yet without being forced past a required field
  3. Operator sees a review screen showing all collected settings before any config file is written
  4. After wizard completion, the runtime starts in unrouted mode and the operator sees a success screen naming `clisbot setup agent` as the exact next command
  5. Running `clisbot start` with channels configured but no agent linked prints a warning and continues rather than exiting with an error
**Plans**: TBD

Plans:
- TBD
**UI hint**: yes

#### Phase 7: Flow B
**Goal**: Operators can run `clisbot setup agent` to select an AI CLI, verify the binary, choose bot type, and link the agent to configured channels — fully independent of Flow A's command path
**Depends on**: Phase 6
**Requirements**: AGTWIZ-01, AGTWIZ-02, AGTWIZ-03, AGTWIZ-04, AGTWIZ-05
**Success Criteria** (what must be TRUE):
  1. Operator sees a summary of already-configured channels before making agent choices
  2. Selecting a CLI tool triggers a binary existence check; if the binary is missing, the operator receives install instructions before the wizard can proceed
  3. Operator chooses bot type (personal / team) with a plain-English description displayed for each option
  4. After agent config is written, the running runtime reloads (or restarts if stopped) and the operator sees the full routing chain and a verification hint
**Plans**: TBD

Plans:
- TBD
**UI hint**: yes

#### Phase 8: Router + CLI Registration
**Goal**: `clisbot setup` with no subcommand detects what is missing and routes the operator to the right wizard without presenting a menu in the common case; the `setup` subcommand is registered in the CLI entry point
**Depends on**: Phase 7
**Requirements**: ROUTER-01, ROUTER-02, ROUTER-03
**Success Criteria** (what must be TRUE):
  1. Running `clisbot setup` with no existing config drops the operator directly into the channel wizard with no intermediate menu
  2. Running `clisbot setup` with channels configured but no agent drops the operator directly into the agent wizard with a brief preamble
  3. Running `clisbot setup` with both channels and agent configured shows a status summary and offers both flows as named options
**Plans**: TBD

Plans:
- TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema Precondition | v0.2.0 | 1/1 | Complete | 2026-05-26 |
| 2. Runner & Session Config | v0.2.0 | 2/2 | Complete | 2026-05-26 |
| 3. Hardening | v0.2.0 | 2/2 | Complete | 2026-05-26 |
| 4. Pi Review Fixes | v0.2.0 | 5/5 | Complete | 2026-05-26 |
| 5. Wizard Foundation | v0.3.0 | 0/? | Not started | - |
| 6. Flow A + start() Change | v0.3.0 | 0/? | Not started | - |
| 7. Flow B | v0.3.0 | 0/? | Not started | - |
| 8. Router + CLI Registration | v0.3.0 | 0/? | Not started | - |
