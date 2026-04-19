import { afterEach, beforeEach } from "bun:test";

const SANITIZED_ENV_KEYS = [
  "SLACK_APP_TOKEN",
  "SLACK_BOT_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CONTROL_BOT_TOKEN",
  "TELEGRAM_DEV_BOT_TOKEN",
] as const;

function restoreSanitizedEnv() {
  for (const key of SANITIZED_ENV_KEYS) {
    delete process.env[key];
  }
}

beforeEach(() => {
  restoreSanitizedEnv();
});

afterEach(() => {
  restoreSanitizedEnv();
});
