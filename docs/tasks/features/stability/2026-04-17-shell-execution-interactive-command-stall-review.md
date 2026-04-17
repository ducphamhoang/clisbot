# Shell Execution Interactive Command Stall Review

## Summary

Review why shell execution can become stuck when the launched command takes over the terminal interactively, such as `vi`, `nano`, `less`, or similar full-screen tools.

This is a stability task because the issue is about runner truthfulness, stuck active-run state, and deterministic recovery.

## Why This Task Exists

Interactive terminal programs can block normal prompt submission, settlement detection, and operator expectations.

When that happens, the system may look alive but stop making useful progress, which is a runtime stability problem even if auth was correct.

## Review Questions

1. Which commands or terminal states are currently known to stall shell execution?
2. How does the runtime detect that control has moved into an interactive full-screen program?
3. What should happen next: block launch, warn early, auto-detach, surface recovery guidance, or attempt bounded interruption?
4. Which status, logs, or channel replies should tell the operator that the shell is stuck in an interactive program?
5. Which protections belong in prompt guidance, runner detection, or hard command guardrails?

## Current Focus

- review current tmux and runner behavior for interactive shell takeover
- define a truthful runtime contract for stuck shell-execution cases
- identify the smallest stable detection and recovery slices
- avoid relying only on user intuition to recognize a blocked terminal

## Scope

- `shellExecute` paths that enter interactive terminal programs
- tmux pane readiness and settlement implications
- stuck active-run truthfulness
- operator-facing recovery guidance and status
- follow-up hardening tasks for detection, prevention, or containment

## Non-Goals

- redesign of shell execution as a feature
- editor-specific UX polish
- non-interactive shell command performance

## Exit Criteria

- known interactive-stall cases are named explicitly
- the runtime response contract is clear for detection, status, and recovery
- follow-up work is split into small hardening tasks

## Related Docs

- [docs/features/non-functionals/stability/README.md](../../../features/non-functionals/stability/README.md)
- [2026-04-04-runner-interface-standardization-and-tmux-runner-hardening.md](../runners/2026-04-04-runner-interface-standardization-and-tmux-runner-hardening.md)
- [2026-04-12-tmux-submit-truthfulness-and-telegram-send-reliability.md](2026-04-12-tmux-submit-truthfulness-and-telegram-send-reliability.md)
