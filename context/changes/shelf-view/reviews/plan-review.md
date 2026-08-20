<!-- PLAN-REVIEW-REPORT -->
# Plan Review: S-09 Shelf View

- **Plan**: context/changes/shelf-view/plan.md
- **Mode**: Deep
- **Date**: 2026-08-20
- **Verdict**: REVISE → SOUND after triage (all 3 findings fixed)
- **Findings**: 1 critical, 2 warnings — all FIXED

## Verdicts

| Dimension | Verdict (post-triage) |
|-----------|-----------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS (was FAIL — fixed) |
| Blind Spots | PASS (was WARNING — fixed) |
| Plan Completeness | PASS (was WARNING — fixed) |

## Grounding

11/11 paths ✓, all design.html line refs verified accurate ✓, brief↔plan ✓

## Findings

### F1 — Folding row components into list files breaks per-book action-state isolation

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 change 3 (book-row.tsx → book-list.tsx), Phase 3 change 3 (discover-book-row.tsx → discover-search.tsx)
- **Detail**: Both phases delete the per-book row component and fold its logic into the list component. Two consequences: (1) it directly violates AGENTS.md:18 ("Every component should be in separate file") and reverses a pattern every S-08 phase followed without exception. (2) It removes the natural component-instance boundary that today makes per-book `useActionState` (delete/borrow) trivially correct — each row is its own live instance today; once only one `Drawer` is conditionally rendered for the selected book, that hook has to live in the single list component, and nothing in the plan addresses whether/how it resets between selections. Without an explicit reset mechanism, a stale error from book A could show in book B's drawer.
- **Fix A ⭐ Recommended**: Keep dedicated per-book components
  - Strength: Restores AGENTS.md:18 compliance and the unbroken S-08 precedent; per-book `useActionState` isolation comes back for free.
  - Tradeoff: Slightly more DOM (one closed Drawer per book) — negligible given the plan's own deferred-scale decision.
  - Confidence: HIGH — matches the established, working S-08 pattern across 5 prior conversions.
  - Blind spot: None significant.
- **Fix B**: Keep the single-file consolidation, add an explicit `key=`
  - Strength: Smaller diff — only book-list.tsx/discover-search.tsx change.
  - Tradeoff: Still violates AGENTS.md:18; correctness depends on placing `key={selectedBook.id}` at exactly the right subtree boundary.
  - Confidence: MEDIUM — standard React pattern, but unverified against this exact Server Actions integration.
  - Blind spot: Haven't confirmed useActionState resets cleanly on remount here.
- **Decision**: FIXED (Fix A — book-row.tsx/discover-book-row.tsx kept as separate files, restyled in place; new src/lib/spine-style.utils.ts extracted so Drawer's caller and Spine derive the same color independently)

### F2 — Drawer/EditBookModal mutual exclusivity isn't structurally guaranteed

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 change 3
- **Detail**: book-list.tsx keeps `editingId` state (drives EditBookModal) and gains a second, independent useState for the drawer's selected book (drives Drawer). The plan's prose says Edit "closes drawer, opens EditBookModal" but never states the exact mechanism — nothing structurally prevents both dialogs being open simultaneously.
- **Fix**: Add to Phase 2's Contract: either derive Drawer's `open` as `selectedId !== null && editingId === null`, or have Edit's onClick explicitly clear the drawer's selection before setting editingId.
- **Decision**: FIXED (resolved as a side effect of F1's Fix A — drawer-open state is now local to book-row.tsx; its Edit button's onClick closes the drawer synchronously before notifying the parent, with nothing to coordinate across two independent list-level state variables)

### F3 — Test fixture edit surface not mentioned in Phase 2/3's Contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change 4 (Specs), Phase 3 change 4 (Specs)
- **Detail**: `isbn: string | null` is required (not optional). Existing CollectionBook/DiscoverBook literal fixtures in test/.../book-list.spec.tsx:14-21, test/.../edit-book-modal.spec.tsx:16-22, and test/.../discover-search.spec.tsx:30-47 (two literals) fail to type-check until isbn is added. The plan's Contract text never mentions these.
- **Fix**: Add "update existing CollectionBook/DiscoverBook test fixture literals with an isbn value" to Phase 2 and Phase 3's Specs contract text, naming the 3 files.
- **Decision**: FIXED (resolved while applying F1 — Phase 2/3's Specs contracts now explicitly name book-list.spec.tsx, edit-book-modal.spec.tsx, and discover-search.spec.tsx as needing an isbn value on their existing fixture literals)
