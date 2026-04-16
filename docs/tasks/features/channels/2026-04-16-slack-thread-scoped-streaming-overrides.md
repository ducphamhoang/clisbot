# Slack Thread-Scoped Streaming Overrides

## Summary

Fix Slack routed conversation config so thread-level streaming changes stay scoped to the target thread instead of leaking across the whole parent channel.

## Status

Planned

## Outcome

After this task:

- changing streaming from a Slack thread only affects that routed thread
- parent-channel defaults remain intact unless the operator intentionally changes the channel-level route
- `/status` and related config-inspection surfaces tell the user whether streaming is coming from thread scope, channel scope, or inheritance

## Scope

- audit current Slack config target resolution for `/streaming`
- separate Slack channel-level and thread-level persistence where needed
- make route lookup prefer thread-scoped overrides before parent-channel defaults
- add regression coverage for Slack thread vs channel isolation
- update user-facing docs or status wording if the active source becomes more explicit

## Non-Goals

- redesigning Telegram topic override semantics unless the same bug exists there
- changing the meaning of `streaming` outside routed conversation scopes
- broad surface-config refactors unrelated to thread isolation

## Problem Statement

Current behavior appears to let Slack thread-level streaming changes affect the whole channel. That breaks the expected mental model for routed Slack threads, where one thread should be able to opt into different streaming behavior without mutating sibling threads.

## Validation Notes

- setting `/streaming off` inside Slack thread A must not change thread B
- setting `/streaming off` inside Slack thread A must not mutate the parent channel default unless the user targeted the channel-level surface explicitly
- `/status` from thread A must report the thread-scoped source
- `/status` from thread B must still report the parent or inherited source

## Exit Criteria

- Slack thread-scoped streaming overrides no longer leak to the parent channel or sibling threads
- persisted config target selection is truthful and reviewable
- regression tests cover thread-level and channel-level separation
