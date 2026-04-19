#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${CLISBOT_HOME:=~/.clisbot-dev}"
: "${CLISBOT_WRAPPER_PATH:=$CLISBOT_HOME/bin/clisbot-dev}"

export CLISBOT_HOME
export CLISBOT_WRAPPER_PATH

unset CLISBOT_CONFIG_PATH
unset CLISBOT_PID_PATH
unset CLISBOT_LOG_PATH
unset CLISBOT_RUNTIME_MONITOR_STATE_PATH
unset CLISBOT_RUNTIME_CREDENTIALS_PATH

exec bun run src/main.ts --internal-cli-name clisbot-dev "$@"
