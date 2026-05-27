# Phase 6: Flow A + start() Change — Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build `src/control/setup/setup-channels.ts` — the `clisbot setup channels` wizard that collects Telegram/Slack/Zalo-bot tokens interactively, pre-fills from env vars, defaults DM policy to `pairing`, shows a review screen, writes config atomically, and starts the runtime in unrouted mode.

Also change `src/control/commands/runtime-bootstrap-cli.ts` — `clisbot start` with channels configured but no agent linked changes from hard fail to warning + continue (START-01).

New file additions:
- `src/control/setup/setup-channels.ts` — Flow A wizard
- `test/control/setup/setup-channels.test.ts` — behavior coverage

Modifications:
- `src/control/setup/setup-wizard-utils.ts` — add `promptMasked` helper (FOUND-03)
- `src/control/commands/runtime-bootstrap-cli.ts` — START-01 change in `printMissingBootstrapOptions` / no-agent guard

Out of scope for Phase 6:
- `clisbot setup agent` (Flow B) — Phase 7
- `clisbot setup` router — Phase 8
- CLI registration (`setup-cli.ts`) — Phase 8
- Zalo Personal — wizard notes it and points to `clisbot bots login zalo-personal`
- Token format validation regex — deferred post-MVP (REQUIREMENTS.md)
- Wizard resume state (`wizard-state.json`) — deferred post-MVP

</domain>

<decisions>
## Implementation Decisions

### Masked Input (FOUND-03)
- **D-01:** Use `_writeToOutput` monkey-patch approach — override the readline interface's `_writeToOutput` method to write `*` per character instead of the actual char. No raw stdin mode needed.
- **D-02:** Show asterisks (not blank/silent) — operator sees `***` as they type, confirming input is received.
- **D-03:** Add `promptMasked(rl: Interface, question: string): Promise<string>` to `src/control/setup/setup-wizard-utils.ts`. Keep all wizard utilities co-located in that file.

### Channel Selection Flow (CHANWIZ-01, CHANWIZ-02)
- **D-04:** Sequential with per-channel confirm — present Telegram → Slack → Zalo-bot in order. For each channel, show env var detection status, then ask `Configure this channel? [Y/n]`. If yes, collect token. If no, skip.
- **D-05:** Env var auto-accept — if the env var is already set (e.g. `TELEGRAM_BOT_TOKEN`), display `Telegram: using TELEGRAM_BOT_TOKEN from env` and skip the token prompt entirely. Operator can re-run wizard to override.
- **D-06:** Token collection uses `promptMasked` (D-01) for token fields.
- **D-07:** Zalo Personal is skipped in this wizard. Display a note: `Zalo Personal requires QR login — run clisbot bots login zalo-personal after setup.`

### DM Pairing Policy (CHANWIZ-03)
- **D-08:** Default to `pairing` silently — no DM policy question in the wizard. Reduces wizard length. Operator adjusts via `clisbot routes` after setup if they want `open`.
- **D-09:** CHANWIZ-03 is satisfied by always writing `directMessagesPolicy: "pairing"` for all configured channels without prompting.

### Review Screen (CHANWIZ-04)
- **D-10:** Show a plain-text review table before writing config. Display each configured channel, its token source (env or entered), and DM policy. Operator types `y` (or Enter) to proceed or `n` to abort.

### Success Screen + Unrouted Start (CHANWIZ-05)
- **D-11:** After writing config, start runtime immediately (no confirmation prompt). Show success lines naming `clisbot setup agent` as the exact next command.

### START-01 Change
- **D-12:** Trigger: plain `clisbot start` with no `--cli` / `--bot-type` flags, with channels configured but no agent. The bootstrap path (with `--cli`) is unchanged.
- **D-13:** Warning message: `warning: no agent configured — starting in unrouted mode. Run clisbot setup agent to add an AI agent.` Then continue to `startDetachedRuntime`.
- **D-14:** The change is inside `printMissingBootstrapOptions` (currently exits with failure banner) — for `commandName === "start"` with no bootstrap flags and channels present, switch from exit-with-error to warn-and-continue.

### Claude's Discretion
- Exact readline prompt text and formatting (as long as the review screen and success screen are present)
- Whether `promptMasked` restores `_writeToOutput` after each prompt or once per session
- Exact success screen layout (lines, ordering) — just needs to name `clisbot setup agent` as next step
- Whether per-channel confirm defaults to Y or N (typical: Y for channels with env vars detected, N for missing ones)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CHANWIZ-01 through CHANWIZ-05 and START-01 (Phase 6 scope)

### Phase 5 Deliverables (import, don't re-implement)
- `src/control/setup/setup-wizard-utils.ts` — `ensureTTY`, `ensureDaemonNotRunning`, `writeEditableConfigAtomic`, `withWizardCleanup` (add `promptMasked` here)

### Core functions to call (thin orchestration)
- `src/config/channels/channel-bot-management.ts` — `applyBootstrapBotsToConfig` — use this to write channel config; do NOT hand-write channel config structure
- `src/control/runtime/runtime-process.ts` — `startDetachedRuntime` — use this to start runtime after config write
- `src/control/commands/startup-bootstrap.ts` — `getDefaultChannelAvailability`, `getChannelAvailabilityForBootstrap` — use for env var detection per channel

### Hard-fail location to change (START-01)
- `src/control/commands/runtime-bootstrap-cli.ts` lines ~120–145 — `printMissingBootstrapOptions` — this is the function to modify for START-01

### Channel inventory (for sequential channel flow)
- `src/channels/telegram/operator-inventory.ts` — `getDefaultAvailability` checks `TELEGRAM_BOT_TOKEN`
- `src/channels/slack/operator-inventory.ts` — `getDefaultAvailability` checks `SLACK_APP_TOKEN` + `SLACK_BOT_TOKEN`
- `src/channels/zalo-bot/operator-inventory.ts` — `getDefaultAvailability` checks `ZALO_BOT_TOKEN`
- `src/channels/integration/operator-inventory.ts` — `ChannelStartupAvailability` type

### Architecture
- `docs/architecture/domain-language.md` — canonical vocabulary
- `docs/architecture/runtime-architecture.md` — runtime lifecycle (unrouted mode, startDetachedRuntime)
- `.planning/ROADMAP.md` — Phase 6 success criteria and dependency chain

### Out-of-scope confirmation
- `.planning/REQUIREMENTS.md` §Out of Scope — confirms no new npm deps, no back-navigation, no animated spinners, Zalo Personal QR handled separately

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setup-wizard-utils.ts` — 4 exports ready: `ensureTTY`, `ensureDaemonNotRunning`, `writeEditableConfigAtomic`, `withWizardCleanup`. Phase 6 adds `promptMasked` to this file.
- `applyBootstrapBotsToConfig` in `channel-bot-management.ts` — takes `ChannelBootstrapBots` map and applies to config; this is the correct write path for channel tokens.
- `startDetachedRuntime` in `runtime-process.ts` — starts the detached runtime; Flow A calls this after config write.
- `getDefaultChannelAvailability(env)` in `startup-bootstrap.ts` — returns per-channel boolean map; use this to detect which env vars are set before prompting.
- `listStartupChannelDescriptors()` in `src/channels/catalog/registry.ts` — iterates over Telegram, Slack, Zalo-bot descriptors in order; sequential channel flow uses this list.

### Established Patterns
- Console output: `console.log` with plain strings, no logger abstraction
- No cursor control, no animated output — sequential lines only
- Config path resolution: `expandHomePath(configPath ?? getDefaultConfigPath())`
- Single `readline.Interface` per wizard session, `process.stdin.unref()` after `rl.close()`

### Integration Points
- Phase 6 (`setup-channels.ts`) imported by Phase 8 (`setup-cli.ts`) via the `clisbot setup channels` subcommand
- START-01 change is isolated to `runtime-bootstrap-cli.ts` in `printMissingBootstrapOptions` — no other files need changing for START-01

</code_context>

<specifics>
## Specific Ideas

- Temp file convention: `{configPath}.tmp` (already used in `writeEditableConfigAtomic`)
- Ctrl+C exit code: `process.exit(130)` (already in `withWizardCleanup`)
- `_writeToOutput` monkey-patch pattern for masked input is standard for readline-based CLIs
- START-01 warning message: `warning: no agent configured — starting in unrouted mode. Run clisbot setup agent to add an AI agent.`
- Success screen must name `clisbot setup agent` as the exact next command

</specifics>

<deferred>
## Deferred Ideas

- **DM pairing policy prompt** — decision to always default to `pairing` and skip the question; operator adjusts via `clisbot routes` after setup
- **Token format validation regex** — deferred post-MVP per REQUIREMENTS.md
- **Wizard resume state** — deferred post-MVP per REQUIREMENTS.md
- **Live token reachability probe** — deferred post-MVP (Telegram `/getMe`, Slack `auth.test`)
- **`--non-interactive` flag** — deferred post-MVP
- **Back-navigation** — explicitly out of scope; re-run wizard covers redo

</deferred>

---

*Phase: 06-flow-a-start-change*
*Context gathered: 2026-05-27*
