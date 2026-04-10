# Clisbot Product Rename

## Summary

Rename the whole product from `muxbot` to `clisbot` with no compatibility layer, including package metadata, CLI commands, runtime paths, config filenames, docs, and repository metadata.

## Status

Done

## Why

This product rename is intended to be direct, not a transitional aliasing phase.

That means mixed identity is a real product bug:

- package name and install examples must point to `clisbot`
- the primary CLI must be `clisbot`
- the short alias must be `clis`
- local runtime defaults must move away from `~/.muxbot`
- config and wrapper paths must stop teaching `muxbot`
- docs and operator help must stay coherent with the shipped binary and repo identity

## Scope

- rename package metadata from `@muxbot/muxbot` to `clisbot`
- rename the primary CLI command to `clisbot`
- add `clis` as a shipped alias
- rename runtime home, config, socket, pid, log, and wrapper defaults from `.muxbot` to `.clisbot`
- rename product-facing env vars from `MUXBOT_*` to `CLISBOT_*`
- rename user-facing docs, help text, config templates, and examples
- rename internal code identifiers where they still encode the old product identity
- attempt GitHub repo rename from `longbkit/muxbot` to `longbkit/clisbot` if local tooling and auth allow it

## Non-Goals

- compatibility shims for old CLI names, env vars, or config paths
- migration helpers for old installs
- rewriting historical human requirement notes

## Related

- [Architecture Overview](../architecture/architecture-overview.md)
- [Non-Functional Stability](../features/non-functionals/stability/README.md)
- [User Preferences For Research, CLI Docs, And Critical-Path Validation](../lessons/2026-04-10-user-preferences-for-research-cli-docs-and-critical-path-validation.md)
- [Early-Phase Product Should Not Add Fallback Or Compat Modes](../lessons/2026-04-10-early-phase-product-should-not-add-fallback-or-compat-modes.md)

## Subtasks

- [x] add task tracking and keep scope explicit
- [x] rename package metadata, bins, and install examples
- [x] rename runtime defaults, wrapper paths, config filenames, and environment variables
- [x] rename user-facing docs and architecture docs
- [x] rename internal code identifiers that still carry the old product name
- [x] validate typecheck, tests, build, and representative CLI flows
- [x] attempt remote GitHub repo rename if local auth permits it

## Explicit Decisions

- this rename is direct and does not keep `muxbot` as a supported public alias
- `clisbot` is the primary shipped command and `clis` is a convenience alias
- runtime defaults move to `~/.clisbot` and `clisbot.json` as part of the same rename

## Validation Notes

- `bun x tsc --noEmit`
- `bun test`
- `bun run build`
- temp-config CLI init using `CLISBOT_CONFIG_PATH` created `clisbot.json` with `~/.clisbot` defaults
- remote repository rename succeeded and local `origin` now points to `git@github.com:longbkit/clisbot.git`
