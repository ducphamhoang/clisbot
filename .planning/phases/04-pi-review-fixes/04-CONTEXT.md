# Phase 4: Pi Review Fixes — Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** Adversarial milestone review + Technical Architecture Specialist resolution

<domain>
## Phase Boundary

Fix 8 specific correctness, security, and architecture findings from the v0.2.0 Pi CLI Integration milestone review. All architectural ambiguities were resolved before planning — decisions below are final and locked.

This phase touches:
- `src/agents/runtime/runner-service.ts` — Fix 1, Fix 2
- `src/config/runtime/agent-tool-presets.ts` — Fix 8
- `src/runners/transcript/transcript-normalization.ts` — Fix 3, Fix 4, Fix 5, Fix 6
- `.planning/REQUIREMENTS.md` — Fix 7 (doc correction only)
- Tests in `test/runner-service.integration.test.ts` and `test/text/text-cleaning-chrome.suite.ts`

</domain>

<decisions>
## Implementation Decisions

### Fix 1 — FIX-01: `/new` command broken for pi (LOCKED)

**Problem:** `triggerNewSessionInLiveRunner` calls `captureNewSessionIdentityAfterTrigger` with `forceStatusCommand: true`. This bypasses the `capture.mode: "off"` guard and tries to scrape a session ID from pi — which has no `/status` command. Every `/new` times out and throws a user-facing error.

**Decision:** Add a guard at the top of `triggerNewSession` (runner-service.ts). Condition: `resolved.runner.sessionId.capture.mode === "off"` AND `resolved.runner.sessionId.create.mode === "explicit"`. When both are true, skip `triggerNewSessionInLiveRunner` entirely and call `restartRunnerWithFreshSessionIdForNewCommand` directly. The restart path already clears the stored ID; the next `ensureSessionReady` generates a fresh UUID via the explicit-create path.

**Why restart not live-rotation:** Pi's `create.mode: "explicit"` means the session ID is always clisbot-generated before launch. A "new session" must be a fresh UUID + fresh launch — there is no in-process command that rotates state and exposes a new ID.

### Fix 2 — FIX-02: Crash recovery silently drops pi session ID (LOCKED)

**Problem:** `retryFreshStartAfterStoredResumeFailure` has a gate: `create.mode !== "runner"`. For pi (`create.mode: "explicit"`), this is always true — the gate short-circuits and the stored `sessionId` is discarded without user notification.

**Decision:** Widen the gate condition: allow `create.mode === "explicit"` as a valid continuation case alongside `create.mode === "runner"`. Explicit IDs are clisbot-owned and can always be reused — there is no reason to discard them on crash recovery.

### Fix 3 — FIX-03: No `dropPiPromptBlocks` — user prompt echoes in responses (LOCKED)

**Problem:** codex, claude, and gemini each have `dropXxxPromptBlocks`. Pi has none. The `> {user message}` line (pi's prompt echo) appears in every response sent to Slack/Telegram users.

**Decision:** Add `dropPiPromptBlocks` using the shared `dropPromptBlocks` helper with pattern `/^\s*>\s/`. This is structurally identical to `dropGeminiPromptBlocks` (gemini also uses `>`). Place after `dropGeminiPromptBlocks` (~line 368). Wire into `cleanInteractionSnapshotInternal` at the `promptStripped` dispatch block — add `isPi ? dropPiPromptBlocks(lines) :` before the final `lines` fallback.

**No collision with gemini:** The `isPi` guard in `cleanInteractionSnapshotInternal` already excludes gemini (`!isGemini`), so the same `> ` pattern is safe for both.

### Fix 4 — FIX-04: Pi chrome filter leaks detection markers into output (LOCKED)

**Problem:** `looksLikePiSnapshot` uses `Type your message` and `run /help...` as pi identifiers, but `shouldDropPiChromeLine` never drops those lines — they appear in channel output.

**Decision:** Add explicit drop rules in `shouldDropPiChromeLine` for the help-bar phrases:
- Lines containing `Type your message`
- Lines containing `run /help`
- Any other ready-bar text used as a pi detection signal in `looksLikePiSnapshot`

### Fix 5 — FIX-05: `Warning:`/`Note:` rule strips legitimate AI content (LOCKED)

**Problem:** `shouldDropPiChromeLine` drops any `/^(?:Warning|Note):\s/i` line anywhere in the snapshot. This strips real AI response content like "Warning: this command is destructive" or "Note: you need sudo privileges."

**Decision:** Remove the `Warning:`/`Note:` rule entirely from `shouldDropPiChromeLine`. The startup blockers (`Warning: No models available`, `tmux extended-keys is off`) are handled at launch by `startupBlockers` before normalization ever runs — they do not need a second filter here.

### Fix 6 — FIX-06: `looksLikePiSnapshot` false-positive on bare `>` (LOCKED)

**Problem:** `trimmed === '>'` as a standalone pi detector can misclassify any snapshot containing a bare `>` (Bash PS2 prompt, heredoc, markdown blockquote) as pi, causing incorrect chrome stripping.

**Decision:** Remove `trimmed === '>'` as a standalone sufficient condition from `looksLikePiSnapshot`. The `>` idle prompt is already handled by `dropPiPromptBlocks` and `shouldDropPiChromeLine` — it does not need to be a classification signal. Pi detection should rely only on markers that are uniquely pi: the version header (`pi v`), `Welcome to pi`, or the escape-interrupt help bar.

### Fix 7 — FIX-07: REQUIREMENTS.md SESSION-03 doc error (LOCKED)

**Problem:** SESSION-03 says `Pi session resume passes --session {uuid}`. The implementation correctly uses `--resume {sessionId}` (matching pi CLI semantics: `--session` is create, `--resume` is resume — same pattern as claude).

**Decision:** Update REQUIREMENTS.md SESSION-03 from `--session {uuid}` to `--resume {uuid}`. This is a documentation-only fix; no code changes.

### Fix 8 — FIX-08: `buildRunnerFromToolTemplate` overwrites non-codex resume args (LOCKED)

**Problem:** The non-codex branch of `buildRunnerFromToolTemplate` always reconstructs resume args as `["--resume", "{sessionId}", ...options]`, silently overriding whatever the template declared. Pi's template resume args are ignored.

**Decision:** Preserve the template's `resume.args` for non-codex runners. Apply `applyTemplate` for `{sessionId}` placeholder substitution only — do not reconstruct the array. Add a comment explaining why codex requires special-casing (codex has a documented reason for the override). The non-codex path should call `applyTemplate(template.sessionId.resume.args, { sessionId })` rather than rebuilding from scratch.

### Claude's Discretion

- Wave assignment and plan count — determined by planner based on file conflict analysis
- Exact line numbers for insertion — planner reads current file state
- Test fixture design — planner follows existing test patterns in `test/text/text-cleaning-chrome.suite.ts` and `test/runner-service.integration.test.ts`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core files being modified
- `src/agents/runtime/runner-service.ts` — Fix 1 (triggerNewSession), Fix 2 (retryFreshStartAfterStoredResumeFailure)
- `src/config/runtime/agent-tool-presets.ts` — Fix 8 (buildRunnerFromToolTemplate)
- `src/runners/transcript/transcript-normalization.ts` — Fix 3 (dropPiPromptBlocks), Fix 4 (shouldDropPiChromeLine help-bar drops), Fix 5 (remove Warning/Note rule), Fix 6 (looksLikePiSnapshot tighten)

### Test files
- `test/runner-service.integration.test.ts` — existing pi startup/session tests; add Fix 1 and Fix 2 coverage
- `test/text/text-cleaning-chrome.suite.ts` — existing pi chrome tests; add Fix 3–6 coverage

### Architecture docs
- `docs/architecture/runtime-architecture.md` — runner lifecycle, session identity model
- `docs/architecture/domain-language.md` — canonical vocabulary

### Planning artifacts
- `.planning/REQUIREMENTS.md` — FIX-01 through FIX-08
- `.planning/ROADMAP.md` — Phase 4 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

### Wave structure (guidance, planner has final say)
- Wave 1 (can run in parallel): Fix 5 + Fix 6 + Fix 7 — transcript-normalization removals and doc fix, no runner-service touch, low conflict risk
- Wave 2 (can run in parallel): Fix 3 + Fix 4 — transcript-normalization additions, both in same file but non-overlapping functions
- Wave 3: Fix 8 — agent-tool-presets resume args, isolated change
- Wave 4: Fix 1 + Fix 2 — runner-service, adjacent functions, safer sequential

### Pattern references
- `dropGeminiPromptBlocks` and `dropPromptBlocks` — exact pattern for Fix 3
- `shouldDropGeminiChromeLine` — structural reference for Fix 4
- `triggerNewSession` call graph — Fix 1 insertion point
- `retryFreshStartAfterStoredResumeFailure` gate condition — Fix 2 change site

### Test patterns
- Positive chrome-drop tests: see existing pi suite in `text-cleaning-chrome.suite.ts`
- Negative detection tests (non-pi snapshot with `>`): add as new describe block
- Runner service integration tests: see `ensureSessionReady` block pattern

</specifics>

<deferred>
## Deferred Ideas

- ARCH-01: Pi defaults duplicated 3× in schema.ts — DRY violation. Deferred: pre-existing issue, out of scope for this phase.
- REG-01: `isRunnerIdlePromptLine` `"> "` match could misclassify markdown blockquotes for all runners — deferred: pre-existing, low priority.
- SEC-03: UUID format guard before `{sessionId}` substitution — deferred: requires broader runner-service audit.
- CRIT-05: `shouldDropPiChromeLine` drops `│`-starting lines that may be real response content — deferred: shared risk with gemini, needs broader cross-runner design.

</deferred>

---

*Phase: 04-pi-review-fixes*
*Context gathered: 2026-05-26 via adversarial review + Technical Architecture Specialist*
