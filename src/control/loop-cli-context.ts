import type { AgentSessionTarget } from "../agents/agent-service.ts";
import { getAgentEntry, type LoadedConfig } from "../config/load-config.ts";
import {
  resolveSlackBotConfig,
  resolveSlackBotId,
  resolveTelegramBotConfig,
  resolveTelegramBotId,
} from "../config/channel-bots.ts";
import { buildAgentPromptText } from "../channels/agent-prompt.ts";
import type { ChannelIdentity } from "../channels/channel-identity.ts";
import type { SharedChannelRoute } from "../channels/route-policy.ts";
import { resolveSlackConversationRoute } from "../channels/slack/route-config.ts";
import { resolveSlackConversationTarget } from "../channels/slack/session-routing.ts";
import { resolveTelegramConversationRoute } from "../channels/telegram/route-config.ts";
import { resolveTelegramConversationTarget } from "../channels/telegram/session-routing.ts";

type LoopCliChannel = "slack" | "telegram";

export type LoopCliContext = {
  channel: LoopCliChannel;
  botId: string;
  target: string;
  threadId?: string;
  sessionTarget: AgentSessionTarget;
  identity: ChannelIdentity;
  route: SharedChannelRoute;
  buildLoopPromptText: (text: string) => string;
};

type LoopCliContextParams = {
  loadedConfig: LoadedConfig;
  channel: LoopCliChannel;
  target: string;
  threadId?: string;
  topicId?: string;
  botId?: string;
};

export type SlackLoopTarget = {
  conversationKind: "dm" | "group" | "channel";
  channelType: "im" | "mpim" | "channel";
  channelId: string;
  userId?: string;
};

export function normalizeSlackLoopTarget(raw: string): SlackLoopTarget {
  const target = raw.trim();
  if (!target) {
    throw new Error("--target is required");
  }

  if (target.startsWith("channel:")) {
    return {
      conversationKind: "channel",
      channelType: "channel",
      channelId: target.slice("channel:".length),
    };
  }

  if (target.startsWith("group:")) {
    return {
      conversationKind: "group",
      channelType: "mpim",
      channelId: target.slice("group:".length),
    };
  }

  if (target.startsWith("dm:")) {
    const channelId = target.slice("dm:".length);
    return {
      conversationKind: "dm",
      channelType: "im",
      channelId,
      userId: channelId.startsWith("U") ? channelId : undefined,
    };
  }

  if (target.startsWith("D")) {
    return {
      conversationKind: "dm",
      channelType: "im",
      channelId: target,
    };
  }

  if (target.startsWith("G")) {
    return {
      conversationKind: "group",
      channelType: "mpim",
      channelId: target,
    };
  }

  if (target.startsWith("C")) {
    return {
      conversationKind: "channel",
      channelType: "channel",
      channelId: target,
    };
  }

  throw new Error(
    "Slack loop targets must use channel:<id>, group:<id>, dm:<user-or-channel-id>, or a raw C/G/D id.",
  );
}

function resolveSlackLoopCliContext(params: LoopCliContextParams): LoopCliContext {
  const botId = resolveSlackBotId(params.loadedConfig.raw.bots.slack, params.botId);
  const target = normalizeSlackLoopTarget(params.target);
  const routeInfo = resolveSlackConversationRoute(
    params.loadedConfig,
    {
      channel_type: target.channelType,
      channel: target.channelId,
      user: target.userId,
    },
    {
      botId,
    },
  );
  if (!routeInfo.route) {
    throw new Error(`Route not configured or not admitted for Slack target \`${params.target}\`.`);
  }
  const route = routeInfo.route;

  const sessionTarget = resolveSlackConversationTarget({
    loadedConfig: params.loadedConfig,
    agentId: route.agentId,
    botId,
    channelId: target.channelId,
    userId: target.userId,
    conversationKind: target.conversationKind,
    threadTs: params.threadId,
    messageTs: params.threadId,
    replyToMode: routeInfo.route.replyToMode,
  });
  const identity: ChannelIdentity = {
    platform: "slack",
    botId,
    conversationKind: target.conversationKind,
    channelId: target.channelId,
    threadTs: params.threadId?.trim() || undefined,
  };
  const botConfig = resolveSlackBotConfig(params.loadedConfig.raw.bots.slack, botId);
  const cliTool = getAgentEntry(params.loadedConfig, sessionTarget.agentId)?.cli;

  return {
    channel: "slack",
    botId,
    target: params.target,
    threadId: params.threadId?.trim() || undefined,
    sessionTarget,
    identity,
    route,
    buildLoopPromptText: (text) =>
      buildAgentPromptText({
        text,
        identity,
        config: botConfig.agentPrompt,
        cliTool,
        responseMode: route.responseMode,
        streaming: route.streaming,
      }),
  };
}

function resolveTelegramLoopCliContext(params: LoopCliContextParams): LoopCliContext {
  const chatId = Number(params.target);
  if (!Number.isFinite(chatId)) {
    throw new Error("Telegram loop targets must use the numeric chat id.");
  }

  const rawThreadId = params.threadId?.trim();
  const rawTopicId = params.topicId?.trim() || rawThreadId;
  const topicId = rawTopicId ? Number(rawTopicId) : undefined;
  if (rawTopicId && !Number.isFinite(topicId)) {
    throw new Error("Telegram --topic-id must be a numeric topic id.");
  }

  const botId = resolveTelegramBotId(params.loadedConfig.raw.bots.telegram, params.botId);
  const routeInfo = resolveTelegramConversationRoute({
    loadedConfig: params.loadedConfig,
    chatType: chatId > 0 ? "private" : "supergroup",
    chatId,
    topicId: Number.isFinite(topicId) ? topicId : undefined,
    isForum: Number.isFinite(topicId),
    botId,
  });
  if (!routeInfo.route) {
    throw new Error(`Route not configured or not admitted for Telegram target \`${params.target}\`.`);
  }
  const route = routeInfo.route;

  const conversationKind =
    routeInfo.conversationKind === "topic"
      ? "topic"
      : routeInfo.conversationKind === "dm"
        ? "dm"
        : "group";
  const sessionTarget = resolveTelegramConversationTarget({
    loadedConfig: params.loadedConfig,
    agentId: route.agentId,
    botId,
    chatId,
    userId: chatId > 0 ? chatId : undefined,
    conversationKind,
    topicId: Number.isFinite(topicId) ? topicId : undefined,
  });
  const identity: ChannelIdentity = {
    platform: "telegram",
    botId,
    conversationKind,
    chatId: String(chatId),
    topicId: Number.isFinite(topicId) ? String(topicId) : undefined,
  };
  const botConfig = resolveTelegramBotConfig(params.loadedConfig.raw.bots.telegram, botId);
  const cliTool = getAgentEntry(params.loadedConfig, sessionTarget.agentId)?.cli;

  return {
    channel: "telegram",
    botId,
    target: params.target,
    threadId: Number.isFinite(topicId) ? String(topicId) : undefined,
    sessionTarget,
    identity,
    route,
    buildLoopPromptText: (text) =>
      buildAgentPromptText({
        text,
        identity,
        config: botConfig.agentPrompt,
        cliTool,
        responseMode: route.responseMode,
        streaming: route.streaming,
      }),
  };
}

export function resolveLoopCliContext(params: LoopCliContextParams): LoopCliContext {
  if (params.channel === "slack") {
    return resolveSlackLoopCliContext(params);
  }
  return resolveTelegramLoopCliContext(params);
}
