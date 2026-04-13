# Loops CLI Management

## Summary

Add operator CLI commands for inspecting and cancelling persisted recurring loops without adding any CLI path that creates loops.

## Status

Done

## Why

Once `/loop` can create durable recurring work, operators also need a direct local control path to inspect active loops and cancel mistakes quickly even when chat interaction is inconvenient.

## Scope

- add `clisbot loops list`
- add `clisbot loops status`
- add `clisbot loops cancel <id>`
- add `clisbot loops cancel --all`
- reuse one rendering path for `list` and `status`
- document the operator model in feature docs, user guide, and control test docs
- add CLI and loop-control test coverage

## Non-Goals

- any CLI command that creates new loops
- session-scoped CLI cancellation semantics
- a new loop-specific runtime IPC transport

## Design Notes

- `list` and `status` are aliases because they answer the same operator question
- the operator CLI is global, so every row includes `agentId` and `sessionKey`
- cancellation is persisted first, and the runtime scheduler re-checks persistence before each future tick
- this keeps the first operator slice simple while still preventing cancelled loops from firing again

## Validation

- parse coverage proves top-level `loops` routing exists in `src/cli.ts`
- control CLI tests prove:
  - `list` renders persisted interval loops
  - `status` renders the same inventory shape
  - `cancel <id>` removes exactly one loop
  - `cancel --all` removes all loops across sessions
- agent-service coverage proves a loop removed from persisted state is dropped before its next scheduled tick

## Exit Criteria

- operators can inspect recurring loop inventory without opening the session store manually
- operators can cancel one or all persisted loops from the CLI
- no CLI path exists for creating loops
