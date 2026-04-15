import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLoopsCli } from "../src/control/loops-cli.ts";

function buildConfig(params: {
  socketPath: string;
  storePath: string;
  workspaceTemplate: string;
}) {
  return {
    tmux: {
      socketPath: params.socketPath,
    },
    session: {
      mainKey: "main",
      dmScope: "main",
      identityLinks: {},
      storePath: params.storePath,
    },
    agents: {
      defaults: {
        workspace: params.workspaceTemplate,
        runner: {
          command: "codex",
          args: ["-C", "{workspace}"],
          trustWorkspace: false,
          startupDelayMs: 1,
          promptSubmitDelayMs: 1,
          sessionId: {
            create: {
              mode: "runner",
              args: [],
            },
            capture: {
              mode: "status-command",
              statusCommand: "/status",
              pattern: "session id:\\s*(.+)",
              timeoutMs: 10,
              pollIntervalMs: 1,
            },
            resume: {
              mode: "command",
              args: ["resume", "{sessionId}"],
            },
          },
        },
        stream: {
          captureLines: 80,
          updateIntervalMs: 1000,
          idleTimeoutMs: 60_000,
          noOutputTimeoutMs: 60_000,
          maxRuntimeSec: 900,
          maxMessageChars: 4000,
        },
        session: {
          createIfMissing: true,
          staleAfterMinutes: 60,
          name: "{sessionKey}",
        },
      },
      list: [{ id: "default" }],
    },
    bindings: [],
    control: {
      configReload: {
        watch: false,
        watchDebounceMs: 250,
      },
      sessionCleanup: {
        enabled: false,
        intervalMinutes: 5,
      },
      loop: {
        maxRunsPerLoop: 20,
        maxActiveLoops: 10,
      },
    },
    channels: {
      slack: {
        enabled: false,
        mode: "socket",
        appToken: "app-token",
        botToken: "bot-token",
        defaultAccount: "default",
        accounts: {
          default: {
            appToken: "app-token",
            botToken: "bot-token",
          },
        },
        agentPrompt: {
          enabled: true,
          maxProgressMessages: 3,
          requireFinalResponse: true,
        },
        ackReaction: "",
        typingReaction: "",
        processingStatus: {
          enabled: true,
          status: "Working...",
          loadingMessages: [],
        },
        allowBots: false,
        replyToMode: "thread",
        channelPolicy: "allowlist",
        groupPolicy: "allowlist",
        defaultAgentId: "default",
        commandPrefixes: {
          slash: ["::", "\\"],
          bash: ["!"],
        },
        streaming: "all",
        response: "final",
        followUp: {
          mode: "auto",
          participationTtlMin: 5,
        },
        channels: {},
        groups: {},
        directMessages: {
          enabled: true,
          requireMention: false,
          allowBots: false,
          agentId: "default",
        },
      },
      telegram: {
        enabled: false,
        mode: "polling",
        botToken: "telegram-token",
        defaultAccount: "default",
        accounts: {
          default: {
            botToken: "telegram-token",
          },
        },
        allowBots: false,
        groupPolicy: "allowlist",
        defaultAgentId: "default",
        commandPrefixes: {
          slash: ["::", "\\"],
          bash: ["!"],
        },
        streaming: "all",
        response: "final",
        followUp: {
          mode: "auto",
          participationTtlMin: 5,
        },
        polling: {
          timeoutSeconds: 20,
          retryDelayMs: 1000,
        },
        groups: {},
        directMessages: {
          enabled: true,
          requireMention: false,
          allowBots: false,
          agentId: "default",
        },
      },
    },
  };
}

describe("loops cli", () => {
  let tempDir = "";
  let previousConfigPath: string | undefined;
  const originalLog = console.log;

  afterEach(() => {
    process.env.CLISBOT_CONFIG_PATH = previousConfigPath;
    console.log = originalLog;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("list and status render the same active loop inventory", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "clisbot-loops-cli-"));
    previousConfigPath = process.env.CLISBOT_CONFIG_PATH;
    process.env.CLISBOT_CONFIG_PATH = join(tempDir, "clisbot.json");
    const storePath = join(tempDir, "sessions.json");
    writeFileSync(
      process.env.CLISBOT_CONFIG_PATH,
      JSON.stringify(
        buildConfig({
          socketPath: join(tempDir, "clisbot.sock"),
          storePath,
          workspaceTemplate: join(tempDir, "workspaces", "{agentId}"),
        }),
        null,
        2,
      ),
    );
    writeFileSync(
      storePath,
      JSON.stringify(
        {
          "agent:default:slack:channel:C1:thread:100": {
            agentId: "default",
            sessionKey: "agent:default:slack:channel:C1:thread:100",
            workspacePath: join(tempDir, "workspaces", "default"),
            runnerCommand: "codex",
            intervalLoops: [
              {
                id: "loop123",
                intervalMs: 300_000,
                maxRuns: 20,
                attemptedRuns: 5,
                executedRuns: 4,
                skippedRuns: 1,
                createdAt: 1,
                updatedAt: 2,
                nextRunAt: 1_700_000_000_000,
                promptText: "check CI",
                promptSummary: "check CI",
                promptSource: "custom",
                force: false,
              },
            ],
            updatedAt: 2,
          },
        },
        null,
        2,
      ),
    );

    const logs: string[] = [];
    console.log = ((value?: unknown) => {
      logs.push(String(value ?? ""));
    }) as typeof console.log;

    await runLoopsCli(["list"]);
    const listOutput = logs.join("\n");
    expect(listOutput).toContain("clisbot loops list");
    expect(listOutput).toContain("activeLoops.global: `1`");
    expect(listOutput).toContain("loop123");
    expect(listOutput).toContain("interval: `5m`");
    expect(listOutput).toContain("session: `agent:default:slack:channel:C1:thread:100`");

    logs.length = 0;
    await runLoopsCli(["status"]);
    const statusOutput = logs.join("\n");
    expect(statusOutput).toContain("clisbot loops status");
    expect(statusOutput).toContain("activeLoops.global: `1`");
    expect(statusOutput).toContain("loop123");
    expect(statusOutput).toContain("interval: `5m`");
  });

  test("cancel <id> removes a single persisted loop", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "clisbot-loops-cli-"));
    previousConfigPath = process.env.CLISBOT_CONFIG_PATH;
    process.env.CLISBOT_CONFIG_PATH = join(tempDir, "clisbot.json");
    const storePath = join(tempDir, "sessions.json");
    writeFileSync(
      process.env.CLISBOT_CONFIG_PATH,
      JSON.stringify(
        buildConfig({
          socketPath: join(tempDir, "clisbot.sock"),
          storePath,
          workspaceTemplate: join(tempDir, "workspaces", "{agentId}"),
        }),
        null,
        2,
      ),
    );
    writeFileSync(
      storePath,
      JSON.stringify(
        {
          sessionA: {
            agentId: "default",
            sessionKey: "sessionA",
            workspacePath: join(tempDir, "workspaces", "default"),
            runnerCommand: "codex",
            intervalLoops: [
              {
                id: "loop123",
                intervalMs: 300_000,
                maxRuns: 20,
                attemptedRuns: 0,
                executedRuns: 0,
                skippedRuns: 0,
                createdAt: 1,
                updatedAt: 1,
                nextRunAt: 1_700_000_000_000,
                promptText: "check CI",
                promptSummary: "check CI",
                promptSource: "custom",
                force: false,
              },
              {
                id: "loop456",
                intervalMs: 600_000,
                maxRuns: 20,
                attemptedRuns: 0,
                executedRuns: 0,
                skippedRuns: 0,
                createdAt: 1,
                updatedAt: 1,
                nextRunAt: 1_700_000_100_000,
                promptText: "check deploy",
                promptSummary: "check deploy",
                promptSource: "custom",
                force: false,
              },
            ],
            updatedAt: 1,
          },
        },
        null,
        2,
      ),
    );

    const logs: string[] = [];
    console.log = ((value?: unknown) => {
      logs.push(String(value ?? ""));
    }) as typeof console.log;

    await runLoopsCli(["cancel", "loop123"]);

    const output = logs.join("\n");
    expect(output).toContain("Cancelled loop `loop123`.");
    expect(output).toContain("activeLoops.global: `1`");

    const store = JSON.parse(readFileSync(storePath, "utf8")) as {
      sessionA: { intervalLoops: Array<{ id: string }> };
    };
    expect(store.sessionA.intervalLoops.map((loop) => loop.id)).toEqual(["loop456"]);
  });

  test("cancel --all removes every persisted loop across the app", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "clisbot-loops-cli-"));
    previousConfigPath = process.env.CLISBOT_CONFIG_PATH;
    process.env.CLISBOT_CONFIG_PATH = join(tempDir, "clisbot.json");
    const storePath = join(tempDir, "sessions.json");
    writeFileSync(
      process.env.CLISBOT_CONFIG_PATH,
      JSON.stringify(
        buildConfig({
          socketPath: join(tempDir, "clisbot.sock"),
          storePath,
          workspaceTemplate: join(tempDir, "workspaces", "{agentId}"),
        }),
        null,
        2,
      ),
    );
    writeFileSync(
      storePath,
      JSON.stringify(
        {
          sessionA: {
            agentId: "default",
            sessionKey: "sessionA",
            workspacePath: join(tempDir, "workspaces", "default"),
            runnerCommand: "codex",
            intervalLoops: [
              {
                id: "loop123",
                intervalMs: 300_000,
                maxRuns: 20,
                attemptedRuns: 0,
                executedRuns: 0,
                skippedRuns: 0,
                createdAt: 1,
                updatedAt: 1,
                nextRunAt: 1_700_000_000_000,
                promptText: "check CI",
                promptSummary: "check CI",
                promptSource: "custom",
                force: false,
              },
            ],
            updatedAt: 1,
          },
          sessionB: {
            agentId: "default",
            sessionKey: "sessionB",
            workspacePath: join(tempDir, "workspaces", "default"),
            runnerCommand: "codex",
            intervalLoops: [
              {
                id: "loop456",
                kind: "calendar",
                cadence: "daily",
                localTime: "07:00",
                hour: 7,
                minute: 0,
                timezone: "Asia/Ho_Chi_Minh",
                maxRuns: 20,
                attemptedRuns: 3,
                executedRuns: 3,
                skippedRuns: 0,
                createdAt: 1,
                updatedAt: 1,
                nextRunAt: 1_700_000_100_000,
                promptText: "daily summary",
                promptSummary: "daily summary",
                promptSource: "custom",
                force: false,
              },
            ],
            updatedAt: 1,
          },
        },
        null,
        2,
      ),
    );

    const logs: string[] = [];
    console.log = ((value?: unknown) => {
      logs.push(String(value ?? ""));
    }) as typeof console.log;

    await runLoopsCli(["cancel", "--all"]);

    const output = logs.join("\n");
    expect(output).toContain("Cancelled 2 active loops across the whole app.");
    expect(output).toContain("activeLoops.global: `0`");

    const store = JSON.parse(readFileSync(storePath, "utf8")) as Record<
      string,
      { intervalLoops?: unknown[] }
    >;
    expect(store.sessionA?.intervalLoops ?? []).toEqual([]);
    expect(store.sessionB?.intervalLoops ?? []).toEqual([]);
  });
});
