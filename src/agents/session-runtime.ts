export type SessionRuntimeInfo = {
  state: "idle" | "running" | "detached";
  startedAt?: number;
  detachedAt?: number;
  finalReplyAt?: number;
  sessionKey: string;
  agentId: string;
};
