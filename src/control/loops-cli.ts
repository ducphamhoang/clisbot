import type { IntervalLoopStatus } from "../agents/loop-state.ts";
import { AgentSessionState } from "../agents/session-state.ts";
import { SessionStore } from "../agents/session-store.ts";
import {
  formatCalendarLoopSchedule,
  formatLoopIntervalShort,
} from "../agents/loop-command.ts";
import { ensureEditableConfigFile } from "../config/config-file.ts";
import {
  loadConfigWithoutEnvResolution,
  resolveSessionStorePath,
} from "../config/load-config.ts";
import { collapseHomePath } from "../shared/paths.ts";

function getEditableConfigPath() {
  return process.env.CLISBOT_CONFIG_PATH;
}

export function renderLoopsHelp() {
  return [
    "clisbot loops",
    "",
    "Usage:",
    "  clisbot loops",
    "  clisbot loops --help",
    "  clisbot loops list",
    "  clisbot loops status",
    "  clisbot loops cancel <id>",
    "  clisbot loops cancel --all",
    "",
    "Behavior:",
    "  - `list` and `status` are aliases that render the same global loop inventory",
    "  - this CLI manages only persisted recurring loops created earlier through channel `/loop` commands",
    "  - it does not create new loops",
    "  - `cancel --all` cancels every persisted loop across the whole app",
    "  - when runtime is already running, cancelled loops are suppressed before their next scheduled tick",
  ].join("\n");
}

function renderLoopSchedule(loop: IntervalLoopStatus) {
  if (loop.kind === "calendar") {
    return `schedule: \`${formatCalendarLoopSchedule({
      cadence: loop.cadence,
      dayOfWeek: loop.dayOfWeek,
      localTime: loop.localTime,
    })}\` timezone: \`${loop.timezone}\``;
  }

  return `interval: \`${formatLoopIntervalShort(loop.intervalMs)}\``;
}

function renderLoopInventory(params: {
  commandLabel: "list" | "status";
  configPath: string;
  sessionStorePath: string;
  loops: IntervalLoopStatus[];
}) {
  const lines = [
    `clisbot loops ${params.commandLabel}`,
    "",
    `config: ${collapseHomePath(params.configPath)}`,
    `sessionStore: ${collapseHomePath(params.sessionStorePath)}`,
    `activeLoops.global: \`${params.loops.length}\``,
  ];

  if (params.loops.length === 0) {
    lines.push("", "No active loops.");
    return lines.join("\n");
  }

  lines.push("");
  for (const loop of params.loops) {
    lines.push(
      `- id: \`${loop.id}\` agent: \`${loop.agentId}\` session: \`${loop.sessionKey}\` ${renderLoopSchedule(loop)} remaining: \`${loop.remainingRuns}\` nextRunAt: \`${new Date(loop.nextRunAt).toISOString()}\` prompt: \`${loop.promptSummary}\`${loop.kind !== "calendar" && loop.force ? " force" : ""}`,
    );
  }

  return lines.join("\n");
}

function getSessionState(sessionStorePath: string) {
  return new AgentSessionState(new SessionStore(sessionStorePath));
}

async function loadLoopControlState() {
  const configPath = await ensureEditableConfigFile(getEditableConfigPath());
  const loadedConfig = await loadConfigWithoutEnvResolution(configPath);
  const sessionStorePath = resolveSessionStorePath(loadedConfig);
  return {
    configPath: loadedConfig.configPath,
    sessionStorePath,
    sessionState: getSessionState(sessionStorePath),
  };
}

async function listLoops(commandLabel: "list" | "status") {
  const state = await loadLoopControlState();
  const loops = await state.sessionState.listIntervalLoops();
  console.log(
    renderLoopInventory({
      commandLabel,
      configPath: state.configPath,
      sessionStorePath: state.sessionStorePath,
      loops,
    }),
  );
}

async function cancelLoop(loopId: string) {
  const state = await loadLoopControlState();
  const cancelled = await state.sessionState.removeIntervalLoopById(loopId);
  const remaining = await state.sessionState.listIntervalLoops();

  console.log(
    [
      cancelled
        ? `Cancelled loop \`${loopId}\`.`
        : `No active loop found with id \`${loopId}\`.`,
      `activeLoops.global: \`${remaining.length}\``,
      `sessionStore: ${collapseHomePath(state.sessionStorePath)}`,
    ].join("\n"),
  );
}

async function cancelAllLoops() {
  const state = await loadLoopControlState();
  const cancelled = await state.sessionState.clearAllIntervalLoops();
  const remaining = await state.sessionState.listIntervalLoops();

  console.log(
    [
      cancelled > 0
        ? `Cancelled ${cancelled} active loop${cancelled === 1 ? "" : "s"} across the whole app.`
        : "No active loops to cancel across the whole app.",
      `activeLoops.global: \`${remaining.length}\``,
      `sessionStore: ${collapseHomePath(state.sessionStorePath)}`,
    ].join("\n"),
  );
}

export async function runLoopsCli(args: string[]) {
  const subcommand = args[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    console.log(renderLoopsHelp());
    return;
  }

  if (subcommand === "list" || subcommand === "status") {
    await listLoops(subcommand);
    return;
  }

  if (subcommand === "cancel") {
    if (args[1] === "--all") {
      await cancelAllLoops();
      return;
    }

    const loopId = args[1]?.trim();
    if (!loopId) {
      throw new Error("Usage: clisbot loops cancel <id> | clisbot loops cancel --all");
    }
    await cancelLoop(loopId);
    return;
  }

  throw new Error(renderLoopsHelp());
}
