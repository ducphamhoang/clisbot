# Unreleased

Use this file as the staging area for the next release note.

## Summary

Timezone control is now explicit and app-centered, with lower-friction schedule creation and safer migration from legacy timezone defaults.

## Highlights

- Added `clisbot timezone get|set|clear|doctor` for the app-wide default timezone, plus scoped `get-timezone` / `set-timezone` / `clear-timezone` commands for agents, routes, and concrete bots.
- Wall-clock loop creation now confirms the first schedule before persisting it, showing the resolved timezone, next run, and exact retry command with `--confirm`.
- Agent prompt guidance now tells AI agents to inspect `clisbot loops --help` for schedule, loop, and reminder requests instead of guessing loop CLI behavior.

## Upgrade Notes

- Config schema is now `0.1.45`.
- On upgrade from `0.1.44` or older, clisbot backs up the config, migrates legacy timezone defaults into `app.timezone`, validates the new shape, and removes `app.control.loop.defaultTimezone`, `bots.defaults.timezone`, `bots.slack.defaults.timezone`, and `bots.telegram.defaults.timezone` from the rewritten config.
- Concrete bot, route/topic, and persisted loop timezone values are preserved.

## Links

- [Timezone config task](../tasks/features/configuration/2026-04-26-timezone-config-cli-and-loop-resolution.md)
- [Configuration timezone model](../features/configuration/README.md#timezone-model)
- [Loops CLI](../features/control/loops-cli.md)
