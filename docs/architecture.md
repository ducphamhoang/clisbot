# clisbot Architecture

This document provides a high-level overview of the `clisbot` architecture, consolidating the core principles and component responsibilities that govern the system.

## System Overview

`clisbot` is designed as a modular system split into six explicit product systems. This separation ensures that backend quirks don't leak into product logic, operator workflows stay distinct from user-facing channels, and the system remains easy to refactor and extend.

### Top-Level Diagram

```text
                                 clisbot

    Humans / clients                           Operators
           |                                      |
           v                                      v
+----------------------+              +----------------------+
|      CHANNELS        |              |       CONTROL        |
|----------------------|              |----------------------|
| Slack                |              | start / stop         |
| Telegram             |              | status / logs        |
| future API / Discord |              | channels / agents    |
|                      |              | pairing / debug      |
|                      |              | gated actions        |
| owns:                |              | owns:                |
| - inbound messages   |              | - inspect            |
| - thread / reply UX  |              | - intervene          |
| - chat-first render  |              | - operator views     |
| - transcript command |              | - operator intervention |
+----------+-----------+              +----------+-----------+
           |                                     |
           +------------------+------------------+
                              |
                              v
                    +----------------------+
                    |    CONFIGURATION     |
                    |----------------------|
                    | clisbot.json         |
                    | env vars             |
                    | route mapping        |
                    | agent defs           |
                    | policy storage       |
                    | workspace defaults   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |         AUTH         |
                    |----------------------|
                    | roles / permissions  |
                    | owner claim          |
                    | resolution order     |
                    | enforcement contract |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |        AGENTS        |
                    |----------------------|
                    | backend-agnostic     |
                    |                      |
                    | owns:                |
                    | - agent identity     |
                    | - session keys       |
                    | - workspaces         |
                    | - queueing           |
                    | - lifecycle state    |
                    | - follow-up state    |
                    | - memory / tools     |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |       RUNNERS        |
                    |----------------------|
                    | normalize backend    |
                    | quirks into one      |
                    | internal contract    |
                    |                      |
                    | contract:            |
                    | - start / stop       |
                    | - submit input       |
                    | - capture snapshot   |
                    | - stream updates     |
                    | - lifecycle / errors |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |    tmux runner now   |
                    |----------------------|
                    | native CLI in tmux   |
                    | Codex / Claude / ... |
                    | session-id capture   |
                    | resume / relaunch    |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   Durable runtime    |
                    |----------------------|
                    | tmux sessions        |
                    | workspaces           |
                    | CLI processes        |
                    +----------------------+
```

## Component Responsibilities

### 1. Channels
User-facing ingress and egress (e.g., Slack, Telegram).
- **Owns**: Inbound messages, thread/reply UX, chat-first rendering, and transcript commands.
- **Rule**: Channel failures (e.g., failed message edits) must stay surface-local and not terminate the underlying run.

### 2. Auth
Manages roles, permissions, and owner claims.
- **Owns**: Permission semantics and the contract between advisory and enforced behavior.
- **Rule**: Surfaces consume auth decisions for both user and operator checks.

### 3. Control
Operator-facing surface for system management.
- **Owns**: Inspection, intervention, operator views, and manual session control.
- **Rule**: Must not behave like a user-facing conversation channel.

### 4. Configuration
The local control plane wiring the system together.
- **Owns**: `clisbot.json`, environment variables, route mapping, and agent/workspace defaults.

### 5. Agents
The backend-agnostic layer for agent and session logic.
- **Owns**: Agent identity, session keys, workspaces, queueing, and lifecycle state.
- **Rule**: Must not depend on runner-specific terms (like tmux panes).

### 6. Runners
The backend-specific execution layer.
- **Owns**: Normalizing backend quirks (tmux, ACP, SDKs) into a standard contract.
- **Standard Contract**: `start`, `stop`, `submit input`, `capture snapshot`, `stream updates`, and `surface errors`.

## Core Design Principles

1.  **Chat-First Rendering**: Normal channel interaction should stream only meaningful new content and suppress runner chrome. Full transcripts are available only via explicit request.
2.  **Persistence Rule**: Persist only what must survive restarts (config, processed event state, session continuity metadata). Transient runner artifacts (like tmux pane IDs) are not canonical state.
3.  **Run Supervision**: Runner monitoring and run lifecycle are transport-independent. Channel failures should not cause run failure.
4.  **Backend Agnosticism**: The `agents` layer remains unaware of whether it's running via tmux, ACP, or an SDK.

## Data Flow

```text
user message
  -> channel
  -> configuration resolves route + persisted policy inputs
  -> auth resolves effective permissions
  -> agents resolves agent + session key
  -> runner executes native CLI
  -> channel renders clean chat-first output
```
