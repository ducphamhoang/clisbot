# Group Bot Abuse And Feedback-Loop Containment

## Summary

Review how `clisbot` behaves in shared group surfaces, especially when other bots, relays, or automation are present.

The goal is to make the security posture explicit and safe by default so one misconfigured route does not turn into bot-to-bot spam or easy abuse.

## Why This Task Exists

`clisbot` can already run in Slack channels and Telegram groups.

Current code has useful guards:

- Slack drops mismatched `api_app_id` or `team_id`
- Slack dedupes by `event_id` and recent `channel:ts`
- Slack drops self-authored messages and blocks bot-originated events unless `allowBots` is enabled
- Telegram dedupes by `update_id`
- Telegram drops self-authored messages and blocks bot-originated messages unless `allowBots` is enabled

Those guards are good foundations, but they do not yet add up to a complete security contract for shared-group abuse resistance.

## Review Questions

1. What is the default trust model for inbound group traffic: humans only, trusted bots only, or any routed message?
2. Is `allowBots` too coarse as the only switch for bot-originated traffic?
3. What should happen when a route starts receiving bot-authored replies that appear to be echoes of `clisbot` output?
4. What operator-visible status or quarantine behavior should exist before a channel starts spamming?
5. Which protections are hard enforcement versus advisory guidance?

## Current Gaps To Address

- No first-class security doc defines the inbound trust model for shared channels.
- `allowBots` is a coarse boolean; if enabled, it may trust more bot traffic than the operator intended.
- There is no explicit concept of trusted bot identities versus untrusted bot traffic.
- There is no route-level abuse budget, cooldown, or quarantine mode for suspicious repeated inbound traffic.
- There is no explicit cross-bot feedback-loop containment contract for cases where two bots answer each other in the same channel.
- There is no operator-facing `security` or `doctor` style surface for reviewing route risk posture.

## Scope

- define the human-first default for shared group routes
- define bot-origin trust tiers for Slack and Telegram
- define containment behavior for bot-to-bot loops and other spammy inbound patterns
- define the minimum operator controls or status needed to inspect and stop abuse safely
- add follow-up backlog slices only after the contract is clear

## Non-Goals

- secret-storage redesign
- enterprise compliance requirements
- broad auth refactors unrelated to group abuse resistance

## Proposed Deliverables

- one clear security contract for shared group routes
- explicit semantics for `allowBots` or its replacement
- a containment model for suspicious repeated inbound bot traffic
- follow-up implementation tasks only after the above contract is reviewed

## Exit Criteria

- a reviewer can explain, in one pass, what inbound group traffic is trusted by default
- bot-to-bot spam scenarios have an explicit containment rule
- operator controls and status expectations are named clearly enough to implement later
- the resulting implementation backlog is split into small slices instead of one vague security bucket

## Related Docs

- [docs/features/non-functionals/security/README.md](../../../features/non-functionals/security/README.md)
- [docs/features/non-functionals/stability/README.md](../../../features/non-functionals/stability/README.md)
- [2026-04-04-slack-channel-mvp-validation-and-hardening.md](../channels/2026-04-04-slack-channel-mvp-validation-and-hardening.md)
- [2026-04-15-runtime-crash-containment-and-service-self-healing.md](../stability/2026-04-15-runtime-crash-containment-and-service-self-healing.md)
