import type { PairingChannel, PairingRequest } from "./store.ts";

export function buildPairingReply(params: {
  channel: PairingChannel;
  idLine: string;
  code: string;
}) {
  return [
    "clisbot: access not configured.",
    "",
    params.idLine,
    "",
    `Pairing code: ${params.code}`,
    "",
    "Ask the bot owner to approve with:",
    `clisbot pairing approve ${params.channel} ${params.code}`,
  ].join("\n");
}

export function buildPairingQueueFullReply(params: {
  channel: PairingChannel;
  idLine: string;
}) {
  return [
    "clisbot: access not configured.",
    "",
    params.idLine,
    "",
    "Pairing queue is full right now.",
    "",
    "Ask the bot owner to inspect or clear pending requests with:",
    `clisbot pairing list ${params.channel}`,
    `clisbot pairing reject ${params.channel} <code>`,
    `clisbot pairing clear ${params.channel}`,
  ].join("\n");
}

export function buildPairingReplyFromRequest(params: {
  channel: PairingChannel;
  idLine: string;
  pairingRequest: {
    code: string;
    created: boolean;
  };
}) {
  const code = params.pairingRequest.code.trim();
  if (!code) {
    return buildPairingQueueFullReply({
      channel: params.channel,
      idLine: params.idLine,
    });
  }

  return buildPairingReply({
    channel: params.channel,
    idLine: params.idLine,
    code,
  });
}

export function renderPairingRequests(params: {
  channel: PairingChannel;
  requests: PairingRequest[];
}) {
  if (!params.requests.length) {
    return `No pending ${params.channel} pairing requests.`;
  }

  return [
    `Pending ${params.channel} pairing requests:`,
    ...params.requests.map((request) => {
      const meta = request.meta ? ` meta=${JSON.stringify(request.meta)}` : "";
      return `- code=${request.code} id=${request.id}${meta} requestedAt=${request.createdAt}`;
    }),
  ].join("\n");
}
