import { afterEach, describe, expect, test } from "bun:test";
import { runRunnerCli } from "../src/control/runner-cli.ts";
import { CliCommandError } from "../src/control/runtime-cli-shared.ts";

describe("runner cli", () => {
  const originalLog = console.log;
  const originalExitCode = process.exitCode;

  afterEach(() => {
    console.log = originalLog;
    process.exitCode = originalExitCode;
  });

  test("renders help with no subcommand", async () => {
    const logs: string[] = [];
    console.log = ((value?: unknown) => {
      logs.push(String(value ?? ""));
    }) as typeof console.log;

    await runRunnerCli([]);

    const output = logs.join("\n");
    expect(output).toContain("clisbot runner");
    expect(output).toContain("clisbot runner smoke --backend <codex|claude|gemini> --scenario <name>");
    expect(output).toContain("launch-trio");
  });

  test("smoke --json returns a machine-readable not-implemented result and exit code 3", async () => {
    const logs: string[] = [];
    console.log = ((value?: unknown) => {
      logs.push(String(value ?? ""));
    }) as typeof console.log;

    await runRunnerCli([
      "smoke",
      "--backend",
      "codex",
      "--scenario",
      "startup_ready",
      "--json",
    ]);

    expect(process.exitCode).toBe(3);
    const output = logs.join("\n");
    expect(output).toContain("\"kind\": \"runner-smoke-framework-error\"");
    expect(output).toContain("\"backendId\": \"codex\"");
    expect(output).toContain("\"scenario\": \"startup_ready\"");
    expect(output).toContain("\"code\": \"NOT_IMPLEMENTED\"");
  });

  test("smoke rejects invalid backend and scenario combinations with exit code 2 semantics", async () => {
    await expect(
      runRunnerCli([
        "smoke",
        "--backend",
        "all",
        "--scenario",
        "startup_ready",
      ]),
    ).rejects.toMatchObject({
      message: "--backend all is only valid with --suite",
      exitCode: 2,
    } satisfies Partial<CliCommandError>);
  });
});
