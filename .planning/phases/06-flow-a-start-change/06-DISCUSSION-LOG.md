# Phase 6: Flow A + start() Change — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 06-flow-a-start-change
**Areas discussed:** Masked input, Channel selection flow, DM pairing policy, start() warning tone

---

## Masked Input

| Option | Description | Selected |
|--------|-------------|----------|
| _writeToOutput monkey-patch | Override readline's internal _writeToOutput to write '*' per character. Simple, proven in Node.js readline wizards. | ✓ |
| Raw stdin mode | Switch stdin to raw mode, read char-by-char. More control but more Bun compatibility surface. | |
| No masking | Tokens shown as typed. Simplest. | |

**User's choice:** `_writeToOutput` monkey-patch

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show asterisks | Operator sees *** as they type — confirms input is received | ✓ |
| Suppress entirely | Nothing appears as they type | |
| You decide | Leave it to Claude | |

**User's choice:** Show asterisks

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add to setup-wizard-utils.ts | Extends Phase 5 shared safety layer | ✓ |
| New file setup-wizard-input.ts | Separate input utilities | |

**User's choice:** Add to `setup-wizard-utils.ts`

---

## Channel Selection Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential with per-channel confirm | Telegram → Slack → Zalo-bot in order, ask 'Configure this one? [Y/n]' each | ✓ |
| Select upfront, then collect | First ask which channels (numbered list), then loop | |
| Always ask, no skip | Present each channel, no skip option | |

**User's choice:** Sequential with per-channel confirm

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-accept | Show 'using X from env', skip token prompt | ✓ |
| Pre-fill but confirm | Show value, ask 'Use this? [Y/n]' | |
| Always prompt | Env var as default in prompt | |

**User's choice:** Auto-accept env vars

---

## DM Pairing Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Inline — right after each channel's token | Natural per-channel flow | |
| Second pass — after all tokens | Separate block for policies | |
| Skip — always default to 'pairing' | Reduce wizard length, adjust via routes later | ✓ |

**User's choice:** Skip the question — always default to `pairing`

---

## start() Warning Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Warn + continue + name next command | Print warning naming clisbot setup agent, then continue | ✓ |
| Warn + continue only | Minimal warning, no next-step hint | |
| Warn + explain unrouted mode + name next command | Longer message with mode explanation | |

**User's choice:** Warn + continue + name next command

---

| Option | Description | Selected |
|--------|-------------|----------|
| Plain 'clisbot start' only — no flags | Triggers only without --cli/--bot-type, bootstrap path unchanged | ✓ |
| Any start path including bootstrap | Warn whenever channels present and no agent | |

**User's choice:** Plain `clisbot start` only (no flags)

---

## Claude's Discretion

- Exact readline prompt text and formatting
- Whether `promptMasked` restores `_writeToOutput` after each call or once per session
- Exact success screen layout
- Per-channel confirm default (Y vs N based on env var detection)

## Deferred Ideas

- DM pairing policy prompt (always default to `pairing`, operator adjusts via routes)
- Token format validation regex
- Wizard resume state
- Live token reachability probe
- `--non-interactive` flag
- Back-navigation
