<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-12 Post-Launch UX Polish

- **Plan**: `context/changes/ux-polish/plan.md`
- **Scope**: Phase 4 of 4 (full plan)
- **Date**: 2026-09-02
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Evidence

- Full test suite: 468/469 pass. The 1 failure (`test/server/account-deletion/account-deletion.repository.spec.ts`) is a pre-existing Neon DB-latency timeout, confirmed flaky by re-running it in isolation (failed once, passed on immediate retry) earlier in this implementation session; not touched by any file in this plan.
- `npm run lint`: clean.
- `npx tsc --noEmit`: 2 pre-existing errors in `test/app/forgot-password/actions.spec.ts` and `test/app/reset-password/actions.spec.ts`, unrelated to this plan (predate it, untouched by it).
- `grep -rn "window.confirm" src/`: zero matches — the app-wide `ConfirmModal` migration (Phase 3) is complete.
- All 4 phases' "Changes Required" verified file-by-file against the actual code: MATCH on every planned change, including the three scope additions (ConfirmModal app-wide, `useSyncExternalStore` adaptation, `<main>` width removal), all of which carry an explicit "Scope addition"/"Implementation note" in `plan.md` and a Key Decisions row + Open Risks entry in `plan-brief.md`.
- Every Manual Progress row has a traceable, non-rubber-stamped confirmation in the conversation — several phases surfaced real developer feedback (centered text, fit-content modal, `<main>` right-edge) that was implemented and re-verified before the row was checked, not blanket-approved.

## Findings

### F1 — Modal's new sizeClassName prop and ConfirmModal's fit-content styling were undocumented

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `src/app/_components/modal.tsx:11,23-24,65`; `src/app/_components/confirm-modal.tsx:31,33-34`
- **Detail**: `Modal` gained a public `sizeClassName` prop (default unchanged, so `AddBookModal`/`EditBookModal` are unaffected) and `ConfirmModal` uses it (`w-fit max-w-[90vw]`) plus centers its message/buttons — both from user feedback during Phase 3 manual verification, already committed in `604820e`. Unlike this plan's other two scope additions (ConfirmModal app-wide rollout, `<main>` width removal), neither got a "Scope addition" note, a Key Decisions row, or an Open Risks entry at the time — a real gap against the documentation discipline this plan otherwise applied consistently.
- **Fix**: Add a "Further scope addition" note to Phase 3, Change 4's Contract in `plan.md`, plus a Key Decisions row and an Open Risks entry in `plan-brief.md`, mirroring the treatment given to the other two additions.
- **Decision**: FIXED — note added to `plan.md` (Phase 3, Change 4), Key Decisions row + Open Risks entry added to `plan-brief.md`. Documentation only, no code change.
