# Setup Wizard

## Summary

`clisbot setup` is an interactive readline wizard that guides operators through first-run configuration without requiring manual JSON editing.

It replaces the old hard-stop error flow where a missing token or missing agent would prevent the service from starting at all.

## When To Use It

Use `clisbot setup` instead of `clisbot start ...` flags when:

- you are setting up clisbot for the first time
- you want to reconfigure channel tokens without editing `~/.clisbot/clisbot.json` directly
- you want to swap the AI CLI or re-seed the agent workspace

Use the direct subcommands when the scope is clear:

- `clisbot setup channels` — only reconfigure bot tokens
- `clisbot setup agent` — only reconfigure the AI CLI and workspace

## Requirements

- a TTY terminal (the wizard reads interactively from stdin)
- the runtime must not already be running when you start the wizard

## clisbot setup

Running `clisbot setup` without a subcommand reads your current config and routes automatically:

- no channels configured → runs the channels wizard
- channels configured but no agent → skips preamble, runs the agent wizard directly
- both configured → shows current state and asks which wizard to run

```bash
clisbot setup
```

Example output:

```
=== clisbot setup ===

Current configuration:
  Channels: telegram
  Agent: default

What would you like to do?
  1. channels  — reconfigure bot tokens
  2. agent     — reconfigure AI CLI and workspace
```

## clisbot setup channels

Collects and validates channel tokens for Telegram, Slack, and Zalo Bot.

```bash
clisbot setup channels
```

What it does:

1. reads any existing channel credentials from `~/.clisbot/credentials/`
2. asks which channels to enable
3. prompts for each bot token with masked input (input shows `*` characters, not the real token)
4. validates the token is non-empty
5. writes credentials to the standard credential files
6. writes updated channel config to `~/.clisbot/clisbot.json` atomically
7. starts the runtime in unrouted mode when no agent is configured yet, so you can confirm channels are working before adding an agent

The wizard writes credential files under `~/.clisbot/credentials/` and references them by path in the config file. Raw tokens are never stored in config.

After the channels wizard completes, run `clisbot status` to confirm channels show `active`.

## clisbot setup agent

Configures the AI CLI runner and seeds the agent workspace.

```bash
clisbot setup agent
```

What it does:

1. shows which channels are already configured
2. asks which AI CLI to use: `codex`, `claude`, `gemini`, or `pi`
3. checks that the chosen CLI binary exists in `PATH`; if not, prints the install command and exits early
4. asks which bot type to use for the workspace template: `personal` or `team`
5. writes the agent config to `~/.clisbot/clisbot.json`
6. seeds the workspace with bootstrap files (`AGENTS.md`, `IDENTITY.md`, etc.)
7. reloads the runtime config if the service is already running, or starts the runtime if it was stopped

Install commands for each CLI:

| CLI    | Install command                              |
| ------ | -------------------------------------------- |
| codex  | `npm install -g @openai/codex`               |
| claude | `npm install -g @anthropic-ai/claude-code`   |
| gemini | `npm install -g @google/gemini-cli`          |
| pi     | `npm install -g @earendil-works/pi-coding-agent` |

## clisbot start behavior change

Before this wizard existed, `clisbot start` with channels configured but no agent would exit with a hard error.

Current behavior: if at least one channel is enabled in config but no agent is configured, `clisbot start` warns and continues in unrouted mode:

```
warning: no agent configured — starting in unrouted mode.
Run clisbot setup agent to add an AI agent.
```

This lets you verify channel connectivity first, then add an agent as a second step.

## Atomic Config Writes

Both wizards write config atomically (write to a temp file, then rename into place). If the wizard exits or is interrupted before completing, the existing config is left untouched.

## After Setup

Once both wizards have run:

1. get your principal from a routed surface: `/whoami`
2. grant first app owner: `clisbot auth add-user app --role owner --user <principal>`
3. add channel routes: `clisbot routes add ...`
4. inspect status: `clisbot status`

See [CLI Commands](cli-commands.md) for the full command reference and [Authorization And Roles](auth-and-roles.md) for role setup.
