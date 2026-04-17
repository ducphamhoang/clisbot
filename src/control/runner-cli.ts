import { CliCommandError } from "./runtime-cli-shared.ts";

const SMOKE_BACKENDS = ["codex", "claude", "gemini", "all"] as const;
const SMOKE_SCENARIOS = [
  "startup_ready",
  "first_prompt_roundtrip",
  "session_id_roundtrip",
  "interrupt_during_run",
  "recover_after_runner_loss",
] as const;
const SMOKE_SUITES = ["launch-trio"] as const;

type SmokeBackend = (typeof SMOKE_BACKENDS)[number];
type SmokeScenario = (typeof SMOKE_SCENARIOS)[number];
type SmokeSuite = (typeof SMOKE_SUITES)[number];

type SmokeCommandOptions = {
  backend: SmokeBackend;
  scenario?: SmokeScenario;
  suite?: SmokeSuite;
  workspace?: string;
  agent?: string;
  artifactDir?: string;
  timeoutMs?: number;
  keepSession: boolean;
  json: boolean;
};

function parseRepeatedOption(args: string[], name: string) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) {
      continue;
    }

    const value = args[index + 1]?.trim();
    if (!value) {
      throw new CliCommandError(`Missing value for ${name}`, 2);
    }
    values.push(value);
  }

  return values;
}

function parseSingleOption(args: string[], name: string) {
  const values = parseRepeatedOption(args, name);
  if (values.length === 0) {
    return undefined;
  }
  return values[values.length - 1];
}

function hasFlag(args: string[], name: string) {
  return args.includes(name);
}

function isOneOf<T extends readonly string[]>(value: string, allowed: T): value is T[number] {
  return allowed.includes(value);
}

function parseTimeoutMs(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliCommandError("Invalid value for --timeout-ms", 2);
  }
  return parsed;
}

export function renderRunnerHelp() {
  return [
    "clisbot runner",
    "",
    "Usage:",
    "  clisbot runner",
    "  clisbot runner --help",
    "  clisbot runner smoke --backend <codex|claude|gemini> --scenario <name> [--workspace <path>] [--agent <id>] [--artifact-dir <path>] [--timeout-ms <n>] [--keep-session] [--json]",
    "  clisbot runner smoke --backend all --suite launch-trio [--workspace <path>] [--agent <id>] [--artifact-dir <path>] [--timeout-ms <n>] [--keep-session] [--json]",
    "",
    "Smoke scenarios:",
    "  - startup_ready",
    "  - first_prompt_roundtrip",
    "  - session_id_roundtrip",
    "  - interrupt_during_run",
    "  - recover_after_runner_loss",
    "",
    "Smoke suites:",
    "  - launch-trio",
    "",
    "Current status:",
    "  - the `runner` CLI surface now validates the smoke command contract",
    "  - real smoke execution is the next implementation batch",
  ].join("\n");
}

function parseSmokeCommand(args: string[]): SmokeCommandOptions {
  const backend = parseSingleOption(args, "--backend");
  if (!backend) {
    throw new CliCommandError(
      "Usage: clisbot runner smoke --backend <codex|claude|gemini> --scenario <name> [--json]\n       clisbot runner smoke --backend all --suite launch-trio [--json]",
      2,
    );
  }
  if (!isOneOf(backend, SMOKE_BACKENDS)) {
    throw new CliCommandError(`Unsupported --backend value: ${backend}`, 2);
  }

  const rawScenario = parseSingleOption(args, "--scenario");
  const rawSuite = parseSingleOption(args, "--suite");
  if (rawScenario && rawSuite) {
    throw new CliCommandError("--scenario and --suite are mutually exclusive", 2);
  }

  if (rawScenario && !isOneOf(rawScenario, SMOKE_SCENARIOS)) {
    throw new CliCommandError(`Unsupported --scenario value: ${rawScenario}`, 2);
  }

  if (rawSuite && !isOneOf(rawSuite, SMOKE_SUITES)) {
    throw new CliCommandError(`Unsupported --suite value: ${rawSuite}`, 2);
  }

  const scenario = rawScenario as SmokeScenario | undefined;
  const suite = rawSuite as SmokeSuite | undefined;

  if (backend === "all") {
    if (scenario) {
      throw new CliCommandError("--backend all is only valid with --suite", 2);
    }
    if (!suite) {
      throw new CliCommandError("--backend all requires --suite launch-trio", 2);
    }
  } else {
    if (suite) {
      throw new CliCommandError(`--suite is only valid with --backend all`, 2);
    }
    if (!scenario) {
      throw new CliCommandError(`--backend ${backend} requires --scenario`, 2);
    }
  }

  return {
    backend,
    scenario,
    suite,
    workspace: parseSingleOption(args, "--workspace"),
    agent: parseSingleOption(args, "--agent"),
    artifactDir: parseSingleOption(args, "--artifact-dir"),
    timeoutMs: parseTimeoutMs(parseSingleOption(args, "--timeout-ms")),
    keepSession: hasFlag(args, "--keep-session"),
    json: hasFlag(args, "--json"),
  };
}

function renderSmokeNotImplementedResult(options: SmokeCommandOptions) {
  return {
    kind: "runner-smoke-framework-error",
    version: "v0",
    ok: false,
    backendId: options.backend,
    scenario: options.scenario ?? null,
    suite: options.suite ?? null,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "clisbot runner smoke is not implemented yet. The command surface and contract validation are ready; the real execution batch is next.",
    },
    options: {
      workspace: options.workspace ?? null,
      agent: options.agent ?? null,
      artifactDir: options.artifactDir ?? null,
      timeoutMs: options.timeoutMs ?? null,
      keepSession: options.keepSession,
      json: options.json,
    },
  };
}

async function runSmokeCli(args: string[]) {
  if (args.length === 0 || hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log(renderRunnerHelp());
    return;
  }

  const options = parseSmokeCommand(args);
  const result = renderSmokeNotImplementedResult(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      [
        "clisbot runner smoke",
        "",
        `backend: ${options.backend}`,
        options.scenario ? `scenario: ${options.scenario}` : `suite: ${options.suite}`,
        "status: not implemented yet",
        "note: the smoke contract is validated, but real CLI execution is the next batch",
      ].join("\n"),
    );
  }
  process.exitCode = 3;
}

export async function runRunnerCli(args: string[]) {
  const subcommand = args[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    console.log(renderRunnerHelp());
    return;
  }

  if (subcommand === "smoke") {
    await runSmokeCli(args.slice(1));
    return;
  }

  throw new CliCommandError(renderRunnerHelp(), 2);
}
