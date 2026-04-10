import { chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";
import { fileExists, readTextFile, writeTextFile } from "../shared/fs.ts";
import { APP_HOME_DIR, ensureDir, expandHomePath } from "../shared/paths.ts";

export const DEFAULT_CLISBOT_BIN_DIR = join(APP_HOME_DIR, "bin");
export const DEFAULT_CLISBOT_WRAPPER_PATH = join(DEFAULT_CLISBOT_BIN_DIR, "clisbot");

function shellQuote(value: string) {
  if (/^[a-zA-Z0-9_./:@=-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function getClisbotMainScriptPath() {
  return fileURLToPath(new URL("../main.ts", import.meta.url));
}

function isPackagedRuntime() {
  const currentModulePath = fileURLToPath(import.meta.url);
  return currentModulePath.includes(`${sep}dist${sep}`);
}

export function getClisbotWrapperPath() {
  return expandHomePath(process.env.CLISBOT_WRAPPER_PATH || DEFAULT_CLISBOT_WRAPPER_PATH);
}

export function getClisbotPromptCommand() {
  if (process.env.CLISBOT_PROMPT_COMMAND?.trim()) {
    return process.env.CLISBOT_PROMPT_COMMAND.trim();
  }

  return isPackagedRuntime() ? "clis" : getClisbotWrapperPath();
}

export function getClisbotWrapperDir() {
  return dirname(getClisbotWrapperPath());
}

export function renderClisbotWrapperScript() {
  const execPath = process.execPath;
  const mainScriptPath = getClisbotMainScriptPath();

  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `exec ${shellQuote(execPath)} ${shellQuote(mainScriptPath)} "$@"`,
    "",
  ].join("\n");
}

export async function ensureClisbotWrapper() {
  const wrapperPath = getClisbotWrapperPath();
  const wrapperDir = dirname(wrapperPath);
  await ensureDir(wrapperDir);

  const nextScript = renderClisbotWrapperScript();
  const existing = await fileExists(wrapperPath) ? await readTextFile(wrapperPath) : null;
  if (existing !== nextScript) {
    await writeTextFile(wrapperPath, nextScript);
  }

  await chmod(wrapperPath, 0o755);
  return wrapperPath;
}
