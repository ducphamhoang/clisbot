import { describe, expect, test } from "bun:test";
import { parseAgentCommand } from "../src/agents/commands.ts";

describe("parseAgentCommand", () => {
  test("parses start as a reserved control slash command", () => {
    const parsed = parseAgentCommand("/start");

    expect(parsed).toEqual({
      type: "control",
      name: "start",
    });
  });

  test("strips a bot username suffix from telegram slash commands", () => {
    const parsed = parseAgentCommand("/transcript@longluong2bot", {
      botUsername: "longluong2bot",
    });

    expect(parsed).toEqual({
      type: "control",
      name: "transcript",
    });
  });

  test("parses whoami as a reserved control slash command", () => {
    const parsed = parseAgentCommand("/whoami");

    expect(parsed).toEqual({
      type: "control",
      name: "whoami",
    });
  });

  test("parses status as a reserved control slash command", () => {
    const parsed = parseAgentCommand("/status");

    expect(parsed).toEqual({
      type: "control",
      name: "status",
    });
  });

  test("parses configured slash-style shortcut prefixes", () => {
    const parsed = parseAgentCommand("\\transcript");

    expect(parsed).toEqual({
      type: "control",
      name: "transcript",
    });
  });

  test("parses attach as a reserved control slash command", () => {
    const parsed = parseAgentCommand("/attach");

    expect(parsed).toEqual({
      type: "control",
      name: "attach",
    });
  });

  test("parses detach as a reserved control slash command", () => {
    const parsed = parseAgentCommand("/detach");

    expect(parsed).toEqual({
      type: "control",
      name: "detach",
    });
  });

  test("parses watch commands with interval and optional duration", () => {
    expect(parseAgentCommand("/watch every 30s")).toEqual({
      type: "control",
      name: "watch",
      intervalMs: 30_000,
    });

    expect(parseAgentCommand("/watch every 30s for 10m")).toEqual({
      type: "control",
      name: "watch",
      intervalMs: 30_000,
      durationMs: 600_000,
    });
  });

  test("parses bash shortcut prefixes", () => {
    const parsed = parseAgentCommand("!pwd");

    expect(parsed).toEqual({
      type: "bash",
      command: "pwd",
      source: "shortcut",
    });
  });

  test("parses additional message mode slash commands", () => {
    expect(parseAgentCommand("/additionalmessagemode")).toEqual({
      type: "control",
      name: "additionalmessagemode",
      action: "status",
    });

    expect(parseAgentCommand("/additionalmessagemode queue")).toEqual({
      type: "control",
      name: "additionalmessagemode",
      action: "queue",
      additionalMessageMode: "queue",
    });
  });

  test("parses queue slash commands", () => {
    expect(parseAgentCommand("/queue follow up after the current run")).toEqual({
      type: "queue",
      text: "follow up after the current run",
    });
  });

  test("parses queue and steer shortcuts plus queue admin commands", () => {
    expect(parseAgentCommand("\\q follow up after the current run")).toEqual({
      type: "queue",
      text: "follow up after the current run",
    });

    expect(parseAgentCommand("\\s focus on the regression")).toEqual({
      type: "steer",
      text: "focus on the regression",
    });

    expect(parseAgentCommand("/queue-list")).toEqual({
      type: "control",
      name: "queue-list",
    });

    expect(parseAgentCommand("/queue-clear")).toEqual({
      type: "control",
      name: "queue-clear",
    });
  });
});
