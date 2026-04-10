---
title: Product Rename Must Cover Runtime Paths, Commands, And Remote Metadata Together
date: 2026-04-10
area: cross-cutting
summary: A direct product rename is not complete until package metadata, CLI names, runtime paths, env vars, docs, tests, and remote repository metadata all agree on one identity.
related:
  - ../tasks/2026-04-10-clisbot-product-rename.md
  - ../features/non-functionals/stability/README.md
---

# Product Rename Must Cover Runtime Paths, Commands, And Remote Metadata Together

## What Happened

The rename from `muxbot` to `clisbot` touched far more than package metadata.

The real identity surface included:

- package name and install commands
- shipped binaries and aliases
- runtime home and config paths
- socket, pid, log, and wrapper defaults
- environment variable names
- docs and operator help
- tests and helper filenames
- GitHub repository metadata and local git remotes

## Why It Matters

If even one of those areas stays on the old name, the product becomes harder to install, harder to debug, and harder to trust.

Direct renames especially need this discipline because there is no compatibility layer to hide partial work.

## Reusable Rule

When renaming a product in an early-phase system:

- rename file identities first
- run a broad text and symbol pass second
- then use compile and test failures to catch the remaining stale imports or constants
- validate one real CLI flow against the new default runtime paths
- update remote repository metadata and local git remotes as part of the same batch

## Practical Warning

Bulk replacement scripts can also over-edit task docs and newly created files.

After scripted replacement:

- inspect task and backlog docs for corrupted before or after wording
- inspect wrapper helpers and env var constants explicitly
- run a repo-wide search for old identity strings and confirm any survivors are intentional historical references only
