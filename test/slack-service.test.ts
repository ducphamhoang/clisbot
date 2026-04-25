import { describe, expect, test } from "bun:test";
import { SlackSocketService } from "../src/channels/slack/service.ts";
import { clisbotConfigSchema } from "../src/config/schema.ts";
import { renderDefaultConfigTemplate } from "../src/config/template.ts";

function createLoadedConfig() {
  const config = clisbotConfigSchema.parse(JSON.parse(renderDefaultConfigTemplate()));
  config.app.auth.roles.admin.users = ["slack:UADMIN"];
  config.bots.slack.defaults.enabled = true;
  config.bots.slack.default.enabled = true;
  config.bots.slack.default.appToken = "app-token";
  config.bots.slack.default.botToken = "bot-token";
  config.bots.slack.default.directMessages["*"] = {
    enabled: true,
    policy: "open",
    allowUsers: [],
    blockUsers: [],
    requireMention: false,
    allowBots: false,
    agentId: "default",
  };
  return {
    raw: config,
  } as any;
}

describe("SlackSocketService shared audience enforcement", () => {
  test("drops routed bot-originated messages when allowBots is false", async () => {
    const completed: string[] = [];

    await (SlackSocketService.prototype as any).handleInboundMessage.call(
      {
        shouldDropMismatchedSlackEvent: () => false,
        processedEventsStore: {
          getStatus: async () => null,
          markCompleted: async (eventId: string) => {
            completed.push(eventId);
          },
        },
        loadedConfig: createLoadedConfig(),
        markMessageSeen: () => false,
        botUserId: "U_SELF",
      },
      {
        body: { event_id: "evt-1" },
        event: {
          channel: "C123",
          subtype: "bot_message",
          bot_id: "B_OTHER",
          ts: "111.222",
          text: "hello from another bot",
        },
        conversationKind: "channel",
        route: {
          agentId: "default",
          policy: "open",
          allowBots: false,
        },
        wasMentioned: false,
      },
    );

    expect(completed).toEqual(["evt-1"]);
  });

  test("replies with an explicit deny message before dropping unauthorized shared senders", async () => {
    const completed: string[] = [];
    const apiCalls: Array<Record<string, unknown>> = [];

    await (SlackSocketService.prototype as any).handleInboundMessage.call(
      {
        shouldDropMismatchedSlackEvent: () => false,
        processedEventsStore: {
          getStatus: async () => null,
          markCompleted: async (eventId: string) => {
            completed.push(eventId);
          },
        },
        loadedConfig: createLoadedConfig(),
        markMessageSeen: () => false,
        botUserId: "U_SELF",
        botId: "default",
        app: {
          client: {
            chat: {
              postMessage: async (payload: Record<string, unknown>) => {
                apiCalls.push(payload);
                return { ts: "123.456", message: { ts: "123.456" } };
              },
            },
          },
        },
        resolveThreadTs: async () => "111.333",
      },
      {
        body: { event_id: "evt-2" },
        event: {
          channel: "C123",
          user: "U_DENIED",
          ts: "111.333",
          text: "hello",
        },
        conversationKind: "channel",
        route: {
          agentId: "default",
          policy: "allowlist",
          allowBots: false,
          allowUsers: ["U_ALLOWED"],
          blockUsers: [],
        },
        wasMentioned: false,
      },
    );

    expect(completed).toEqual(["evt-2"]);
    expect(apiCalls).toHaveLength(1);
    expect(String(apiCalls[0]?.text ?? "")).toContain("You are not allowed to use this bot in this group.");
  });

  test("drops shared-route senders listed in blockUsers without sending a reply", async () => {
    const completed: string[] = [];
    const apiCalls: Array<Record<string, unknown>> = [];

    await (SlackSocketService.prototype as any).handleInboundMessage.call(
      {
        shouldDropMismatchedSlackEvent: () => false,
        processedEventsStore: {
          getStatus: async () => null,
          markCompleted: async (eventId: string) => {
            completed.push(eventId);
          },
        },
        loadedConfig: createLoadedConfig(),
        markMessageSeen: () => false,
        botUserId: "U_SELF",
      },
      {
        body: { event_id: "evt-3" },
        event: {
          channel: "C123",
          user: "U_BLOCKED",
          ts: "111.444",
          text: "hello",
        },
        conversationKind: "channel",
        route: {
          agentId: "default",
          policy: "open",
          allowBots: false,
          allowUsers: [],
          blockUsers: ["U_BLOCKED"],
        },
        wasMentioned: false,
      },
    );

    expect(completed).toEqual(["evt-3"]);
    expect(apiCalls).toEqual([]);
  });
});
