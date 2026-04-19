import { resolveSlackBotConfig, resolveSlackBotId } from "../config/channel-bots.ts";
import { type LoadedConfig, loadConfig } from "../config/load-config.ts";
import { normalizeSlackLoopTarget } from "./loop-cli-context.ts";

type SlackApiSuccess<T> = T & { ok: true };
type SlackApiFailure = { ok: false; error?: string };

async function callSlackApi<T>(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<SlackApiSuccess<T>> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Slack API ${method} failed with HTTP ${response.status}.`);
  }

  const data = (await response.json()) as SlackApiSuccess<T> | SlackApiFailure;
  if (!data.ok) {
    throw new Error(`Slack API ${method} failed: ${data.error ?? "unknown_error"}`);
  }
  return data;
}

async function resolveSlackPostChannelId(params: {
  token: string;
  target: string;
}) {
  const normalized = normalizeSlackLoopTarget(params.target);
  if (normalized.conversationKind === "dm" && normalized.userId) {
    const opened = await callSlackApi<{ channel?: { id?: string } }>(
      params.token,
      "conversations.open",
      {
        users: normalized.userId,
      },
    );
    const channelId = opened.channel?.id?.trim();
    if (!channelId) {
      throw new Error(`Unable to open Slack DM for user ${normalized.userId}.`);
    }
    return channelId;
  }
  return normalized.channelId;
}

export async function resolveSlackLoopChannelId(params: {
  configPath: string;
  botId?: string;
  target: string;
}) {
  const loadedConfig = await loadConfig(params.configPath, {
    materializeChannels: ["slack"],
  });
  const resolvedBotId = resolveSlackBotId(
    loadedConfig.raw.bots.slack,
    params.botId,
  );
  const botToken = resolveSlackBotConfig(
    loadedConfig.raw.bots.slack,
    resolvedBotId,
  ).botToken.trim();
  if (!botToken) {
    throw new Error("Slack bot credentials are required to resolve the loop target.");
  }
  return resolveSlackPostChannelId({
    token: botToken,
    target: params.target,
  });
}

export async function createSlackLoopThread(params: {
  configPath: string;
  botId?: string;
  target: string;
  initialText: string;
}) {
  const loadedConfig = await loadConfig(params.configPath, {
    materializeChannels: ["slack"],
  });
  return createSlackLoopThreadWithLoadedConfig({
    loadedConfig,
    botId: params.botId,
    target: params.target,
    initialText: params.initialText,
  });
}

export async function createSlackLoopThreadWithLoadedConfig(params: {
  loadedConfig: LoadedConfig;
  botId?: string;
  target: string;
  initialText: string;
}) {
  const resolvedBotId = resolveSlackBotId(
    params.loadedConfig.raw.bots.slack,
    params.botId,
  );
  const botToken = resolveSlackBotConfig(
    params.loadedConfig.raw.bots.slack,
    resolvedBotId,
  ).botToken.trim();
  if (!botToken) {
    throw new Error("Slack bot credentials are required to create a new loop thread.");
  }

  const channelId = await resolveSlackPostChannelId({
    token: botToken,
    target: params.target,
  });
  const posted = await callSlackApi<{ ts?: string }>(
    botToken,
    "chat.postMessage",
    {
      channel: channelId,
      text: params.initialText,
    },
  );
  const threadTs = posted.ts?.trim();
  if (!threadTs) {
    throw new Error("Slack did not return a thread timestamp for the new loop thread.");
  }

  return {
    channelId,
    threadTs,
  };
}
