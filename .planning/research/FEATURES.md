# Feature Research — CLI Wizard UX Patterns

**Domain:** Interactive CLI setup wizard for multi-channel bot runtime
**Project:** clisbot v0.3.0
**Researched:** 2026-05-27
**Confidence:** MEDIUM-HIGH — patterns verified against gh, clack, Evil Martians CLI guide, NN/g wizard research

---

## Table Stakes (must-have)

These are patterns users expect from any well-made CLI wizard. Missing them causes trust loss or abandonment on first run.

| Feature | Rationale | Complexity |
|---------|-----------|------------|
| **Masked token/credential input** | Tokens must not echo to the terminal or land in shell history. Users expect `***` masking or complete suppression for secrets. The `@clack/prompts` `password()` prompt and Node.js `readline` with `_writeToOutput` suppression both implement this. | Low |
| **Env var detection with skip** | If `TELEGRAM_BOT_TOKEN` is already set in the environment, the wizard must detect it and not ask the user to re-enter it. Show `Found in environment: $TELEGRAM_BOT_TOKEN` and skip the prompt or offer "use this / enter a different one." Misidentifying configured state as blank is a documented anti-pattern (hermes-agent issue #13024). | Low |
| **Inline validation with instant feedback** | Validate each token before moving to the next step. Show the error immediately at the field, not after all prompts are answered. A token with the wrong format, wrong length, or that fails a live API check must fail fast. Reshow the same prompt on failure rather than starting over. | Medium |
| **Non-interactive detection and bail-out** | Check `process.stdin.isTTY` before opening any readline interface. If not a TTY (piped input, CI, cron), print a one-line error and exit with a non-zero code. Never hang waiting for input that will never come. | Low |
| **Ctrl+C / cancellation handling** | Clack's `isCancel()` and Node `readline` both surface SIGINT from the user. Every prompt must check for cancellation and exit cleanly. Leave no dangling readline handle, raw-mode lock, or incomplete config on disk. | Low |
| **Atomic config write** | Config must be written temp-then-rename (POSIX atomic). A killed wizard must never leave a half-written config that breaks `clisbot start`. See PITFALLS.md — this is the highest-consequence failure mode. | Low |
| **Step progress indicator** | Show the operator where they are: `[1/3] Telegram token`, `[2/3] Slack token`, `[3/3] Starting runtime`. Operators will not re-run a wizard they cannot see is making progress. X of Y is the right pattern here (Evil Martians CLI guide). | Low |
| **Success summary screen** | After completion, print a summary of what was configured. Use green/checkmarks for each item. Switch from gerund to past tense: not "Configuring Telegram..." but "Telegram configured." One-liner next step: "Run `clisbot agents add` or `clisbot setup agent` to add an AI CLI." | Low |
| **Pre-populate prompts with existing values** | If a token is already written to config, show it as the default or as `[existing value]`. The user should never have to re-enter a value they already set in a previous partial run. | Low |
| **"Skip for now" path for optional channels** | Zalo is optional. Slack is optional unless specifically wanted. Any optional channel must have an explicit "Skip for now" choice. Forcing answers for optional fields is the number-one wizard frustration per NN/g research. | Low |

---

## Differentiators (nice-to-have)

These improve the experience without being blocking. All are low-to-medium effort. Defer any marked Medium until table stakes are solid.

| Feature | Value | Effort |
|---------|-------|--------|
| **Live reachability probe with spinner** | After the user enters a Telegram token, fire a lightweight `/getMe` call with a spinner: "Verifying token..." → "Telegram bot: @mybot (confirmed)". This turns format validation into connection confirmation and catches revoked tokens before `clisbot start` fails silently. | Medium |
| **Smart router that skips completed flows** | `clisbot setup` should detect which flows are already done and route directly to the missing one. "Channels are configured, no agent found — running `clisbot setup agent` now." Never re-run a flow that is already complete without `--force`. | Low |
| **Wizard resume state** | If the wizard is interrupted mid-flow (Ctrl+C after entering one token), write resume state to `wizard-state.json`. On next run, offer "You left off at Slack token — continue from here?" This is especially important for Flow A which collects up to 3 tokens. | Medium |
| **Quiet / non-wizard flag path** | For operators who know their tokens, `clisbot setup channels --telegram $TOKEN --slack $TOKEN` should bypass the wizard entirely and apply the values directly. Power users should never be forced into interactive mode. `gh auth login` does this with `--with-token`. | Low |
| **Binary detection with install hint** | In Flow B, when checking whether the chosen AI CLI binary is installed, if it is missing, print the exact install command: "claude not found — install with: npm i -g @anthropic-ai/claude-code". Do not just say "not found." | Low |
| **Idempotent re-run** | Running `clisbot setup channels` twice with the same tokens must produce the same result. No duplicate entries, no config corruption. Each run is a safe update. | Low |

---

## Anti-Features (explicitly avoid)

These patterns appear in bad CLI wizards. Calling them out explicitly prevents accidental implementation.

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| **Forcing re-entry of already-set values** | Operators who rerun the wizard after a partial setup must not lose prior work. Re-asking for a token already in config is the hermes-agent bug in reverse — configured state treated as blank. | Detect existing config values, show them as defaults or skip prompts entirely. |
| **Wizard inside a running daemon** | Documented in PITFALLS.md: stdin contention with the daemon's process in the same tmux pane causes silent message loss and hung wizards. | Check PID file before entering interactive mode. Refuse with a clear message if the runtime is up. |
| **No way to exit mid-wizard** | If the user cannot Ctrl+C cleanly, they will kill the terminal. Anything short of a clean exit from any step is a blocker. | Handle `isCancel()` or SIGINT at every prompt. Exit cleanly with a recovery hint. |
| **Partial config write on interruption** | Leaving a half-written YAML means `clisbot start` will throw a parse error with no recovery path. | Atomic write (temp + rename). Back up previous valid config before overwriting. |
| **Menu-first router** | "What would you like to set up? (1) Channels (2) Agent (3) Exit" shown even when the answer is obvious. The router should detect what is missing and go there directly. Menus are a fallback for the ambiguous case only. | Auto-detect and route. Show a menu only when both flows are incomplete or both are complete (re-run scenario). |
| **Inline help walls inside prompts** | Pasting a 10-line explanation of what a Telegram bot token is into the prompt text itself. Operators who know what they are doing have to scroll past it every time. | One-line prompt text. Offer `--help` or a URL for more. |
| **Silent failure on validation error** | Showing the next prompt without telling the user why the previous value was rejected. | Inline error at the failed field. Never advance on invalid input. |
| **Asking for things that can be auto-detected** | Do not ask the operator which channels are configured — detect it from config. Do not ask which CLI is installed — check the binary. Ask only for what cannot be detected. | Auto-detect then confirm. Only prompt for genuinely unknown values. |
| **Complex choice menus for bot-type when only one option makes sense** | In Flow B, if only one channel is configured, asking "which channel should this agent serve?" is unnecessary friction. | Single channel: bind silently and confirm. Multiple channels: prompt. |

---

## Real-World Examples

Patterns observed from well-regarded CLI tools. These are not speculation — each is sourced from observed behavior or official docs.

### gh auth login (GitHub CLI)

**What it does well:**
- Minimal prompt count: 4 questions total (host, protocol, authenticate git, auth method)
- Each question has an obvious default selected
- Token path: `--with-token < file` bypasses all interactive prompts for automation
- SSH flow auto-detects existing SSH keys and offers to upload them — no re-generation if one exists
- One-time code pattern for browser OAuth: prints code, opens browser, waits — no spinning "please wait" that makes users think it is broken
- Env var override: if `GITHUB_TOKEN` is set, `gh` uses it without prompting
- Non-interactive detection: if no TTY detected, interactive mode disabled; falls back to token env var or errors clearly

**Source:** https://cli.github.com/manual/gh_auth_login

---

### wrangler (Cloudflare Workers)

**What it does well:**
- `--yes` flag skips all confirmation prompts and uses detected defaults — pure non-interactive mode
- `CLOUDFLARE_API_TOKEN` env var bypasses the auth prompt entirely — consistent with the env-var-first pattern
- Clear distinction between project config (wrangler.toml) and secrets (`.dev.vars`, `.env`) — operator knows exactly where each thing lives

**What it does less well:**
- `--yes` can still trigger interactive prompts in some cases (reported as bug #3286) — inconsistent non-interactive mode is a trust breaker
- `wrangler init` deprecated in favor of `npm create cloudflare` — command surface fragmentation confuses operators on re-entry

**Source:** https://developers.cloudflare.com/workers/wrangler/system-environment-variables/

---

### fly launch (Fly.io)

**What it does well:**
- Auto-scans project directory to detect framework/language — asks only what it cannot detect
- Writes `fly.toml` as the output artifact — operator knows exactly what was generated and can edit it
- "Good defaults" philosophy: sets region, machine size, etc. without asking unless the operator needs custom values

**Pattern to borrow:** "detect first, ask only for what is unknown." Applied to Flow A: detect which channel tokens are already in config or env vars, ask only for the missing ones.

---

### @clack/prompts (prompt library used by create-svelte, eslint, etc.)

**What it does well:**
- `intro()` / `outro()` framing: every wizard has a clear "here we go" and "all done" boundary
- `isCancel()` utility: every prompt resolves to either a value or a cancel symbol — forces the developer to handle every exit path
- `password()` prompt: built-in masking, nothing special needed
- `spinner()` with `.start()` / `.stop()` / `.stop('message', 0|1)`: wraps any async operation in a loading indicator cleanly
- `note()` for informational blocks that are not prompts — avoids cramming help text into prompt strings
- `tasks()` for sequential post-wizard steps with checkmark feedback
- `select()` with `hint` field: shows a one-line hint per option without cluttering the main label

**Pattern to borrow:** `intro`/`outro` framing, `isCancel()` at every step, spinner for any async validation (token reachability probe), `tasks()` for the final "applying config → starting runtime" sequence.

**Source:** https://bomb.sh/docs/clack/basics/getting-started/

---

### Evil Martians CLI UX Best Practices

**Key findings:**
- Use X of Y pattern (`[2/3]`) for sequential steps — enables time estimation and trust
- Green + checkmark for success states; switch from gerund to past tense at completion
- Spinner tick on each action to signal liveness — not a spinning hourglass that may be frozen
- Clear spinners before showing final output — do not leave the spinner on screen when reporting results

**Source:** https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays

---

### AWS CLI wizard mode

**Key finding:** AWS added `--cli-auto-prompt` mode (the `aws_cli_auto_prompt` env var) which provides tab-completion and inline documentation for every flag. Relevant lesson: env vars should always be able to override interactive behavior in both directions — env var to skip prompts AND env var to enable them.

**Source:** https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-wizard.html

---

## Applied to Clisbot Two-Flow Design

How each pattern maps concretely to Flow A (`clisbot setup channels`) and Flow B (`clisbot setup agent`).

### Flow A: `clisbot setup channels`

**Step sequence (incorporating table-stakes patterns):**

```
intro("clisbot setup — channel configuration")

[Check] Runtime running? → PID file check → if yes: error + exit
[Check] Existing config? → readEditableConfig → derive which channels are already set

[1/N] Telegram bot token
  - If TELEGRAM_BOT_TOKEN env var set → "Found $TELEGRAM_BOT_TOKEN in environment (use this? Y/n)"
  - If already in config → "Telegram: already configured (re-enter to update, or press Enter to keep)"
  - Otherwise: password() prompt — "Enter Telegram bot token:" — masked
  - Validate: format check (starts with digits:, correct length) → inline error on failure
  - Differentiator: spinner → GET /getMe → "Bot: @yourbot (confirmed)" or inline error

[2/N] Slack bot token (optional)
  - Offer "Skip for now" as a select option: ["Enter token", "Skip for now"]
  - If entered: masked input + format check (xoxb-...)
  - Differentiator: spinner → auth.test call

[3/N] Zalo (optional, same skip pattern)

[Confirm] "Configure these channels? (Y/n)"
  - Show summary of what will be written

[Tasks] Applying config... → spinner
         Starting runtime in unrouted mode... → spinner
         Runtime started (PID: 12345) → checkmark

outro("Channels configured. Run `clisbot setup agent` to add an AI CLI.")
```

**Patterns applied:**
- Env var detection → pre-fill or skip (gh pattern)
- Masked input → password() (clack)
- Optional skip path → select with Skip option (table stakes)
- Inline validation → before advancing step (table stakes)
- Atomic write → temp+rename (PITFALLS.md)
- Step counter → [1/3], [2/3] (Evil Martians)
- Tasks() for apply + start sequence (clack)
- outro() with next step (clack)

---

### Flow B: `clisbot setup agent`

**Step sequence:**

```
intro("clisbot setup — agent configuration")

[Check] Runtime running? → if yes: error + exit
[Check] Channels configured? → if none: "No channels configured yet — run `clisbot setup channels` first"

[1/3] Choose AI CLI
  - select(["claude", "codex", "gemini", "pi"]) with hint per option
  - Binary check: commandExists(choice) → if missing: note() with install command, then confirm "install first and re-run, or continue anyway?"

[2/3] Bot type
  - select(["personal", "team"]) with one-line hint per option
  - If only one sensible option given context: skip and confirm silently

[3/3] Link to channels
  - If only one channel configured: "Linking to Telegram (@yourbot) — press Enter to confirm"
  - If multiple: multiselect() of configured channel bots

[Tasks] Seeding workspace (AGENTS.md, IDENTITY.md, BOOTSTRAP.md)... → checkmark
        Adding agent to config... → checkmark
        Linking to channels... → checkmark

outro("Agent configured. Run `clisbot start` to launch.")
```

**Patterns applied:**
- Auto-detect binary → install hint if missing (differentiator, low effort)
- Auto-detect single channel → skip the "which channel" prompt (anti-feature avoidance)
- select() with hint → context without wall of text (clack)
- Tasks() for post-collection work (clack)
- outro() with one exact next command (clack)

---

### Router: `clisbot setup`

**Logic:**

```
1. Read config state
2. No channels configured AND no agent → route to Flow A; after A completes, offer to continue to Flow B
3. Channels configured, no agent → route directly to Flow B with message "Channels are set. Setting up agent now."
4. Agent configured, no channels → route to Flow A with message "Agent is set. Need channels first."
5. Both configured → "Setup looks complete. Use --force to re-run, or clisbot status to check runtime."
```

**Anti-pattern avoided:** Never show the "(1) Channels (2) Agent (3) Exit" menu as the default. The menu is the fallback for case 5 only (both complete, operator wants to re-run something specific).

---

## Feature Dependencies

```
Masked input (password()) → required before any token collection step
Env var detection → required before showing token prompts
Inline validation → required before advancing any step
Atomic config write → required before wizard can be considered safe
isCancel() handling → required at every prompt (not optional)

Spinner + live probe → depends on token having been entered and validated (format only)
Router smart detection → depends on readEditableConfig being called at router entry
Resume state → depends on step counter being tracked (wizard-state.json)
```

---

## MVP Recommendation

Implement table stakes in this order for the MVP:

1. TTY guard (non-interactive bail-out) — no cost, prevents CI hangs
2. Masked input for all token prompts — immediate trust signal
3. Env var detection + pre-fill — prevents re-entry frustration on re-run
4. Inline validation (format only, no live probe) — fast feedback
5. isCancel() at every step — clean exit
6. Atomic config write — correct by default
7. Step counter [1/N] — progress visibility
8. Tasks() sequence for apply + start — polished completion
9. outro() with exact next command — operators know what to do next

**Defer to next milestone or iteration:**
- Live reachability probe (spinner + API call): useful but not blocking — format validation is sufficient for MVP
- Resume state (wizard-state.json): useful for multi-token Flow A, but Ctrl+C + re-run with env var detection covers most cases already
- `--telegram $TOKEN` flag bypass: useful for power users, low effort, can be added after MVP validates the interactive path

---

## Sources

- https://cli.github.com/manual/gh_auth_login — gh auth login documented flow
- https://developers.cloudflare.com/workers/wrangler/system-environment-variables/ — wrangler env var override pattern
- https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays — X of Y, spinner, success checkmarks
- https://bomb.sh/docs/clack/basics/getting-started/ — clack prompt types, isCancel(), tasks(), intro/outro
- https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html — interactive mode, validation, env var detection
- https://www.nngroup.com/articles/wizards/ — wizard design principles, skip paths, optional steps
- https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-wizard.html — AWS wizard mode, env var bidirectional override
- https://github.com/NousResearch/hermes-agent/issues/13024 — misidentifying configured state as first-run (anti-pattern evidence)
