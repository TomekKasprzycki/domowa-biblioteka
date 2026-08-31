<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-11 Forgot Password Implementation Plan

- **Plan**: context/changes/forgot-password/plan.md
- **Scope**: All 3 phases
- **Date**: 2026-08-31
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Expired token rows are never cleaned up

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/server/password-reset/password-reset.repository.ts:44-46
- **Detail**: When `resetPasswordWithToken` found an expired row, it returned `"invalid"` without deleting it. Confirmed by the Phase 1 spec, which explicitly asserted the expired row survived. Bounded to at most one row per user (create-time delete-then-insert), and already named in the plan's "What We're NOT Doing" (cleanup of expired, never-used tokens) — this extended that same accepted gap to the expired-and-clicked case too.
- **Fix**: Delete the row when expiry is detected, inside the same transaction.
- **Decision**: FIXED — deleted the row on expiry-detection inside the existing transaction; updated the Phase 1 spec to assert the row is gone afterward. Verified with `npm test` (434/434), `npm run build`, `npm run lint`.

### F2 — Raw reset token travels as a URL query parameter

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/forgot-password/actions.ts:31, src/app/reset-password/page.tsx
- **Detail**: The token lands in browser history and server/proxy access logs via the query string, and could leak via a `Referer` header if the reset-password page ever loads a third-party resource (it doesn't today). Standard pattern for emailed reset links.
- **Fix**: No action needed now; worth a one-line note if a future change ever adds third-party resources to `/reset-password`.
- **Decision**: SKIPPED — accepted as standard practice, no active leak vector today.

### F3 — Unrelated file landed in the Phase 3 commit

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: context/design/todo.md (commit 5da3a9c)
- **Detail**: A pre-existing, untracked design-notes file (harmless Polish-language todo list, no secrets) got staged outside this session's tool calls and landed in the Phase 3 commit.
- **Fix**: N/A
- **Decision**: ACCEPTED — resolved during implementation; user chose to leave it as-is (2026-08-31) rather than rewrite history.
