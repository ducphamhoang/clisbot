import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAccountsCli } from "../src/control/accounts-cli.ts";

let previousCliName: string | undefined;

beforeEach(() => {
  previousCliName = process.env.CLISBOT_CLI_NAME;
  delete process.env.CLISBOT_CLI_NAME;
});

afterEach(() => {
  process.env.CLISBOT_CLI_NAME = previousCliName;
});

describe("accounts cli", () => {
  test("fails fast and redirects operators to the official bots surface", async () => {
    await expect(runAccountsCli([])).rejects.toThrow("Use `clisbot bots ...` instead.");
    await expect(runAccountsCli(["help"])).rejects.toThrow(
      "Use `clisbot bots ...` instead.",
    );
  });
});
