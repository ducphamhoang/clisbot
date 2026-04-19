import type { IntervalLoopStatus } from "../agents/loop-state.ts";
import { summarizeLoopPrompt, type ResolvedLoopPrompt } from "../agents/loop-control-shared.ts";
import { formatCalendarLoopSchedule, type ParsedLoopSlashCommand } from "../agents/loop-command.ts";
import { resolveAgentTarget } from "../agents/resolved-target.ts";
import { type AgentSessionState } from "../agents/session-state.ts";
import type { LoadedConfig } from "../config/load-config.ts";
import type { LoopCliAddressing } from "./loop-cli-addressing.ts";
import { parseAddressing } from "./loop-cli-addressing.ts";
import type { LoopCliContext } from "./loop-cli-context.ts";
import { createSlackLoopThread, resolveSlackLoopChannelId } from "./slack-loop-thread.ts";

export function selectScopedLoopsForAddressing(
  context: LoopCliContext,
  addressing: LoopCliAddressing,
  loops: IntervalLoopStatus[],
) {
  if (
    context.identity.platform === "slack" &&
    context.identity.conversationKind === "dm" &&
    addressing.threadId
  ) {
    return loops.filter((loop) => loop.surfaceBinding?.threadTs === addressing.threadId);
  }
  return loops;
}

export async function removeScopedLoopsById(params: {
  loadedConfig: LoadedConfig;
  sessionState: AgentSessionState;
  context: LoopCliContext;
  loopIds: string[];
}) {
  const resolved = resolveAgentTarget(params.loadedConfig, params.context.sessionTarget);
  for (const loopId of params.loopIds) {
    await params.sessionState.removeIntervalLoop(resolved, loopId);
  }
}

function buildNewSlackThreadIntro(params: {
  parsed: ParsedLoopSlashCommand;
  resolvedPrompt: ResolvedLoopPrompt;
}) {
  const promptSummary = summarizeLoopPrompt(
    params.resolvedPrompt.text,
    params.resolvedPrompt.maintenancePrompt,
  );
  const scheduleLine =
    params.parsed.mode === "calendar"
      ? `schedule: ${formatCalendarLoopSchedule(params.parsed)}`
      : params.parsed.mode === "interval"
        ? `schedule: every ${Math.max(1, Math.round(params.parsed.intervalMs / 60_000))}m`
        : `runs: ${params.parsed.count} time${params.parsed.count === 1 ? "" : "s"}`;
  return [
    "Managed loop thread created.",
    scheduleLine,
    `prompt: \`${promptSummary}\``,
  ].join("\n");
}

export async function prepareLoopCreateAddressing(params: {
  configPath: string;
  rawArgs: string[];
  parsed: ParsedLoopSlashCommand;
  resolvedPrompt: ResolvedLoopPrompt;
}) {
  const addressing = parseAddressing(params.rawArgs);
  if (!addressing.newThread) {
    return addressing;
  }
  if (addressing.channel !== "slack") {
    throw new Error("`--new-thread` is only supported for Slack loop commands.");
  }
  if (addressing.threadId || addressing.topicId) {
    throw new Error("Use either `--new-thread` or an explicit thread/topic id, not both.");
  }

  const provisioned = await createSlackLoopThread({
    configPath: params.configPath,
    botId: addressing.botId,
    target: addressing.target ?? "",
    initialText: buildNewSlackThreadIntro({
      parsed: params.parsed,
      resolvedPrompt: params.resolvedPrompt,
    }),
  });

  return {
    ...addressing,
    threadId: provisioned.threadTs,
    newThread: false,
  } satisfies LoopCliAddressing;
}

export async function resolveSlackSurfaceChannelId(params: {
  configPath: string;
  addressing: LoopCliAddressing;
}) {
  if (params.addressing.channel !== "slack" || !params.addressing.target) {
    return undefined;
  }
  if (!/^dm:/i.test(params.addressing.target)) {
    return undefined;
  }
  return resolveSlackLoopChannelId({
    configPath: params.configPath,
    botId: params.addressing.botId,
    target: params.addressing.target,
  });
}

export async function getScopedLoopCounts(params: {
  sessionState: AgentSessionState;
  sessionKey: string;
  context: LoopCliContext;
  addressing: LoopCliAddressing;
}) {
  const [sessionLoops, globalLoopCount] = await Promise.all([
    params.sessionState.listIntervalLoops({
      sessionKey: params.sessionKey,
    }),
    params.sessionState.listIntervalLoops().then((loops) => loops.length),
  ]);
  return {
    sessionLoopCount: selectScopedLoopsForAddressing(
      params.context,
      params.addressing,
      sessionLoops,
    ).length,
    globalLoopCount,
  };
}
