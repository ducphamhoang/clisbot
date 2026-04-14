# App And Agent Authorization And Owner Claim

## Summary

`clisbot` should introduce one explicit authorization model for app-level control and agent-level runtime actions, plus a low-friction first-owner claim flow for fresh installs.

The model should:

- keep app-level control separate from agent-level behavior
- keep channel admission separate from action authorization
- replace route-local `privilegeCommands` policy with explicit auth roles and permissions
- let normal paired or routed users continue to interact as default `member`s

## Status

Planned

## Why

The current config can say whether a route is enabled and whether `/bash` is allowed, but it does not yet model:

- who owns the app
- who may mutate `clisbot` config and control surfaces
- who may control one agent but only observe another
- how a fresh install safely claims its first owner without manual JSON edits

Without that, several behaviors remain blurry:

- prompt guidance can warn the agent, but not explain the real permission model clearly
- channel slash commands can only partially distinguish safe actions from privileged ones
- future CLI enforcement has no canonical policy source to read from

## Core Model

`app.auth` and `agents.<id>.auth` should share one grammar:

- `defaultRole`
- `roles.<role>.allow`
- `roles.<role>.users`

User selectors stay simple for phase 1:

- `telegram:<userId>`
- `slack:<userId>`

This slice does not need a separate identity registry yet.

## Ownership Split

- auth owns the permission model, role semantics, owner claim, and enforcement contract
- configuration owns the persisted shape that stores `app.auth` and `agents.<id>.auth`
- control, channels, and agents consume auth decisions rather than owning the model itself

## Runtime Command Inventories

For auth design, command inventories should stay separate from auth semantics:

- `docs/user-guide/slash-commands.md` is the runtime inventory for chat-surface commands
- `docs/user-guide/cli-commands.md` is the runtime inventory for operator CLI commands

Those pages answer "what commands exist today".

This feature doc answers:

- which permission gates each class of action
- which layer enforces it
- which roles should own it

## Product Rules

- `app.auth` owns app-wide control permissions
- `agents.<id>.auth` owns permissions for routed agent actions
- channel pairing, DM allowlists, and route presence still answer whether a user reaches the bot at all
- after a user reaches a routed agent surface, agent auth decides what that user may do there
- `app.auth.defaultRole` may still exist for grammar consistency, but in phase 1 it should be treated as a neutral fallback with no app-level privileges unless a deployment explicitly grants some
- a user not explicitly listed in an agent role resolves to `defaultRole`
- the phase-1 default should be `member`
- `owner` is the only role that may claim the app during the fresh-owner window
- if `app.auth.roles.owner.users` is non-empty, owner claim is closed no matter how many times the runtime restarts
- app `owner` should be treated as allowed for all app-level permissions even when a separate app `admin` list exists
- app `admin` should also be treated as allowed for all app-level permissions that its role grants
- phase 1 should also treat app `owner` and app `admin` as implicitly allowed for every agent-level permission unless a later slice introduces an explicit opt-out
- app owners and app admins should not need to be duplicated into every `agents.<id>.auth.roles.admin.users` list

## Config Shape

Example:

```json
{
  "app": {
    "auth": {
      "ownerClaimWindowMinutes": 30,
      "defaultRole": "member",
      "roles": {
        "owner": {
          "allow": [
            "configManage",
            "runtimeManage",
            "routesManage",
            "agentsManage",
            "accountsManage",
            "appAuthManage",
            "agentAuthManage",
            "promptTemplatesManage",
            "pairingManage",
            "loopsGlobalManage"
          ],
          "users": ["telegram:1276408333"]
        },
        "admin": {
          "allow": [
            "configManage",
            "runtimeManage",
            "routesManage",
            "agentsManage",
            "accountsManage",
            "appAuthManage",
            "agentAuthManage",
            "promptTemplatesManage",
            "pairingManage",
            "loopsGlobalManage"
          ],
          "users": ["slack:UADMIN1"]
        },
        "member": {
          "allow": [],
          "users": []
        }
      }
    }
  },
  "agents": {
    "default": {
      "auth": {
        "defaultRole": "member",
        "roles": {
          "admin": {
            "allow": [
              "chat",
              "helpView",
              "statusView",
              "identityView",
              "transcriptView",
              "runObserve",
              "runInterrupt",
              "runNudge",
              "shellExecute",
              "followupManage",
              "streamingManage",
              "responseModeManage",
              "additionalMessageModeManage",
              "steeringSend",
              "queueAdd",
              "queueView",
              "queueClear",
              "loopCreate",
              "loopView",
              "loopCancel"
            ],
            "users": []
          },
          "supervisor": {
            "allow": [
              "chat",
              "helpView",
              "statusView",
              "identityView",
              "transcriptView",
              "runObserve",
              "queueView",
              "loopView"
            ],
            "users": []
          },
          "member": {
            "allow": [
              "chat",
              "helpView",
              "statusView",
              "identityView",
              "runInterrupt",
              "runNudge",
              "followupManage",
              "steeringSend",
              "queueAdd",
              "queueView",
              "queueClear",
              "loopCreate",
              "loopView",
              "loopCancel"
            ],
            "users": []
          }
        }
      }
    }
  }
}
```

## Permission Naming

Permission names should follow `verb + noun` or a compact action noun when the action already reads clearly.

Recommended app-level permissions:

- `configManage`
- `runtimeManage`
- `routesManage`
- `agentsManage`
- `accountsManage`
- `appAuthManage`
- `agentAuthManage`
- `promptTemplatesManage`
- `pairingManage`
- `loopsGlobalManage`

Recommended agent-level permissions:

- `chat`
- `helpView`
- `statusView`
- `identityView`
- `transcriptView`
- `runObserve`
- `runInterrupt`
- `runNudge`
- `shellExecute`
- `followupManage`
- `streamingManage`
- `responseModeManage`
- `additionalMessageModeManage`
- `steeringSend`
- `queueAdd`
- `queueView`
- `queueClear`
- `loopCreate`
- `loopView`
- `loopCancel`

Naming notes:

- prefer `runInterrupt` over `stop` because it describes the real semantics and stays parallel with `runObserve` and `runNudge`
- prefer `transcriptView` over `transcript` because it marks the action as read-oriented
- prefer `shellExecute` over `bash` because the permission is about shell execution, not one slash command label
- prefer split queue and loop permissions over one large `queueManage` or `loopManage` bucket so member defaults can stay useful without becoming too broad
- keep `member` permissive enough for normal collaboration after pairing or route admission succeeds
- app-level `member` is a neutral role in phase 1; it exists mainly so app and agent auth share one grammar

## Owner Claim Rule

The source of truth is:

- `app.auth.roles.owner.users`

Behavior:

- if that list is empty when the runtime starts, a claim window opens for `ownerClaimWindowMinutes`
- the first successful DM user during that window is auto-approved and added to `owner.users`
- once `owner.users` is non-empty, claim closes immediately
- later restarts do not reopen claim while an owner still exists
- if operators later remove every owner manually, the next start opens claim again

This keeps first-run friction low without leaving the install permanently claimable.

## Resolution Order

Phase 1 should resolve permissions in this order:

1. channel admission decides whether the sender reaches the routed surface at all
2. app auth resolves whether the sender is app `owner`, app `admin`, or app `member`
3. agent auth resolves whether the sender is agent `admin`, `supervisor`, or falls back to `defaultRole`
4. app `owner` or app `admin` may satisfy any agent-level permission check implicitly
5. channel slash-command handling enforces the selected routed permissions from agent auth
6. later control CLI enforcement should read from app auth rather than inventing a separate permission source

This keeps admission, membership, and action gating separate.

## Legacy Config Rejection

Once auth becomes the canonical permission model:

- route-local `privilegeCommands` config should be removed entirely
- the config loader should reject any `privilegeCommands` keys as unsupported in the new model
- the error should direct operators to `app.auth` and `agents.<id>.auth`

No compatibility layer is required for phase 1 because the app is still early and the cleaner target is to have one permission model, not two overlapping ones.

## Current Command Mapping

Recommended phase-1 command mapping for current routed slash actions:

- `/help` -> `helpView`
- `/status` -> `statusView`
- `/whoami` -> `identityView`
- `/transcript` -> `transcriptView`
- `/attach`, `/detach`, `/watch ...` -> `runObserve`
- `/stop` -> `runInterrupt`
- `/nudge` -> `runNudge`
- `/followup ...` that mutates mode -> `followupManage`
- `/streaming ...` that mutates mode -> `streamingManage`
- `/responsemode ...` that mutates mode -> `responseModeManage`
- `/additionalmessagemode ...` that mutates mode -> `additionalMessageModeManage`
- `/queue <message>` -> `queueAdd`
- `/steer <message>` -> `steeringSend`
- `/queue-list` -> `queueView`
- `/queue-clear` -> `queueClear`
- `/loop ...` create -> `loopCreate`
- `/loop status` -> `loopView`
- `/loop cancel ...` -> `loopCancel`
- `/bash ...` and bash shortcut prefixes -> `shellExecute`

Read-only status variants may stay available to the same role that may use the corresponding feature, but the implementation should document that choice explicitly.

Recommended app-level control mapping for later enforcement:

- config file mutation -> `configManage`
- runtime start or stop -> `runtimeManage`
- `channels add/remove/...` and route binding edits -> `routesManage`
- `agents bind/unbind/bootstrap/...` -> `agentsManage`
- `accounts add/persist/...` -> `accountsManage`
- app role mutation -> `appAuthManage`
- agent role mutation -> `agentAuthManage`
- prompt template mutation -> `promptTemplatesManage`
- `pairing approve ...` -> `pairingManage`
- global loop CLI actions -> `loopsGlobalManage`

## Operator Workflow Notes

This feature doc is the product and implementation contract, not the end-user guide.

Before this model is considered user-facing complete, the repo should also document:

- how a fresh install claims its first owner
- how operators add or remove users from app roles and agent roles
- what denial message a normal member sees when they try a privileged action
- which permissions are enforced only in prompt guidance during phase 1 and which are enforced by runtime checks

Suggested future operator CLI grammar:

```bash
clisbot auth add-user app --role owner --user telegram:1276408333
clisbot auth remove-user app --role admin --user telegram:1276408333
clisbot auth add-user agent --agent default --role supervisor --user slack:U123
clisbot auth remove-user agent --agent default --role admin --user slack:U123
```

## Outcome By Surface

This feature should change product behavior differently across four surfaces.

### 1. Routed Chat

Normal paired or admitted users should still be able to chat as `member`.

Phase 1 should add clear, role-based denials for privileged routed actions without blocking basic conversation.

### 2. Prompt Safety

The agent should receive truthful auth context on every routed turn so it can refuse unauthorized requests to mutate config, auth, or control state even before full CLI enforcement exists.

### 3. Channel Controls

Selected slash commands should move from mostly route-local gating to role-based runtime checks.

### 4. Later Control CLI

The later CLI enforcement slice should reuse the same auth model rather than rebuilding a second permission system.

## Prompt Contract And Template Interaction

Phase 1 should pass resolved auth information into the injected agent prompt so the model sees:

- current app role
- current agent role
- whether config mutation is allowed
- whether `clisbot` control CLI mutation commands are allowed

Protected prompt contract:

- auth truth should be injected in a system-owned or developer-owned prompt segment, not only inside an operator-editable template body
- prompt-template overrides may change wording around user, steering, or loop messages, but they should not be able to remove or weaken the auth facts
- the injected auth block should say explicitly that when the current user lacks permission, the agent must refuse requests to edit `clisbot.json`, change auth roles, or run config-mutating `clisbot` commands
- this block should be appended after normal prompt-template resolution so template files cannot shadow it by accident
- the block should cover the same core rules for normal user messages, steering messages, and loop-triggered prompts

This is advisory guidance, not final enforcement, but it should still be written as a hard behavioral rule inside the protected prompt layer.

Recommended phase-1 protected block facts:

- `current_user_app_role`
- `current_user_agent_role`
- `allowed_agent_permissions`
- `may_manage_clisbot_config`
- `may_manage_auth_roles`
- `may_run_config_mutating_clisbot_commands`
- `must_refuse_unauthorized_mutation_requests`

Illustrative protected segment shape:

```text
Auth context for the current sender:
- app role: owner | admin | member
- agent role: admin | supervisor | member
- allowed agent permissions: ...
- may manage clisbot config: yes | no
- may manage auth roles: yes | no
- may run config-mutating clisbot commands: yes | no

If permission is missing, refuse requests to edit clisbot.json, mutate auth roles, or run config-mutating clisbot commands.
```

## Denial UX Contract

Phase-1 deny messages should use one shared convention so channel code, operator docs, and prompt refusals stay aligned.

Shared conventions:

- line 1 states the denied action in plain language
- line 2 states the current role and required permission or required role
- line 3 states the next step when one exists
- do not leak raw config paths, internal ids, or obsolete policy keys
- reuse the same action phrase in slash-command denial and prompt refusal where possible

Recommended routed-action pattern:

```text
You are not allowed to <action phrase> for this agent.
Current role: <role>. Required permission: <permission>.
Ask an app owner, app admin, or agent admin if this access should be granted.
```

Recommended prompt-refusal pattern:

```text
I can't do that because your current role is not allowed to change clisbot config or auth.
I can still explain the change, draft the command, or suggest what an owner or admin should run.
```

Representative examples:

- `/bash`
  - `You are not allowed to run shell commands for this agent.`
  - `Current role: member. Required permission: shellExecute.`
- `/streaming on`
  - `You are not allowed to change streaming mode for this agent.`
  - `Current role: member. Required permission: streamingManage.`
- prompt request to edit config
  - `I can't do that because your current role is not allowed to change clisbot config or auth.`

## Phase 1 Gated Actions

Phase 1 should enforce selected agent permissions in channel interaction handling with one explicit mapping table.

Minimum routed gating set:

- basic read surfaces:
  - `/help` -> `helpView`
  - `/status` -> `statusView`
  - `/whoami` -> `identityView`
  - `/transcript` -> `transcriptView`
- active-run observation and control:
  - `/attach`, `/detach`, `/watch ...` -> `runObserve`
  - `/stop` -> `runInterrupt`
  - `/nudge` -> `runNudge`
- runtime mode mutation:
  - `/followup ...` writes -> `followupManage`
  - `/streaming ...` writes -> `streamingManage`
  - `/responsemode ...` writes -> `responseModeManage`
  - `/additionalmessagemode ...` writes -> `additionalMessageModeManage`
- message injection and queueing:
  - `/queue <message>` -> `queueAdd`
  - `/steer <message>` -> `steeringSend`
  - `/queue-list` -> `queueView`
  - `/queue-clear` -> `queueClear`
- loop control:
  - `/loop ...` create -> `loopCreate`
  - `/loop status` -> `loopView`
  - `/loop cancel ...` -> `loopCancel`
- privileged execution:
  - `/bash ...` and shortcut prefixes -> `shellExecute`

Phase-1 non-gated or later-gated areas:

- normal routed chat stays allowed for `member` through `chat`
- direct shell-level blocking of arbitrary mutation commands inside the runner is later work
- control CLI permission checks are later work

This is the first real runtime enforcement layer for routed in-chat behavior.

## Delivery Roadmap

### Phase 1

- ship `app.auth` and `agents.<id>.auth`
- ship owner claim
- ship protected auth prompt segment
- ship routed slash-command gating
- ship deny-message convention

### Phase 2

- ship `clisbot auth ...` operator CLI
- ship operator guide and troubleshooting flow against the real runtime
- polish default slash help and admin or advanced help split if needed

### Later

- enforce auth for config-mutating control CLI actions
- add runner-side blocking for unauthorized mutation commands when needed
- revisit finer-grained per-object semantics only if product pressure appears

## Control CLI Enforcement

Full owner or admin enforcement for config-mutating `clisbot` CLI commands should come later as a dedicated control-layer follow-up.

That later slice should read from the same `app.auth` model instead of inventing a second permission system.

## Regression Risks

Main regression risks to watch during implementation:

- `member` may accidentally gain too much power if agent command mapping drifts from the documented permission table
- owner claim may trigger in the wrong context if DM-only gating is not enforced strictly
- prompt guidance and runtime slash-command enforcement may disagree, which would create misleading denial or approval behavior
- `/bash` may stay accidentally reachable if any `privilegeCommands` branch survives in loading or routing code
- old configs may be misread silently if the loader still accepts `privilegeCommands` in any form
- app `admin` implicit agent rights may be implemented inconsistently if some code paths only special-case `owner`
- prompt-template overrides may accidentally hide or weaken the auth warning if the auth block is not injected from a protected prompt layer

## Exit Criteria

- config can express `app.auth` and `agents.<id>.auth` with one shared grammar
- fresh installs can claim the first owner only while the owner list is empty
- normal routed users still default to `member`
- app `owner` and app `admin` both satisfy agent-level permission checks implicitly
- `privilegeCommands` config is removed rather than renamed
- config loading fails when `privilegeCommands` appears anywhere in the new model
- prompt context can explain auth truthfully
- channel slash commands can enforce the main agent-level permissions
- later CLI enforcement work has one canonical config model to build on
