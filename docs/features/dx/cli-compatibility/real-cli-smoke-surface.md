# Real-CLI Smoke Surface

## Summary

This page defines the next practical DX batch for real CLI validation.

The goal is simple:

after the next batch, an operator should be able to run a small set of real-CLI checks against Codex, Claude, and Gemini, then immediately read:

- how compatible each backend currently is
- which capability failed
- whether the failure is startup, session, observation, interrupt, or recovery
- which artifact proves that result

## What The Next Batch Should Deliver

The next batch should give three concrete operator outputs.

### 1. One-shot real-CLI smoke command

Proposed surface:

```text
clisbot runner smoke --backend <codex|claude|gemini> --scenario <name> --json
```

Purpose:

- run one scenario against the real upstream CLI
- return one normalized result object
- avoid forcing the operator to manually inspect raw tmux panes first

### 2. Artifact bundle per run

Every smoke run should save a small artifact directory:

```text
~/.clisbot/artifacts/runner-smoke/<timestamp>-<backend>-<scenario>/
```

Minimum files:

- `result.json`
- `summary.md`
- `transitions.json`
- `snapshots/000-start.txt`
- `snapshots/001-after-submit.txt`
- `snapshots/002-final.txt`

Optional when present:

- `snapshots/003-interrupt.txt`
- `snapshots/004-recover.txt`

### 3. Roll-up compatibility summary

Proposed surface:

```text
clisbot runner smoke --backend all --suite launch-trio --json
```

Purpose:

- run the small real-CLI suite across Codex, Claude, and Gemini
- emit one compatibility summary per backend
- let the operator see launch readiness at a glance

## Proposed Scenario Set For The Next Batch

Do not try to test everything at once.

The next batch should only ship these real-CLI scenarios:

### `startup_ready`

Goal:

- prove the backend reaches a truthful ready state

What it answers:

- can the runner launch the real CLI
- does startup block on trust/auth/setup
- does `probe` truthfully say `ready`, `blocked`, or `timeout`

### `first_prompt_roundtrip`

Goal:

- prove a fresh prompt can be submitted and settled

What it answers:

- did `send` actually transition from `waiting_input` to `running`
- did the backend produce meaningful output
- did settlement happen cleanly

### `session_id_roundtrip`

Goal:

- prove the chosen session continuity path is real

What it answers:

- did `sessionId` get captured or injected as expected
- can the next startup reuse that same session
- is continuity real or only implied

### `interrupt_during_run`

Goal:

- prove interrupt is at least operationally useful on the real backend

What it answers:

- did the interrupt signal reach the live run
- did the runner observe an actual state change
- is interrupt still only best-effort for this backend

### `recover_after_runner_loss`

Goal:

- prove pane-loss recovery for resumable backends

What it answers:

- can a killed tmux host be recreated
- can the stored `sessionId` reopen the same conversation context
- does recovery degrade to fresh start, or fail truthfully

## What The Operator Should See

Each scenario result should expose:

```json
{
  "backendId": "codex",
  "scenario": "startup_ready",
  "ok": true,
  "grade": "strong",
  "capabilities": {
    "start": "strong",
    "probe": "partial",
    "sessionId": "strong",
    "resume": "strong",
    "interrupt": "partial"
  },
  "finalState": "ready",
  "failureClass": null,
  "artifactDir": "~/.clisbot/artifacts/runner-smoke/2026-04-17T13-30-00Z-codex-startup_ready"
}
```

If it fails:

```json
{
  "backendId": "gemini",
  "scenario": "startup_ready",
  "ok": false,
  "grade": "blocked",
  "finalState": "blocked",
  "failureClass": "auth-blocker",
  "errorCode": "BLOCKED",
  "artifactDir": "~/.clisbot/artifacts/runner-smoke/2026-04-17T13-30-00Z-gemini-startup_ready"
}
```

## Failure Classification

The next batch should classify failures into a short stable set:

- `launch-failed`
- `ready-timeout`
- `auth-blocker`
- `trust-blocker`
- `submit-failed`
- `settlement-failed`
- `session-id-missing`
- `resume-failed`
- `interrupt-unconfirmed`
- `runner-lost`
- `recover-failed`

## What The Roll-Up Summary Should Tell Anh Long

After the suite runs, the output should answer five product questions immediately:

1. Which backends are launch-ready right now?
2. Which backends have real continuity, not fake continuity?
3. Which backends can survive runner loss?
4. Which backends still have weak interrupt semantics?
5. Which failures are upstream drift versus our own runner gap?

## Suggested Implementation Order

If the next batch must stay lean:

1. `startup_ready`
2. `first_prompt_roundtrip`
3. `session_id_roundtrip`
4. roll-up summary across the launch trio
5. only then `interrupt_during_run` and `recover_after_runner_loss`

That already gives a real compatibility picture without waiting for the full deterministic fake harness.
