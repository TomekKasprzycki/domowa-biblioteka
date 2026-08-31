<!-- PLAN-REVIEW-REPORT -->
# Plan Review: S-11: Forgot Password Implementation Plan

- **Plan**: context/changes/forgot-password/plan.md
- **Mode**: Deep
- **Date**: 2026-08-31
- **Verdict**: REVISE
- **Findings**: 0 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

Grounding: 8/8 paths ✓ (auth.config.ts, middleware.ts, account-deletion.repository.ts, delete-account-form.tsx, CreateFriendConnectionTable.ts, CreateLoanTable.ts, user.repository.ts, page.tsx), 4/4 symbols ✓ (publicPaths, deleteAccount, passwordHash, useActionState usages), brief↔plan ✓

Progress↔Phase mechanical contract: PASS — one `## Progress` heading, all 3 phases have matching Progress subsections, every Success Criteria bullet has a matching `- [ ]` row, no checkboxes outside Progress.

## Findings

### F1 — New action-state pattern invented where an existing idiom fits

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 2, Change #4 (`requestPasswordResetAction`, `forgot-password.types.ts`)
- **Detail**: The plan introduces `RequestPasswordResetState = { status: "error" | "sent"; message: string } | null`, a discriminated-union `useActionState` shape used nowhere else in the codebase. A sweep of all 14 `useActionState` call sites in `src/app/**` confirms every existing action returns plain `string | null` for errors only. The codebase's actual "confirm success without erroring" idiom is redirect + query-param banner: `deleteAccountAction` calls `signOut({ redirectTo: "/?accountDeleted=1" })`, and `src/app/page.tsx:19-26` reads `searchParams.accountDeleted` to render the banner. The plan doesn't reuse this existing idiom.
- **Fix A ⭐ Recommended**: Redirect to `/forgot-password?sent=1` on the generic-success path (mirroring `deleteAccountAction`); keep `requestPasswordResetAction` returning plain `string | null` for validation errors only; drop `forgot-password.types.ts` and the discriminated union entirely — the page reads `searchParams.sent` and renders the confirmation banner exactly like `page.tsx`'s `accountDeleted` banner.
  - Strength: Reuses the codebase's one existing "success while not erroring" idiom verbatim — zero new state-shape pattern, no new types file, less code overall.
  - Tradeoff: A full navigation/redirect round-trip instead of an in-place message; the typed email value is lost after redirect.
  - Confidence: HIGH — the redirect+banner idiom is directly grounded in working code, not inferred.
  - Blind spot: Doesn't verify whether losing the typed email on redirect is an acceptable UX regression — that's a product-taste call.
- **Fix B**: Keep the discriminated-union `RequestPasswordResetState` as designed.
  - Strength: No page navigation; user stays in place with immediate inline feedback, consistent with how `/register` and `/login` behave on error.
  - Tradeoff: Introduces a second, codebase-first "stay and show success" pattern with no precedent — the next engineer touching action-state shapes now has two idioms to choose between.
  - Confidence: MEDIUM — reasonable design, but the plan doesn't argue why the existing idiom wasn't reused.
  - Blind spot: Whether a future feature would organically want this same "stay + success" shape, making it a reasonable second idiom rather than a one-off.
- **Decision**: FIXED (Fix A) — `requestPasswordResetAction` now returns plain `string | null` and redirects to `/forgot-password?sent=1` on success; `forgot-password.types.ts` dropped.

### F2 — "No rate limiting" + "invalidate old token on re-request" combine into a targeted reset-denial vector

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: "What We're NOT Doing" (rate limiting bullet) × Phase 1, Change #4 (`createPasswordResetToken`)
- **Detail**: `createPasswordResetToken` deletes ALL of a user's existing unused tokens on every new request (the deliberate "at most one live token" decision). Combined with the deferred rate-limiting decision, anyone who knows a victim's email can call `/forgot-password` repeatedly and indefinitely, invalidating the victim's own in-flight (unclicked) reset link before they can use it — an unauthenticated, free way to indefinitely deny a specific user's password recovery. The plan's existing "What We're NOT Doing" bullet frames the no-rate-limiting risk only as "spam a target's inbox" / "exhaust Gmail's sending cap" — it doesn't name this account-recovery-denial consequence, which is a materially more serious framing of the same gap.
- **Fix A ⭐ Recommended**: Document the fuller risk explicitly in "What We're NOT Doing" — add a sentence naming that a third party can repeatedly invalidate a victim's in-flight reset link, accepted for the same reason as the rest of the rate-limiting deferral.
  - Strength: Zero implementation cost; keeps scope exactly as already negotiated (rate limiting was already explicitly deferred after a dedicated question/answer round).
  - Tradeoff: The gap stays open — a self-service recovery flow that a third party can indefinitely deny is a real weakness if this app ever has an actual adversarial user, even at friend-circle scale.
  - Confidence: HIGH — matches the developer's already-stated preference on rate limiting.
  - Blind spot: None significant — documentation-only fix.
- **Fix B**: Add a minimal per-email cooldown inside `createPasswordResetToken` — if an unexpired token for the user already exists and is less than N minutes old, don't delete/reissue it (no-op, still return the same generic message).
  - Strength: Closes the specific griefing vector cheaply — no IP tracking, no new table, no infra, just a timestamp check against the row already being read.
  - Tradeoff: Slightly more logic than currently specified in Phase 1's contract; doesn't stop inbox-spam or Gmail-quota exhaustion, only the token-invalidation griefing specifically.
  - Confidence: MEDIUM — reasonable, but revises an already-decided contract after the fact.
  - Blind spot: Doesn't fully replace real rate limiting.
- **Decision**: FIXED (Fix A) — added a sentence to the rate-limiting bullet in "What We're NOT Doing" naming the reset-denial consequence explicitly.

### F3 — Token-logging discipline stated as a rule but not enforced in the action's error-handling contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details ("Token storage is hash-only") × Phase 2, Change #4
- **Detail**: Critical Implementation Details states "Never log the raw token or return it from any other function — the emailed URL is its only other home." Phase 2 Change #4's contract only says "catching and logging any send failure" for `requestPasswordResetAction` — it doesn't specify what to log, and doesn't warn against including `resetUrl` (which contains the raw token) in that log call. An implementer debugging a delivery failure could reasonably `console.error("send failed", { to, resetUrl, error })` for context, silently violating the plan's own stated invariant.
- **Fix**: Add one clause to Phase 2 Change #4's contract: the caught error must be logged as `console.error("password reset email send failed", error)` only — never include `resetUrl` or the raw token in the log call.
- **Decision**: FIXED — folded into F1's edit to Critical Implementation Details' enumeration-safety paragraph.

### F4 — Expired, never-used token rows have no documented cleanup story

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: "What We're NOT Doing"
- **Detail**: A token that's requested, never clicked, and never superseded by a later request (and whose user never deletes their account) has no cleanup path — it sits in `password_reset_tokens` past its `expiresAt` forever. Negligible at this app's scale, but every other deferred-risk category (rate limiting, session invalidation, HTML email, timing attacks) is explicitly named in "What We're NOT Doing" — this one isn't.
- **Fix**: Add a bullet to "What We're NOT Doing": cleanup of expired, never-used token rows is out of scope — they remain until superseded by a new request or removed via account deletion; negligible at this app's scale.
- **Decision**: FIXED — bullet added to "What We're NOT Doing".
