export type SlackProcessingDecorationPhase =
  | "add-reaction"
  | "set-status"
  | "refresh-status"
  | "remove-reaction"
  | "clear-status";

const DEFAULT_STATUS_REFRESH_INTERVAL_MS = 2_000;

export async function activateSlackProcessingDecoration(params: {
  addReaction: () => Promise<boolean>;
  removeReaction: () => Promise<boolean>;
  setStatus: () => Promise<boolean>;
  clearStatus: () => Promise<boolean>;
  statusRefreshIntervalMs?: number;
  onUnexpectedError?: (phase: SlackProcessingDecorationPhase, error: unknown) => void;
}) {
  const [reactionResult, statusResult] = await Promise.allSettled([
    params.addReaction(),
    params.setStatus(),
  ]);

  const reactionApplied =
    reactionResult.status === "fulfilled" ? reactionResult.value === true : false;
  const statusApplied =
    statusResult.status === "fulfilled" ? statusResult.value === true : false;

  if (reactionResult.status === "rejected") {
    params.onUnexpectedError?.("add-reaction", reactionResult.reason);
  }
  if (statusResult.status === "rejected") {
    params.onUnexpectedError?.("set-status", statusResult.reason);
  }

  if (!reactionApplied && !statusApplied) {
    if (reactionResult.status === "rejected") {
      throw reactionResult.reason;
    }
    if (statusResult.status === "rejected") {
      throw statusResult.reason;
    }
  }

  let statusRefreshTimer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let refreshInFlight = false;
  let refreshPromise: Promise<void> | undefined;
  if (statusApplied) {
    const refreshIntervalMs = Math.max(
      0,
      params.statusRefreshIntervalMs ?? DEFAULT_STATUS_REFRESH_INTERVAL_MS,
    );
    if (refreshIntervalMs > 0) {
      statusRefreshTimer = setInterval(() => {
        if (closed || refreshInFlight) {
          return;
        }
        refreshInFlight = true;
        refreshPromise = params.setStatus()
          .then(() => undefined)
          .catch((error) => {
            if (!closed) {
              params.onUnexpectedError?.("refresh-status", error);
            }
          })
          .finally(() => {
            refreshInFlight = false;
            refreshPromise = undefined;
          });
      }, refreshIntervalMs);
    }
  }

  return async () => {
    closed = true;
    if (statusRefreshTimer) {
      clearInterval(statusRefreshTimer);
      statusRefreshTimer = undefined;
    }
    await refreshPromise;

    if (reactionApplied) {
      try {
        await params.removeReaction();
      } catch (error) {
        params.onUnexpectedError?.("remove-reaction", error);
      }
    }

    if (statusApplied) {
      try {
        await params.clearStatus();
      } catch (error) {
        params.onUnexpectedError?.("clear-status", error);
      }
    }
  };
}
