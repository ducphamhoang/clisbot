# Prompt Access Control Review

## Summary

Review which users and routes may cause the model to see protected control instructions, sensitive transcript content, shell-oriented guidance, and configuration mutation hints.

The goal is to make prompt access control explicit instead of letting it emerge accidentally from route shape or prompt composition.

## Why This Task Exists

`clisbot` now has auth roles, protected-control wording, transcript visibility modes, shell execution permissions, and route-local behavior differences.

Those pieces exist, but the product still needs one clear review of who gets access to which prompt layers and why.

## Review Questions

1. Which prompt layers are visible to all routed users versus privileged users only?
2. Does prompt composition ever leak protected control guidance to users who cannot actually perform the underlying action?
3. Are transcript and verbose surfaces aligned with the same permission model as shell and control mutations?
4. Where should prompt access be denied outright rather than merely discouraged by wording?
5. Which access decisions belong to auth, control, channels, or runtime?

## Current Focus

- map prompt layers to the current auth model
- identify mismatches between visible guidance and hard permissions
- identify places where the model can see or expose more than the user should control
- produce small follow-up tasks for real enforcement gaps

## Scope

- protected control prompt rules
- shell-execution guidance and access
- transcript and verbose prompt exposure
- channel-specific prompt wrappers and overrides
- role-based differences between owner, admin, paired user, and unpaired user

## Non-Goals

- redesign of the whole auth model
- general UX wording cleanup that does not affect access boundaries
- unrelated channel rendering work

## Exit Criteria

- prompt-layer access is described in a way that matches the current auth model
- any gap between prompt visibility and hard permission is named explicitly
- the remaining work is split into small enforcement slices

## Related Docs

- [docs/features/non-functionals/security/README.md](../../../features/non-functionals/security/README.md)
- [docs/user-guide/auth-and-roles.md](../../../user-guide/auth-and-roles.md)
- [2026-04-14-app-and-agent-authorization-and-owner-claim.md](../auth/2026-04-14-app-and-agent-authorization-and-owner-claim.md)
- [2026-04-14-auth-aware-cli-mutation-enforcement-and-runner-command-guardrails.md](../control/2026-04-14-auth-aware-cli-mutation-enforcement-and-runner-command-guardrails.md)
