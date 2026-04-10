# Channel Plugin Standardization

## Summary

Introduce a real `ChannelPlugin` contract for `clisbot` so Slack and Telegram share one channel integration seam for runtime bootstrap, operator message commands, health summaries, and route-policy composition.

## Status

In Progress

## Why

OpenClaw already standardizes channels behind a plugin-style adapter layer.

`clisbot` had started to accumulate the same cross-channel seams in duplicated Slack and Telegram code:

- runtime startup and account enumeration
- message CLI dispatch
- health summary rendering
- reply-target resolution for operator replies
- route-policy composition

That duplication made new channel work riskier and made the Slack or Telegram implementations drift from each other.

## Scope

- add a first-class `ChannelPlugin` contract
- register Slack and Telegram through one shared channel registry
- move runtime bootstrap to the plugin registry
- move message CLI dispatch to provider plugins
- move health-summary rendering to provider plugins
- extract shared route-policy composition into one builder
- keep provider event parsing, transport calls, and payload semantics provider-owned
- avoid compatibility wrappers or legacy fallback layers for the new abstraction

## Research

- [OpenClaw Channel Standardization Vs Clisbot Gaps](../../../research/channels/2026-04-10-openclaw-channel-standardization-vs-clisbot-gaps.md)

## Subtasks

- [x] map duplicated Slack and Telegram seams against the OpenClaw channel model
- [x] add `ChannelPlugin` and registry primitives
- [x] move runtime startup and health summaries behind plugins
- [x] move `clisbot message` execution behind plugins
- [x] extract shared route-policy composition
- [x] refactor Slack and Telegram route config to consume the shared builder
- [x] keep provider transport and provider event loops provider-owned
- [x] remove hard-coded runtime shutdown summaries in favor of plugin-owned summaries
- [x] add or update tests for plugin-driven runtime and message CLI paths
- [ ] perform live Slack validation from the refactored checkout

## Validation Notes

- automated validation currently covers:
  - `message-cli` through plugin-dispatched Slack and Telegram message commands
  - Slack and Telegram route resolution after shared route-policy extraction
  - interaction-processing behavior that depends on route-owned `responseMode` and `additionalMessageMode`
  - account-aware route resolution and provider-owned message action guards
- full compile validation is required because the shared route-policy builder affects broad config typing paths

## Explicit Decisions

- `clisbot` now has a real static `ChannelPlugin` contract rather than a compatibility wrapper
- the first plugin scope is intentionally narrow and only covers the duplicated seams that already exist
- shared route-policy composition is centralized now because it was already logically channel-agnostic
- provider event loops, event payload parsing, and transport-specific semantics remain provider-owned
- no legacy fallback layer is added for this refactor because this product has not launched yet
