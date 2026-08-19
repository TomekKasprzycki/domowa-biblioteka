<!-- PLAN-REVIEW-REPORT -->
# Plan Review: S-07 ISBN Lookup

- **Plan**: `context/changes/isbn-lookup/plan.md`
- **Mode**: Deep
- **Date**: 2026-08-15
- **Verdict**: REVISE → **SOUND after triage** (all 7 findings fixed)
- **Findings**: 2 critical, 4 warnings, 1 observation

## Verdicts

| Dimension | Verdict (at review) | After fixes |
|-----------|---------------------|-------------|
| End-State Alignment | PASS | PASS |
| Lean Execution | PASS | PASS |
| Architectural Fitness | WARNING | PASS |
| Blind Spots | FAIL | PASS |
| Plan Completeness | FAIL | PASS |

## Grounding

13/13 modify-paths exist ✓ · 5/5 new paths absent ✓ · symbols ✓ (`createBook` 14 call sites, all object literals; `auth` exported at `src/auth.ts:8`) · brief↔plan ✓ · Progress↔Phase 27/27 ✓ · no checkboxes outside `## Progress` ✓

Claims 1–5 were verified by a sub-agent against a scratch reproduction using the project's exact dependency versions. Claim 1 was reproduced empirically rather than reasoned about, which is what refuted it.

## Findings

### F1 — /api/isbn never returns 401; middleware redirects first

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 — route handler contract; criterion 2.7
- **Detail**: `src/middleware.ts:8` matches every non-static path and `src/auth.config.ts:16-20` treats only `/`, `/login`, `/register` and `/api/auth/*` as public, returning `false` otherwise — so NextAuth redirects to `pages.signIn` (`/login`) before the handler runs. The planned 401 never occurs. Compounding it, the browser wrapper mapped every non-OK response to `{ found: false }`, so an expired session would have told the user the book does not exist.
- **Fix A ⭐ Recommended**: Correct the plan to match the real behaviour and make the wrapper distinguish a redirect from a miss.
  - Strength: No change to shared auth config, so blast radius stays inside the slice; also fixes the misleading UI state.
  - Tradeoff: The endpoint keeps non-API redirect semantics.
  - Confidence: HIGH — read directly from middleware and auth config, independently confirmed by the verification agent.
  - Blind spot: Exact status code (307 vs 302) unverified.
- **Fix B**: Let `/api/*` through so the handler's own `auth()` produces a real 401.
  - Strength: Proper API semantics.
  - Tradeoff: Edits shared auth config for one slice.
  - Confidence: MEDIUM.
  - Blind spot: Whether a future route relies on the redirect.
- **Decision**: FIXED via Fix A. Phase 2 gained a "Middleware reality" note; the result type gained an `unauthenticated` variant; criterion 2.7 now expects a redirect. The middleware matcher is explicitly listed as out of scope.

### F2 — "Not modifying jest.config.ts" is an unverified guardrail

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Completeness
- **Location**: What We're NOT Doing; Phase 2 change 1
- **Detail**: Originally raised as an untested assumption. A spike against the project's exact versions then **refuted it outright**: importing `msw` — not just `msw/node` — throws `SyntaxError: Cannot use import statement outside a module` from `rettime/build/index.mjs`. msw 2.15.0 ships CJS itself, but ~37 transitive packages declare `"type": "module"` and `rettime` exposes no `require` condition. `transformIgnorePatterns` alone does not help, because the repo's `transform` matches only `^.+\.tsx?$`, so un-ignored `.mjs` files reach no transformer. A working setup needs four coordinated changes plus a second tsconfig with `allowJs`, a ~341-package install, and an allow-list that npm hoisting can silently invalidate.
- **Fix (chosen)**: Defer msw entirely for this slice; the gateway spec stubs `global.fetch` via `jest.spyOn`. Record the constraint in `context/foundation/lessons.md` so the next slice does not rediscover it, and treat a real msw adoption as its own tooling change.
  - Strength: One outbound call does not justify owning a brittle transform allow-list; slice scope stays on the feature.
  - Tradeoff: Deliberate departure from `AGENTS.md:45`, and the project still has no HTTP-mocking infrastructure afterwards.
  - Confidence: HIGH — the failure was reproduced, not predicted.
  - Blind spot: None significant.
- **Decision**: FIXED. Phase 2 change 1 is now a fetch-stub helper; the msw dependency and its pin criterion are gone; criterion 2.4 asserts `git diff package.json` is empty; a new lessons.md entry records the four-change cost.

### F7 — Controlled conversion changes two user-visible behaviours

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 3 change 3
- **Detail**: Added after verification. React 19 clears uncontrolled fields of a `<form action={…}>` once the action resolves, **including on error** — measured, not recalled. So today a duplicate-title error blanks the add form while the alert renders. After conversion the values survive (an improvement), and because they survive, `isDirty()` flips from `false` to `true` on that path, so Esc after a failed submit now shows the discard prompt where it previously closed silently. Neither behaviour is covered by any test, and the comments at `add-book-modal.tsx:15-17` and `:45-46` assert the form is uncontrolled.
- **Fix**: Name both changes, add a regression spec for value survival and a manual criterion for the new prompt, and rewrite the two stale comments.
- **Decision**: FIXED. Added to Critical Implementation Details, Phase 3 specs, and criterion 3.12.

### F3 — .client.ts suffix carries two opposite meanings

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 change 3; Phase 3 change 2
- **Detail**: `openlibrary.client.ts` was a server-side outbound HTTP client while `isbn-lookup.client.ts` is a browser-side wrapper — the same suffix on opposite sides of the network boundary, in a framework where "client" already means "runs in the browser".
- **Fix**: Rename the server-side one to `openlibrary.gateway.ts`.
- **Decision**: FIXED. Renamed throughout the plan, including its spec path and the What-We're-NOT-Doing rationale.

### F4 — OPENLIBRARY_CONTACT silently does nothing in production

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 change 3
- **Detail**: The variable was chosen specifically to earn the 3 req/s tier, but the gateway omits the header silently when it is unset, no phase documented it, the repo has no `.env.example`, and no phase set it on Vercel. The benefit that justified the decision would never have materialised.
- **Fix**: Add an explicit Phase 2 change covering the README entry and the Vercel setting, plus a manual criterion asserting the header actually goes out.
- **Decision**: FIXED. New Phase 2 change 3 and criterion 2.8.

### F5 — ISBN input's controlled/uncontrolled status is unspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 change 3
- **Detail**: The contract specified `title`/`author` as controlled and `notes` as uncontrolled but never said which the ISBN input was, even though the lookup button reads its value. No spec case covered the in-flight status state either.
- **Fix**: State that the ISBN input is controlled and add a searching-state spec case.
- **Decision**: FIXED. Also added a session-expired status state, following from F1.

### F6 — Migration criteria leave the column dropped

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 criteria 1.4 / 1.5
- **Detail**: 1.4 ran the migration and 1.5 reverted it, with nothing re-running it, so Phases 2 and 3 would start against a table with no `isbn` column.
- **Fix**: Reword 1.5 as "reverts and re-applies cleanly".
- **Decision**: FIXED.

## Triage Summary

| Outcome | Findings |
|---------|----------|
| Fixed | F1 (Fix A), F2 (drop msw), F3, F4, F5, F6, F7 — **7** |
| Skipped / Accepted / Dismissed | none |

**Verdict after fixes: SOUND.** The approach was never in question; two contract-level claims were factually wrong and both are now corrected against verified evidence. One recurring rule was extracted to `context/foundation/lessons.md`.
