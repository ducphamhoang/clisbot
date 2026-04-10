import { describe, expect, test } from "bun:test";
import type { TmuxClient } from "../src/runners/tmux/client.ts";
import { waitForTmuxSessionBootstrap } from "../src/runners/tmux/session-handshake.ts";
import { monitorTmuxRun } from "../src/runners/tmux/run-monitor.ts";

describe("tmux runner latency behavior", () => {
  test("waitForTmuxSessionBootstrap returns before the full startup budget once output appears", async () => {
    let captureCount = 0;
    const fakeTmux = {
      async capturePane() {
        captureCount += 1;
        return captureCount >= 2 ? "READY" : "";
      },
    } as unknown as TmuxClient;

    const startedAt = Date.now();
    const snapshot = await waitForTmuxSessionBootstrap({
      tmux: fakeTmux,
      sessionName: "test-session",
      captureLines: 80,
      startupDelayMs: 500,
    });
    const elapsedMs = Date.now() - startedAt;

    expect(snapshot).toBe("READY");
    expect(captureCount).toBe(2);
    expect(elapsedMs).toBeLessThan(400);
  });

  test("monitorTmuxRun polls quickly for the first visible output", async () => {
    let snapshot = "";
    let submitted = false;

    const fakeTmux = {
      async sendLiteral() {
        submitted = true;
      },
      async sendKey() {
        if (submitted) {
          snapshot = "READY\nFIRST";
        }
      },
      async capturePane() {
        return snapshot;
      },
    } as unknown as TmuxClient;

    const startedAt = Date.now();
    const seenRunningAt = await monitorTmuxRun({
      tmux: fakeTmux,
      sessionName: "test-session",
      prompt: "ping",
      promptSubmitDelayMs: 1,
      captureLines: 80,
      updateIntervalMs: 1000,
      idleTimeoutMs: 5_000,
      noOutputTimeoutMs: 5_000,
      maxRuntimeMs: 10_000,
      startedAt,
      initialSnapshot: "",
      detachedAlready: false,
      onRunning: async () => {
        throw new Error(`seen-running:${Date.now() - startedAt}`);
      },
      onDetached: async () => undefined,
      onCompleted: async () => undefined,
      onTimeout: async () => undefined,
    }).catch((error) => {
      if (!(error instanceof Error) || !error.message.startsWith("seen-running:")) {
        throw error;
      }

      return Number.parseInt(error.message.replace("seen-running:", ""), 10);
    });

    expect(seenRunningAt).toBeLessThan(700);
  });
});
