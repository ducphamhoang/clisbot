# Gemini CLI Guide

## Summary

`Gemini` is usable in `clisbot`, but it is more environment-sensitive than `codex`.

The main issue is not session continuity.

The main issue is startup and routed delivery quality when Gemini auth or setup is not already clean.

## Current Strengths

- explicit ready pattern
- explicit startup blockers
- strong session-id capture and resume model

## Current Caveats

- Gemini must already be authenticated in a way the runtime can reuse
- routed reply behavior is still weaker than desired in some message-tool flows
- upstream auth and setup screens can drift

## Operator Recommendation

- if Gemini is already authenticated and you specifically want Gemini, it is a viable routed CLI
- if you want the safest general default, prefer `codex`
- if you need more implementation detail, see [Gemini CLI Profile](../features/dx/cli-compatibility/profiles/gemini.md)
