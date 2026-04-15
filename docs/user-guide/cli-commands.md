# CLI Commands

## Status

Current runtime command inventory.

This page is the canonical overview for operator CLI surfaces and a quick reference for auth and permission planning.

## Source Of Truth

- Top-level parse and help: `src/cli.ts`
- Runtime dispatch: `src/main.ts`
- Subcommand families:
  - `src/control/channels-cli.ts`
  - `src/control/accounts-cli.ts`
  - `src/control/loops-cli.ts`
  - `src/control/message-cli.ts`
  - `src/control/agents-cli.ts`
  - `src/channels/pairing/cli.ts`

If this page and runtime ever disagree, runtime wins.

## Top-Level

- `clisbot start`
- `clisbot restart`
- `clisbot stop`
- `clisbot status`
- `clisbot version`
- `clisbot logs`
- `clisbot channels ...`
- `clisbot accounts ...`
- `clisbot loops ...`
- `clisbot message ...`
- `clisbot agents ...`
- `clisbot pairing ...`
- `clisbot init`

## Service Lifecycle

- `clisbot start [bootstrap flags...]`: seed config if needed and start the detached runtime
- `clisbot restart`: stop then start again
- `clisbot stop [--hard]`: stop runtime, optionally clean all tmux sessions on the clisbot socket
- `clisbot status`: inspect runtime, config, log, and tmux state
- `clisbot logs [--lines N]`: print recent logs
- `clisbot init [bootstrap flags...]`: seed config and optionally first agent without starting runtime

## Channels

- `clisbot channels enable <slack|telegram>`
- `clisbot channels disable <slack|telegram>`
- `clisbot channels add telegram-group <chatId> [--topic <topicId>] [--agent <id>] [--require-mention true|false]`
- `clisbot channels remove telegram-group <chatId> [--topic <topicId>]`
- `clisbot channels add slack-channel <channelId> [--agent <id>] [--require-mention true|false]`
- `clisbot channels remove slack-channel <channelId>`
- `clisbot channels add slack-group <groupId> [--agent <id>] [--require-mention true|false]`
- `clisbot channels remove slack-group <groupId>`
- `clisbot channels response-mode status --channel <slack|telegram> [--target <target>] [--topic <topicId>]`
- `clisbot channels response-mode set <capture-pane|message-tool> --channel <slack|telegram> [--target <target>] [--topic <topicId>]`
- `clisbot channels additional-message-mode status --channel <slack|telegram> [--target <target>] [--topic <topicId>]`
- `clisbot channels additional-message-mode set <queue|steer> --channel <slack|telegram> [--target <target>] [--topic <topicId>]`
- `clisbot channels set-token <slack-app|slack-bot|telegram-bot> <value>`
- `clisbot channels clear-token <slack-app|slack-bot|telegram-bot>`

## Accounts

- `clisbot accounts add telegram --account <id> --token <ENV_NAME|${ENV_NAME}|literal> [--persist]`
- `clisbot accounts add slack --account <id> --app-token <ENV_NAME|${ENV_NAME}|literal> --bot-token <ENV_NAME|${ENV_NAME}|literal> [--persist]`
- `clisbot accounts persist --channel <slack|telegram> --account <id>`
- `clisbot accounts persist --all`

## Loops

- `clisbot loops list`
- `clisbot loops status`
- `clisbot loops cancel <id>`
- `clisbot loops cancel --all`

## Message Tooling

- `clisbot message send ...`
- `clisbot message poll ...`
- `clisbot message react ...`
- `clisbot message reactions ...`
- `clisbot message read ...`
- `clisbot message edit ...`
- `clisbot message delete ...`
- `clisbot message pin ...`
- `clisbot message unpin ...`
- `clisbot message pins ...`
- `clisbot message search ...`

## Agents

- `clisbot agents list`
- `clisbot agents list --bindings`
- `clisbot agents list --json`
- `clisbot agents add <id> --cli <codex|claude|gemini> [--workspace <path>] [--startup-option <arg>]... [--bootstrap <personal-assistant|team-assistant>] [--bind <channel[:accountId]>]...`
- `clisbot agents bootstrap <id> --mode <personal-assistant|team-assistant> [--force]`
- `clisbot agents bindings [--agent <id>] [--json]`
- `clisbot agents bind --agent <id> --bind <channel[:accountId]>`
- `clisbot agents unbind --agent <id> [--bind <channel[:accountId]> | --all]`
- `clisbot agents response-mode status --agent <id>`
- `clisbot agents response-mode set <capture-pane|message-tool> --agent <id>`
- `clisbot agents response-mode clear --agent <id>`
- `clisbot agents additional-message-mode status --agent <id>`
- `clisbot agents additional-message-mode set <queue|steer> --agent <id>`
- `clisbot agents additional-message-mode clear --agent <id>`

## Pairing

- `clisbot pairing list <slack|telegram> [--json]`
- `clisbot pairing approve <slack|telegram> <code>`

## Notes

- This page is inventory-first by design
- It is meant to answer “what commands exist” before answering “how each one behaves”
- For current route and channel operating details, see `docs/user-guide/channels.md`
