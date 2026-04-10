# Tmux Session Drift Detection And Guardrails

## Summary

Detect and surface session drift when a routed Slack or Telegram conversation reuses a tmux session that was also changed by direct manual pane input outside the normal muxbot channel path.

## Status

Planned

## Why

Live validation showed that the follow-up routing bug can be fixed while a separate risk still remains: a tmux session may receive direct manual input after or between routed channel turns.

When that happens, the chat surface and the underlying session can diverge:

- Slack or Telegram history shows one conversation
- the tmux pane contains extra input that did not come from that conversation
- later reuse of the same session becomes harder to reason about and harder to debug

This is a stability problem and should be handled explicitly instead of leaving it as silent operator knowledge.

## Scope

- define what counts as session drift for reused channel sessions
- add an explicit detection or audit signal when pane activity does not match muxbot-submitted input
- expose that state to operators in a low-noise way
- decide whether drift should only warn, block reuse, or require an explicit reset or resume action
- keep the solution architecture-aligned and shared across Slack and Telegram rather than embedding channel-specific heuristics

## Related

- [Stability](../../../features/non-functionals/stability/README.md)
- [Agent Progress Reply Wrapper And Prompt](../channels/2026-04-09-agent-progress-reply-wrapper-and-prompt.md)
- [Channel Plugin Standardization](../channels/2026-04-10-channel-plugin-standardization.md)
- [Slack Latency And Stability Audit](../../../research/channels/2026-04-10-slack-latency-and-stability-audit.md)

## Subtasks

- [ ] define the exact drift invariant for reused channel sessions
- [ ] map current tmux input paths and identify where muxbot can attribute trusted input
- [ ] choose the operator-visible behavior for detected drift
- [ ] implement shared runtime detection without channel-specific duplication
- [ ] add automated coverage for drift detection and session reuse behavior
- [ ] validate the behavior live on Slack without manual pane interaction

## Explicit Decisions

- this is tracked as a separate stability task from follow-up routing because the root cause is different
- no silent fallback should hide drift once detected
- the first rollout should prefer truthful operator visibility over clever automatic recovery
