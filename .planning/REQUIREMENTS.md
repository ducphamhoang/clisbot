# Requirements — v0.3.0 Interactive Setup Wizard

**Milestone:** v0.3.0
**Updated:** 2026-05-27

---

## Active Requirements

### WIZARD FOUNDATION — shared utilities, guards, safety

- [ ] **FOUND-01:** Operator can run wizard only in an interactive terminal (`process.stdin.isTTY`); CI/non-TTY environments receive a clear error message naming the flag-based alternative command
- [ ] **FOUND-02:** Operator is blocked from running setup wizard while the clisbot daemon is already running, with an actionable stop message
- [ ] **FOUND-03:** Operator's channel tokens are masked (not echoed to terminal) when pasted into the wizard
- [ ] **FOUND-04:** Config file is written atomically (temp file + rename); a partial write never leaves the runtime unbootable
- [ ] **FOUND-05:** Operator can cancel any wizard prompt with Ctrl+C and the system is left in its previous valid state (no partial config on disk)
- [ ] **FOUND-06:** Wizard implementation uses only Node/Bun stdlib (`node:readline/promises`); no new npm dependencies are introduced

### CHANNEL WIZARD (Flow A) — `clisbot setup channels`

- [ ] **CHANWIZ-01:** Operator sees which channel tokens are already present in env vars, pre-filled with no re-entry required
- [ ] **CHANWIZ-02:** Operator can select which channels to configure and skip channels they don't have tokens for yet
- [ ] **CHANWIZ-03:** Operator chooses DM pairing policy (pairing / open) for each configured channel
- [ ] **CHANWIZ-04:** Operator sees a review screen with all collected channel settings before config is written
- [ ] **CHANWIZ-05:** After writing config, the runtime starts automatically in unrouted mode and the operator sees a success screen with pairing instructions and the exact next command (`clisbot setup agent`)

### START BEHAVIOR — `clisbot start` with partial setup

- [ ] **START-01:** `clisbot start` with channels configured but no agent proceeds with a warning instead of failing hard, so operators can test channel connectivity before committing to an agent CLI

### AGENT WIZARD (Flow B) — `clisbot setup agent`

- [ ] **AGTWIZ-01:** Operator sees which channels are already configured before choosing agent settings
- [ ] **AGTWIZ-02:** Operator selects the AI CLI (codex/claude/gemini/pi); wizard verifies the binary exists before proceeding, with install instructions if missing
- [ ] **AGTWIZ-03:** Operator chooses bot type (personal / team) with a plain-English description of each
- [ ] **AGTWIZ-04:** Operator confirms which configured channels to link the new agent to
- [ ] **AGTWIZ-05:** After linking, the running runtime reloads config (or restarts if not running) and the operator sees the full routing chain and a verification hint

### SETUP ROUTER — `clisbot setup`

- [ ] **ROUTER-01:** Operator running `clisbot setup` with no config is routed directly into `clisbot setup channels` without a menu
- [ ] **ROUTER-02:** Operator running `clisbot setup` with channels configured but no agent is routed directly into `clisbot setup agent` with a brief preamble
- [ ] **ROUTER-03:** Operator running `clisbot setup` with both channels and agent configured sees a status summary and is offered both flows as options

---

## Future Requirements (deferred)

- Live token reachability probe (Telegram `/getMe`, Slack `auth.test`) with spinner — format validation is sufficient for MVP
- Wizard resume state (`wizard-state.json`) — env var detection covers the re-run case; full resume state deferred post-MVP
- `--non-interactive` flag with env var seeding for automated setups
- Token format validation regex (Telegram `\d+:[\w-]+`, Slack `xoxb-`) — deferred; structural validation at runtime is sufficient for MVP

---

## Out of Scope

- **TUI framework / any new npm dependency:** Explicitly excluded. `node:readline/promises` only. (`@clack/prompts` also carries a confirmed Bun EPERM regression — Bun #24615.)
- **Multi-agent wizard setup:** Wizard creates one default agent. Additional agents use `clisbot agents add`.
- **Group route configuration in wizard:** Operators don't have chat IDs until the bot is running. Use `clisbot routes add` after setup.
- **Zalo Personal in Flow A:** Zalo Personal requires QR login, handled separately by `clisbot bots login zalo-personal`. Wizard notes this and points to that command.
- **Back-navigation within wizard steps:** Re-running the wizard covers re-do scenarios.
- **Animated spinners or progress bars:** Sequential line output only; no cursor control.

---

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| FOUND-01 | Phase 5 (Wizard Foundation) | Complete |
| FOUND-02 | Phase 5 (Wizard Foundation) | Complete |
| FOUND-03 | Phase 5 (Wizard Foundation) | Complete |
| FOUND-04 | Phase 5 (Wizard Foundation) | Complete |
| FOUND-05 | Phase 5 (Wizard Foundation) | Complete |
| FOUND-06 | Phase 5 (Wizard Foundation) | Complete |
| CHANWIZ-01 | Phase 6 (Flow A + start() Change) | Complete |
| CHANWIZ-02 | Phase 6 (Flow A + start() Change) | Complete |
| CHANWIZ-03 | Phase 6 (Flow A + start() Change) | Complete |
| CHANWIZ-04 | Phase 6 (Flow A + start() Change) | Complete |
| CHANWIZ-05 | Phase 6 (Flow A + start() Change) | Complete |
| START-01 | Phase 6 (Flow A + start() Change) | Complete |
| AGTWIZ-01 | Phase 7 (Flow B) | Complete |
| AGTWIZ-02 | Phase 7 (Flow B) | Complete |
| AGTWIZ-03 | Phase 7 (Flow B) | Complete |
| AGTWIZ-04 | Phase 7 (Flow B) | Complete |
| AGTWIZ-05 | Phase 7 (Flow B) | Complete |
| ROUTER-01 | Phase 8 (Router + CLI Registration) | Complete |
| ROUTER-02 | Phase 8 (Router + CLI Registration) | Complete |
| ROUTER-03 | Phase 8 (Router + CLI Registration) | Complete |
