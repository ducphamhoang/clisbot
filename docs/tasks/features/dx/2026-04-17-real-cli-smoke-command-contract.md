# Real-CLI Smoke Command Contract

## Summary

Define the exact command and JSON contract for `clisbot runner smoke` so the first real-CLI validation batch has stable operator input and machine-readable output.

## Status

Done

## Why

The real-CLI smoke direction is now clear at the product level, but the next implementation batch still needs one explicit contract for:

- which flags exist
- which combinations are valid
- what a single-scenario result looks like
- what a suite result looks like
- which exit codes automation may rely on

Without that contract, the first smoke implementation is likely to drift into an ad hoc command that humans can maybe read once, but automation cannot trust.

## Scope

- define `runner smoke` command shapes
- define required and optional flags
- define result JSON schemas
- define suite roll-up JSON schema
- define transition timeline artifact schema
- define a minimal exit code contract

## Non-Goals

- implementing the smoke command itself
- choosing the final artifact storage helper code
- building fake CLI support

## Exit Criteria

- `runner smoke` has one explicit operator contract
- the first real-CLI implementation can target stable JSON output
- single-run and suite-run semantics are both named before code starts

## Related Docs

- [Real-CLI Smoke Surface](../../../features/dx/cli-compatibility/real-cli-smoke-surface.md)
- [Smoke Command Contract](../../../features/dx/cli-compatibility/smoke-command-contract.md)

## Outcome

The operator contract is now documented with:

- command shapes for single-scenario and launch-trio runs
- the first-batch flag set and validation rules
- stable exit codes
- scenario, suite, and transition artifact JSON schemas
