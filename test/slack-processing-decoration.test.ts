import { describe, expect, test } from "bun:test";
import { activateSlackProcessingDecoration } from "../src/channels/slack/processing-decoration.ts";

describe("activateSlackProcessingDecoration", () => {
  test("cleans up only the side effects that were actually applied", async () => {
    const events: string[] = [];
    const cleanup = await activateSlackProcessingDecoration({
      addReaction: async () => {
        events.push("add-reaction");
        return true;
      },
      removeReaction: async () => {
        events.push("remove-reaction");
        return true;
      },
      setStatus: async () => {
        events.push("set-status");
        return false;
      },
      clearStatus: async () => {
        events.push("clear-status");
        return true;
      },
    });

    await cleanup();

    expect(events).toEqual([
      "add-reaction",
      "set-status",
      "remove-reaction",
    ]);
  });

  test("keeps cleanup for successful work even when a sibling activation step throws", async () => {
    const events: string[] = [];
    const failures: string[] = [];
    const cleanup = await activateSlackProcessingDecoration({
      addReaction: async () => {
        events.push("add-reaction");
        return true;
      },
      removeReaction: async () => {
        events.push("remove-reaction");
        return true;
      },
      setStatus: async () => {
        events.push("set-status");
        throw new Error("boom");
      },
      clearStatus: async () => {
        events.push("clear-status");
        return true;
      },
      onUnexpectedError: (phase, error) => {
        failures.push(`${phase}:${error instanceof Error ? error.message : String(error)}`);
      },
    });

    await cleanup();

    expect(events).toEqual([
      "add-reaction",
      "set-status",
      "remove-reaction",
    ]);
    expect(failures).toEqual(["set-status:boom"]);
  });

  test("throws when nothing was applied and an activation step throws unexpectedly", async () => {
    await expect(
      activateSlackProcessingDecoration({
        addReaction: async () => false,
        removeReaction: async () => true,
        setStatus: async () => {
          throw new Error("boom");
        },
        clearStatus: async () => true,
      }),
    ).rejects.toThrow("boom");
  });

  test("keeps refreshing assistant status while the decoration is active", async () => {
    const events: string[] = [];
    const cleanup = await activateSlackProcessingDecoration({
      addReaction: async () => false,
      removeReaction: async () => true,
      setStatus: async () => {
        events.push("set-status");
        return true;
      },
      clearStatus: async () => {
        events.push("clear-status");
        return true;
      },
      statusRefreshIntervalMs: 5,
    });

    await Bun.sleep(18);

    const refreshCount = events.filter((event) => event === "set-status").length;
    expect(refreshCount).toBeGreaterThan(1);

    await cleanup();
    const settledCount = events.length;

    await Bun.sleep(15);

    expect(events).toContain("clear-status");
    expect(events).toHaveLength(settledCount);
  });

  test("waits for an in-flight status refresh before clearing", async () => {
    const events: string[] = [];
    let refreshCount = 0;
    let resolveRefresh: (() => void) | undefined;
    const cleanup = await activateSlackProcessingDecoration({
      addReaction: async () => false,
      removeReaction: async () => true,
      setStatus: async () => {
        refreshCount += 1;
        events.push(`set-status-${refreshCount}`);
        if (refreshCount === 1) {
          return true;
        }
        await new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        });
        events.push(`set-status-${refreshCount}-done`);
        return true;
      },
      clearStatus: async () => {
        events.push("clear-status");
        return true;
      },
      statusRefreshIntervalMs: 5,
    });

    for (let attempt = 0; attempt < 20 && refreshCount < 2; attempt += 1) {
      await Bun.sleep(5);
    }
    expect(refreshCount).toBeGreaterThanOrEqual(2);

    const cleanupPromise = cleanup();
    await Bun.sleep(0);
    expect(events).not.toContain("clear-status");

    resolveRefresh?.();
    await cleanupPromise;

    expect(events.at(-2)).toBe("set-status-2-done");
    expect(events.at(-1)).toBe("clear-status");
  });
});
