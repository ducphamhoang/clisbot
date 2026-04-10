# Agent Progress Replies

## Purpose

Use this page when you want to test the chatbot flow where Codex or Claude sends short progress updates back to Slack or Telegram while it is still working.

## What muxbot Does

Current local developer flow has three parts:

1. `muxbot` creates a stable local wrapper at `~/.muxbot/bin/muxbot`
2. runner-launched agent sessions get that wrapper path exported during startup
3. Slack and Telegram prepend a short hidden system block to the agent-bound prompt with the exact reply command for the current conversation

That means the agent can be running inside another workspace and still send progress updates with a machine-local command that does not depend on its current working directory.

## Fastest Test Flow

Start muxbot normally:

```bash
bun run start --cli codex --bootstrap team-assistant
```

Then:

1. send a real human message in the configured Slack or Telegram test surface
2. let muxbot route that message to the configured agent
3. the agent prompt now includes the exact local reply command for that conversation
4. the agent can send progress updates and the final reply through `muxbot message send ...`

Preferred reply pattern for multi-line or quote-heavy content:

```bash
~/.muxbot/bin/muxbot message send \
  --channel slack \
  --target channel:C1234567890 \
  --thread-id 1712345678.123456 \
  --message "$(cat <<'__MUXBOT_MESSAGE__'
working on it

step 1 complete
__MUXBOT_MESSAGE__
)"
```

## Important Rules

- send a real human message to trigger the flow
- do not try to simulate the inbound user turn with `muxbot message send ...`
- the wrapper path is stable on the local machine: `~/.muxbot/bin/muxbot`
- use normal ASCII spaces when copying shell examples
- the injected prompt tells the agent to keep progress updates short
- current prompt policy defaults are:
  - at most `3` progress messages
  - exactly `1` final response

## Why The Wrapper Exists

Agent sessions do not run in the `muxbot` repo root.

So repo-local commands such as:

```bash
bun run src/main.ts message send ...
```

are poor runtime instructions for the agent.

The local wrapper fixes that by always pointing back to the active local `muxbot` checkout.

## Config

Slack and Telegram now expose a small prompt policy block:

```json
"agentPrompt": {
  "enabled": true,
  "maxProgressMessages": 3,
  "requireFinalResponse": true
}
```

If you disable `agentPrompt.enabled`, muxbot stops injecting the reply instruction block into agent-bound prompts for that provider.

User-visible reply delivery is configured beside `streaming` and `response`:

```json
"streaming": "off",
"response": "final",
"responseMode": "message-tool",
"additionalMessageMode": "steer"
```

- `capture-pane`: existing muxbot behavior. The channel posts progress or final settlement from normalized runner output.
- `message-tool`: muxbot still captures and observes the runner pane for state, but normal progress and final reply delivery are expected to happen through `muxbot message send ...` from the agent prompt flow.
- `steer`: when a session is already active, later human messages are sent straight into that live session as steering input.
- `queue`: when a session is already active, later human messages wait behind the current run and muxbot settles them one by one.

Use `message-tool` when you want to avoid duplicate replies or raw pane-derived final settlement while still keeping tmux observation available for status, attach, watch, and internal runtime logic.

Use `additionalMessageMode: "steer"` when you want natural chatbot follow-ups to influence the current active run immediately.

Use `additionalMessageMode: "queue"` when you want each later human message to become its own queued turn instead.

If the route keeps `streaming: "off"`, queued turns still settle through muxbot, but you should only expect the final queued answer on the surface, not an interim queued placeholder.

## Debug Reply Delay

When you need to measure where reply latency is happening, start muxbot with:

```bash
MUXBOT_DEBUG_LATENCY=1 muxbot start
```

Then reproduce the routed message and inspect the log:

```bash
muxbot logs | rg 'muxbot latency'
```

Latency stages currently include:

- `slack-event-accepted` or `telegram-event-accepted`
- `channel-enqueue-start`
- `ensure-session-ready-*`
- `runner-session-ready`
- `tmux-submit-start`
- `tmux-submit-complete`
- `tmux-first-meaningful-delta`

Read them as a handoff timeline:

- large gap before `channel-enqueue-start`: inbound surface handling or event duplication gating
- large gap inside `ensure-session-ready-*`: tmux startup, resume, or trust-prompt path
- large gap between `tmux-submit-complete` and `tmux-first-meaningful-delta`: the runner accepted input slowly or the pane did not visibly change yet

## Response Mode Precedence

Resolved `responseMode` now follows one order:

1. surface override
2. agent override
3. provider default
4. built-in default `message-tool`

That means muxbot still captures the pane in every case, but decides whether user-visible delivery comes from pane settlement or from `muxbot message send ...` using the first configured match above.

Top-level Slack example:

```json
"channels": {
  "slack": {
    "agentPrompt": {
      "enabled": true,
      "maxProgressMessages": 3,
      "requireFinalResponse": true
    },
    "streaming": "off",
    "response": "final",
    "responseMode": "message-tool",
    "additionalMessageMode": "steer"
  }
}
```

Slack channel override example:

```json
"channels": {
  "slack": {
    "streaming": "off",
    "response": "final",
    "responseMode": "message-tool",
    "additionalMessageMode": "steer",
    "channels": {
      "C1234567890": {
        "requireMention": true,
        "responseMode": "capture-pane",
        "additionalMessageMode": "queue"
      }
    }
  }
}
```

Telegram group and topic override example:

```json
"channels": {
  "telegram": {
    "streaming": "off",
    "response": "final",
    "responseMode": "message-tool",
    "additionalMessageMode": "steer",
    "groups": {
      "-1001234567890": {
        "requireMention": false,
        "responseMode": "capture-pane",
        "additionalMessageMode": "queue",
        "topics": {
          "42": {
            "responseMode": "message-tool",
            "additionalMessageMode": "steer"
          }
        }
      }
    }
  }
}
```

Interpretation:

- top-level `responseMode` is the provider default
- top-level `additionalMessageMode` is the provider default for busy-session follow-up
- `agents.list[].responseMode` overrides the provider default for that one agent
- `agents.list[].additionalMessageMode` overrides the provider default for that one agent
- a Slack channel route can override it per channel
- a Telegram group can override it per group
- a Telegram topic can override the parent group again for that one topic

Agent override example:

```json
"agents": {
  "list": [
    {
      "id": "default",
      "responseMode": "message-tool",
      "additionalMessageMode": "steer"
    },
    {
      "id": "reviewer",
      "responseMode": "capture-pane",
      "additionalMessageMode": "queue"
    }
  ]
}
```

## Operator Commands

Channel or surface response-mode status:

```bash
muxbot channels response-mode status --channel slack
muxbot channels response-mode status --channel slack --target channel:C1234567890
muxbot channels response-mode status --channel slack --target group:G1234567890
muxbot channels response-mode status --channel slack --target dm:D1234567890
muxbot channels response-mode status --channel telegram --target -1001234567890
muxbot channels response-mode status --channel telegram --target -1001234567890 --topic 42
muxbot channels response-mode status --channel telegram --target 123456789
```

Channel or surface response-mode updates:

```bash
muxbot channels response-mode set message-tool --channel slack --target channel:C1234567890
muxbot channels response-mode set capture-pane --channel slack --target group:G1234567890
muxbot channels response-mode set message-tool --channel slack --target dm:D1234567890
muxbot channels response-mode set message-tool --channel telegram --target -1001234567890
muxbot channels response-mode set capture-pane --channel telegram --target -1001234567890 --topic 42
muxbot channels response-mode set message-tool --channel telegram --target 123456789
```

Channel or surface additional-message-mode status:

```bash
muxbot channels additional-message-mode status --channel slack
muxbot channels additional-message-mode status --channel slack --target channel:C1234567890
muxbot channels additional-message-mode status --channel slack --target group:G1234567890
muxbot channels additional-message-mode status --channel slack --target dm:D1234567890
muxbot channels additional-message-mode status --channel telegram --target -1001234567890
muxbot channels additional-message-mode status --channel telegram --target -1001234567890 --topic 42
muxbot channels additional-message-mode status --channel telegram --target 123456789
```

Channel or surface additional-message-mode updates:

```bash
muxbot channels additional-message-mode set steer --channel slack --target channel:C1234567890
muxbot channels additional-message-mode set queue --channel slack --target group:G1234567890
muxbot channels additional-message-mode set steer --channel slack --target dm:D1234567890
muxbot channels additional-message-mode set steer --channel telegram --target -1001234567890
muxbot channels additional-message-mode set queue --channel telegram --target -1001234567890 --topic 42
muxbot channels additional-message-mode set steer --channel telegram --target 123456789
```

Agent response-mode status and updates:

```bash
muxbot agents response-mode status --agent default
muxbot agents response-mode set message-tool --agent default
muxbot agents response-mode clear --agent reviewer
```

Agent additional-message-mode status and updates:

```bash
muxbot agents additional-message-mode status --agent default
muxbot agents additional-message-mode set steer --agent default
muxbot agents additional-message-mode clear --agent reviewer
```

Status surfaces:

- `muxbot status` shows provider-level `responseMode` and `additionalMessageMode` for Slack and Telegram plus any per-agent overrides in the agent summary.
- `/status` shows the active route `responseMode` and `additionalMessageMode` for the current conversation.
- `/responsemode status` shows the active route value plus the current persisted surface target value.
- `/additionalmessagemode status` shows the active route busy-session behavior plus the current persisted surface target value.
- `/queue <message>` always queues that one extra message, even when the surface default is `steer`.
- `\q <message>` is a shortcut alias for `/queue <message>`.
- `/steer <message>` and `\s <message>` inject a steering message into the active run immediately.
- `/queue-list` shows queued messages for the current conversation that have not started yet.
- `/queue-clear` clears queued messages for the current conversation that have not started yet.
