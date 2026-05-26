# Clisbot

**What This Is:** A multi-channel bot platform that lets operators route conversations from Telegram, Slack, and Zalo through AI coding CLIs (Claude Code, Codex, Gemini) running in persistent tmux sessions. The core value is durable, session-aware agent routing across multiple chat surfaces.

**Current Version:** 0.1.53  
**Repository:** ducph fork of longbkit/clisbot

## Current Milestone: v0.2.0 — Pi CLI Integration

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

None yet — v0.2.0 is the first GSD-tracked milestone.

## Active Requirements

See `REQUIREMENTS.md`

## Context

- Upstream: longbkit/clisbot (synced to v0.1.53)
- Supported CLIs: codex, claude, gemini
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
*Last updated: 2026-05-26 — Milestone v0.2.0 started*
