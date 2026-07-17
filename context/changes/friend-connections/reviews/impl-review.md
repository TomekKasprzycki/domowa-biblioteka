<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Friend Connections (S-02)

- **Plan**: context/changes/friend-connections/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-07-17
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

Automated criteria at review time: `npx tsc --noEmit` PASS, `npm run lint` PASS, `npm test` 56/56 PASS (8 suites).

## Findings

### F1 — AGENTS.md gained an unplanned rule line

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: AGENTS.md:19
- **Detail**: A new hard rule ("When using enum strings, create a const using values marked as const and create a type from them using the key of that const.") was added on this branch but is not mentioned in plan.md. Benign — it documents the `FriendConnectionStatus` const+`keyof` pattern introduced in friend-connection.types.ts — but it edits the governance doc outside the plan's declared scope.
- **Fix**: Add a one-line addendum to plan.md noting the AGENTS.md update, so the plan stays the record of what this change touched.
- **Decision**: FIXED (addendum added to plan.md "## Addenda")

### F2 — Intra-feature imports are relative, not @/*

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Pattern Consistency
- **Location**: src/app/friends/_components/*.tsx, page.tsx
- **Detail**: New components imported via "../actions" and "./sibling". AGENTS.md mandates the @/* alias instead of relative ../ imports. Consistent with merged S-01 collection code, which uses the same relative style.
- **Fix**: Convert friends _components + page.tsx imports to @/* (or defer to a repo-wide cleanup).
- **Decision**: ACCEPTED-AS-RULE (lessons.md: "Intra-feature imports: @/* alias vs relative paths") + FIXED (friends folder converted to @/*; collection left for a future repo-wide pass)

### F3 — Component prop types declared inline, not in *.types.ts

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Pattern Consistency
- **Location**: received-invites-list.tsx, friends-list.tsx
- **Detail**: `ReceivedInvite` and `Friend` prop types were declared inline in their component files. AGENTS.md says types/interfaces belong in *.types.ts. Mirrors S-01's inline `Book` type. (Related: no *.spec.tsx for the 5 components — explicitly waived by the plan's "What We're NOT Doing", matching S-01.)
- **Fix**: Extract the two prop types into src/app/friends/friends.types.ts.
- **Decision**: ACCEPTED-AS-RULE (lessons.md: "Component prop types: inline vs *.types.ts") + FIXED (extracted into src/app/friends/friends.types.ts; imports rewired)

## Triage Summary

- Fixed: F1
- Rule + Fixed: F2, F3
- Skipped: none
- Accepted (no fix): none

Post-triage automated state: `npx tsc --noEmit` PASS, `npm run lint` PASS.
