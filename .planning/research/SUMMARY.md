# Research Summary — v0.3.0 Interactive Setup Wizard

**Synthesized:** 2026-05-27
**Overall Confidence:** HIGH — all four research files derived from direct source reading, verified Bun issue tracker, and existing codebase patterns

---

## Executive Summary

The v0.3.0 milestone replaces a hard-stop first-run error flow with two independent readline-based wizard commands (`clisbot setup channels` and `clisbot setup agent`) plus a smart router (`clisbot setup`). The established approach is `node:readline/promises` — no new dependencies — mirroring the pattern already in production at `src/channels/zalo-personal/login.ts`. All five new files live entirely within `src/control/commands/`, total ~550 lines, and integrate exclusively with existing config and runtime functions (`readEditableConfig`, `writeEditableConfig`, `applyBootstrapBotsToConfig`, `startDetachedRuntime`, `requireChannelBotRecord`).

The two highest-consequence failure modes are partial config write (leaves the system unbootable) and launching the wizard while the daemon is running (stdin contention in shared tmux PTY). Both are prevented by atomic write (temp + rename) and a PID-file check at wizard entry. A confirmed Bun-specific bug — `rl.close()` corrupting stdin state on Bun 1.2.18+ (issue #21189) — requires calling `process.stdin.unref()` after close and using a single interface instance for the full wizard session.

The recommended build order is utilities first (validation + state helpers), then Flow A (channels) with the `runtime-bootstrap-cli.ts` warning change in the same batch, then Flow B (agent), then the router. The router must come last because it dispatches to both flow files; building it before either flow makes the integration untestable.

---

## Stack Additions

**Use `node:readline/promises` exclusively. No new runtime dependencies.**

| API / Pattern | Purpose | Notes |
|---|---|---|
| `createInterface({ input, output })` | All interactive prompts | One instance per wizard session, reused across questions |
| `rl.question(prompt)` | Text and token prompts | Existing pattern in `login.ts` line 1 |
| `_writeToOutput` override | Token masking / password input | Internal cast required: `as unknown as { _writeToOutput }`. Confirmed working in Bun 1.3.8. |
| Numbered choice loop | Multi-select / channel selection | No native multi-select in readline; implement as validated integer loop |
| `process.stdin.isTTY` | Non-interactive guard | Already used in `login.ts` line 33; mirror pattern |
| `process.stdin.unref()` | Post-close hang prevention | Required mitigation for Bun issue #21189 |

**Do not add:** Inquirer, Enquirer, Prompts, readline-sync, Chalk, Commander, or Yargs. The project has 5 runtime dependencies today; keep it that way for this milestone.

**Note on `@clack/prompts`:** Research identified it as a useful pattern source (intro/outro, isCancel, tasks, spinner) but it carries a confirmed EPERM regression on Bun 1.3.1-1.3.2 (issue #24615). Using `node:readline/promises` directly avoids this version sensitivity. The clack patterns (step counter, tasks sequence, outro with next command) are worth implementing manually without the dependency.

---

## Feature Table Stakes

Ordered by implementation priority (each depends on the prior):

1. **TTY guard + CI bail-out** — `process.stdin.isTTY` check before any readline opens; honor `CI=true` env var; emit a clear one-line error on failure, never silent exit
2. **Daemon PID check** — refuse to run wizard if `CLISBOT_PID_PATH` process is live; print actionable stop message
3. **Masked input for all token prompts** — `_writeToOutput` suppression; immediate trust signal
4. **Env var detection + pre-fill** — check `TELEGRAM_BOT_TOKEN`, `SLACK_BOT_TOKEN`, etc. before prompting; offer existing value as default; never re-ask for a value already in config
5. **Inline validation with re-prompt** — format check (not live API call) before advancing; reshow same prompt on failure; never advance on invalid input
6. **isCancel / SIGINT handling** — clean exit from any prompt step; no dangling readline handle or partial config on disk
7. **Atomic config write** — write to `config.yaml.tmp.<pid>`, validate parse, `fs.rename` to final path; back up previous valid config before overwriting
8. **Step counter [N/Total]** — operators need progress visibility; `[1/3] Telegram token` pattern
9. **Skip path for optional channels** — Slack and Zalo are optional; must be skippable without friction
10. **Success summary + exact next command** — past-tense confirmation of what was configured; one-liner next step (e.g., `Run clisbot setup agent`)

**Defer to post-MVP:**
- Live reachability probe (spinner + `/getMe` API call) — format validation is sufficient for MVP
- Wizard resume state (`wizard-state.json`) — env var detection covers the re-run case; full resume state is medium effort
- `--telegram $TOKEN` flag bypass — useful for power users but not blocking; validate interactive path first

---

## Architecture Integration Points

### New files (all in `src/control/commands/`)

| File | Role | Depends On |
|---|---|---|
| `setup-wizard-validation.ts` | Pure token format checks, `commandExists` wrapper | `infra/process.ts` only |
| `setup-state.ts` | Read/write `wizard-state.json` under `getDefaultStateDir()` | `infra/paths.ts`, `infra/fs.ts` |
| `setup-channels-cli.ts` | Flow A wizard — token collection, config write, runtime start | Phase 1 files + existing config/runtime functions |
| `setup-agent-cli.ts` | Flow B wizard — CLI tool + bot type, agent config, channel binding | Phase 1 files + `agents-cli.ts`, `channel-bots.ts` |
| `setup-cli.ts` | Router — detects missing config, dispatches to Flow A or B | Both flow files |

### Modified files

| File | Change | Risk |
|---|---|---|
| `src/control/commands/runtime-bootstrap-cli.ts` | `start()`: remove hard-fail for channels-configured/no-agent; replace with warning + continue | LOW — isolated branch change |
| CLI entry point | Register `setup` subcommand pointing to `setup-cli.ts` | LOW — additive only |

### Key call chains

**Flow A (channels):**

    runChannelSetupWizard()
      readEditableConfig(configPath)
      readline prompts (masked, with defaults from env/existing config)
      validateToken() [setup-wizard-validation.ts]
      applyBootstrapBotsToConfig(config, bots, { firstRun })
      buildBootstrapRuntimeMemEnv(bots, process.env)
      writeEditableConfig(configPath, config)
      startDetachedRuntime({ configPath, extraEnv, ... })

**Flow B (agent):**

    runAgentSetupWizard()
      readEditableConfig(configPath)
      readline prompts (cli tool, bot type, channel binding)
      commandExists(cliTool)
      addAgentToEditableConfig({ agentId: 'default', cliTool, bootstrap })
      for each bot: requireChannelBotRecord(config, channel, botId); bot.agentId = 'default'
      writeEditableConfig(configPath, config)

**Critical constraint:** Do NOT call `runBotsCli` or spawn a subprocess for agent binding. The mutation is 3 lines of direct config change via `requireChannelBotRecord` + field assignment + `writeEditableConfig`. CLI re-dispatch introduces fragile string-based argument construction.

**Config read discipline:** Config is loaded once at router entry, passed by parameter into flow functions. `setup-state.ts` and `setup-wizard-validation.ts` never import config loading functions.

### Wizard state location
`${CLISBOT_HOME}/state/wizard-state.json` — same directory as pid, sessions, activity files. Resolved via `getDefaultStateDir(process.env)`. Respects the full `CLISBOT_HOME` env var chain.

---

## Watch Out For

### 1. Bun `rl.close()` corrupts stdin — process hangs after wizard completes
**Issue:** Bun #21189 (v1.2.18+). After `rl.close()`, stdin becomes unresponsive; Ctrl+C does not work.
**Prevention:** Call `process.stdin.unref()` immediately after `rl.close()`. Use a single `createInterface` instance for the entire wizard session — never create and close multiple interfaces (segfault risk, Bun #10844).

### 2. Partial config write leaves runtime unbootable
**Issue:** `fs.writeFile` is not atomic. A killed wizard mid-write produces syntactically invalid YAML; `clisbot start` throws a schema error with no recovery path.
**Prevention:** Write to `config.yaml.tmp.<pid>`, validate the YAML parses, then `fs.rename` to the final path. Back up the previous valid config. Verify whether `writeEditableConfig` already does atomic write — if not, the wizard must wrap the call.

### 3. Wizard launched while daemon is running — stdin contention in shared tmux PTY
**Issue:** Readline raw mode grabs the PTY; daemon drops messages; wizard may hang.
**Prevention:** Check `CLISBOT_PID_PATH` at wizard entry; call `kill(pid, 0)` to confirm liveness; refuse with actionable stop message. Check belongs in both flow entry points.

### 4. `@clack/prompts` EPERM crash on Bun 1.3.1-1.3.2
**Issue:** Confirmed regression (Bun #24615) — wizard crashes before first prompt on uncompiled scripts.
**Prevention:** Do not add `@clack/prompts` as a dependency. Implement clack UX patterns using native readline + manual formatting.

### 5. TTY detection false negatives give operators a silent no-op
**Issue:** `process.stdin.isTTY === false` in SSH without `-t`, Docker exec without `-it`, and some CI runners.
**Prevention:** Never silently exit. Always emit a clear error. Honor `CI=true` as an explicit non-interactive signal to fail fast rather than hang.

---

## Build Order Recommendation

| Phase | Files | Rationale |
|---|---|---|
| **Phase 1 — Wizard Foundation** | `setup-wizard-validation.ts`, `setup-state.ts` | Pure utilities, no dependencies on other new files. No UI, no readline — pure testable functions. |
| **Phase 2 — Flow A + start() change** | `setup-channels-cli.ts`, `runtime-bootstrap-cli.ts` (warning change) | Highest-value deliverable. The `start()` hard-fail removal ships in same batch — without it, Flow A result immediately triggers the error it was designed to prevent. |
| **Phase 3 — Flow B** | `setup-agent-cli.ts` | Depends on Phase 1 utilities and config state from Flow A. Tested independently once Flow A is complete. |
| **Phase 4 — Router + CLI registration** | `setup-cli.ts`, CLI entry point | Must come last — dispatches to both flow files. |
| **Phase 5 — Test coverage** | Test files | All Bun edge cases need regression coverage. Use dependency injection (Prompter interface) for unit tests; piped child process for integration tests. |

**Critical path:** Phase 1 -> Phase 2 (flow A + start change together) -> Phase 3 -> Phase 4 -> Phase 5.

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | `node:readline/promises` is in production in this codebase today. Bun 1.3.8 compatibility confirmed. |
| Features | MEDIUM-HIGH | Patterns verified against gh, wrangler, fly, clack docs, Evil Martians guide, NN/g wizard research. |
| Architecture | HIGH | Derived from direct source reading of all relevant files. All import paths and call chains verified against actual exports. |
| Pitfalls | HIGH | Bun issues #21189, #24615, #10844, #13374 all confirmed from official Bun issue tracker. |

**Gaps to address during planning:**
- Token format validation rules (exact regex for `xoxb-` Slack tokens, Telegram token format)
- Verify whether `writeEditableConfig` already performs atomic write or wizard must add temp+rename wrapper
- Confirm `applyBootstrapBotsToConfig` handles the first-run case without requiring pre-existing config structure

---

## Sources (aggregated)

- Bun `node:readline` reference: https://bun.com/reference/node/readline
- Bun issue #21189 (readline.close stdin corruption): https://github.com/oven-sh/bun/issues/21189
- Bun issue #24615 (@clack/prompts EPERM): https://github.com/oven-sh/bun/issues/24615
- Bun issue #10844 (multiple readline interfaces): https://github.com/oven-sh/bun/issues/10844
- Node.js readline official docs: https://nodejs.org/api/readline.html
- gh auth login documented flow: https://cli.github.com/manual/gh_auth_login
- Evil Martians CLI UX best practices: https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays
- @clack/prompts docs: https://bomb.sh/docs/clack/basics/getting-started/
- NN/g wizard design principles: https://www.nngroup.com/articles/wizards/
- Wrangler env var patterns: https://developers.cloudflare.com/workers/wrangler/system-environment-variables/
- Existing codebase: `src/channels/zalo-personal/login.ts` (production readline usage in this repo)
