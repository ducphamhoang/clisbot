# OpenClaw Template Improvements

## Purpose

This note explains how `clisbot` improves the vendored OpenClaw workspace-template model under `templates/openclaw/`.

The goal is not to replace OpenClaw's core bootstrap idea. The goal is to adapt it for `clisbot`'s actual product surfaces:

- personal assistant workspaces
- team assistant workspaces
- low-friction chat turns such as greetings, thanks, and simple Q&A

## Baseline

The upstream OpenClaw template set assumes a mostly single-human assistant model:

- `AGENTS.md` defines the workspace ritual
- `USER.md` describes the human
- `MEMORY.md` stores durable context
- `BOOTSTRAP.md` is used for first-run identity setup

That baseline is useful, but `clisbot` needs clearer role separation and a leaner steady-state prompt.

## Improvement 1: Split Personal And Team Assistant Models

`clisbot` adds explicit customized variants under `templates/customized/`:

- `personal-assistant`
- `team-assistant`

This is the biggest product-level improvement over the upstream OpenClaw template set.

### Personal Assistant

Use the personal-assistant variant when the bot primarily works on behalf of one human.

Across the core files:

- `AGENTS.md` keeps the one-human proxy model and treats shared-channel behavior as a safety constraint
- `USER.md` describes one primary human
- `MEMORY.md` is allowed to contain personal long-term context about that human and their ongoing work

The main operating rule is:

- the workspace is centered on one human
- `MEMORY.md` must not leak into shared contexts casually

### Team Assistant

Use the team-assistant variant when the bot is an independent assistant inside a shared team environment.

Across the core files:

- `AGENTS.md` states that the bot is not a single-human proxy
- `USER.md` becomes a team profile and people/role map instead of one person's profile
- `MEMORY.md` becomes shared long-term team context rather than private personal memory

The main operating rule is:

- the workspace belongs to a team context
- the assistant should act like a shared operational participant, not one teammate's voice

### Why This Split Matters

Without this split, one template would mix two incompatible models:

- private human-proxy memory and behavior
- shared team-safe memory and behavior

That ambiguity creates avoidable risks:

- leaking personal context into team channels
- treating team consensus as one person's opinion
- loading the wrong memory scope by default
- prompting the bot with the wrong social role

## Improvement 2: Make First-Run Instructions Disposable

OpenClaw uses `BOOTSTRAP.md` as a first-run ritual. That is fine for workspace creation, but it should not stay in the steady-state prompt forever.

`clisbot` improves this by making first-run cleanup explicit:

- after bootstrap is complete, remove `BOOTSTRAP.md`
- after bootstrap is complete, remove the `## First Run` section from `AGENTS.md`

Why this is better:

- bootstrap-only instructions stop consuming context after first use
- the steady-state workspace contract becomes smaller and clearer
- `AGENTS.md` stops referring to a file that should no longer exist

This also fixes a product-clarity issue in the upstream pattern:

- if `BOOTSTRAP.md` is already deleted, any remaining `AGENTS.md` instruction that points to it is dead guidance

The intended steady-state rule is simple:

- first-run instructions should disappear after first run
- day-to-day operating instructions should stay

## Improvement 3: Optimize For Simple Conversational Turns

OpenClaw's default ritual is useful for rich work sessions, but it is too heavy for small conversational turns.

`clisbot` adds an optimization for simple interactions such as:

- `hi`
- `hello`
- `thanks`
- `thank you`
- very small factual Q&A that does not depend on workspace history

For those turns, the assistant should avoid expensive context loading when it is not needed.

In practice, this means:

- do not force long memory-loading rituals for lightweight social replies
- do not read `MEMORY.md` unless the turn actually needs durable context
- do not read daily notes just to answer greetings or acknowledgements

Why this matters:

- lower latency
- lower context burn
- less prompt noise
- more natural chat behavior

This keeps the workspace templates aligned with `clisbot`'s chat-first surface goals rather than treating every turn like a full task-execution session.

## Current Template Direction

The `clisbot` template layer should continue to preserve these rules:

1. choose the workspace role first: personal assistant or team assistant
2. keep `USER.md` and `MEMORY.md` aligned with that role
3. treat `BOOTSTRAP.md` and `## First Run` as temporary setup aids, not permanent prompt content
4. skip unnecessary memory loading for greetings, thanks, and simple Q&A

## File References

The current template structure that reflects this direction is:

- `templates/openclaw/AGENTS.md`
- `templates/openclaw/BOOTSTRAP.md`
- `templates/openclaw/USER.md`
- `templates/openclaw/MEMORY.md`
- `templates/customized/personal-assistant/AGENTS.md`
- `templates/customized/personal-assistant/USER.md`
- `templates/customized/team-assistant/AGENTS.md`
- `templates/customized/team-assistant/USER.md`
- `templates/customized/team-assistant/MEMORY.md`

## Recommended Follow-Through

When template behavior changes again, keep this comparison note updated if the change affects:

- role boundaries
- memory-loading rules
- first-run lifecycle
- prompt-size optimization for chat turns
