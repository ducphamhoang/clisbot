import { renderPairingRequests } from "./messages.ts";
import {
  approveChannelPairingCode,
  clearChannelPairingRequests,
  listChannelPairingRequests,
  rejectChannelPairingCode,
  type PairingChannel,
} from "./store.ts";

type PairingCliWriter = {
  log: (line: string) => void;
};

function resolvePairingBaseDir(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.CLISBOT_PAIRING_DIR?.trim();
  if (configured) {
    return configured;
  }

  const legacy = env.TMUX_TALK_PAIRING_DIR?.trim();
  return legacy || undefined;
}

function parseChannel(raw: string | undefined): PairingChannel {
  const value = raw?.trim().toLowerCase();
  if (value === "slack" || value === "telegram") {
    return value;
  }
  throw new Error("Channel required: slack | telegram");
}

export async function runPairingCli(args: string[], writer: PairingCliWriter = console) {
  const [command, ...rest] = args;
  const baseDir = resolvePairingBaseDir();

  if (command === "list") {
    const wantsJson = rest.includes("--json");
    const channel = parseChannel(rest.find((value) => !value.startsWith("--")));
    const requests = await listChannelPairingRequests(channel, baseDir);
    writer.log(
      wantsJson
        ? JSON.stringify({ channel, requests }, null, 2)
        : renderPairingRequests({ channel, requests }),
    );
    return;
  }

  if (command === "approve") {
    const [channelArg, code] = rest;
    const channel = parseChannel(channelArg);
    if (!code?.trim()) {
      throw new Error("Usage: pairing approve <channel> <code>");
    }

    const approved = await approveChannelPairingCode({
      channel,
      code,
      baseDir,
    });
    if (!approved) {
      throw new Error(`No pending pairing request found for code: ${code}`);
    }
    writer.log(`Approved ${channel} sender ${approved.id}.`);
    return;
  }

  if (command === "reject") {
    const [channelArg, code] = rest;
    const channel = parseChannel(channelArg);
    if (!code?.trim()) {
      throw new Error("Usage: pairing reject <channel> <code>");
    }

    const rejected = await rejectChannelPairingCode({
      channel,
      code,
      baseDir,
    });
    if (!rejected) {
      throw new Error(`No pending pairing request found for code: ${code}`);
    }
    writer.log(`Rejected ${channel} sender ${rejected.id}.`);
    return;
  }

  if (command === "clear") {
    const [channelArg] = rest;
    const channel = parseChannel(channelArg);
    const result = await clearChannelPairingRequests({
      channel,
      baseDir,
    });
    writer.log(`Cleared ${result.cleared} pending ${channel} pairing request(s).`);
    return;
  }

  throw new Error(
    "Usage: pairing list <channel> [--json] | pairing approve <channel> <code> | pairing reject <channel> <code> | pairing clear <channel>",
  );
}
