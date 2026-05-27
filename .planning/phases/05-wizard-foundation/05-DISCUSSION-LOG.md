# Phase 5: Wizard Foundation — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 05-wizard-foundation
**Areas discussed:** Atomic write scope, Wizard file structure, Masked input (descoped)

---

## Atomic Write Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap globally — modify writeEditableConfig itself | All existing callers get atomic write. DRY but touches core config path with existing tests. | |
| Wizard-local — new writeEditableConfigAtomic | Zero blast radius. Wizard calls safe version; existing callers unchanged. | ✓ |
| You decide | Claude picks safest approach based on call sites. | |

**User's choice:** Wizard-local — `writeEditableConfigAtomic` in `src/control/setup/setup-wizard-utils.ts`
**Notes:** Keeps existing callers untouched. Wizard is the only caller of the atomic wrapper.

---

## Wizard File Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single file: setup-wizard-utils.ts | All foundation utilities in one file. Phase 6/7 add alongside it. | ✓ |
| Split: setup-state.ts + setup-io.ts | Separate concerns up-front but adds import complexity for ~5 functions. | |

**User's choice:** Single file — `src/control/setup/setup-wizard-utils.ts`

| Option | Description | Selected |
|--------|-------------|----------|
| No skeleton — Phase 8 creates setup-cli.ts | Phase 5 is purely a utilities module. | ✓ |
| Yes skeleton — Phase 5 creates a stub | Empty setup-cli.ts for Phase 6/7 to wire up incrementally. | |

**User's choice:** No CLI skeleton in Phase 5.

---

## Masked Input (descoped from Phase 5)

**User's question:** "Why do we need to work on this? In our wizard, is there anywhere we need to worry about the token?"

**Discussion:** Masked input (FOUND-03) is only needed when token prompts are presented. Phase 5 creates no readline prompts — those live in Phase 6 (channel wizard). Only Flow A involves credential input; Flow B (agent wizard) does not ask for tokens.

**Decision:** Descope FOUND-03 from Phase 5. Phase 6 owns masked input alongside the readline token prompts it introduces. Phase 5 scope trimmed to: TTY guard, daemon check, atomic write, Ctrl+C safety.

---

## Claude's Discretion

- Exact function signatures and export names
- Whether `withWizardCleanup` is HOF, class, or register/unregister pair
- Error message copy (naming flag alternative and stop command)

## Deferred Ideas

- Masked input (FOUND-03) — Phase 6
- CLI registration skeleton — Phase 8
- Token format validation — post-MVP
- Wizard resume state — post-MVP
