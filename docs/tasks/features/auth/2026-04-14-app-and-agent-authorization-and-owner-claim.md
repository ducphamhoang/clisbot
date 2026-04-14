# App And Agent Authorization And Owner Claim

## Summary

Introduce one explicit auth model for app-level control and agent-level runtime behavior, plus a first-owner claim flow for fresh installs, while keeping the initial slice small enough to ship quickly.

## Status

Ready

## Outcome

After this task:

- `clisbot.json` can express `app.auth` and `agents.<id>.auth`
- app ownership can be claimed automatically only while the app has no owner
- routed users who are not explicitly listed still resolve to `member`
- `privilegeCommands` no longer exists as a separate route-local policy shape
- injected agent prompts receive truthful auth context for config mutation guidance
- channel slash-command handling can enforce the main role-mapped agent permissions
- app `owner` and app `admin` both satisfy agent-level permissions implicitly
- full CLI mutation enforcement remains a separate later task

## Why

The current model is too narrow:

- route-local privilege gating is a second blurry permission system
- `privilegeCommands` is not a clean product concept and overlaps with role semantics anyway
- app ownership and agent ownership do not exist as first-class policy
- prompt guidance cannot explain who is actually allowed to mutate `clisbot`
- there is no stable policy source for later CLI permission checks

This task introduces the minimum shared policy model that later slices can reuse.

## Scope

- add `app.auth` to persisted config
- add `agents.<id>.auth` to persisted config
- add `ownerClaimWindowMinutes`
- add `defaultRole`
- add `roles.<role>.allow`
- add `roles.<role>.users`
- remove route-local `privilegeCommands` as a supported permission model
- resolve effective app role and agent role for the current sender
- inject prompt guidance based on resolved app or agent auth
- inject auth guidance through a protected prompt segment that template overrides cannot remove
- gate selected channel slash commands from agent auth
- define the phase-1 command-to-permission mapping for current routed slash actions
- update docs, help text, and tests

## Non-Goals

- hard enforcement for config-mutating `clisbot` CLI commands
- shell-level blocking of `clisbot` mutation commands inside the agent runner
- a separate principal registry
- channel-first admin scopes
- full CLI enforcement for config-mutating `clisbot` commands
- backward-compatible loading of `privilegeCommands` in any form
- writing the full end-user operator guide for role management

## Affected Surfaces

### 1. Prompt Context

Phase 1 should pass auth truth into the injected prompt so the agent sees at least:

- current app role
- current agent role
- whether config mutation is allowed
- whether `clisbot` mutation CLI commands are allowed

This guidance is advisory, but it should be precise enough to reduce accidental config mutation by non-owners.

Implementation rule:

- the auth block should be appended from a protected system-owned or developer-owned prompt layer after normal template resolution
- operator-editable prompt templates may change general wording, but they should not be able to delete or weaken the auth facts
- the block should explicitly instruct the agent to refuse unauthorized requests to edit `clisbot.json`, mutate auth roles, or run config-mutating `clisbot` commands
- the block should exist for normal user messages, steering messages, and loop-triggered prompts
- the block should expose a bounded set of auth facts instead of a large free-form object

### 2. Channel Slash Commands

Phase 1 should enforce agent permissions in `src/channels/interaction-processing.ts` for the main routed control actions with one explicit mapping table.

Minimum phase-1 gating set:

- `/help` -> `helpView`
- `/status` -> `statusView`
- `/whoami` -> `identityView`
- `/transcript` -> `transcriptView`
- `/attach`, `/detach`, `/watch ...` -> `runObserve`
- `/stop` -> `runInterrupt`
- `/nudge` -> `runNudge`
- `/followup ...` writes -> `followupManage`
- `/streaming ...` writes -> `streamingManage`
- `/responsemode ...` writes -> `responseModeManage`
- `/additionalmessagemode ...` writes -> `additionalMessageModeManage`
- `/queue <message>` -> `queueAdd`
- `/steer <message>` -> `steeringSend`
- `/queue-list` -> `queueView`
- `/queue-clear` -> `queueClear`
- `/loop ...` create -> `loopCreate`
- `/loop status` -> `loopView`
- `/loop cancel ...` -> `loopCancel`
- `/bash ...` and shortcut prefixes -> `shellExecute`

Normal routed chat should remain allowed for `member` through `chat`.

### 3. Later Control CLI Enforcement

App-level owner or admin checks for config-mutating `clisbot` CLI commands should stay out of this slice and move to a later control-owned task.

## Product Rules

- `app.auth.roles.owner.users` is the canonical owner source of truth
- if the owner list is empty at runtime start, claim stays open for `ownerClaimWindowMinutes`
- the first successful DM user during that window is added to `owner.users`
- once an owner exists, later restarts do not reopen claim
- if operators remove every owner later, the next start opens claim again
- a user not listed in an agent role resolves to `agents.<id>.auth.defaultRole`
- phase 1 should use `member` as the normal default role
- pairing or route admission still decides whether the user reaches the bot at all
- agent auth only decides what the user may do after that
- app `owner` should satisfy every app-level permission
- app `admin` should satisfy every app-level permission that its role grants
- phase 1 should also treat app `owner` and app `admin` as implicitly allowed for every agent-level permission
- `privilegeCommands` should stop being a supported config concept rather than being renamed or normalized

## Implementation Notes

- `src/config/schema.ts` owns the new persisted shape
- `src/config/template.ts` should seed the new auth blocks
- startup and DM-pairing flow should own the owner-claim behavior
- one shared auth resolver should map sender identity to app role and agent role
- `src/channels/agent-prompt.ts` should render auth context into the prompt
- `src/channels/interaction-processing.ts` should enforce the selected agent permissions
- the implementation should keep one explicit mapping table between current slash commands and the new permission names
- config loading should reject any `privilegeCommands` keys as unsupported and point operators to `app.auth` and `agents.<id>.auth`
- `/bash` should become a normal `shellExecute` permission check instead of a separate route-local gate
- prompt rendering should inject auth facts after template resolution so editable templates cannot weaken the protected auth contract
- deny messages should follow one shared convention across slash-command denials and prompt refusals

## Suggested Validation

- `bun x tsc --noEmit`
- targeted config-schema tests
- targeted startup or pairing tests for owner claim
- targeted interaction-processing tests for slash-command auth
- targeted prompt-rendering tests for auth context
- targeted schema validation tests that any `privilegeCommands` config now fails as unsupported
- targeted denial-copy tests for representative routed actions
- full `bun test`

## Regression Risks To Test

- a non-owner tries to induce config mutation through normal chat, steering, or loop prompt paths
- owner claim is attempted from a non-DM context and must not succeed
- `member` can still do the intended low-friction actions, but cannot reach `shellExecute`, `transcriptView`, or `runObserve` unless granted
- app `owner` and app `admin` still satisfy agent-level permission checks in phase 1
- no leftover route-local `privilegeCommands` branch still affects `/bash` behavior
- any config that still includes `privilegeCommands` fails fast instead of surviving as a shadow policy

## Exit Criteria

- config supports `app.auth` and `agents.<id>.auth`
- owner claim opens only while the owner list is empty
- the first successful DM during claim becomes owner automatically
- non-listed routed users resolve to `member`
- app `owner` and app `admin` both satisfy agent-level permission checks implicitly
- `privilegeCommands` is removed instead of being replaced by another route-local permission shape
- injected prompt text includes truthful app or agent auth context
- selected channel slash commands are denied or allowed from resolved agent permissions
- any `privilegeCommands` config fails as unsupported and points to `app.auth` and `agents.<id>.auth`
- docs explain that prompt guidance ships now but hard CLI enforcement is still pending
- docs explain that a separate user-guide follow-up is still needed before the role model is end-user complete

## Phase Plan

### Phase 1

- `app.auth` and `agents.<id>.auth`
- owner claim
- protected auth prompt segment
- routed slash-command gating
- shared deny-message convention

### Phase 2

- `clisbot auth ...` operator CLI
- shipped operator guide and denial troubleshooting against the real runtime
- optional admin or advanced slash-help split

### Later

- control CLI enforcement for config mutation
- runner-side blocking for unauthorized mutation commands where justified

## Related Docs

- [App And Agent Authorization And Owner Claim](../../../features/auth/app-and-agent-authorization-and-owner-claim.md)
- [Auth-Aware CLI Mutation Enforcement And Runner Command Guardrails](../control/2026-04-14-auth-aware-cli-mutation-enforcement-and-runner-command-guardrails.md)
