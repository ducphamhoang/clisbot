# Phase 5: Wizard Foundation — Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `src/control/setup/setup-wizard-utils.ts` — the shared safety layer that Phase 6 (Flow A) and Phase 7 (Flow B) will import. No user-facing wizard UI is built in this phase.

Deliverables:
- TTY guard (FOUND-01)
- Daemon-running check (FOUND-02)
- Atomic config write wrapper `writeEditableConfigAtomic` (FOUND-04)
- Ctrl+C / clean exit contract (FOUND-05)

Explicitly out of scope for Phase 5:
- Masked input (FOUND-03) — moved to Phase 6, where the actual token prompts live
- CLI registration / `setup-cli.ts` entry point — Phase 8
- Any wizard UI (readline questions, review screens, success screens)

</domain>

<decisions>
## Implementation Decisions

### Atomic Write
- **D-01:** `writeEditableConfig` (config-file.ts) is NOT modified — it remains a direct `writeTextFile` call. Existing callers are unaffected.
- **D-02:** A new `writeEditableConfigAtomic` function is added to `src/control/setup/setup-wizard-utils.ts`. It wraps the write with temp-file + rename (write to `{configPath}.tmp`, then `fs.rename`). Only the wizard flows call this.
- **D-03:** If the process is killed after rename completes, config is valid. If killed before rename, the `.tmp` file is orphaned but the previous config is intact. Ctrl+C handler (see D-07) removes any `.tmp` file before exiting.

### File Structure
- **D-04:** Phase 5 creates exactly one new file: `src/control/setup/setup-wizard-utils.ts`. No other files in `src/control/setup/` are created this phase.
- **D-05:** Phase 6 and 7 add their own files (`setup-channels.ts`, `setup-agent.ts`) alongside it. Phase 8 creates `src/control/commands/setup-cli.ts` for CLI registration.
- **D-06:** No CLI skeleton or stub is created in Phase 5.

### Masked Input
- **D-07 (descoped):** Masked token input (FOUND-03) is NOT implemented in Phase 5. Phase 6 owns it alongside the readline prompts that collect tokens. This keeps Phase 5 purely about safety guards.

### Ctrl+C / SIGINT Contract
- **D-08:** The wizard utility exposes a `withWizardCleanup(fn: () => Promise<void>)` wrapper (or equivalent) that installs a SIGINT handler before `fn` runs and removes it after. On SIGINT: remove any `.tmp` config file, call `process.stdin.unref()`, then `process.exit(130)`.
- **D-09:** No partial config is ever written — `writeEditableConfigAtomic` only renames after the full write completes, so a mid-write kill leaves `.tmp` only, never a truncated primary config.

### Bun Workarounds (locked from prior sessions)
- **D-10:** Bun #21189 mitigation: call `process.stdin.unref()` after `rl.close()` to prevent Bun from hanging on a closed readline interface.
- **D-11:** Single `readline.Interface` instance per wizard session — do not create multiple interfaces.

### Claude's Discretion
- Exact function signatures and export names beyond what is documented above
- Whether `withWizardCleanup` is a higher-order function, a class, or a simpler register/unregister pair
- Error message copy for TTY guard (FOUND-01) and daemon check (FOUND-02) — as long as the message names the flag-based alternative (`clisbot init`) for TTY and names the exact stop command for daemon check

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-06 (Phase 5 scope: FOUND-01, FOUND-02, FOUND-04, FOUND-05, FOUND-06; FOUND-03 deferred to Phase 6)

### Core files to read before planning
- `src/config/core/config-file.ts` — `writeEditableConfig` (line 52) — this is what `writeEditableConfigAtomic` wraps; do NOT modify this function
- `src/control/runtime/runtime-process.ts` — `getRuntimeStatus()` — use this for the daemon check (FOUND-02); do not re-implement
- `src/infra/fs.ts` — `writeTextFile` — understand what the current write does before writing the atomic wrapper
- `src/infra/paths.ts` — `expandHomePath`, `getDefaultConfigPath` — path resolution conventions

### Architecture
- `docs/architecture/domain-language.md` — canonical vocabulary
- `docs/architecture/runtime-architecture.md` — runtime lifecycle (relevant for daemon check)

### Roadmap
- `.planning/ROADMAP.md` — Phase 5 success criteria and dependency chain (5 → 6 → 7 → 8)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getRuntimeStatus()` in `src/control/runtime/runtime-process.ts` — already returns `{ running: boolean, configPath, ... }`; daemon check (FOUND-02) should call this directly
- `writeEditableConfig` in `src/config/core/config-file.ts` — call this inside `writeEditableConfigAtomic` after reading the current write logic; don't duplicate the normalization it does
- `expandHomePath` in `src/infra/paths.ts` — use for resolving config path before constructing `.tmp` path

### Established Patterns
- All CLI commands are under `src/control/commands/` — new wizard flows go to `src/control/setup/` (new sibling directory)
- Console output style: `console.log` with plain strings; no logger abstraction in CLI commands
- No spinner/cursor control: sequential line output only (per REQUIREMENTS.md out-of-scope)

### Integration Points
- Phase 6 (`setup-channels.ts`) imports TTY guard, daemon check, `writeEditableConfigAtomic`, and Ctrl+C wrapper from `src/control/setup/setup-wizard-utils.ts`
- Phase 7 (`setup-agent.ts`) imports the same set
- Phase 8 (`setup-cli.ts`) imports and calls the flow functions from Phase 6 and 7

</code_context>

<specifics>
## Specific Ideas

- The temp file path convention: `{configPath}.tmp` — simple, predictable, easy to clean up
- Ctrl+C exit code: `process.exit(130)` — standard SIGINT convention

</specifics>

<deferred>
## Deferred Ideas

- **FOUND-03 (masked input)** — moved to Phase 6; Phase 6 owns readline IO and token prompt masking alongside the actual channel wizard prompts
- **setup-cli.ts skeleton** — Phase 8 creates CLI registration; no stub in Phase 5
- Token format validation regex — deferred post-MVP per REQUIREMENTS.md
- Wizard resume state (`wizard-state.json`) — deferred post-MVP per REQUIREMENTS.md

</deferred>

---

*Phase: 05-wizard-foundation*
*Context gathered: 2026-05-27*
