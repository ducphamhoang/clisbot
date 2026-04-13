# Gemini CLI Runner Support

## Summary

`clisbot` now has first-class runner wiring for Gemini CLI at the same architecture boundary as Codex and Claude:

- tool preset and bootstrap support
- tmux startup readiness gating
- runner-owned session-id capture and resume
- Gemini-specific transcript normalization
- explicit startup blocker handling for authentication waits

## Current Truth

Gemini support is real, but it has one important operational prerequisite:

- Gemini must already be authenticated in a way the runtime can reuse, or
- the environment must provide a headless-compatible auth path such as `GEMINI_API_KEY` or Vertex AI credentials

Without that prerequisite, `clisbot` now fails fast and truthfully instead of pretending the tmux session is ready.

## Why This Exists

Gemini is part of the intended launch CLI trio with Claude and Codex.

That only makes sense if Gemini support is not treated as a vague future promise.

The runner needs an explicit contract for:

- when Gemini is actually ready for prompt submission
- how Gemini session continuity is captured and resumed
- how Gemini-specific startup blockers surface to operators

## Runner Contract

Current Gemini preset:

- command: `gemini`
- startup args: `--approval-mode=yolo --sandbox=false`
- trust prompt automation: off
- startup ready pattern: `Type your message or @path/to/file`
- session-id create mode: runner-generated
- session-id capture mode: `status-command` via `/stats session`
- session-id resume mode: `command` via `--resume {sessionId}`

## Startup Behavior

Gemini startup now follows two explicit rules:

1. If the configured ready pattern appears, the session is considered ready.
2. If a configured startup blocker appears first, or the ready pattern never appears before the startup budget expires, the runner fails startup and kills the half-ready tmux session.

Current built-in blocker:

- Gemini OAuth code-flow prompt:
  - `Please visit the following URL to authorize the application`
  - `Enter the authorization code:`
- Gemini auth-setup or sign-in recovery screen:
  - `How would you like to authenticate for this project?`
  - `Failed to sign in.`
  - `Manual authorization is required but the current session is non-interactive`

This prevents stale half-ready Gemini sessions from being reused by later prompts.

## Session Continuity

Current continuity rule:

- `agents` owns `sessionKey`
- `agents` persists Gemini `sessionId`
- the tmux runner owns how Gemini `sessionId` is captured and reused

Current implementation uses Gemini-native UUID sessions:

- capture with `/stats session`
- resume with `gemini --resume <sessionId>`

This avoids fake continuity heuristics such as `--resume latest`.

## Non-Goals

- automating Google OAuth inside `clisbot`
- hiding Gemini authentication requirements behind implicit fallback logic
- declaring authenticated Slack or Telegram Gemini routes "proven" without real auth-backed end-to-end validation

## Validation State

Covered now:

- config and CLI wiring
- bootstrap templates
- readiness and blocker gating
- session-id capture and resume strategy
- normalization coverage

Still environment-dependent:

- full success-path end-to-end validation through a live authenticated Gemini runtime

## Related Docs

- [tmux Runner](tmux-runner.md)
- [Runner Tests](../../tests/features/runners/README.md)
- [New CLI Test Suites](../../tests/new-cli-tests-suites.md)
