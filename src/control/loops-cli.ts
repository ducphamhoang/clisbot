import {
  AgentService,
  ActiveRunInProgressError,
  type AgentSessionTarget,
} from "../agents/agent-service.ts";
import {
  createStoredCalendarLoop,
  createStoredIntervalLoop,
  renderLoopStartedMessage,
  renderLoopStatusSchedule,
  resolveLoopPromptText,
  summarizeLoopPrompt,
  validateLoopInterval,
} from "../agents/loop-control-shared.ts";
import type { IntervalLoopStatus } from "../agents/loop-state.ts";
import {
  LOOP_APP_FLAG,
  formatCalendarLoopSchedule,
  parseLoopSlashCommand,
  resolveLoopTimezone,
  type ParsedLoopSlashCommand,
} from "../agents/loop-command.ts";
import { resolveAgentTarget } from "../agents/resolved-target.ts";
import { AgentSessionState } from "../agents/session-state.ts";
import { SessionStore } from "../agents/session-store.ts";
import { ensureEditableConfigFile } from "../config/config-file.ts";
import {
  loadConfigWithoutEnvResolution,
  resolveSessionStorePath,
} from "../config/load-config.ts";
import { getRuntimeStatus } from "./runtime-process.ts";
import { resolveLoopCliContext } from "./loop-cli-context.ts";
import { renderCliCommand } from "../shared/cli-name.ts";
import { collapseHomePath } from "../shared/paths.ts";
import { sleep } from "../shared/process.ts";

const LOOP_CONTEXT_FLAGS = new Set(["--channel", "--target", "--thread-id", "--bot", "--account"]);
const LOOP_BUSY_RETRY_MS = 250;

type LoopCliAddressing = {
  channel?: "slack" | "telegram";
  target?: string;
  threadId?: string;
  botId?: string;
};

type LoadedLoopControlState = Awaited<ReturnType<typeof loadLoopControlState>>;
type LoopCliContext = ReturnType<typeof resolveLoopCliContext>;
type LoopPromptResolution = Awaited<ReturnType<typeof resolveLoopPromptText>>;
type LoopCreateRequest = {
  addressing: LoopCliAddressing;
  context: LoopCliContext;
  parsed: ParsedLoopSlashCommand;
  resolvedPrompt: LoopPromptResolution;
  resolvedTarget: ReturnType<typeof resolveAgentTarget>;
  maxRunsPerLoop: number;
  maxActiveLoops: number;
  defaultTimezone?: string;
};
type LoopCounts = {
  sessionLoopCount: number;
  globalLoopCount: number;
};
type LoopCreateBase = {
  state: LoadedLoopControlState;
  request: LoopCreateRequest;
  cancelCommand: string;
  runtimeRunning: boolean;
};

function getEditableConfigPath() {
  return process.env.CLISBOT_CONFIG_PATH;
}

function parseOptionValue(args: string[], name: string) {
  const indexes = args
    .map((arg, index) => (arg === name ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length === 0) {
    return undefined;
  }

  const value = args[indexes.at(-1)! + 1]?.trim();
  if (!value) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function stripLoopContextArgs(args: string[]) {
  const remaining: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === "--") {
      remaining.push(...args.slice(index + 1));
      break;
    }
    if (LOOP_CONTEXT_FLAGS.has(current)) {
      index += 1;
      continue;
    }
    remaining.push(current);
  }
  return remaining;
}

function parseAddressing(args: string[]): LoopCliAddressing {
  const channel = parseOptionValue(args, "--channel");
  if (channel && channel !== "slack" && channel !== "telegram") {
    throw new Error("--channel must be `slack` or `telegram`.");
  }

  return {
    channel: channel as LoopCliAddressing["channel"],
    target: parseOptionValue(args, "--target"),
    threadId: parseOptionValue(args, "--thread-id"),
    botId: parseOptionValue(args, "--bot") ?? parseOptionValue(args, "--account"),
  };
}

function hasLoopContext(args: string[]) {
  return Boolean(parseOptionValue(args, "--channel") || parseOptionValue(args, "--target"));
}

function renderScopedCommand(base: string, addressing: LoopCliAddressing) {
  const suffix = [
    `--channel ${addressing.channel}`,
    addressing.target ? `--target ${addressing.target}` : null,
    addressing.threadId ? `--thread-id ${addressing.threadId}` : null,
    addressing.botId ? `--bot ${addressing.botId}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return renderCliCommand(`${base} ${suffix}`.trim());
}

export function renderLoopsHelp() {
  return [
    renderCliCommand("loops"),
    "",
    "Usage:",
    `  ${renderCliCommand("loops")}`,
    `  ${renderCliCommand("loops --help")}`,
    `  ${renderCliCommand("loops list")}`,
    `  ${renderCliCommand("loops status")}`,
    `  ${renderCliCommand("loops status --channel slack --target channel:C1234567890 --thread-id 1712345678.123456")}`,
    `  ${renderCliCommand("loops create --channel slack --target channel:C1234567890 --thread-id 1712345678.123456 every day at 07:00 check CI")}`,
    `  ${renderCliCommand("loops --channel slack --target channel:C1234567890 --thread-id 1712345678.123456 5m check CI")}`,
    `  ${renderCliCommand("loops create --channel telegram --target -1001234567890 --thread-id 42 every weekday at 07:00 standup")}`,
    `  ${renderCliCommand("loops --channel slack --target channel:C1234567890 --thread-id 1712345678.123456 3 review backlog")}`,
    `  ${renderCliCommand("loops cancel <id>")}`,
    `  ${renderCliCommand("loops cancel --all")}`,
    `  ${renderCliCommand("loops cancel --channel slack --target channel:C1234567890 --thread-id 1712345678.123456 --all")}`,
    `  ${renderCliCommand("loops cancel --channel slack --target channel:C1234567890 --thread-id 1712345678.123456")}`,
    `  ${renderCliCommand(`loops cancel --channel slack --target channel:C1234567890 --thread-id 1712345678.123456 --all ${LOOP_APP_FLAG}`)}`,
    "",
    "Expressions:",
    "  - interval: `5m check CI` or `check CI every 5m`",
    `  - forced interval: \`1m ${LOOP_FORCE_FLAG} check CI\` or \`check CI every 1m ${LOOP_FORCE_FLAG}\``,
    "  - times: `3 check CI` or `check CI 3 times`",
    "  - calendar: `every day at 07:00 check CI`, `every weekday at 07:00 standup`, or `every mon at 09:00 review queue`",
    "  - omit the prompt to load `LOOP.md` from the target workspace",
    "",
    "Examples:",
    `  ${renderCliCommand("loops status --channel slack --target channel:C1234567890 --thread-id 1712345678.123456")}`,
    `  ${renderCliCommand("loops --channel telegram --target -1001234567890 --thread-id 42 5m")}`,
    `  ${renderCliCommand("loops cancel --channel slack --target channel:C1234567890 --thread-id 1712345678.123456 abc123")}`,
    "Behavior:",
    "  - `list` always renders the global persisted loop inventory",
    "  - bare `status` is global; scoped `status --channel ... --target ...` matches `/loop status` for one routed session",
    "  - `create` and bare scoped syntax reuse the same loop parser as channel `/loop`",
    "  - recurring loops created here are persisted immediately and picked up by the runtime when it is running",
    "  - if runtime is stopped, recurring loops activate on the next `clisbot start`",
    "  - global `cancel --all` clears the whole app; scoped `cancel --all` clears one routed session",
    "  - `cancel --all --app` is accepted only with a scoped session target, matching `/loop cancel --all --app`",
    "  - one-shot count loops run synchronously in the CLI because the top-level operator process has no shared queue IPC today",
  ].join("\n");
}

function renderLoopInventory(params: {
  commandLabel: "list" | "status";
  configPath: string;
  sessionStorePath: string;
  loops: IntervalLoopStatus[];
}) {
  const lines = [
    renderCliCommand(`loops ${params.commandLabel}`),
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
      `- id: \`${loop.id}\` agent: \`${loop.agentId}\` session: \`${loop.sessionKey}\` ${renderLoopStatusSchedule(loop)} remaining: \`${loop.remainingRuns}\` nextRunAt: \`${new Date(loop.nextRunAt).toISOString()}\` prompt: \`${loop.promptSummary}\`${loop.kind !== "calendar" && loop.force ? " force" : ""}`,
    );
  }

  return lines.join("\n");
}

function renderScopedLoopStatus(params: {
  commandLabel: string;
  configPath: string;
  sessionStorePath: string;
  sessionKey: string;
  sessionLoops: IntervalLoopStatus[];
  globalLoopCount: number;
}) {
  const lines = [
    params.commandLabel,
    "",
    `config: ${collapseHomePath(params.configPath)}`,
    `sessionStore: ${collapseHomePath(params.sessionStorePath)}`,
    `sessionKey: \`${params.sessionKey}\``,
  ];

  if (params.sessionLoops.length === 0) {
    lines.push(
      "No active loops for this session.",
      `activeLoops.global: \`${params.globalLoopCount}\``,
    );
    return lines.join("\n");
  }

  lines.push(
    `activeLoops.session: \`${params.sessionLoops.length}\``,
    `activeLoops.global: \`${params.globalLoopCount}\``,
    "",
  );
  for (const loop of params.sessionLoops) {
    lines.push(
      `- id: \`${loop.id}\` ${renderLoopStatusSchedule(loop)} remaining: \`${loop.remainingRuns}\` nextRunAt: \`${new Date(loop.nextRunAt).toISOString()}\` prompt: \`${loop.promptSummary}\`${loop.kind !== "calendar" && loop.force ? " force" : ""}`,
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
    loadedConfig,
    configPath: loadedConfig.configPath,
    sessionStorePath,
    sessionState: getSessionState(sessionStorePath),
  };
}

function requireLoopContext(addressing: LoopCliAddressing) {
  if (!addressing.channel || !addressing.target) {
    throw new Error("--channel and --target are required for scoped loop commands.");
  }
}

function resolveScopedLoopContext(
  state: LoadedLoopControlState,
  addressing: LoopCliAddressing,
) {
  requireLoopContext(addressing);
  return resolveLoopCliContext({
    loadedConfig: state.loadedConfig,
    channel: addressing.channel!,
    target: addressing.target!,
    threadId: addressing.threadId,
    botId: addressing.botId,
  });
}

function renderLoopStoreSummary(sessionStorePath: string, activeLoopCount: number) {
  return [
    `activeLoops.global: \`${activeLoopCount}\``,
    `sessionStore: ${collapseHomePath(sessionStorePath)}`,
  ];
}

async function listLoops(state: LoadedLoopControlState, commandLabel: "list" | "status") {
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

async function showScopedStatus(state: LoadedLoopControlState, addressing: LoopCliAddressing) {
  const context = resolveScopedLoopContext(state, addressing);
  const sessionLoops = await state.sessionState.listIntervalLoops({
    sessionKey: context.sessionTarget.sessionKey,
  });
  const globalLoopCount = (await state.sessionState.listIntervalLoops()).length;
  console.log(
    renderScopedLoopStatus({
      commandLabel: renderScopedCommand("loops status", addressing),
      configPath: state.configPath,
      sessionStorePath: state.sessionStorePath,
      sessionKey: context.sessionTarget.sessionKey,
      sessionLoops,
      globalLoopCount,
    }),
  );
}

async function cancelLoopById(state: LoadedLoopControlState, loopId: string) {
  const cancelled = await state.sessionState.removeIntervalLoopById(loopId);
  const remaining = await state.sessionState.listIntervalLoops();
  console.log(
    [
      cancelled
        ? `Cancelled loop \`${loopId}\`.`
        : `No active loop found with id \`${loopId}\`.`,
      ...renderLoopStoreSummary(state.sessionStorePath, remaining.length),
    ].join("\n"),
  );
}

async function cancelAllLoops(state: LoadedLoopControlState) {
  const cancelled = await state.sessionState.clearAllIntervalLoops();
  const remaining = await state.sessionState.listIntervalLoops();
  console.log(
    [
      cancelled > 0
        ? `Cancelled ${cancelled} active loop${cancelled === 1 ? "" : "s"} across the whole app.`
        : "No active loops to cancel across the whole app.",
      ...renderLoopStoreSummary(state.sessionStorePath, remaining.length),
    ].join("\n"),
  );
}

function resolveScopedLoopCancelId(args: string[], sessionLoops: IntervalLoopStatus[]) {
  const explicitLoopId = stripLoopContextArgs(args.slice(1))
    .find((token) => token && token !== "--all" && token !== LOOP_APP_FLAG);
  return explicitLoopId || (sessionLoops.length === 1 ? sessionLoops[0]?.id : undefined);
}

async function cancelAllScopedLoops(
  state: LoadedLoopControlState,
  context: LoopCliContext,
  sessionLoops: IntervalLoopStatus[],
) {
  const resolved = resolveAgentTarget(state.loadedConfig, context.sessionTarget);
  await state.sessionState.clearIntervalLoops(resolved);
  const remaining = await state.sessionState.listIntervalLoops();
  console.log(
    [
      sessionLoops.length > 0
        ? `Cancelled ${sessionLoops.length} active loop${sessionLoops.length === 1 ? "" : "s"} for this session.`
        : "No active loops to cancel for this session.",
      ...renderLoopStoreSummary(state.sessionStorePath, remaining.length),
    ].join("\n"),
  );
}

async function cancelOneScopedLoop(
  state: LoadedLoopControlState,
  context: LoopCliContext,
  sessionLoops: IntervalLoopStatus[],
  targetLoopId: string,
) {
  const resolved = resolveAgentTarget(state.loadedConfig, context.sessionTarget);
  await state.sessionState.removeIntervalLoop(resolved, targetLoopId);
  const remaining = await state.sessionState.listIntervalLoops();
  console.log(
    [
      sessionLoops.some((loop) => loop.id === targetLoopId)
        ? `Cancelled loop \`${targetLoopId}\`.`
        : `No active loop found with id \`${targetLoopId}\`.`,
      ...renderLoopStoreSummary(state.sessionStorePath, remaining.length),
    ].join("\n"),
  );
}

async function cancelScopedLoops(
  state: LoadedLoopControlState,
  args: string[],
  addressing: LoopCliAddressing,
) {
  const context = resolveScopedLoopContext(state, addressing);
  const all = hasFlag(args, "--all");
  const app = hasFlag(args, LOOP_APP_FLAG);
  if (app && !all) {
    throw new Error(`\`${LOOP_APP_FLAG}\` only works with \`cancel --all\`.`);
  }

  if (all && app) {
    await cancelAllLoops(state);
    return;
  }

  const sessionLoops = await state.sessionState.listIntervalLoops({
    sessionKey: context.sessionTarget.sessionKey,
  });
  if (all) {
    await cancelAllScopedLoops(state, context, sessionLoops);
    return;
  }

  const targetLoopId = resolveScopedLoopCancelId(args, sessionLoops);
  if (!targetLoopId) {
    console.log(
      sessionLoops.length === 0
        ? "No active loops to cancel for this session."
        : `Multiple active loops exist for this session. Use ${renderCliCommand("loops cancel --channel <...> --target <...> <id>", { inline: true })} or ${renderCliCommand("loops cancel --channel <...> --target <...> --all", { inline: true })}.`,
    );
    return;
  }

  await cancelOneScopedLoop(state, context, sessionLoops, targetLoopId);
}

async function waitForSessionIdle(agentService: AgentService, target: AgentSessionTarget) {
  while (true) {
    try {
      const runtime = await agentService.getSessionRuntime(target);
      if (runtime.state !== "running") {
        return;
      }
    } catch {
      return;
    }
    await sleep(LOOP_BUSY_RETRY_MS);
  }
}

async function executeCountLoop(params: {
  state: LoadedLoopControlState;
  context: LoopCliContext;
  promptText: string;
  count: number;
  maintenancePrompt: boolean;
}) {
  const agentService = new AgentService(params.state.loadedConfig);
  const builtPrompt = params.context.buildLoopPromptText(params.promptText);
  console.log(
    renderLoopStartedMessage({
      mode: "times",
      count: params.count,
      maintenancePrompt: params.maintenancePrompt,
    }),
  );

  try {
    for (let index = 0; index < params.count; index += 1) {
      while (true) {
        await waitForSessionIdle(agentService, params.context.sessionTarget);
        try {
          await agentService.enqueuePrompt(params.context.sessionTarget, builtPrompt, {
            onUpdate: () => undefined,
          }).result;
          break;
        } catch (error) {
          if (!(error instanceof ActiveRunInProgressError)) {
            throw error;
          }
          await sleep(LOOP_BUSY_RETRY_MS);
        }
      }
    }
  } finally {
    await agentService.stop();
  }

  console.log(`Completed ${params.count} iteration${params.count === 1 ? "" : "s"}.`);
}

function parseCreateExpression(rawArgs: string[], explicitCreateSubcommand: boolean) {
  const expressionArgs = stripLoopContextArgs(
    explicitCreateSubcommand ? rawArgs.slice(1) : rawArgs,
  );
  const expression = expressionArgs.join(" ").trim();
  if (!expression) {
    throw new Error("Loop creation requires an interval, count, or schedule expression.");
  }
  return expression;
}

function parseCreateCommand(expression: string) {
  const parsed = parseLoopSlashCommand(expression);
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  return parsed;
}

async function enforceLoopCreateLimits(
  state: LoadedLoopControlState,
  parsed: ParsedLoopSlashCommand,
  maxRunsPerLoop: number,
  maxActiveLoops: number,
) {
  const globalLoops = await state.sessionState.listIntervalLoops();
  if (parsed.mode !== "times" && globalLoops.length >= maxActiveLoops) {
    throw new Error(
      `Active loop count exceeds the configured max of \`${maxActiveLoops}\`. Cancel an existing loop first.`,
    );
  }
  if (parsed.mode === "times" && parsed.count > maxRunsPerLoop) {
    throw new Error(`Loop count exceeds the configured max of \`${maxRunsPerLoop}\`.`);
  }
}

function requireValidIntervalLoop(parsed: Extract<ParsedLoopSlashCommand, { mode: "interval" }>) {
  const validation = validateLoopInterval({
    intervalMs: parsed.intervalMs,
    force: parsed.force,
  });
  if (validation.error) {
    throw new Error(validation.error);
  }
  return validation;
}

async function resolveLoopCreateRequest(
  state: LoadedLoopControlState,
  rawArgs: string[],
  explicitCreateSubcommand: boolean,
): Promise<LoopCreateRequest> {
  const addressing = parseAddressing(rawArgs);
  const context = resolveScopedLoopContext(state, addressing);
  const parsed = parseCreateCommand(
    parseCreateExpression(rawArgs, explicitCreateSubcommand),
  );
  const loopConfig = state.loadedConfig.raw.control.loop;
  const maxRunsPerLoop = loopConfig.maxRunsPerLoop ?? loopConfig.maxTimes ?? 50;
  const maxActiveLoops = loopConfig.maxActiveLoops ?? 10;
  await enforceLoopCreateLimits(state, parsed, maxRunsPerLoop, maxActiveLoops);
  const resolvedTarget = resolveAgentTarget(state.loadedConfig, context.sessionTarget);
  const resolvedPrompt = await resolveLoopPromptText({
    workspacePath: resolvedTarget.workspacePath,
    promptText: parsed.promptText,
  });
  return {
    addressing,
    context,
    parsed,
    resolvedPrompt,
    resolvedTarget,
    maxRunsPerLoop,
    maxActiveLoops,
    defaultTimezone: loopConfig.defaultTimezone,
  };
}

function buildLoopSurfaceBinding(context: LoopCliContext) {
  return {
    platform: context.identity.platform,
    botId: context.botId,
    conversationKind: context.identity.conversationKind,
    channelId: context.identity.channelId,
    chatId: context.identity.chatId,
    threadTs: context.identity.threadTs,
    topicId: context.identity.topicId,
  };
}

async function getLoopCounts(state: LoadedLoopControlState, sessionKey: string): Promise<LoopCounts> {
  const [sessionLoopCount, globalLoopCount] = await Promise.all([
    state.sessionState
      .listIntervalLoops({ sessionKey })
      .then((loops) => loops.length),
    state.sessionState.listIntervalLoops().then((loops) => loops.length),
  ]);
  return {
    sessionLoopCount,
    globalLoopCount,
  };
}

function buildRecurringLoopCreateBase(
  state: LoadedLoopControlState,
  request: LoopCreateRequest,
): Promise<LoopCreateBase> {
  return getRuntimeStatus().then((runtimeStatus) => ({
    state,
    request,
    cancelCommand: renderScopedCommand("loops cancel", request.addressing),
    runtimeRunning: runtimeStatus.running,
  }));
}

function buildRecurringLoopPromptMetadata(request: LoopCreateRequest) {
  return {
    promptText: request.context.buildLoopPromptText(request.resolvedPrompt.text),
    canonicalPromptText: request.resolvedPrompt.text,
    promptSummary: summarizeLoopPrompt(
      request.resolvedPrompt.text,
      request.resolvedPrompt.maintenancePrompt,
    ),
    promptSource: request.resolvedPrompt.maintenancePrompt
      ? ("LOOP.md" as const)
      : ("custom" as const),
    maintenancePrompt: request.resolvedPrompt.maintenancePrompt,
    surfaceBinding: buildLoopSurfaceBinding(request.context),
  };
}

function buildRecurringLoopFirstRunNote(mode: "interval" | "calendar", runtimeRunning: boolean) {
  if (!runtimeRunning) {
    return "Runtime is not running, so this loop activates on the next `clisbot start`.";
  }
  if (mode === "interval") {
    return "The first run starts after the runtime reconciles this new loop.";
  }
  return undefined;
}

async function createCalendarLoop(base: LoopCreateBase) {
  const parsed = base.request.parsed;
  if (parsed.mode !== "calendar") {
    return false;
  }

  const metadata = buildRecurringLoopPromptMetadata(base.request);
  const timezone = resolveLoopTimezone(
    base.request.context.route.timezone,
    base.request.defaultTimezone,
  ) ?? "UTC";
  const loop = createStoredCalendarLoop({
    ...metadata,
    cadence: parsed.cadence,
    dayOfWeek: parsed.dayOfWeek,
    localTime: parsed.localTime,
    hour: parsed.hour,
    minute: parsed.minute,
    timezone,
    maxRuns: base.request.maxRunsPerLoop,
  });
  await base.state.sessionState.setIntervalLoop(base.request.resolvedTarget, loop);
  const counts = await getLoopCounts(
    base.state,
    base.request.context.sessionTarget.sessionKey,
  );
  console.log(
    renderLoopStartedMessage({
      mode: "calendar",
      scheduleText: formatCalendarLoopSchedule(parsed),
      timezone: loop.timezone,
      nextRunAt: loop.nextRunAt,
      maintenancePrompt: metadata.maintenancePrompt,
      loopId: loop.id,
      maxRuns: loop.maxRuns,
      cancelCommand: base.cancelCommand,
      firstRunNote: buildRecurringLoopFirstRunNote("calendar", base.runtimeRunning),
      ...counts,
    }),
  );
  return true;
}

async function createIntervalLoop(base: LoopCreateBase) {
  const parsed = base.request.parsed;
  if (parsed.mode !== "interval") {
    return;
  }

  const validation = requireValidIntervalLoop(parsed);
  const metadata = buildRecurringLoopPromptMetadata(base.request);
  const loop = createStoredIntervalLoop({
    ...metadata,
    intervalMs: parsed.intervalMs,
    maxRuns: base.request.maxRunsPerLoop,
    force: parsed.force,
  });
  await base.state.sessionState.setIntervalLoop(base.request.resolvedTarget, loop);
  const counts = await getLoopCounts(
    base.state,
    base.request.context.sessionTarget.sessionKey,
  );
  console.log(
    renderLoopStartedMessage({
      mode: "interval",
      intervalMs: parsed.intervalMs,
      maintenancePrompt: metadata.maintenancePrompt,
      loopId: loop.id,
      maxRuns: loop.maxRuns,
      warning: validation.warning,
      cancelCommand: base.cancelCommand,
      firstRunNote: buildRecurringLoopFirstRunNote("interval", base.runtimeRunning),
      ...counts,
    }),
  );
}

async function createRecurringLoop(
  state: LoadedLoopControlState,
  request: LoopCreateRequest,
) {
  const base = await buildRecurringLoopCreateBase(state, request);
  if (await createCalendarLoop(base)) {
    return;
  }
  await createIntervalLoop(base);
}

async function createLoop(
  state: LoadedLoopControlState,
  rawArgs: string[],
  options: {
    explicitCreateSubcommand?: boolean;
  } = {},
) {
  const request = await resolveLoopCreateRequest(
    state,
    rawArgs,
    options.explicitCreateSubcommand ?? false,
  );
  if (request.parsed.mode === "times") {
    await executeCountLoop({
      state,
      context: request.context,
      promptText: request.resolvedPrompt.text,
      count: request.parsed.count,
      maintenancePrompt: request.resolvedPrompt.maintenancePrompt,
    });
    return;
  }
  await createRecurringLoop(state, request);
}

async function runCancelSubcommand(
  state: LoadedLoopControlState,
  args: string[],
  addressing: LoopCliAddressing,
) {
  if (addressing.channel || addressing.target) {
    await cancelScopedLoops(state, args, addressing);
    return;
  }
  if (args[1] === "--all") {
    await cancelAllLoops(state);
    return;
  }
  const loopId = args[1]?.trim();
  if (!loopId) {
    throw new Error(
      `Usage: ${renderCliCommand("loops cancel <id>")} | ${renderCliCommand("loops cancel --all")}`,
    );
  }
  await cancelLoopById(state, loopId);
}

async function runStatusSubcommand(
  state: LoadedLoopControlState,
  addressing: LoopCliAddressing,
) {
  if (addressing.channel || addressing.target) {
    await showScopedStatus(state, addressing);
    return;
  }
  await listLoops(state, "status");
}

export async function runLoopsCli(args: string[]) {
  const subcommand = args[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    console.log(renderLoopsHelp());
    return;
  }

  const state = await loadLoopControlState();
  const addressing = parseAddressing(args);

  if (subcommand === "list") {
    await listLoops(state, "list");
    return;
  }

  if (subcommand === "status") {
    await runStatusSubcommand(state, addressing);
    return;
  }

  if (subcommand === "cancel") {
    await runCancelSubcommand(state, args, addressing);
    return;
  }

  if (subcommand === "create") {
    await createLoop(state, args, { explicitCreateSubcommand: true });
    return;
  }

  if (hasLoopContext(args)) {
    await createLoop(state, args);
    return;
  }

  throw new Error(renderLoopsHelp());
}
