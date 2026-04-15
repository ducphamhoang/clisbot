import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isSlackCommandLikeMessage,
  renderSlackMentionRequiredMessage,
  renderSlackRouteChoiceMessage,
  sendSlackGuidanceOnce,
} from "../src/channels/slack/feedback.ts";
import { ProcessedEventsStore } from "../src/channels/processed-events-store.ts";

describe("slack feedback helpers", () => {
  test("treats mapped slash-style control commands as command-like", () => {
    expect(
      isSlackCommandLikeMessage({
        text: "\\status",
        botUsername: "clisbot",
        commandPrefixes: {
          slash: ["::", "\\"],
          bash: ["!"],
        },
      }),
    ).toBe(true);
  });

  test("renders unrouted channel guidance with concrete add-route commands", () => {
    const text = renderSlackRouteChoiceMessage({
      channelId: "C123",
      botLabel: "clisbot",
    });

    expect(text).toContain("this Slack channel is not configured yet");
    expect(text).toContain("`clisbot channels add slack-channel C123`");
    expect(text).toContain("`clisbot channels add slack-channel C123 --agent <id>`");
    expect(text).toContain("`@clisbot \\start`");
  });

  test("renders mention-required guidance with concrete examples", () => {
    const text = renderSlackMentionRequiredMessage("clisbot");

    expect(text).toContain("requires a bot mention");
    expect(text).toContain("`@clisbot \\start`");
    expect(text).toContain("`@clisbot \\status`");
  });

  test("guidance posts only once per processed event id", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "clisbot-slack-feedback-"));

    try {
      const store = new ProcessedEventsStore(join(tempDir, "processed-events.json"));
      let sentCount = 0;

      await sendSlackGuidanceOnce({
        eventId: "E123",
        processedEventsStore: store,
        send: async () => {
          sentCount += 1;
        },
      });
      await sendSlackGuidanceOnce({
        eventId: "E123",
        processedEventsStore: store,
        send: async () => {
          sentCount += 1;
        },
      });

      expect(sentCount).toBe(1);
      expect(await store.getStatus("E123")).toBe("completed");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("guidance clears processing state when delivery fails", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "clisbot-slack-feedback-"));

    try {
      const store = new ProcessedEventsStore(join(tempDir, "processed-events.json"));

      await expect(
        sendSlackGuidanceOnce({
          eventId: "E124",
          processedEventsStore: store,
          send: async () => {
            throw new Error("slack down");
          },
        }),
      ).rejects.toThrow("slack down");
      expect(await store.getStatus("E124")).toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
