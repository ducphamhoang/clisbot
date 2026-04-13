# Loops CLI

## Summary

`clisbot loops` is the operator-facing control surface for inspecting and cancelling persisted recurring loops that were created earlier through channel `/loop` commands.

Examples:

- `clisbot loops list`
- `clisbot loops status`
- `clisbot loops cancel abc123`
- `clisbot loops cancel --all`

## Scope

- global inventory of persisted managed loops across the app
- operator-safe cancellation by loop id
- operator-safe cancellation of all persisted loops
- shared output format for `list` and `status`

## Non-Goals

- creating loops from the operator CLI
- replacing channel `/loop` creation UX
- per-session operator scoping in the CLI
- immediate IPC into the live runtime process

## Invariants

- `clisbot loops list` and `clisbot loops status` are aliases with the same loop inventory body
- this CLI only manages loops that already exist in persisted session state
- `clisbot loops cancel --all` is app-wide because the top-level CLI has no routed session context
- output is global, so every rendered loop includes both `agentId` and `sessionKey`
- loop creation remains channel-owned through `/loop`

## Implementation Notes

### Data Source

- the CLI reads persisted loop state from the session store at `session.storePath`
- default path is `~/.clisbot/state/sessions.json`
- when `CLISBOT_HOME` is set, the default path becomes `<CLISBOT_HOME>/state/sessions.json`
- the CLI intentionally loads config without channel token env resolution because loop inspection should not fail just because Slack or Telegram tokens are unavailable in the current shell

### Cancellation Model

- `clisbot loops cancel <id>` removes the matching loop record from persisted session state
- `clisbot loops cancel --all` clears all persisted loop records across all sessions
- runtime loop state updates use compare-on-write semantics, so a stale in-memory loop update cannot recreate a loop that the CLI already cancelled
- the live runtime scheduler now re-checks persisted loop existence before each scheduled tick
- this means operator CLI cancellation suppresses future runs without needing a separate loop-specific IPC channel
- cancellation does not interrupt a loop iteration that is already running

### Shared Rendering

- `list` and `status` use one shared renderer so operator output stays consistent
- each loop row includes:
  - loop id
  - agent id
  - session key
  - interval or wall-clock schedule
  - remaining run budget
  - next run timestamp
  - prompt summary

## Related Docs

- [Task Doc](../../tasks/features/control/2026-04-13-loops-cli-management.md)
- [User Guide](../../user-guide/README.md)
- [Control Test Cases](../../tests/features/control/README.md)
