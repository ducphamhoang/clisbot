import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  ensureClisbotWrapper,
  getClisbotPromptCommand,
  getClisbotWrapperPath,
  renderClisbotWrapperScript,
} from "../src/control/clisbot-wrapper.ts";

describe("clisbot wrapper", () => {
  let tempDir = "";
  let previousWrapperPath: string | undefined;
  let previousPromptCommand: string | undefined;

  afterEach(() => {
    process.env.CLISBOT_WRAPPER_PATH = previousWrapperPath;
    process.env.CLISBOT_PROMPT_COMMAND = previousPromptCommand;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("creates a stable local wrapper script at the configured path", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "clisbot-wrapper-"));
    previousWrapperPath = process.env.CLISBOT_WRAPPER_PATH;
    process.env.CLISBOT_WRAPPER_PATH = join(tempDir, "bin", "clisbot");

    const wrapperPath = await ensureClisbotWrapper();

    expect(wrapperPath).toBe(process.env.CLISBOT_WRAPPER_PATH);
    expect(getClisbotWrapperPath()).toBe(process.env.CLISBOT_WRAPPER_PATH);
    expect(readFileSync(wrapperPath, "utf8")).toBe(renderClisbotWrapperScript());
  });

  test("rewrites a stale wrapper body in place", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "clisbot-wrapper-"));
    previousWrapperPath = process.env.CLISBOT_WRAPPER_PATH;
    process.env.CLISBOT_WRAPPER_PATH = join(tempDir, "bin", "clisbot");
    await Bun.write(process.env.CLISBOT_WRAPPER_PATH, "#!/usr/bin/env bash\necho stale\n");

    await ensureClisbotWrapper();

    expect(readFileSync(process.env.CLISBOT_WRAPPER_PATH!, "utf8")).toBe(
      renderClisbotWrapperScript(),
    );
    expect(dirname(process.env.CLISBOT_WRAPPER_PATH!)).toBe(join(tempDir, "bin"));
  });

  test("uses an explicit prompt command override when configured", () => {
    previousPromptCommand = process.env.CLISBOT_PROMPT_COMMAND;
    process.env.CLISBOT_PROMPT_COMMAND = "clis";

    expect(getClisbotPromptCommand()).toBe("clis");
  });
});
