import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { IntervalLoopStatus, StoredIntervalLoop, StoredLoopSurfaceBinding } from "./loop-state.ts";
import {
  computeNextCalendarLoopRunAtMs,
  FORCE_LOOP_INTERVAL_MS,
  formatCalendarLoopSchedule,
  formatLoopIntervalShort,
  LOOP_FORCE_FLAG,
  MIN_LOOP_INTERVAL_MS,
  type LoopCalendarCadence,
} from "./loop-command.ts";
import { fileExists, readTextFile } from "../shared/fs.ts";

export type ResolvedLoopPrompt = {
  text: string;
  maintenancePrompt: boolean;
};

function createLoopId() {
  return randomUUID().split("-")[0] ?? randomUUID();
}

function createStoredLoopBase(params: {
  nextRunAt: number;
  promptText: string;
  canonicalPromptText?: string;
  protectedControlMutationRule?: string;
  promptSummary: string;
  promptSource: "custom" | "LOOP.md";
  createdBy?: string;
  surfaceBinding?: StoredLoopSurfaceBinding;
  maxRuns: number;
}) {
  const now = Date.now();
  return {
    id: createLoopId(),
    maxRuns: params.maxRuns,
    attemptedRuns: 0,
    executedRuns: 0,
    skippedRuns: 0,
    createdAt: now,
    updatedAt: now,
    nextRunAt: params.nextRunAt,
    promptText: params.promptText,
    canonicalPromptText: params.canonicalPromptText,
    protectedControlMutationRule: params.protectedControlMutationRule,
    promptSummary: params.promptSummary,
    promptSource: params.promptSource,
    createdBy: params.createdBy,
    surfaceBinding: params.surfaceBinding,
  };
}

export function createStoredIntervalLoop(params: {
  promptText: string;
  canonicalPromptText?: string;
  protectedControlMutationRule?: string;
  promptSummary: string;
  promptSource: "custom" | "LOOP.md";
  surfaceBinding?: StoredLoopSurfaceBinding;
  intervalMs: number;
  maxRuns: number;
  createdBy?: string;
  force: boolean;
}): StoredIntervalLoop {
  return {
    ...createStoredLoopBase({
      nextRunAt: Date.now(),
      promptText: params.promptText,
      canonicalPromptText: params.canonicalPromptText,
      protectedControlMutationRule: params.protectedControlMutationRule,
      promptSummary: params.promptSummary,
      promptSource: params.promptSource,
      createdBy: params.createdBy,
      surfaceBinding: params.surfaceBinding,
      maxRuns: params.maxRuns,
    }),
    intervalMs: params.intervalMs,
    force: params.force,
  };
}

export function createStoredCalendarLoop(params: {
  promptText: string;
  canonicalPromptText?: string;
  protectedControlMutationRule?: string;
  promptSummary: string;
  promptSource: "custom" | "LOOP.md";
  surfaceBinding?: StoredLoopSurfaceBinding;
  cadence: LoopCalendarCadence;
  dayOfWeek?: number;
  localTime: string;
  hour: number;
  minute: number;
  timezone: string;
  maxRuns: number;
  createdBy?: string;
}) {
  const nextRunAt =
    computeNextCalendarLoopRunAtMs({
      cadence: params.cadence,
      dayOfWeek: params.dayOfWeek,
      hour: params.hour,
      minute: params.minute,
      timezone: params.timezone,
      nowMs: Date.now(),
    }) ?? 0;
  if (!nextRunAt) {
    throw new Error("Unable to compute the next wall-clock loop run.");
  }

  return {
    kind: "calendar" as const,
    ...createStoredLoopBase({
      nextRunAt,
      promptText: params.promptText,
      canonicalPromptText: params.canonicalPromptText,
      protectedControlMutationRule: params.protectedControlMutationRule,
      promptSummary: params.promptSummary,
      promptSource: params.promptSource,
      createdBy: params.createdBy,
      surfaceBinding: params.surfaceBinding,
      maxRuns: params.maxRuns,
    }),
    cadence: params.cadence,
    dayOfWeek: params.dayOfWeek,
    localTime: params.localTime,
    hour: params.hour,
    minute: params.minute,
    timezone: params.timezone,
    force: false as const,
  } satisfies StoredIntervalLoop;
}

export function renderLoopStatusSchedule(loop: IntervalLoopStatus | StoredIntervalLoop) {
  if (loop.kind === "calendar") {
    return `schedule: \`${formatCalendarLoopSchedule({
      cadence: loop.cadence,
      dayOfWeek: loop.dayOfWeek,
      localTime: loop.localTime,
    })}\` timezone: \`${loop.timezone}\``;
  }
  return `interval: \`${formatLoopIntervalShort(loop.intervalMs)}\``;
}

export function renderLoopStartedMessage(params: {
  mode: "times" | "interval" | "calendar";
  count?: number;
  intervalMs?: number;
  scheduleText?: string;
  timezone?: string;
  nextRunAt?: number;
  maintenancePrompt: boolean;
  loopId?: string;
  maxRuns?: number;
  sessionLoopCount?: number;
  globalLoopCount?: number;
  warning?: string;
  cancelCommand?: string;
  firstRunNote?: string;
}) {
  if (params.mode === "times") {
    const count = params.count ?? 1;
    return [
      `Started loop for ${count} iteration${count === 1 ? "" : "s"}.`,
      params.maintenancePrompt ? "prompt: `LOOP.md`" : "prompt: custom",
      "Runs are queued immediately in order.",
    ].join("\n");
  }

  const scheduleText =
    params.mode === "calendar"
      ? params.scheduleText ?? "scheduled"
      : `every ${formatLoopIntervalShort(params.intervalMs ?? 0)}`;

  return [
    `Started loop \`${params.loopId ?? ""}\` ${scheduleText}.`,
    params.maintenancePrompt ? "prompt: `LOOP.md`" : "prompt: custom",
    ...(params.timezone ? [`timezone: \`${params.timezone}\``] : []),
    `maxRuns: \`${params.maxRuns ?? 0}\``,
    "policy: `skip-if-busy`",
    `activeLoops.session: \`${params.sessionLoopCount ?? 0}\``,
    `activeLoops.global: \`${params.globalLoopCount ?? 0}\``,
    ...(params.cancelCommand && params.loopId
      ? [`cancel: \`${params.cancelCommand} ${params.loopId}\``]
      : []),
    ...(params.warning ? [`warning: ${params.warning}`] : []),
    params.firstRunNote ??
      (params.mode === "calendar"
        ? `The first run is scheduled for \`${new Date(params.nextRunAt ?? 0).toISOString()}\`.`
        : "The first run starts now."),
  ].join("\n");
}

export function summarizeLoopPrompt(text: string, maintenancePrompt: boolean) {
  if (maintenancePrompt) {
    return "LOOP.md";
  }

  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 60) {
    return singleLine || "(empty)";
  }
  return `${singleLine.slice(0, 57)}...`;
}

export function validateLoopInterval(params: {
  intervalMs: number;
  force: boolean;
}) {
  if (params.intervalMs < MIN_LOOP_INTERVAL_MS) {
    return {
      error: "Loop interval must be at least `1m`.",
    };
  }

  if (params.intervalMs < FORCE_LOOP_INTERVAL_MS && !params.force) {
    return {
      error: `Loop intervals below \`5m\` require \`${LOOP_FORCE_FLAG}\`.`,
    };
  }

  return {
    warning:
      params.force && params.intervalMs < FORCE_LOOP_INTERVAL_MS
        ? `interval below \`5m\` was accepted because \`${LOOP_FORCE_FLAG}\` was set`
        : undefined,
  };
}

export async function resolveLoopPromptText(params: {
  workspacePath: string;
  promptText?: string;
}): Promise<ResolvedLoopPrompt> {
  const providedPrompt = params.promptText?.trim();
  if (providedPrompt) {
    return {
      text: providedPrompt,
      maintenancePrompt: false,
    };
  }

  const loopPromptPath = join(params.workspacePath, "LOOP.md");
  if (!(await fileExists(loopPromptPath))) {
    throw new Error(
      `No loop prompt was provided and LOOP.md was not found in \`${params.workspacePath}\`. Create LOOP.md there if you want maintenance loops.`,
    );
  }

  const loopPromptText = (await readTextFile(loopPromptPath)).trim();
  if (!loopPromptText) {
    throw new Error(`LOOP.md is empty in \`${params.workspacePath}\`.`);
  }

  return {
    text: loopPromptText,
    maintenancePrompt: true,
  };
}
