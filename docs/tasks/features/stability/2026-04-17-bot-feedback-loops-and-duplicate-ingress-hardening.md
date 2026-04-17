# Bot Feedback Loops And Duplicate Ingress Hardening

## Summary

Audit the stability side of routed feedback loops, duplicate ingress, and recurring loop spam.

This task is about runtime truthfulness and deterministic behavior, not only security posture.

## Why This Task Exists

Reports now include cases where bots in the same channel may keep responding to each other, or where repeated loop or duplicate-event behavior could flood a thread.

Current code already has partial protections:

- Slack dedupes inbound work by `event_id`
- Slack also suppresses recent duplicate `channel:ts` pairs
- Telegram dedupes inbound work by `update_id`
- recurring loops are bounded by `control.loop.maxRunsPerLoop`
- global active recurring loops are bounded by `control.loop.maxActiveLoops`

But the product still lacks one explicit cross-channel stability contract for loop containment and idempotent ingress.

## Review Questions

1. What invariant proves that one outbound `clisbot` reply can never re-enter as new inbound work on the same route?
2. What invariant proves that another bot cannot trigger unbounded echo traffic when route policy is permissive?
3. What happens if a recurring `/loop` iteration fires while the same session already has active work?
4. Which repeated notifications are intentional, and which count as spam or duplicate settlement?
5. How should the runtime surface that it is suppressing repeated ingress or quarantining a noisy route?

## Current Gaps To Address

- No single stability doc defines the idempotency contract across Slack and Telegram ingress.
- The repo does not yet have one regression bundle specifically for bot-feedback loops across shared surfaces.
- There is no explicit route quarantine or cool-off mode when repeated ingress keeps hitting the same thread.
- The relationship between recurring loop cadence and existing active-run state should be audited and made explicit.
- Existing duplicate-event hardening is scattered across channel-specific logic instead of being described as one product invariant.

## Scope

- define shared ingress idempotency invariants for Slack and Telegram
- audit recurring loop behavior when prior work is still active
- define stable suppression rules for duplicate or echo-like inbound traffic
- define operator-visible status or logs for repeated suppression or quarantine
- add targeted follow-up tasks only after the runtime contract is clear

## Non-Goals

- feature redesign of `/loop` syntax
- broad channel UX polish unrelated to repeated-ingress stability
- performance benchmarking

## Proposed Deliverables

- one explicit stability contract for duplicate ingress and bot-feedback containment
- a clear list of missing tests and missing status surfaces
- follow-up implementation slices for the highest-risk gaps

## Exit Criteria

- a reviewer can explain how duplicate ingress is suppressed on each channel
- recurring loop behavior under active-run overlap is explicit rather than inferred
- suspected feedback-loop cases have a named runtime response
- the implementation backlog is split into small, testable hardening slices

## Related Docs

- [docs/features/non-functionals/stability/README.md](../../../features/non-functionals/stability/README.md)
- [docs/features/non-functionals/security/README.md](../../../features/non-functionals/security/README.md)
- [2026-04-04-slack-channel-mvp-validation-and-hardening.md](../channels/2026-04-04-slack-channel-mvp-validation-and-hardening.md)
- [2026-04-12-loop-slash-command.md](../channels/2026-04-12-loop-slash-command.md)
