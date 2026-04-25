# Slack Sender Identity In Prompt Context

## Summary

Fix Slack routed prompt assembly so injected prompt context includes a truthful human sender name, not only a Slack user id, and reduce avoidable misaddressing such as calling the user `anh` or `chị` incorrectly.

## Status

Planned

## Why

When Slack prompt injection only carries `senderId`, the agent loses the most natural identity hint for how to address the human in follow-up turns.

That has two concrete effects:

- the model cannot call the user by name even when Slack already knows it
- the model is more likely to guess honorifics or pronouns incorrectly because it has less grounded identity context

This is a prompt-truthfulness issue at the Slack channel surface, not just a style preference.

## Scope

- audit Slack routed identity construction and recent-conversation replay storage
- carry a truthful Slack sender display name into the injected agent prompt when Slack provides one
- keep fallback behavior safe when Slack does not provide a stable name
- review whether the same sender-name gap exists in DM, channel, and thread paths
- add regression coverage for Slack prompt context and recent-message replay sender labels

## Current Truth

- Telegram already passes `senderName` into routed identity and recent-conversation replay state
- Slack routed identity currently appears to pass `senderId` but not `senderName`
- Slack recent-conversation replay currently stores `senderId` without `senderName`
- agent prompt rendering and recent replay both already know how to use `senderName` when it exists

## Non-Goals

- inferring gender, age, or honorific from weak heuristics
- introducing a broad profile or directory system in this slice
- changing Telegram identity behavior unless a matching bug is found there

## Subtasks

- [ ] trace which Slack event fields can provide a safe sender display name for routed prompts
- [ ] add `senderName` through Slack identity construction and recent replay append paths
- [ ] make sure prompt injection prefers grounded sender names over raw ids when both exist
- [ ] add regression tests for Slack thread or channel replay lines and prompt identity summaries
- [ ] review user-facing wording to keep neutral address when no grounded name exists

## Exit Criteria

- Slack prompt injection includes a truthful sender name when Slack provides one
- recent replay lines for Slack can show a readable sender label instead of only `U123...`
- the bot no longer has to rely on weak guesswork just to address the user naturally
- regression tests cover the fixed Slack identity path

## Related Docs

- [Channels Feature](../../../features/channels/README.md)
- [Agent Progress Reply Wrapper And Prompt](2026-04-09-agent-progress-reply-wrapper-and-prompt.md)
- [Slack Channel MVP Validation And Hardening](2026-04-04-slack-channel-mvp-validation-and-hardening.md)
