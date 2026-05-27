# Pitfalls Research — Interactive CLI Wizard

**Domain:** Adding readline wizard to existing Bun/TypeScript daemon-style CLI
**Researched:** 2026-05-27
**Overall confidence:** HIGH (most findings verified against official Bun issue tracker and Node.js docs)

---

## Critical Pitfalls (must prevent)

### 1. Wizard launched inside an existing tmux session steals stdin from the daemon

**What goes wrong:** The operator runs `clisbot setup channels` from inside a tmux pane where `clisbot start` is already running. Both the wizard subprocess and the daemon process share the same PTY. Readline grabs raw mode; daemon's own stdin handler sees garbled or zero bytes. If the daemon is not running, the wizard's raw-mode grab is benign — but if it is running, the result is silent data loss or a hung wizard waiting for input that never arrives.

**Why it happens:** tmux panes each have a single controlling PTY. Any process that sets the terminal to raw mode captures all keystrokes. There is no arbitration. The daemon is a long-running process in the same pane, so it holds a reference to the same fd-0.

**Consequences:** Daemon silently drops messages; wizard blocks on readline.question(); Ctrl+C does not reach the wizard because the daemon intercepts the signal first.

**Prevention:**
- Detect whether the clisbot runtime is running before entering interactive mode: check the PID file (`CLISBOT_PID_PATH`) and refuse to run the wizard if the runtime is up.
- Print a clear error: "clisbot is running. Stop it first with `clisbot stop`, then re-run setup."
- Never spawn the wizard as a subprocess inside a running daemon session. The wizard is a separate command, not a daemon subcommand.

**Detection:** Read `CLISBOT_PID_PATH`; `kill(pid, 0)` to confirm the process is live.

---

### 2. Partial config write leaves system unbootable

**What goes wrong:** The wizard writes token A, then the process is killed (Ctrl+C, power loss, signal) before token B or the agent section is written. The YAML file now exists but is structurally incomplete or syntactically invalid. On next `clisbot start`, config parsing throws and the runtime refuses to start with an unhelpful schema error.

**Why it happens:** `fs.writeFile` is not atomic. The OS may flush the partial buffer. YAML parsers are strict; a half-written key is a parse error.

**Consequences:** Operator cannot start clisbot at all without manually editing or deleting the config file.

**Prevention:**
- Write config to a temp file first (e.g., `config.yaml.tmp.<pid>`), validate it parses correctly, then `fs.rename` to the final path. Rename is atomic on POSIX.
- Use the `atomically` npm package (TypeScript-native, zero dependencies) or implement the write-to-tmp-then-rename pattern directly.
- Keep a backup of the previous valid config (`config.yaml.bak`) before writing, so a failed write can be auto-restored.
- Never overwrite the existing config file in place with partial content.

**Detection:** After wizard exits abnormally, `clisbot start` should detect a missing or parse-invalid config and offer `clisbot setup` as the recovery path, not just a stack trace.

---

### 3. Bun readline.close() leaves stdin unresponsive — process hangs or loses keyboard

**What goes wrong:** The wizard finishes, calls `rl.close()`, and then stdin becomes completely unresponsive. No keyboard input is registered. Ctrl+C does not work. The operator must kill the process externally.

**Why it happens:** Confirmed Bun bug (issue #21189, v1.2.18+). Calling `rl.close()` after a delay corrupts Bun's internal stdin state. The issue is Bun-specific; Node.js handles this correctly. A related older bug (#3604, v0.6.x) also showed readline preventing process exit — fixed by calling `process.stdin.unref()`.

**Consequences:** Wizard appears to complete but the terminal is dead. Operator loses the session.

**Prevention:**
- After `rl.close()`, immediately call `process.stdin.unref()` to allow the event loop to drain.
- Use a single `readline.createInterface` instance for the entire wizard session; never create and close multiple interfaces (segfault risk on Windows, #10844).
- Prefer `@clack/prompts` or a similar high-level library that manages the readline interface lifecycle internally — but see pitfall 4 for its own Bun-version sensitivity.
- Test exit behavior explicitly in CI: spawn the wizard as a child process, send EOF, assert it exits within 2 seconds.

---

### 4. @clack/prompts EPERM regression on specific Bun versions

**What goes wrong:** `@clack/prompts` throws `EPERM: operation not permitted, read - fd: 0` on Bun 1.3.1 and 1.3.2. The wizard appears to start, then immediately crashes before the first prompt renders.

**Why it happens:** A regression in Bun's stdin handling introduced between 1.3.0 and 1.3.2 broke raw-mode reads from fd 0 in interpreted (non-compiled) scripts. Compiled binaries are unaffected.

**Consequences:** Wizard is completely non-functional on affected Bun versions without a workaround.

**Prevention:**
- Pin a minimum Bun version in `package.json` engines field and check at wizard startup with `Bun.version`.
- If using `@clack/prompts`, add a runtime version guard and print an actionable message if the version is in the broken range.
- Test the wizard against the project's pinned Bun version in CI before shipping.
- Consider `bun build --compile` for the CLI distribution — compiled binaries do not trigger the EPERM regression.

---

### 5. TTY detection false positives suppress wizard in legitimate interactive contexts

**What goes wrong:** The wizard checks `process.stdin.isTTY` to decide whether to show prompts or silently exit. The check returns `false` in SSH sessions without PTY allocation, inside VS Code integrated terminal, when stdout is piped (even if stdin is a tty), and in some CI runners that fake a PTY. The wizard silently exits with no output, and the operator has no idea what happened.

**Why it happens:** `isTTY` only reflects whether that specific file descriptor is connected to a PTY. SSH without `-t`, Docker exec without `-it`, and CI systems like GitHub Actions all set `isTTY = false` on at least one of stdin/stdout/stderr, even when a human is present.

**Consequences:** Wizard refuses to run for a real operator in a legitimate environment. Conversely, a bad TTY check might allow the wizard to run in a true non-interactive context (cron, CI) and hang waiting for input that never comes.

**Prevention:**
- Check `process.stdin.isTTY` for the go/no-go decision, but emit a clear error message when it is false: "stdin is not a TTY. Run `clisbot setup` from an interactive terminal."
- Do NOT silently exit. A silent no-op is indistinguishable from a bug.
- For tmux specifically: tmux panes always have a PTY; `isTTY` is `true` inside them. The tmux case is safe.
- Provide a `--non-interactive` flag that reads config values from environment variables or a seed file, so CI/script usage has a first-class path that never touches readline.

---

## Moderate Pitfalls (address in design)

### 6. Token validation HTTP call blocks the prompt loop with no timeout

**What goes wrong:** The wizard prompts for a Telegram token, then calls the Telegram `getMe` API to validate it. If the network is slow, firewalled, or the token is correct but Telegram's API is degraded, the validation hangs indefinitely. The wizard shows a spinner that never resolves. The operator cannot cancel without kill-9.

**Why it happens:** `fetch()` has no default timeout. Bot API validation is a synchronous await in the wizard step.

**Mitigation:**
- Wrap every outbound validation call in `Promise.race([fetch(...), timeout(8000)])`.
- Show a spinner (e.g., `@clack/prompts` spinner) with a "Validating..." message so the operator knows the system is working.
- On timeout: warn, ask if the operator wants to skip validation and save the token anyway. Never silently save an unvalidated token without informing the operator.
- On validation failure: show the exact API error, not a generic "invalid token."

---

### 7. Resume state file goes stale after manual config edits

**What goes wrong:** The wizard saves a `.wizard-state.json` (or equivalent) tracking which steps completed. The operator then manually edits `config.yaml` to add a channel token. On next run, the wizard reads the state file, believes that step is done, skips it, and starts from an inconsistent midpoint. The final config is a merge of wizard state and manual edits that may conflict.

**Why it happens:** The state file records wizard progress, not config correctness. It has no awareness of out-of-band mutations.

**Mitigation:**
- Include a content hash or mtime of `config.yaml` in the state file. On resume, compare the actual file hash against the stored one. If it differs, invalidate the state and restart from the beginning (or from the appropriate step).
- Prefer detecting what is missing from the live config rather than replaying a stored progress list. "What channels are configured?" is more robust than "which steps did I complete?"
- Make `clisbot setup` idempotent: re-running it on an already-configured system should detect existing values and offer to confirm or replace them, not crash.

---

### 8. Wizard and daemon both read and write the same YAML config without coordination

**What goes wrong:** The operator runs `clisbot setup agent` while the runtime is up (perhaps they stopped the daemon but forgot). The runtime reads config on startup and caches it in memory. The wizard writes a new agent section. The running daemon never sees the update. Worse: if the daemon restarts (crash-recovery), it reads the new config, but the wizard may still be writing it — race condition on the file.

**Why it happens:** No locking on the config file. Both processes treat it as a shared file without coordination.

**Mitigation:**
- The simplest solution: enforce that the wizard only runs when the daemon is stopped (check PID file). Document this constraint explicitly.
- If hot-reload is ever needed, use advisory file locking (`flock`) or a lock file pattern. Do not implement this for the first version — defer to a later milestone.
- After writing config, print "Restart clisbot to apply changes: `clisbot start`" — never auto-start the daemon from within the wizard.

---

### 9. Wizard running inside the tool's own tmux session created by the daemon

**What goes wrong:** `clisbot setup` is invoked inside one of the AI agent tmux sessions that the runner manages (e.g., the operator accidentally types it into the claude tmux pane). The wizard's readline takes over that pane's stdin, corrupting the AI session. Because clisbot monitors that pane's output, it may misinterpret wizard output as agent responses.

**Why it happens:** tmux panes are addressable by name. The operator may attach to a managed pane for debugging and accidentally run a command there.

**Mitigation:**
- Detect whether the current process is running inside a tmux pane whose name matches a known agent session name. Check `$TMUX_PANE` and compare against `tmux list-panes -F "#{pane_id} #{pane_title}"`.
- If detected, refuse to start with: "This looks like a managed agent session. Run setup from your main shell."
- This is a safety heuristic, not a hard block — document that operators should run setup from their login shell, not from inside a managed pane.

---

### 10. CI/test environments see interactive prompts and hang

**What goes wrong:** A test runner spawns the wizard as part of an integration test. The wizard detects TTY (or fails to detect non-TTY), renders a prompt, and waits for input that never arrives. The test times out after 30 seconds and reports a confusing failure.

**Why it happens:** TTY detection is imprecise in test harnesses. Some CI systems allocate a pseudo-TTY for stdout. The wizard has no `--non-interactive` escape hatch.

**Mitigation:**
- All wizard code must accept a `--non-interactive` / `CI=true` flag that either fails fast with an error or reads values from environment variables.
- Honor `CI=true` environment variable (standard convention: GitHub Actions, CircleCI, etc.) — if `CI` is set, refuse to render prompts and exit 1 with a clear message.
- Tests that need to exercise wizard logic should inject mock stdio, not rely on TTY detection.

---

## Test Isolation

### Strategy A: Dependency injection for the prompt interface

Extract all readline/prompt calls behind a `Prompter` interface:

```typescript
interface Prompter {
  ask(question: string): Promise<string>
  confirm(question: string): Promise<boolean>
  select<T>(question: string, choices: { value: T; label: string }[]): Promise<T>
}
```

The real implementation wraps `@clack/prompts`. Tests inject a `MockPrompter` that returns pre-scripted answers. No real stdin required. This is the preferred approach for unit-testing wizard step logic.

### Strategy B: Child process with piped stdio

For integration tests that must exercise the real readline path, spawn the wizard as a child process with `stdio: 'pipe'`. Write simulated keystrokes to the child's stdin pipe. Assert on stdout. Use a short timeout (2-3s) to detect hangs.

```typescript
const child = Bun.spawn(['bun', 'run', 'src/control/setup.ts'], {
  stdin: 'pipe',
  stdout: 'pipe',
  stderr: 'pipe',
})
child.stdin.write('mytoken\n')
const output = await readAll(child.stdout)
assert(output.includes('Token saved'))
```

**Caution:** Bun's piped stdin behavior with readline has known edge cases (issue #13374 on macOS). If the child process hangs, the test must kill it explicitly. Always set a test timeout.

### Strategy C: Environment-variable seeding with --non-interactive flag

For CI integration tests, pass all inputs as env vars and run with `--non-interactive`:

```bash
CLISBOT_SETUP_TELEGRAM_TOKEN=xxx CLISBOT_SETUP_BOT_TYPE=personal \
  bun run src/control/setup.ts --non-interactive
```

This tests the full config-write path without any readline involvement. Validates atomic write, YAML correctness, and config file location resolution.

### Strategy D: Mock the HTTP validation layer

Token validation HTTP calls must be mockable. Inject a `Validator` interface:

```typescript
interface TokenValidator {
  validateTelegram(token: string): Promise<{ ok: boolean; error?: string }>
}
```

Tests inject a mock that returns `{ ok: true }` or `{ ok: false, error: '...' }` without network calls. This decouples wizard step logic from network availability and removes the timeout risk from tests.

### What NOT to do

- Do not use `process.stdin.push()` to inject data into the real stdin — this interacts poorly with Bun's internal stdin state and may corrupt subsequent readline operations in the same process (confirmed by Bun issue patterns).
- Do not use `mock-stdin` npm package without verifying Bun compatibility — it patches Node.js internals that Bun may not fully replicate.
- Do not write tests that depend on exact terminal escape sequences — they break across platforms and TTY emulators.

---

## Phase Recommendations

| Phase | Pitfall(s) to Address | Why That Phase |
|-------|----------------------|----------------|
| Phase 1: Wizard scaffolding | Pitfall 5 (TTY detection), Pitfall 10 (CI guard), Pitfall 4 (Bun version guard) | These are entry-gate checks. If they are wrong, nothing downstream works correctly. Get them right before building any steps. |
| Phase 1: Wizard scaffolding | Pitfall 3 (readline.close() hang) | The interface lifecycle must be established in the scaffold. Switching the readline strategy later is disruptive. Use a single interface instance from day one. |
| Phase 2: Channel setup flow (Flow A) | Pitfall 6 (HTTP timeout), Pitfall 2 (partial config write) | Validation calls and config writes are introduced here. Atomic write pattern and timeout wrapper must be in place before any real token is written. |
| Phase 2: Channel setup flow (Flow A) | Pitfall 1 (daemon stdin conflict) | The daemon PID check is part of the entry guard for the wizard command. Wire it here when the command entry point is built. |
| Phase 3: Agent setup flow (Flow B) | Pitfall 7 (stale resume state), Pitfall 8 (concurrent config writes) | Resume state logic is introduced in Flow B. Hash-based invalidation must be designed alongside the state file, not retrofitted. The daemon lock check reinforces the same entry guard from Phase 2. |
| Phase 3: Agent setup flow (Flow B) | Pitfall 9 (wizard in managed tmux pane) | The tmux pane detection heuristic belongs with the agent-session-adjacent code path. Low cost to add; protects against an easy operator mistake. |
| Phase 4: Test coverage | Pitfall 3, 4, 6, 10 (regression tests) | All identified Bun edge cases need regression test coverage before the milestone is called complete. Use Strategy A (DI) for step logic and Strategy B or C for integration paths. |

---

## Sources

- Bun issue #21189 — readline.close() corrupts stdin: https://github.com/oven-sh/bun/issues/21189
- Bun issue #10844 — crash after ~17 readline interfaces: https://github.com/oven-sh/bun/issues/10844
- Bun issue #3604 — readline prevents process exit: https://github.com/oven-sh/bun/issues/3604
- Bun issue #13374 — piped stdin broken on macOS: https://github.com/oven-sh/bun/issues/13374
- Bun issue #24615 — @clack/prompts EPERM in Bun 1.3.2: https://github.com/oven-sh/bun/issues/24615
- Bun v1.2.22 release notes (TUI pattern fix): https://bun.com/blog/bun-v1.2.22
- Bun v1.0.36 release notes (non-blocking stdin): https://bun.sh/blog/bun-v1.0.36
- Node.js TTY documentation: https://nodejs.org/api/tty.html
- atomically npm package (atomic writes): https://www.npmjs.com/package/atomically
- write-file-atomic npm package: https://www.npmjs.com/package/write-file-atomic
- @clack/prompts npm: https://www.npmjs.com/package/@clack/prompts
- Hermes-agent wizard double-write drift issue: https://github.com/NousResearch/hermes-agent/issues/17534
- Reline stdin/stdout tty mismatch: https://github.com/ruby/reline/issues/537
