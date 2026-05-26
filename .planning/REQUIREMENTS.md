# Requirements — v0.2.0 Pi CLI Integration

## Runner Config

- [ ] **RUNNER-01:** Operator can set `cli: "pi"` in agent config and have pi spawned via the tmux runner
- [ ] **RUNNER-02:** Pi runner uses `--session {uuid}` at startup so clisbot owns session identity from launch
- [ ] **RUNNER-03:** Pi runner recognizes `Working...` as an active timer pattern so run-monitor does not fire completion while pi is mid-task
- [ ] **RUNNER-04:** Pi startup is detected as ready via the `escape interrupt` help bar pattern
- [ ] **RUNNER-05:** `inferAgentCliToolId` recognizes `"pi"` as a valid CLI tool ID

## Session Management

- [ ] **SESSION-01:** Pi sessions use `create.mode: "explicit"` — clisbot generates UUID before launch, passes as `--session {uuid}`
- [ ] **SESSION-02:** Pi sessions use `capture.mode: "off"` — no `/status` command scraping needed
- [ ] **SESSION-03:** Pi session resume passes `--session {uuid}` plus startup flags

## Schema & Config

- [ ] **SCHEMA-01:** `AgentToolTemplate` has a `newSessionCommand` field (optional string, defaults to `"/new"`) so pi (and future CLIs) can declare their own session-rotation command rather than receiving a hardcoded `/new`
- [ ] **SCHEMA-02:** `schema.ts` includes pi runner family defaults matching the `agent-tool-presets.ts` template
- [ ] **SCHEMA-03:** `SUPPORTED_AGENT_CLI_TOOLS` includes `"pi"`

## Startup Blockers

- [ ] **BLOCK-01:** If pi starts with no models available (`Warning: No models available`), startup is blocked with an operator-facing message to configure a provider via `/login` or API key env var
- [ ] **BLOCK-02:** If pi detects `tmux extended-keys is off`, startup is blocked with an operator-facing message to add `set -g extended-keys on` to `~/.tmux.conf` and restart tmux

## Output Normalization

- [ ] **NORM-01:** Pi-specific chrome lines are filtered from transcript output (startup warnings, `fd not found` noise, separator lines, status bar lines)

## Future Requirements (deferred)

- RPC runner using pi's `--mode rpc` JSONL protocol — deferred until pi protocol stabilizes
- Pi-specific tool approval model (`--tools` allowlist configuration per agent) — can be added via startupOptions override in config

## Out of Scope

- **RPC runner (Option B):** Deferred. Pi's JSONL protocol is pre-1.0 and may change between releases. tmux runner degrades gracefully; RPC runner breaks hard on protocol changes. Revisit when pi reaches v1.0 or protocol is versioned.
- **Pi OAuth flows:** `/login` interactive auth is out of scope. Operators must pre-configure credentials before routing through clisbot.

## Traceability

| REQ-ID | Phase |
|--------|-------|
| SCHEMA-01 | Phase 1 |
| RUNNER-01 | Phase 2 |
| RUNNER-02 | Phase 2 |
| RUNNER-03 | Phase 2 |
| RUNNER-04 | Phase 2 |
| RUNNER-05 | Phase 2 |
| SESSION-01 | Phase 2 |
| SESSION-02 | Phase 2 |
| SESSION-03 | Phase 2 |
| SCHEMA-02 | Phase 2 |
| SCHEMA-03 | Phase 2 |
| BLOCK-01 | Phase 3 |
| BLOCK-02 | Phase 3 |
| NORM-01 | Phase 3 |
