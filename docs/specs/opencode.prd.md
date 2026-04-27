# PRD: OpenCode CLI Integration

## Overview
OpenCode is a frontier AI agent CLI that provides a Terminal User Interface (TUI) by default but also supports a robust non-interactive CLI mode and a headless server mode. This PRD defines the integration of OpenCode as a new supported bot in `clisbot`.

## Research Findings: OpenCode CLI Capabilities

- **Primary Command**: `opencode`
- **Non-Interactive Mode**: `opencode run "prompt"`
- **Session Management**:
    - Continue last session: `--continue` or `-c`
    - Specific session: `--session <id>` or `-s <id>`
    - Fork session: `--fork`
- **Agent Selection**: `--agent <name>`
- **Model Selection**: `--model <provider/model>` or `-m <provider/model>`
- **Headless Mode**: `opencode serve` starts a headless server for API access.
- **ACP Support**: `opencode acp` starts an Agent Client Protocol server (useful for future integration).
- **Session IDs**: OpenCode uses UUID-style session IDs, which can be listed via `opencode session list`.

## Integration Strategy

OpenCode will be integrated into the `clisbot` tmux runner system, similar to `codex`, `claude`, and `gemini`.

### 1. Update Supported Tools
Add `opencode` to `SUPPORTED_AGENT_CLI_TOOLS` in `src/config/agent-tool-presets.ts`.

### 2. Define `AgentToolTemplate`
The template for OpenCode will focus on non-interactive execution and session resumption.

```typescript
opencode: {
  command: "opencode",
  startupOptions: ["run", "--dangerously-skip-permissions"],
  trustWorkspace: true,
  startupDelayMs: 3000,
  startupRetryCount: 2,
  startupRetryDelayMs: 1000,
  promptSubmitDelayMs: 150,
  sessionId: {
    create: {
      mode: "runner", // OpenCode creates session IDs on run
      args: [],
    },
    capture: {
      mode: "status-command",
      statusCommand: "session list -n 1 --format json", // Example: capture latest session ID
      pattern: "\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b",
      timeoutMs: 5000,
      pollIntervalMs: 250,
    },
    resume: {
      mode: "command",
      args: [
        "run",
        "--session",
        "{sessionId}",
        "--dangerously-skip-permissions",
      ],
    },
  },
}
```

*Note: Since OpenCode's `run` command is often used for one-off prompts, we need to ensure the tmux runner keeps the session alive or uses `serve` / `attach` if a long-running interactive-like experience is desired.*

### 3. Workspace Bootstrap
Add `OPENCODE.md` to the workspace bootstrap templates in `src/agents/bootstrap.ts`.

## Requirements

### Functional Requirements
- Users should be able to start `clisbot` with `--cli opencode`.
- `clisbot` should correctly capture OpenCode session IDs for persistence.
- Session resumption should work correctly using the `--session` flag.
- Default bootstrap files (`OPENCODE.md`, `IDENTITY.md`) should be created in the workspace.

### Non-Functional Requirements
- **Stability**: The tmux runner must handle OpenCode's output correctly, especially if it uses ANSI escapes or complex formatting.
- **Performance**: Startup delay should be minimized while ensuring the tool is ready.

## Future Considerations
- **ACP Integration**: Explore using `opencode acp` for more structured communication instead of tmux pane capture.
- **Server/Attach Mode**: Use `opencode serve` and `opencode run --attach` to avoid cold boot times.
