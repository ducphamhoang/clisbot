import type { FollowUpMode, StoredFollowUpState } from "./follow-up-policy.ts";
import type { IntervalLoopStatus, StoredIntervalLoop } from "./loop-state.ts";
import type { ResolvedAgentTarget } from "./resolved-target.ts";
import type { StoredSessionRuntime } from "./run-observation.ts";
import type { SessionRuntimeInfo } from "./session-runtime.ts";
import { SessionStore } from "./session-store.ts";

export type ActiveSessionRuntimeInfo = SessionRuntimeInfo & {
  state: "running" | "detached";
};

export type ConversationReplyKind = "reply" | "progress" | "final";

type SessionEntryUpdate = (existing: {
  sessionId?: string;
  followUp?: StoredFollowUpState;
  runnerCommand?: string;
  runtime?: StoredSessionRuntime;
  intervalLoops?: StoredIntervalLoop[];
} | null) => {
  sessionId?: string;
  followUp?: StoredFollowUpState;
  runnerCommand?: string;
  runtime?: StoredSessionRuntime;
  intervalLoops?: StoredIntervalLoop[];
};

export class AgentSessionState {
  constructor(private readonly sessionStore: SessionStore) {}

  async getEntry(sessionKey: string) {
    return this.sessionStore.get(sessionKey);
  }

  async listEntries() {
    return this.sessionStore.list();
  }

  async touchSessionEntry(
    resolved: ResolvedAgentTarget,
    params: {
      sessionId?: string | null;
      runnerCommand?: string;
      runtime?: StoredSessionRuntime;
    } = {},
  ) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: params.sessionId?.trim() || existing?.sessionId,
      followUp: existing?.followUp,
      runnerCommand: params.runnerCommand ?? existing?.runnerCommand ?? resolved.runner.command,
      runtime: params.runtime ?? existing?.runtime,
      intervalLoops: existing?.intervalLoops,
    }));
  }

  async clearSessionIdEntry(
    resolved: ResolvedAgentTarget,
    params: { runnerCommand?: string } = {},
  ) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: undefined,
      followUp: existing?.followUp,
      runnerCommand: params.runnerCommand ?? existing?.runnerCommand ?? resolved.runner.command,
      runtime: {
        state: "idle",
      },
      intervalLoops: existing?.intervalLoops,
    }));
  }

  async setSessionRuntime(
    resolved: ResolvedAgentTarget,
    runtime: StoredSessionRuntime,
  ) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: existing?.sessionId,
      followUp: existing?.followUp,
      runnerCommand: existing?.runnerCommand ?? resolved.runner.command,
      runtime,
      intervalLoops: existing?.intervalLoops,
    }));
  }

  async getConversationFollowUpState(target: { sessionKey: string }): Promise<StoredFollowUpState> {
    const entry = await this.sessionStore.get(target.sessionKey);
    return entry?.followUp ?? {};
  }

  async getSessionRuntime(target: {
    sessionKey: string;
    agentId: string;
  }): Promise<SessionRuntimeInfo> {
    const entry = await this.sessionStore.get(target.sessionKey);
    return {
      state: entry?.runtime?.state ?? "idle",
      startedAt: entry?.runtime?.startedAt,
      detachedAt: entry?.runtime?.detachedAt,
      finalReplyAt: entry?.runtime?.finalReplyAt,
      sessionKey: target.sessionKey,
      agentId: target.agentId,
    };
  }

  async listActiveSessionRuntimes(): Promise<ActiveSessionRuntimeInfo[]> {
    const entries = await this.sessionStore.list();
    return entries
      .filter(hasActiveRuntime)
      .map((entry) => ({
        state: entry.runtime.state,
        startedAt: entry.runtime.startedAt,
        detachedAt: entry.runtime.detachedAt,
        finalReplyAt: entry.runtime.finalReplyAt,
        sessionKey: entry.sessionKey,
        agentId: entry.agentId,
      }));
  }

  async listIntervalLoops(params?: {
    sessionKey?: string;
  }): Promise<IntervalLoopStatus[]> {
    const entries = await this.sessionStore.list();
    return entries.flatMap((entry) =>
      (entry.intervalLoops ?? [])
        .filter((loop) => !params?.sessionKey || entry.sessionKey === params.sessionKey)
        .map((loop) => ({
          ...loop,
          agentId: entry.agentId,
          sessionKey: entry.sessionKey,
          remainingRuns: Math.max(0, loop.maxRuns - loop.attemptedRuns),
        })),
    );
  }

  async setIntervalLoop(
    resolved: ResolvedAgentTarget,
    loop: StoredIntervalLoop,
  ) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: existing?.sessionId,
      followUp: existing?.followUp,
      runnerCommand: existing?.runnerCommand ?? resolved.runner.command,
      runtime: existing?.runtime,
      intervalLoops: [...(existing?.intervalLoops ?? []).filter((item) => item.id !== loop.id), loop],
    }));
  }

  async removeIntervalLoop(
    resolved: ResolvedAgentTarget,
    loopId: string,
  ) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: existing?.sessionId,
      followUp: existing?.followUp,
      runnerCommand: existing?.runnerCommand ?? resolved.runner.command,
      runtime: existing?.runtime,
      intervalLoops: (existing?.intervalLoops ?? []).filter((item) => item.id !== loopId),
    }));
  }

  async clearIntervalLoops(resolved: ResolvedAgentTarget) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: existing?.sessionId,
      followUp: existing?.followUp,
      runnerCommand: existing?.runnerCommand ?? resolved.runner.command,
      runtime: existing?.runtime,
      intervalLoops: [],
    }));
  }

  async setConversationFollowUpMode(
    resolved: ResolvedAgentTarget,
    mode: FollowUpMode,
  ) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: existing?.sessionId,
      followUp: {
        ...existing?.followUp,
        overrideMode: mode,
      },
      runnerCommand: existing?.runnerCommand ?? resolved.runner.command,
      intervalLoops: existing?.intervalLoops,
    }));
  }

  async resetConversationFollowUpMode(resolved: ResolvedAgentTarget) {
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: existing?.sessionId,
      followUp: existing?.followUp
        ? {
            ...existing.followUp,
            overrideMode: undefined,
          }
        : undefined,
      runnerCommand: existing?.runnerCommand ?? resolved.runner.command,
      intervalLoops: existing?.intervalLoops,
    }));
  }

  async reactivateConversationFollowUp(resolved: ResolvedAgentTarget) {
    const existing = await this.sessionStore.get(resolved.sessionKey);
    if (existing?.followUp?.overrideMode !== "paused") {
      return existing;
    }
    return this.resetConversationFollowUpMode(resolved);
  }

  async recordConversationReply(
    resolved: ResolvedAgentTarget,
    kind: ConversationReplyKind = "reply",
  ) {
    const repliedAt = Date.now();
    return this.upsertSessionEntry(resolved, (existing) => ({
      sessionId: existing?.sessionId,
      followUp: {
        ...existing?.followUp,
        lastBotReplyAt: repliedAt,
      },
      runnerCommand: existing?.runnerCommand ?? resolved.runner.command,
      runtime:
        kind === "final" && existing?.runtime && existing.runtime.state !== "idle"
          ? {
              ...existing.runtime,
              finalReplyAt: repliedAt,
            }
          : existing?.runtime,
      intervalLoops: existing?.intervalLoops,
    }));
  }

  private async upsertSessionEntry(
    resolved: ResolvedAgentTarget,
    update: SessionEntryUpdate,
  ) {
    return this.sessionStore.update(resolved.sessionKey, (existing) => {
      const next = update(existing);
      return {
        agentId: resolved.agentId,
        sessionKey: resolved.sessionKey,
        sessionId: next.sessionId,
        workspacePath: resolved.workspacePath,
        runnerCommand: next.runnerCommand ?? existing?.runnerCommand ?? resolved.runner.command,
        followUp: next.followUp,
        runtime: next.runtime ?? existing?.runtime,
        intervalLoops: next.intervalLoops ?? existing?.intervalLoops,
        updatedAt: Date.now(),
      };
    });
  }
}

function hasActiveRuntime(
  entry: Awaited<ReturnType<SessionStore["list"]>>[number],
): entry is Awaited<ReturnType<SessionStore["list"]>>[number] & {
  runtime: StoredSessionRuntime & { state: "running" | "detached" };
} {
  return entry.runtime?.state === "running" || entry.runtime?.state === "detached";
}
