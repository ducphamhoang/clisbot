# Clisbot

**What This Is:** A multi-channel bot platform that lets operators route conversations from Telegram, Slack, and Zalo through AI coding CLIs (Claude Code, Codex, Gemini) running in persistent tmux sessions. The core value is durable, session-aware agent routing across multiple chat surfaces.

**Current Version:** 0.1.53  
**Repository:** ducph fork of longbkit/clisbot

## Current Milestone: v0.3.0 — Interactive Setup Wizard

**Goal:** Replace the hard-stop first-run error flow with two independent interactive readline wizards that guide operators through channel and agent setup separately.

**Target features:**
- `clisbot setup channels` (Flow A) — readline wizard to collect and validate channel tokens (Telegram, Slack, Zalo), detect existing env vars, write config, and start runtime in unrouted mode without requiring an agent
- `clisbot setup agent` (Flow B) — readline wizard to choose AI CLI, check binary, pick bot type, seed workspace, and link agent to configured channels
- `clisbot setup` router — auto-detects what is missing and routes to Flow A or B without requiring a menu in the 90% case
- `clisbot start` behavior change — channels configured but no agent becomes warning + continue instead of hard fail

## Previous Milestone: v0.2.0 — Pi CLI Integration

**Goal:** Add pi (pi.dev by Earendil Works) as a supported AI coding CLI runner alongside codex, claude, and gemini using the existing tmux runner infrastructure.

**Target features:**
- pi registered in SUPPORTED_AGENT_CLI_TOOLS
- tmux runner config template (startup flags, ready pattern, session management)
- Active timer pattern for "Working..." (prevent early completion)
- Startup blocker for missing API key / no models configured
- Startup blocker for tmux extended-keys warning
- `newSessionCommand` field added to AgentToolTemplate (architecture precondition)
- pi chrome filtering in transcript-normalization
- `inferAgentCliToolId` recognizes "pi"
- schema.ts runner family defaults for pi

## Architecture

- **Channels:** `src/channels/` — Telegram, Slack, Zalo surfaces, routing, rendering
- **Agents:** `src/agents/` — durable session state, queueing, run lifecycle
- **Runners:** `src/runners/tmux/` — CLI-agnostic tmux subprocess driver
- **Config:** `src/config/runtime/agent-tool-presets.ts` — per-CLI startup templates
- **Auth:** `src/auth/` — roles, permissions, authorization
- **Control:** `src/control/` — operator CLI, runtime lifecycle

## Key Decisions

- **tmux runner for pi (Option A):** Architecture review (Claude Sonnet + Codex) evaluated Option A (tmux, existing pattern) vs Option B (new RPC runner using pi's `--mode rpc`). Chose Option A: pi's JSONL RPC protocol is unproven/pre-stable; tmux failures degrade gracefully while RPC failures break hard. RPC runner deferred until protocol stabilizes.
- **Session via `--session {uuid}`:** pi has no `/status` command for UUID capture. Clisbot generates UUID pre-launch and passes `--session {uuid}`. `capture.mode: "off"`, `create.mode: "explicit"` — same pattern as claude.
- **`newSessionCommand` field required:** Current `resolveNewSessionCommand` hardcodes `/new` for all non-gemini CLIs. Must be added to `AgentToolTemplate` before pi goes live to prevent `/new` being sent as a literal prompt.

## Validated Requirements

- **SCHEMA-01:** `AgentToolTemplate` has `newSessionCommand?: string` field (optional, defaults to `"/new"`). `resolveNewSessionCommand()` reads from template field. Existing codex/claude/gemini behavior unchanged. — Validated in Phase 1: Schema Precondition (2026-05-26)
- **RUNNER-01:** Pi runner template with startup flags (`--session`, `--list-models`, `--verbose`), ready pattern detection (✓ Ready to listen), and session mode (`create.mode: "explicit"`, `capture.mode: "off"`). — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **RUNNER-02:** Tmux extended-keys warning detection at startup prevents silent failures; runner startup blocks with clear error message. — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **RUNNER-03:** Missing API key startup blocker: Pi detects `GITHUB_TOKEN` and `DEEPSEEK_API_KEY` requirements; startup fails with actionable error. — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **RUNNER-04:** Missing model configuration startup blocker: Pi with `--list-models` detects zero models; startup fails with actionable error. — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **RUNNER-05:** Active timer pattern ("Working..." message + timer loop) prevents early completion detection in pi output. — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **SESSION-01:** Pi session UUID strategy: clisbot generates UUID, passes `--session {uuid}`, reads session ID from output (`session.id: "uuid"`). — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **SESSION-02:** New session command: pi supports `/new` command to reset session state without restarting CLI process. — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **SESSION-03:** Session isolation: concurrent sessions do not interfere; each session maintains independent context. — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **SCHEMA-02:** Pi runner schema defaults (family, timeout, ready pattern) in `schema.ts`. — Validated in Phase 2: Runner & Session Config (2026-05-26)
- **SCHEMA-03:** Pi runner test coverage for schema defaults validation. — Validated in Phase 2: Runner & Session Config (2026-05-26)

## Active Requirements

See `REQUIREMENTS.md`

## Validated Requirements (Phase 3)

- **BLOCK-01:** Pi startup blocked with actionable message when no models are configured (`Warning: No models available`). Operator directed to configure provider via `/login` or set `DEEPSEEK_API_KEY` / `GITHUB_TOKEN`. — Validated in Phase 3: Hardening (2026-05-26)
- **BLOCK-02:** Pi startup blocked with actionable message when tmux extended-keys is off (`tmux extended-keys is off`). Operator directed to add `set -g extended-keys on` to `~/.tmux.conf`. — Validated in Phase 3: Hardening (2026-05-26)
- **NORM-01:** Pi-specific chrome (startup warnings, `fd not found` noise, separator lines, status bar lines) filtered from transcript output. `looksLikePiSnapshot()` + `shouldDropPiChromeLine()` integrated into `cleanInteractionSnapshotInternal()`. — Validated in Phase 3: Hardening (2026-05-26)

## Current State

**Milestone v0.2.0 complete. Milestone v0.3.0 complete (2026-05-28).**

v0.2.0 phases shipped:
- Phase 1: `newSessionCommand` field added to `AgentToolTemplate` schema
- Phase 2: Pi runner template registered — explicit session mode, startup ready detection, active-timer pattern, `inferAgentCliToolId`, schema defaults
- Phase 3: Startup blockers for missing models / tmux extended-keys, pi chrome filtering in transcript normalization
- Phase 4: Pi production-safety fixes — `/new` routing, crash recovery, prompt echo stripping, chrome leakage, false-positive detection, template resume args

v0.3.0 phases shipped:
- Phase 5 complete (2026-05-27): `src/control/setup/setup-wizard-utils.ts` — shared wizard safety layer with `ensureTTY`, `ensureDaemonNotRunning`, `writeEditableConfigAtomic`, `withWizardCleanup`; 9/9 tests pass
- Phase 6 complete (2026-05-27): `src/control/setup/setup-channels.ts` — Flow A channels wizard (230 lines); `promptMasked` added to setup-wizard-utils; `clisbot start` warn-and-continue for channels-only config (START-01); 35/35 tests pass
- Phase 7 complete (2026-05-28): `src/control/setup/setup-agent.ts` — Flow B agent wizard (289 lines); channel summary, binary check with install instructions (`execFileSync`), bot-type selection, runtime reload/start after config write; 5/5 tests pass; 3 live-terminal UAT items deferred
- Phase 8 complete (2026-05-28): `src/control/setup/setup-router.ts` — smart setup router (ROUTER-01/02/03 auto-detect), `clisbot setup channels` / `clisbot setup agent` direct routing, CLI registration in `cli.ts` + `main.ts` via dynamic import; 3/3 tests pass; 5 live-terminal UAT items deferred; WR-01 subcommand routing fix committed post-review

Supported CLIs: codex, claude, gemini, **pi**

## Context

- Upstream: longbkit/clisbot (synced to v0.1.53)
- Supported CLIs: codex, claude, gemini, pi
- Pi CLI version tested: 0.75.5 (npm: @earendil-works/pi-coding-agent)
- Pi credentials confirmed: GitHub Copilot + DeepSeek stored in ~/.pi/agent/auth.json

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-28 — v0.3.0 milestone complete (Phases 5–8 shipped)*
