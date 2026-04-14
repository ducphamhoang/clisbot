# Authorization And Roles

## Purpose

Use this page as the operator quickstart for the planned auth model.

It explains:

- how first owner claim works
- how app roles and agent roles are meant to work
- how to add or remove access
- what denied access should look like
- how to debug "why was I denied?"

This is the target operator workflow for the auth slice.

For the product and implementation contract, see:

- [App And Agent Authorization And Owner Claim](../features/auth/app-and-agent-authorization-and-owner-claim.md)

## Status

Planned

## Target Model

The new model has one permission source:

- `app.auth`
- `agents.<id>.auth`

The old route-local `privilegeCommands` model is not part of the target design.

The mental model is:

- admission decides whether a person reaches the bot at all
- auth decides what they may do once they are there

## Core Rules

### 1. App Roles

App roles decide who may control the app itself.

Recommended app roles:

- `owner`
- `admin`
- `member`

Phase-1 meaning:

- `owner` has full app control
- `admin` has delegated app control
- `member` is a neutral fallback with no app-level privileges by default

Typical app-level actions:

- manage config
- manage routes
- manage agents
- manage accounts
- manage auth roles
- manage pairing
- manage prompt templates
- manage app-wide loops

### 2. Agent Roles

Agent roles decide what a user may do after they have already reached a routed agent surface.

Recommended agent roles:

- `admin`
- `supervisor`
- `member`

Phase-1 default:

- users not listed explicitly still fall back to `member`

### 3. App Admin Implicit Agent Rights

Phase 1 should treat both:

- app `owner`
- app `admin`

as implicitly allowed for every agent-level permission.

Practical effect:

- app owners and app admins do not need to be duplicated into every agent's `admin.users`
- agent roles are still useful for people who only manage one agent, not the whole app

### 4. Admission Vs Authorization

These are separate checks.

Admission answers:

- can this person reach the bot at all
- are they paired
- is this DM, channel, group, or topic routed

Authorization answers:

- once they reached the bot, what may they do now

That split matters because a user may be allowed to chat as a normal member without being allowed to inspect transcripts or run shell commands.

## First Owner Claim

The first-owner flow is designed to keep fresh installs easy without leaving them permanently claimable.

Rule:

- if `app.auth.roles.owner.users` is empty when the runtime starts, owner claim opens for `ownerClaimWindowMinutes`
- the first successful DM user during that window becomes the first owner
- once an owner exists, claim closes immediately
- restarting the runtime does not reopen claim while an owner still exists
- if every owner is removed later, the next runtime start opens claim again

Operator expectation:

- use a direct message for the first claim
- do not rely on a group, topic, or shared channel for owner claim

## Minimal Config Examples

### 1. Solo Operator

Use this when one person owns the app and no one else should manage config or privileged actions.

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

### 2. Shared Team Agent

Use this when one or two operators manage the whole app, a few people supervise one agent, and most paired users only chat as members.

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
            "users": ["slack:UAGENTADMIN1"]
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
            "users": ["slack:USUP1", "slack:USUP2"]
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

## Planned CLI Workflow

The planned auth CLI should be easy to read and hard to misuse.

Examples:

```bash
clisbot auth add-user app --role owner --user telegram:1276408333
clisbot auth remove-user app --role admin --user telegram:1276408333
clisbot auth add-user agent --agent default --role supervisor --user slack:U123
clisbot auth remove-user agent --agent default --role admin --user slack:U123
```

Expected intent:

- `app` manages app-level roles
- `agent` manages one agent's roles
- users are selected directly as `platform:userId`

This CLI does not exist yet.

Until it exists, treat these commands as the target operator UX, not current shipped behavior.

## Permission Matrix

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

Suggested defaults:

- app `owner`: all app permissions
- app `admin`: all normal app-management permissions
- app `member`: none by default
- agent `admin`: all agent permissions
- agent `supervisor`: read and observe oriented permissions
- agent `member`: low-friction collaboration permissions, but not transcript, observe, shell, or advanced mode mutation

## Denied Access Contract

Denied access should feel consistent across slash commands and prompt refusals.

Convention:

- line 1 states the denied action in plain language
- line 2 states the current role and required permission or role
- line 3 gives the next step when one exists
- no raw config keys
- no `privilegeCommands` wording

### Routed Action Pattern

```text
You are not allowed to <action phrase> for this agent.
Current role: <role>. Required permission: <permission>.
Ask an app owner, app admin, or agent admin if this access should be granted.
```

### Prompt Refusal Pattern

```text
I can't do that because your current role is not allowed to change clisbot config or auth.
I can still explain the change, draft the command, or suggest what an owner or admin should run.
```

### Examples

Member calling `/bash`:

```text
You are not allowed to run shell commands for this agent.
Current role: member. Required permission: shellExecute.
Ask an app owner, app admin, or agent admin if this access should be granted.
```

Member calling `/streaming on`:

```text
You are not allowed to change streaming mode for this agent.
Current role: member. Required permission: streamingManage.
Ask an app owner, app admin, or agent admin if this access should be granted.
```

Prompt request to edit config:

```text
I can't do that because your current role is not allowed to change clisbot config or auth.
I can still explain the change, draft the command, or suggest what an owner or admin should run.
```

## Why Was I Denied?

Use this quick debug flow:

1. Confirm the user actually reached the bot.
2. Confirm whether this is an app-level action or an agent-level action.
3. Resolve the app role.
4. Resolve the agent role.
5. If the user is app `owner` or app `admin`, treat agent permission as implicitly allowed.
6. Otherwise, check whether the resolved agent role includes the required permission.
7. If the request is a config or auth mutation request through prompt text, apply the protected prompt rule as well.

Typical outcomes:

- not admitted yet:
  pairing or routing issue
- admitted but denied:
  auth role issue
- admitted and role should allow:
  implementation bug or wrong permission mapping

## Prompt Safety

The auth model is not only for CLI and slash commands.

It also affects the injected prompt.

Target rule:

- the runtime passes current app role, current agent role, and mutation permissions into a protected prompt segment
- operator-editable prompt templates may change general wording, but should not be able to remove or weaken these auth facts
- when the user lacks permission, the agent should refuse requests to edit `clisbot.json`, change auth roles, or run config-mutating `clisbot` commands

This prompt guidance is advisory in phase 1.

Hard runtime enforcement should come first from routed slash-command gating, and later from control-layer CLI auth checks.

## Unsupported Old Config

The new auth model should not keep a second route-local permission system.

Operator rule:

- do not use `privilegeCommands` in new configs
- manage privileged access through `app.auth` and `agents.<id>.auth`

## Phase Roadmap

### Phase 1

- `app.auth` and `agents.<id>.auth`
- owner claim
- protected auth prompt segment
- routed slash-command gating
- shared denial convention

### Phase 2

- `clisbot auth ...` operator CLI
- real operator guide and troubleshooting against the shipped runtime
- optional admin or advanced slash-help split

### Later

- control CLI enforcement for config mutation
- runner-side blocking for unauthorized mutation commands if needed

## Operator Checklist

When this slice ships, a clean rollout should look like this:

1. Start the runtime with no existing owner.
2. Claim the first owner from a DM during the claim window.
3. Add any extra app admins.
4. Add any agent admins or supervisors if needed.
5. Confirm unlisted routed users still fall back to agent `member`.
6. Confirm transcript, observe, shell, and streaming denials on non-privileged users.
7. Confirm prompt refusal for config or auth mutation requests from non-owners and non-admins.

## Related Pages

- [User Guide](README.md)
- [Channel Operations](channels.md)
- [App And Agent Authorization And Owner Claim](../features/auth/app-and-agent-authorization-and-owner-claim.md)
- [App And Agent Authorization And Owner Claim Task](../tasks/features/auth/2026-04-14-app-and-agent-authorization-and-owner-claim.md)
