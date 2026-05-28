# Pi CLI Guide

## Summary

`Pi` (pi.dev by Earendil Works, `@earendil-works/pi-coding-agent`) is a supported AI coding CLI in `clisbot`, running alongside codex, claude, and gemini through the existing tmux runner infrastructure.

## Current Strengths

- explicit session UUID strategy: clisbot pre-generates a UUID and passes `--session {uuid}` so the session is always traceable
- explicit ready pattern: runner waits for the `escape interrupt` prompt before delivering the first routed message
- active-timer pattern: a "Working..." heartbeat prevents early completion detection during long pi runs
- `/new` session reset without restarting the CLI process

## Current Caveats

- requires at least one configured AI provider before routing will succeed; pi blocks startup when no models are available
- requires tmux extended-keys support; pi blocks startup when `extended-keys` is off
- pi chrome (startup warnings, `fd not found` noise, status bar lines, separator lines) is filtered from transcript output automatically
- pi is still a young CLI; its JSONL RPC protocol is pre-stable — clisbot uses the tmux runner path, not RPC, for that reason

## Credentials

Pi supports multiple provider backends.

Common env vars:

- `DEEPSEEK_API_KEY` — DeepSeek provider
- `GITHUB_TOKEN` — GitHub Copilot provider (through pi's `/login github`)
- `ANTHROPIC_API_KEY` — Anthropic/Claude provider

Check which providers are configured:

```bash
pi --list-models
```

If the output is empty, configure at least one provider before trying to route through clisbot.

## Startup Blockers

Two blockers prevent silent failures at startup:

**No models configured:**

```
Pi has no models configured. Configure a provider via `/login` or set an API key env var
(e.g. ANTHROPIC_API_KEY, OPENAI_API_KEY) before routing through clisbot.
```

Fix: run `pi` interactively, use `/login` to authenticate a provider, or set an API key env var.

**tmux extended-keys off:**

```
Pi requires tmux extended-keys support. Add `set -g extended-keys on`
to ~/.tmux.conf and restart tmux.
```

Fix: add the line to your tmux config and restart tmux before starting clisbot.

## Install

```bash
npm install -g @earendil-works/pi-coding-agent
```

Verify:

```bash
pi --version
```

## Operator Recommendation

- if you already use pi and have at least one provider authenticated, pi is a valid routed CLI
- if you are choosing a first CLI, `codex` remains the smoothest general default
- if pi startup blocks, check `clisbot logs` for the startup-blocker message and fix the blocking condition before retrying

## Related Docs

- [Codex CLI Guide](codex-cli.md)
- [Claude CLI Guide](claude-cli.md)
- [Gemini CLI Guide](gemini-cli.md)
