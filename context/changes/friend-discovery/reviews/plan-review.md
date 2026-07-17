<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Friend Discovery (S-03)

- **Plan**: context/changes/friend-discovery/plan.md
- **Mode**: Deep
- **Date**: 2026-07-17
- **Verdict**: SOUND (after fixes)
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING (F1, now fixed) |
| Plan Completeness | PASS |

## Grounding

11/11 paths ✓, reused symbols verified (`findByUserId`, `findConnectionBetween`, `findFriends`, `otherUserOf`), logged-out-redirect claim verified against `src/auth.config.ts` publicPaths, Progress↔Phase consistency ✓, `plan-brief.md` absent (write was declined during planning).

## Findings

### F1 — Malformed `friend` param crashes instead of redirecting

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots (+ End-State promise gap)
- **Location**: Phase 2 (discover/page.tsx access gate) vs Phase 3 manual criterion 3.5
- **Detail**: Phase 3's manual verification promises "no crash on a malformed non-uuid value" for `/discover?friend=<x>`, but the plan routed the raw param into `isConfirmedFriend` → `findConnectionBetween`, which runs `WHERE addresseeId = '<x>'` against a `uuid` column (verified: `friend-connection.entity.ts` requesterId/addresseeId are `type: "uuid"`). A non-uuid value makes Postgres raise `invalid input syntax for type uuid` — a 500, not the promised redirect. No phase guarded the param.
- **Fix A ⭐ Recommended**: Gate on the already-fetched `findFriendUsers` list (`friends.some(f => f.id === friendParam)`) instead of a separate `isConfirmedFriend` DB call; non-matching/malformed values never reach the DB, redirect cleanly, and a redundant round-trip is removed.
  - Strength: `findFriendUsers` is already fetched two lines up; string compare can't throw a uuid error.
  - Tradeoff: `isConfirmedFriend` then has no caller in this slice (see F2).
  - Confidence: HIGH.
  - Blind spot: None significant.
- **Fix B**: uuid-guard the param with `z.uuid()` (established: bookIdSchema, connectionIdSchema) before `isConfirmedFriend`; invalid format → same redirect. Keeps the extra DB round-trip.
- **Decision**: FIXED via Fix A — updated Phase 2 page contract, the `redirect()` + new uuid-crash notes in Critical Implementation Details, and the Phase 2 page-spec contract (now covers valid-non-friend AND malformed-non-uuid, both redirecting).

### F2 — isConfirmedFriend unused this slice (after F1 Fix A)

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 1 item 2
- **Detail**: With F1 Fix A, the `/discover` page derives friend membership from the fetched list, leaving `isConfirmedFriend` with no caller this slice — built and tested purely as S-04 groundwork.
- **Fix**: Keep it, explicitly labeled S-04 groundwork in the plan.
- **Decision**: FIXED — Phase 1 item 2 now labels `isConfirmedFriend` as S-04 groundwork and notes the page does not call it.
