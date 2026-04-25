# Prompt Context Truthfulness For Sender And Surface Labels

## Summary

Make routed prompt injection carry the short but high-value identity and surface labels that AI needs to reason naturally and accurately:

- sender name
- Slack channel or group name when available
- Telegram group title when available
- Telegram topic title when available

## Status

Planned

## Why

Today the injected prompt context already carries route identity, but it still appears to miss or inconsistently expose some of the most useful human-facing labels.

That makes the model weaker in ways that are avoidable:

- it cannot call people by name even when the platform already knows the name
- it loses immediate grounding about which Slack channel or Telegram group the message came from
- it cannot use the topic title as a concise clue about the thread's real purpose
- it is more likely to guess tone, addressee, or local context from weaker hints

These fields are short and cheap, but they matter disproportionately to reply quality.

## Scope

- audit prompt-envelope assembly for routed Slack and Telegram messages
- audit recent-message replay state so stored context does not drop readable sender or surface labels
- add truthful sender display names where the channel provides them safely
- add truthful surface labels such as Slack channel name, Slack group label, Telegram group title, and Telegram topic title when the platform provides them
- keep fallback behavior safe when only ids are available
- review whether these labels should also appear in loop, queue, and steer prompt paths when they reuse the same conversation context
- add regression coverage for prompt injection and recent-context replay rendering

## Current Truth

- there is already a narrower planned task for Slack sender name only
- current context appears to still miss a broader cross-platform surface-label layer
- Telegram already carries more sender identity than Slack, but group-title and topic-title truth still needs a direct audit

## Non-Goals

- inferring honorifics, gender, or social relationship from weak heuristics
- building a broad profile directory or contact system
- stuffing long metadata blocks into every prompt

## Exit Criteria

- routed prompt context includes truthful sender names when available
- routed prompt context includes concise readable surface labels when available
- recent-context replay preserves those labels instead of regressing back to raw ids only
- Slack and Telegram tests cover the fixed prompt-context path

## Related Docs

- [Slack Sender Identity In Prompt Context](2026-04-21-slack-sender-identity-in-prompt-context.md)
- [Agent Progress Reply Wrapper And Prompt](2026-04-09-agent-progress-reply-wrapper-and-prompt.md)

