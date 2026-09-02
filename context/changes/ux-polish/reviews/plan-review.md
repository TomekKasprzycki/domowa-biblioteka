<!-- PLAN-REVIEW-REPORT -->
# Plan Review: S-12 Post-Launch UX Polish

- **Plan**: `context/changes/ux-polish/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-02
- **Verdict**: REVISE → SOUND after triage (all 8 findings fixed)
- **Findings**: 1 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict (at review) | After fixes |
|-----------|---------------------|-------------|
| End-State Alignment | WARNING | PASS |
| Lean Execution | PASS | PASS |
| Architectural Fitness | PASS | PASS |
| Blind Spots | FAIL | PASS |
| Plan Completeness | WARNING | PASS |

## Grounding

12/12 paths ✓, 3/3 new-file paths correctly absent ✓, `countBooksForUser` ✓, `Friend`-type blast radius confined to the friends feature + its specs ✓, brief↔plan ✓.

Two riskiest claims verified directly:
- `deleteAccountAction` calls `await signOut({ redirectTo: "/?accountDeleted=1" })` (`account/actions.ts:52`) — session is cleared before `/` renders, so the Phase 1 redirect does not swallow the account-deleted flash. **Claim holds.**
- `Field` wires `<label htmlFor={id}>` → `<input id={id}>` from an explicit prop (`field.tsx:27-44`); `SendInviteForm` hardcodes `id="email"` (`send-invite-form.tsx:19`). **Claim broken** → F1.

Post-triage mechanical re-check of the Progress contract: 4/4 phases match criteria↔progress counts (A=3/2/4/6, M=4/1/3/4), one `## Progress` heading, zero checkboxes outside it, 4 Implementation Notes.

## Findings

### F1 — Dual-render produces duplicate DOM ids and cannot meet its own success criterion

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details + Phase 4, Change 3
- **Detail**: Rendering `ManageInvitesSection` twice (`lg:hidden` / `hidden lg:block`) puts two `<input id="email">` in one document — invalid HTML, and `label[for=email]` resolves to the first match, the `display:none` copy, so the visible desktop label focuses nothing. Two independent `useActionState` instances also mean text typed on one side of the `lg` boundary vanishes on resize, directly contradicting the plan's own manual criterion ("resizing doesn't lose in-progress form input").
- **Fix A ⭐ Recommended**: Single render; `ManageInvitesSection` becomes a Client Component syncing `<details open>` to `window.matchMedia("(min-width: 1024px)")`.
  - Strength: No duplicate ids, no split state; the resize criterion becomes satisfiable.
  - Tradeoff: Collapsed-for-one-frame flash at `lg`; requires amending the "no matchMedia" guardrail.
  - Confidence: HIGH — `Field`/`SendInviteForm` id wiring verified at the lines above.
  - Blind spot: Flash not measured on a real load.
- **Fix B**: Single render, always-expanded, hide only the collapse chrome via CSS.
  - Strength: Zero JS.
  - Tradeoff: Relies on overriding how browsers hide closed `<details>` content (`content-visibility` / `::details-content`); not reliably portable.
  - Confidence: MEDIUM — behavior varies across current engines.
  - Blind spot: Untested against the app's stated browser matrix.
- **Decision**: FIXED via Fix A. Critical Implementation Details rewritten (including an explicit "do not reintroduce dual-render" note with the evidence), guardrail amended, Phase 4 Changes 2–3 rewritten, criterion replaced with a single-invite-form regression guard.

### F2 — Grid restyle changes only the container, not the cards it must reshape

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 4, Change 1
- **Detail**: `design.html`'s `.friend-card` is `flex-direction: column` (`design.html:294-297`), but `FriendRow`/`ReceivedInviteRow` use `flex items-start justify-between gap-4` with avatar+name pushed against a `Pill`, plus a separate action row. In a 240px cell those crowd or wrap, so the "matches design.html" criterion would not pass with a container-only change.
- **Fix A ⭐ Recommended**: Add card-internal restyle (3 row components) to Phase 4.
  - Strength: Matches the mockup's column card, the layout 240px was designed around.
  - Tradeoff: Touches 3 more components and their specs.
  - Confidence: HIGH — mockup CSS and current row classes both read directly.
  - Blind spot: `Pill`/`Avatar` sizing at that width.
- **Fix B**: Widen grid minimum to ~300px, keep rows horizontal.
  - Strength: Smallest edit.
  - Tradeoff: Diverges from the mockup's 240px.
  - Confidence: MEDIUM — 300px is an estimate.
  - Blind spot: Longest real names/emails not sampled.
- **Decision**: FIXED via Fix A. New Change 1b added, with the S-08/S-09 "any breaking spec is an accidental behavior change" rule attached and a criterion that pre-existing friends specs pass unmodified.

### F3 — Every phase is missing the repo's per-phase Implementation Note

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phases 1-4
- **Detail**: All four prior plans carry it (design-system 7, forgot-password 3, gdpr-assessment 3, shelf-view 2); this plan had zero. It is the repo's phase-handoff gate for `/10x-implement`.
- **Fix**: Add the standard note to each phase.
- **Decision**: FIXED — 4 notes added, the Phase 4 one also gating the whole slice against the five todo.md items.

### F4 — Phase 1's login-page spec omits the actions-module mock it will need

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1, criterion 1.2
- **Detail**: `LoginPage` → `LoginForm` → `loginAction` (`"use server"`, imports `signIn` from `@/auth`). Every existing component spec mocks its actions module first (`friend-row.spec.tsx:6-11`); the criterion didn't say so.
- **Fix**: State the `jest.mock("@/app/login/actions", ...)` requirement in the criterion.
- **Decision**: FIXED.

### F5 — Garbled Contract sentence in Phase 4, Change 3

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 4, Change 3
- **Detail**: "...positioned before the mobile admin block in DOM/tab order is not required — today's existing order ... is preserved" was unparseable, leaving DOM order ambiguous.
- **Fix**: Restate as explicit DOM order plus explicit grid column placement.
- **Decision**: FIXED — resolved as part of F1's rewrite of Change 3; DOM order and column placement are now stated plainly.

### F6 — Nesting Section inside Section produces an h2 inside an h2

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 4, Changes 2-3
- **Detail**: `Section` hardcodes `<h2>` (`section.tsx:17,26`); nesting "Received"/"Sent" inside "Manage invites" yields h2-within-h2 under the page's h1.
- **Fix**: Optional `headingLevel?: 2 | 3` prop (default 2 so existing call sites are unaffected); sub-sections pass 3.
- **Decision**: FIXED — new Change 1c, plus a `section.spec.tsx` criterion covering the default and the new level.

### F7 — Icon-only Remove has no label affordance on touch

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phases 2-3
- **Detail**: A native `title` tooltip never fires on touch, and AGENTS.md:35 mandates mobile-first, so on the primary target a sighted user sees only 🗑️. `aria-label` covers assistive tech; the existing `window.confirm` guard names the friend and catches mis-taps.
- **Fix**: Record as an accepted known limitation rather than building a custom tap-to-reveal tooltip.
- **Decision**: FIXED — recorded in Phase 2 as an explicit accepted limitation ("do not add a custom tap-to-reveal tooltip in this slice") and in the brief's Open Risks.

### F8 — At exactly lg the friends column is ~348px, so the "grid" is one card wide

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 4, Change 3
- **Detail**: At 1024px, the 248px sidebar (`layout.tsx:9`) plus `px-10` padding leaves ~696px; a 320px admin column left ~348px for the friends grid — one 240px card per row. The multi-column payoff only arrives near `xl`.
- **Fix**: Narrow the admin column to ~280px and state the width budget in the plan.
- **Decision**: FIXED — admin column set to ~280px (~390px for the grid), with the arithmetic and the "two cards from ~1180px" consequence written into the Contract, and the tradeoff noted in the brief's Open Risks.
