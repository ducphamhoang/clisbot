import { appendInteractionText } from "../shared/transcript.ts";

export function mergeRunSnapshot(snapshotPrefix: string, snapshot: string) {
  return appendInteractionText(snapshotPrefix, snapshot);
}

export function buildRunRecoveryNote(
  kind: "resume-attempt" | "resume-success" | "fresh-attempt" | "fresh-required",
) {
  if (kind === "resume-attempt") {
    return "Runner session was lost. Attempting recovery 1/2 by reopening the same conversation context.";
  }
  if (kind === "resume-success") {
    return "Recovery succeeded. Continuing the current run.";
  }
  if (kind === "fresh-attempt") {
    return "The previous runner session could not be resumed. Opening a fresh runner session 2/2 without replaying your prompt.";
  }
  return "The previous runner session could not be resumed. clisbot opened a new fresh session, but did not replay your prompt because the prior conversation context is no longer guaranteed. Please resend the full prompt/context to continue.";
}
