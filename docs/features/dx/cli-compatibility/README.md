# CLI Compatibility

## Summary

CLI compatibility defines the normalized capability contract between `clisbot` and upstream interactive CLIs such as Codex, Claude, and Gemini.

## State

Planned

## Why It Exists

The repo currently proves compatibility mainly through implementation slices inside runners plus scattered notes about specific CLIs.

That is not enough for long-term stability because upstream CLIs keep changing:

- startup banners drift
- ready-state prompts drift
- session id capture timing drifts
- running indicators drift
- interrupt semantics drift

The system needs one front door that says what `clisbot` expects from a CLI backend and how that expectation is exposed to operators and automation.

## Scope

- normalized capability definitions
- input and output contracts for compatibility operations
- shared state vocabulary such as `ready`, `running`, `waiting_input`, `blocked`, and `lost`
- backend-specific capability profiles
- compatibility harness strategy for fake and real CLIs

## Non-Goals

- channel rendering rules
- tmux-specific implementation details
- agent memory or conversation semantics
- one-off validation notes that belong in task docs

## Related Docs

- [DX](../README.md)
- [Capability Contract](./capability-contract.md)
- [Backend Profiles](./backend-profiles.md)
- [Real-CLI Smoke Surface](./real-cli-smoke-surface.md)
- [Smoke Command Contract](./smoke-command-contract.md)
- [Runners](../../runners/README.md)
- [Agents Sessions](../../agents/sessions.md)

## Current Focus

The v0 contract and launch-trio backend profiles are now in place.

The next batch should use that published contract to drive:

- `runner probe --json`
- `runner send --json`
- `runner attach --json`
- `runner smoke`

without letting those operator surfaces drift back into backend-specific pane heuristics.
