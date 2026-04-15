# Queued And Loop Running Surface Notifications

## Summary

Add truthful in-chat running notifications when:

- a queued message reaches the front and actually starts running
- a loop tick starts a new run in the same chat surface

The goal is to reduce silent waiting and make autonomous or delayed work visible without turning the chat into spam.

## Status

Done

## Outcome

After this task:

- queued messages do not jump from `queued` to final settlement with no visible `now running` transition
- loop ticks can announce that a new run has started in the same chat surface
- the product has an explicit policy for notification verbosity: `brief`, `full`, or `none`
- defaults are optimized for low friction and low spam
- route resolution remains channel-owned, and managed loop ticks re-resolve the current surface policy from persisted surface binding instead of replaying stale wrapped prompt text

## Delivered Behavior

- route and channel config now support `surfaceNotifications.queueStart` and `surfaceNotifications.loopStart`
- default templates for Slack and Telegram ship both values as `brief`
- queue-start and loop-start notifications are independent from `streaming`; `streaming` owns previews, while `surfaceNotifications` owns explicit start announcements
- queued work with `streaming: "off"` stays free of queued placeholders and running previews, but can still emit one explicit queue-start notification unless `queueStart` is set to `none`
- managed interval and calendar loops can emit one start notification per scheduled tick, while the immediate first interval run still relies on the existing loop-created acknowledgment
- loop persistence now keeps `surfaceBinding.accountId` so later ticks can resolve the correct Slack or Telegram account before sending notifications

## Why

Current behavior is uneven:

- queued messages already get a queued acknowledgment in the chat, but there is no explicit product rule for what should happen when that queued item actually starts running
- loop creation already posts a start acknowledgment, but per-tick start notifications are still missing as a first-class feature

This leaves a visibility gap:

- the user sees that something was queued
- then may see nothing for a while
- then a final answer suddenly appears

For loops, the gap is even larger because the run may start much later without any human typing in that chat.

## Scope

- define and implement queue-start notifications in the same chat surface
- define and implement loop-tick-start notifications in the same chat surface
- choose a default content policy and make it configurable
- keep behavior truthful across Slack and Telegram
- avoid noisy duplicate messages when an existing placeholder or draft can be reused
- add regression coverage for queue and loop start visibility

## Non-Goals

- redesigning all processing indicators
- replacing final settlement rendering
- adding full per-token or per-step verbose logs into chats
- turning each loop iteration into a large transcript dump by default

## Product Decision

### Recommended default

Use `brief` as the default for both queue-start and loop-start notifications.

Reason:

- `full` is too noisy for repeated background runs
- `none` keeps friction high because the user cannot tell when delayed work actually began
- `brief` is the best tradeoff between visibility and spam

Important rule:

- `brief` must still summarize what is running
- do not use vague copy that only says "running" with no task context
- the summary should stay compact, usually loop id, prompt summary, or queued task summary, but not the full prompt body

### Verbosity modes

- `none`
  - do not post a separate running signal
  - use only final settlement or existing processing indicators
- `brief`
  - post or update a short running signal in the same chat
  - no transcript body, no full prompt body
- `full`
  - post a richer start message with prompt summary and route context
  - intended for debugging or highly explicit automation surfaces, not the default

## Recommended behavior by case

### Queue: when queued item starts running

Default: `brief`

Preferred UX:

- if a queued placeholder message already exists, update that same message
- otherwise post one short running message in the same thread or chat

Recommended brief copy:

- `Queued message is now running: \`send the short summary\`.`

Optional richer brief copy:

- `Queued message is now running for agent \`default\`: \`send the short summary\`.`

Do not include full prompt text by default.

The key requirement is:

- the user should understand which queued work item has started
- even if they do not open transcript, tmux, or earlier queue history

### Loop: when a scheduled tick starts running

Default: `brief`

Preferred UX:

- post one short message in the same thread or chat because the loop tick may start long after the original creation message
- include loop id, prompt summary, and schedule context in compact form

Recommended brief copy:

- `Loop \`loop123\` is now running: \`daily review\` · every 2h · next run 09:00Z.`

Recommended slightly richer brief copy:

- `Loop \`loop123\` is now running: \`daily review\` · every 2h · next run 09:00Z · remaining 4/10.`

Do not include the full prompt body by default.

The key requirement is:

- the user should know what this loop tick is doing right now
- brief mode must not collapse into a meaningless generic "started" signal
- for interval or calendar loops, brief should include `next run`
- for interval loops, brief should include interval summary such as `every 2h`
- for bounded times loops, brief should include how many iterations remain

### Full mode

Allow only as an explicit config choice.

Example:

- `Loop \`loop123\` started for agent \`default\` with prompt \`daily review\` in this thread.`

Useful for:

- debugging
- internal ops workflows
- low-frequency scheduled tasks where extra context is worth the noise

## Config Direction

Recommended shape:

```json
{
  "channels": {
    "defaults": {
      "surfaceNotifications": {
        "queueStart": "brief",
        "loopStart": "brief"
      }
    },
    "slack": {
      "surfaceNotifications": {
        "queueStart": "brief",
        "loopStart": "brief"
      }
    },
    "telegram": {
      "surfaceNotifications": {
        "queueStart": "brief",
        "loopStart": "brief"
      }
    }
  }
}
```

Exact config naming can still change, but the policy should stay explicit and channel-owned.

## Implementation Slices

### 1. Queue-start lifecycle

- detect when a queued item transitions from waiting to active running
- reuse the queued placeholder when possible instead of adding a second message
- fall back to one brief running post if placeholder reuse is not available

### 2. Loop-tick-start lifecycle

- post a start signal when a managed loop tick begins a real run
- keep the signal in the same chat surface and session context as the loop
- make sure repeated ticks do not create confusing duplicate state without final settlement

### 3. Content policy

- implement `none`, `brief`, and `full`
- ship `brief` as the default
- keep prompt-summary generation compact and deterministic
- ensure `brief` always includes a compact task summary, not just a generic lifecycle word
- for loop notifications, ensure `brief` also carries compact schedule state:
  - interval or cadence summary
  - next run when applicable
  - remaining runs for bounded loops when applicable

### 4. Tests and live validation

- queued item start becomes visible in the same chat
- loop tick start becomes visible in the same chat
- `brief` stays compact
- `brief` still tells the user what is currently running
- `none` suppresses extra running messages
- `full` includes richer start context

## Validation Notes

- queue tests should prove:
  - a queued message first shows queued state
  - later shows running state in the same surface
  - avoids duplicate noisy posts when placeholder update is possible
- loop tests should prove:
  - loop creation acknowledgment still works
  - each tick can produce a start signal under the configured mode
  - the start signal stays brief by default
  - interval or calendar loops show schedule context such as next run
  - bounded times loops show remaining run count
- live validation should compare Slack and Telegram behavior for:
  - one queued message behind an active run
  - one scheduled loop tick that fires later

## Exit Criteria

- queued work is visibly promoted from waiting to running
- loop ticks can visibly announce that a run has begun
- default notification policy is explicitly documented as `brief`
- `brief` mode includes a short summary of what is running so the user is not left guessing
- users can still disable or enrich these notifications through config
- both product and engineering can understand the intended behavior from docs without reading code

## Related Docs

- [Agent Progress Reply Wrapper And Prompt](../../../features/channels/agent-progress-reply-wrapper-and-prompt.md)
- [Loop Slash Command](../../../features/channels/loop-slash-command.md)
- [Processing Indicator Lifecycle And Active-Run Truthfulness](2026-04-14-processing-indicator-lifecycle-and-active-run-truthfulness.md)
