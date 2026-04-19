# Claude CLI Profile

## Summary

Claude has the strongest explicit session-identity model of the current launch trio because `clisbot` can pass a known session id at startup.

Its weaker areas are:

- startup readiness is still more heuristic than explicit
- Claude can surface Claude-owned plan approval and auto-mode classifier behavior that `clisbot` does not currently suppress

## Capability Mapping

### `start`

Support: `Strong`

Current basis:

- command: `claude`
- startup args include:
  - `--dangerously-skip-permissions`
- trust prompt handling is enabled

Important boundary:

- `--dangerously-skip-permissions` skips Claude permission prompts
- it does not guarantee that Claude will stay out of its own plan-confirmation or auto-mode flows once the session is running

### `probe`

Support: `Partial`

Current basis:

- no CLI-specific `startupReadyPattern` is configured
- readiness depends on trust-prompt dismissal plus generic startup bootstrap behavior

Known stabilization already shipped:

- runner now recognizes current Claude trust prompt shapes such as:
  - `Quick safety check:`
  - `Yes, I trust this folder`
  - `Enter to confirm · Esc to cancel`

Current implication:

- startup is meaningfully better than before
- but the compatibility profile should still mark readiness as partial until a dedicated ready pattern exists

### `sessionId`

Support: `Strong`

Current basis:

- create mode: `explicit`
- startup args include `--session-id {sessionId}`
- capture mode: `off`

Current implication:

- Claude does not need post-start status-command capture for continuity in the current model
- the known session id is already owned before startup

### `resume`

Support: `Strong`

Current basis:

- command mode resume
- current resume shape:
  - `claude --resume {sessionId} --dangerously-skip-permissions`

### `recover`

Support: `Strong`

Current basis:

- logical session continuity does not depend on the old tmux process surviving
- stored Claude session id can be reused when a new runner instance is created

### `attach`

Support: `Strong`

Current basis:

- tmux snapshot capture and observer flows already exist
- transcript normalization already recognizes Claude snapshots and running timer lines

### `interrupt`

Support: `Partial`

Current basis:

- current interrupt path sends `Escape`
- current normalization recognizes Claude running clues such as:
  - `Worked for ...`
  - footer rows that include `| claude | ... | <duration>`

Current implication:

- runtime UX can observe Claude as running
- interrupt confirmation is still indirect, so the compatibility profile should keep it best-effort

## Running Snapshot Signals

Current normalized running clues include:

- `Worked for ...`
- `Cooked for ...`
- Claude footer duration rows

The running snapshot layer can keep these, but final contract truth should still come from normalized state rather than raw footer matching.

## Main Drift Risks

- no explicit startup ready pattern
- Claude trust/safety prompt wording can drift again
- multiline paste and terminal settlement remain sensitive to CLI UI changes
- Claude can enter a plan-complete approval screen even during routed coding work
- after that approval, Claude may continue with auto-mode classifier semantics instead of returning to a bypass-permissions feel

## Operator Caveats

### Plan Approval Gate

Observed current behavior:

- Claude can switch into a plan-complete confirmation step that asks the operator to proceed or adjust the plan
- this can happen even when the runner launched Claude with `--dangerously-skip-permissions`
- `clisbot` does not currently have a validated startup arg that reliably disables this Claude behavior

Current operator workaround:

- turn `/streaming on` for coding-heavy routed work
- if the run stalls at the plan approval screen, send `/nudge`
- current observed behavior is that `/nudge` usually triggers the first available option and lets the run continue

Treat that `/nudge` flow as an operational workaround, not a guaranteed Claude contract.

### Auto-Mode Classifier Drift

Observed current behavior:

- Claude can still surface auto-mode classifier decisions even after a bypass-permissions launch
- the classifier may appear for basic local work such as file edits or command execution
- after a plan approval step, Claude may continue in auto-mode-style behavior instead of returning to an operator expectation of pure bypass-permissions

Current operator implication:

- if a team wants the most predictable local execution path, disable Claude auto mode in Claude's own settings before routing it through `clisbot`
- `clisbot` should not currently claim that its Claude launch args alone disable this behavior
