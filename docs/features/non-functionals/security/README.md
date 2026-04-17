# Security

## Summary

Security is a cross-cutting non-functional area in `clisbot`.

It owns the product-level rules that decide who may reach the bot, what inbound traffic is trusted, how abusive or ambiguous traffic is contained, and how risky control or execution paths are surfaced to operators.

## State

Planned

## Why This Exists

`clisbot` operates on shared chat surfaces, executes AI runners, and can trigger recurring work.

That means security is not only secret storage or auth policy.
It also includes:

- who may trigger work in shared groups
- whether bot-authored traffic is ever allowed back in
- how pairing, allowlists, and role checks reduce abuse
- how spam, replay, or feedback-loop patterns are detected and contained
- how operators learn that a route is unsafe before it floods a channel

## Scope

- inbound trust boundaries for Slack and Telegram routes
- pairing and allowlist posture as part of abuse resistance
- bot-origin policy for shared surfaces
- anti-abuse controls such as cooldowns, rate limits, quarantines, and operator-visible warnings
- control-surface hardening for risky mutations
- security-focused audits and regression tracking

## Non-Goals

- generic infrastructure hardening outside this repo
- architecture conformance work that belongs to the architecture area
- performance or latency work that belongs to stability or benchmarks

## Related Task Folder

- [docs/tasks/features/security](../../../tasks/features/security)

## Related Research

- [OpenClaw Telegram Credential Security And Setup](../../../research/security/2026-04-12-openclaw-telegram-credential-security-and-setup.md)

## Dependencies

- [Auth](../../auth/README.md)
- [Channels](../../channels/README.md)
- [Control](../../control/README.md)
- [Configuration](../../configuration/README.md)
- [Stability](../stability/README.md)

## Current Focus

Define a truthful security model for shared chat surfaces:

- keep default group behavior human-first
- make bot-origin handling explicit instead of accidental
- prevent abuse and feedback loops from becoming channel spam
- give operators simple controls to inspect, contain, and recover risky routes
