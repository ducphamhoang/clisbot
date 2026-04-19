# Claude CLI Guide

## Summary

`Claude` is usable in `clisbot`, but it currently has two operator-facing behaviors that matter more than on `codex`:

- Claude can stop at a Claude-owned plan approval step
- Claude can keep using auto-mode classifier behavior even when launched with bypass-permissions

## Current Truth

`clisbot` launches Claude with `--dangerously-skip-permissions`.

That helps with Claude permission prompts.

It does **not** currently guarantee that Claude will stay out of:

- plan approval gates
- auto-mode classifier decisions

There is no current `clisbot` launch arg or runner mode that we treat as a validated fix for those two Claude behaviors.

## Issue 1: Plan Approval Gate

Observed behavior:

- Claude can present a "plan completed" style confirmation step
- the operator then has to choose whether to proceed or adjust the plan
- this can still happen during full-permission routed work

Why it is annoying:

- the run looks stuck unless you can see the terminal state
- it breaks the expected feel of "full permission means keep going"

Current workaround:

1. turn `/streaming on` for coding-heavy routed conversations
2. if the stream shows Claude waiting at a plan approval screen, send `/nudge`
3. current observed behavior is that `/nudge` will submit Enter, usually accepts the default option and lets the run continue
4. use `/attach` anytime to keep streaming on for long session

## Issue 2: Auto-Mode Classifier Drift

Observed behavior:

- Claude can still route work through its auto-mode classifier even after a bypass-permissions launch
- this can affect simple local work such as file edits or shell commands
- after a plan approval step, Claude may continue in auto-mode-like behavior instead of returning to the operator expectation of bypass-permissions

Current implication:

- `--dangerously-skip-permissions` is not the same thing as "never use plan or auto semantics"
- if you want the most predictable Claude behavior, disable auto mode in Claude itself before routing it through `clisbot`

Recommended place to change that:

- Claude UI `/config`
- Claude settings file `~/.claude/settings.json`

## Operator Recommendation

- use `codex` as the default when you want the smoothest coding experience
- use `claude` when Claude itself is the priority, but expect to monitor it more closely on longer coding runs
- enable `/streaming on` early when the task is likely to trigger planning behavior

## Related Docs

- [Claude CLI Profile](../features/dx/cli-compatibility/profiles/claude.md)
- [Native CLI Commands](native-cli-commands.md)
