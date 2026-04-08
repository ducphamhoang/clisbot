---
title: Public Artifacts Must Be Scrubbed Before Publish
date: 2026-04-08
area: docs, research, release
summary: Public-facing docs, templates, and release artifacts should not leak environment-specific paths, stale product names, or incidental implementation leftovers.
related:
  - README.md
  - docs/user-guide/README.md
  - docs/research/runners/2026-04-05-tmux-session-cpu-memory-benchmark-codex-vs-claude.md
  - docs/architecture/architecture-overview.md
  - docs/architecture/surface-architecture.md
---

## Context

This lesson comes from repeated Codex cleanup feedback in the `muxbot` project before GitHub publication.

It was confirmed against local Codex session history captured during project work, where the user explicitly asked to strip local references, avoid leaking earlier commits, rewrite `main` to a single public commit, and publish only the cleaned snapshot.

The repeated problems were:

- local absolute paths appearing in docs and examples
- stale `tmux-talk` references surviving the product rename to `muxbot`
- duplicated or overly local setup language that read like scratch notes rather than public docs
- concern about leaking unwanted historical details through commit history or leftover doc content
- concern that even fixed but previously committed content should not remain in published Git history

## Extra Rule

For public release work, clean file content and clean history are both required. One without the other is not enough.

## Lesson

Before public release, treat docs and templates as publishable artifacts rather than internal working notes.

That means:

- remove environment-specific paths unless the path itself is the subject of the example
- prefer repo-relative references in docs
- finish renames completely
- remove sensitive values and stale placeholders
- prefer one clean public narrative over historical implementation debris

## Practical Rule

Before publishing:

1. search for old product names
2. search for local absolute paths
3. search for secrets, token literals, and environment-specific values
4. search for duplicated setup blocks and stale examples
5. rewrite or squash history if earlier commits should not be published

## Applied Here

This lesson was applied by:

- cleaning stale `tmux-talk` references
- replacing or removing local path references where possible
- rewriting `main` to one public commit before pushing to GitHub
- tightening README and user-guide text for public consumption
