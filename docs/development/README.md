# Development Guide

## Purpose

Use this guide for local development flows that should not distract from the public first-run path in the main `README.md`.

## Separate Dev Home

If you want to run a dev instance beside your main bot, use a separate `CLISBOT_HOME`:

```bash
export CLISBOT_HOME=~/.clisbot-dev
clisbot start --cli codex --bot-type team --telegram-bot-token DEV_TELEGRAM_BOT_TOKEN
```

What this changes:

- `CLISBOT_HOME` changes the default config path
- `CLISBOT_HOME` changes the runtime state directory
- `CLISBOT_HOME` changes the tmux socket path
- `CLISBOT_HOME` changes the local wrapper path
- `CLISBOT_HOME` changes the default workspace root

If you only want to point at one exact config file manually, `CLISBOT_CONFIG_PATH` still works.

## npm Publish

Current preferred publish flow is the same 2-step operator flow that already succeeded for `clisbot@0.1.22`.

Use this sequence unless the operator explicitly asks for something else:

1. authenticate first:

```bash
npm login
```

2. publish the current package publicly:

```bash
npm publish --access public
```

Notes:

- do not skip the explicit `npm login` step if auth might be stale
- keep the publish process attached so the operator can complete npm approval or browser confirmation if npm asks for it
- after publish, verify the live version with:

```bash
npm view clisbot version
```

- the package that gets published is the local repo state at publish time, not automatically `origin/main`
