<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-09 Shelf View

- **Plan**: context/changes/shelf-view/plan.md
- **Scope**: Full plan (Phases 1–3 of 3)
- **Commits**: a19c771, 39e4b28, 33272bd, 6d9ce00
- **Date**: 2026-08-21
- **Verdict**: REJECTED (one blocking user-visible regression; everything else is warnings/observations)
- **Findings**: 1 critical, 6 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | PASS |
| Safety & Quality | FAIL |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

Architecture note: the per-book `<Drawer>` design was load-tested against a synthetic 150-book render (PRD's stated scale) — 2,382 DOM elements (~1.4× the prior Card-row markup), no quadratic behavior, closed `<dialog>`s cost nothing (UA `display:none`). The design holds; PASS is genuine, not a pass-by-default.

Success Criteria note: `tsc`, `lint`, `build` clean; all 13 S-09-touched spec suites green (84 tests). Full `npm test` intermittently fails 8 DB-integration suites against a remote Neon Postgres under Jest's parallel workers (`AggregateError`, connection-pool/cold-start related) — confirmed environmental (passes in isolation, passed 390/390 full-suite earlier this session), not a code regression. WARNING is solely for F7 (manual criteria checked off without a confirmed browser pass).

## Findings

### F1 — /discover no longer shows who owns a book

- **Severity**: CRITICAL
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality (functional regression)
- **Location**: src/app/(app)/discover/_components/discover-book-row.tsx:32-79
- **Detail**: The old row rendered `Owned by {book.owner.name}` and `book.notes`. The new Spine+Drawer composition renders neither. `book.owner` now appears exactly once in the whole discover UI — as the filter predicate in discover-search.tsx:39 — never displayed. The friend filter defaults to "All friends", so the common case mixes several friends' books on one shelf with no way to tell whose spine is whose, before or after opening the drawer. Not caught by the plan: Phase 3's drawer contract never mentions owner (contrast Phase 2, where notes/loan status were deliberately routed through statusSlot).
- **Fix**: Render `Owned by {book.owner.name}` in the discover drawer, and fold owner into the spine's accessible name (`View {title}, {author}, owned by {owner}`). Decide separately whether `book.notes` returns or is recorded as an intentional drop.
  - Strength: Restores core page context with no data-layer change — owner is already fetched and typed.
  - Tradeoff: Needs a deliberate call on notes rather than leaving them silently gone.
  - Confidence: HIGH — verified by grep that owner is display-dead, and by reading the pre-change component.
  - Blind spot: Whether notes should return is a product call, not a code call.
- **Decision**: FIXED — added an `owner?` prop to `Spine` (folded into aria-label + tooltip only) and a "Owned by {name}" line in the discover drawer's `statusSlot`, above the availability `Pill`. `book.notes` intentionally left dropped per the user's scoping. Covered by new specs in `spine.spec.tsx` and `discover-book-row.spec.tsx`.

### F2 — Plan text and shipped code now assert opposite things

- **Severity**: WARNING
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: context/changes/shelf-view/plan.md (Key Discoveries) vs src/lib/spine-style.utils.ts, book-row.tsx:54-67
- **Detail**: Phase 2's commit (39e4b28) reworked Phase-1 primitives beyond its declared scope, and plan.md was never amended (`git diff a19c771..HEAD -- plan.md` is checkbox-only). Four contradictions: palette (8 planned vs 12 shipped), height formula (`148+hash%65` planned, explicitly "not an approximation" vs. title-length-aware shipped), onPaper mechanism (`color===last entry` planned vs. luminance threshold shipped), and book-row's `statusSlot` (planned `undefined`, ships notes+loan). All four are defensible and documented in commit bodies ("Iterated live with the user..."); the `statusSlot` case is the implementation correctly filling a plan gap. This is a traceability failure, not a quality failure.
- **Fix A ⭐ Recommended**: Amend plan.md's Key Discoveries to describe what shipped, with the live-iteration rationale.
  - Strength: Keeps the improvements (better than the mockup); restores the plan as usable ground truth for future review/archive.
  - Tradeoff: Editing a plan post-hoc.
  - Confidence: HIGH — code is shipped, verified, visually confirmed during Phase 2.
  - Blind spot: None significant.
- **Fix B**: Revert spine-style.utils.ts to the mockup's exact formulas.
  - Strength: Strict plan fidelity.
  - Tradeoff: Reintroduces the color collisions and title truncation the live iteration fixed.
  - Confidence: LOW — undoes verified manual feedback.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — amended plan.md's Key Discoveries (spine sizing, palette/onPaper, own-book statusSlot) to describe what shipped and why, plus a new bullet documenting F1's post-hoc owner fix.

### F3 — List semantics lost on both shelves

- **Severity**: WARNING
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency / Accessibility
- **Location**: src/app/_components/shelf.tsx:5, book-list.tsx:23, discover-search.tsx:72
- **Detail**: `<Shelf>` renders a bare `<div>` with loose buttons/dialogs — no `<li>`, no list roles. Screen readers no longer announce "list, N items" or position-in-set, which matters most with many near-identical spine names. `book-list.spec.tsx`'s prior `getAllByRole("listitem")` assertion was deleted, not replaced.
- **Fix**: Give `Shelf` `role="list"` and wrap each row's spine in `<div role="listitem">`; restore a count assertion.
  - Strength: Recovers semantics with no visual change.
  - Tradeoff: Touches Shelf plus both row components.
  - Confidence: HIGH — role-based approach sidesteps the flex/`<li>` layout issue.
  - Blind spot: Confirm the dialog sits outside the listitem wrapper.
- **Decision**: FIXED — `Shelf` now has `role="list"` (ledge marked `role="presentation"`); both `BookRow` and `DiscoverBookRow` wrap their `Spine`+`Drawer` pair in `<div role="listitem">`. Restored count assertions in `book-list.spec.tsx`/`discover-search.spec.tsx`, added a `role="list"` assertion to `shelf.spec.tsx`.

### F4 — Availability legend now contradicts what's on screen

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (misleading UI)
- **Location**: src/app/(app)/discover/page.tsx:78-79
- **Detail**: The green/blue "Available"/"Unavailable" legend was accurate when rows carried green/blue Pills. Spine color is now `SPINE_PALETTE[hash % 12]` — hash-assigned, unrelated to availability. The legend actively teaches a false color mapping.
- **Fix**: Remove the legend from /discover, or re-point its copy at the spine tag rather than color.
- **Decision**: FIXED — removed the legend block and its import from `discover/page.tsx`, with an inline comment explaining why. Deleted the now-unused `AvailabilityLegendItem` component and its spec (no other callers).

### F5 — Spine's aria-label suppresses the availability tag

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (accessibility)
- **Location**: src/app/_components/spine.tsx:68
- **Detail**: `aria-label` replaces inner content for assistive tech, and the tag chip renders inside the same button. So "On loan"/"Requested"/"Borrowed by you" is never announced — a screen-reader user must open every drawer to learn what's visible at a glance.
- **Fix**: `aria-label={\`View ${title}, ${author}${tag ? \`, ${tag}\` : ""}\`}`
- **Decision**: FIXED — tag folded into `Spine`'s aria-label (after owner, per F1), with a comment explaining why. Covered by a new spec in `spine.spec.tsx`.

### F6 — Drawer's spec covers far less than Modal's

- **Severity**: WARNING
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria / Pattern Consistency
- **Location**: test/app/_components/drawer.spec.tsx
- **Detail**: Drawer duplicates Modal's native-`<dialog>` contract but its spec omits what modal.spec.tsx already covers with existing helpers: accessible name, Escape (`pressEscape` helper imported but unused), backdrop click (untested, and for a 340px panel most of the viewport is backdrop). Also missing the plan's enumerated "actionsSlot absent" case.
- **Fix**: Port modal.spec.tsx's accessible-name, Escape, and backdrop-click cases into drawer.spec.tsx, plus the missing actionsSlot-absent case (~40 lines against an existing template).
  - Strength: Closes gaps on the most likely dismissal bugs using a proven template.
  - Tradeoff: Test-only work, no user-visible payoff today.
  - Confidence: HIGH — modal.spec.tsx is a direct model.
  - Blind spot: jsdom can't fully model focus; focus-return stays unverified by automation.
- **Decision**: FIXED — ported accessible-name, backdrop-click, content-click, and Escape cases from `modal.spec.tsx`, plus the missing "actionsSlot absent" case. The Escape assertion deliberately checks `onClose` fired at all rather than exactly once, with a comment cross-referencing F10(b) (the double-fire is real but tracked separately, not fixed here).

### F7 — Manual criteria 3.5/3.6 were checked off without manual confirmation

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/shelf-view/plan.md (Progress, 3.5-3.6)
- **Detail**: The Phase 3 gate asked for a browser pass over 4 availability states, drawer actions, borrow end-to-end, and 375px layout. The reply was "jest ok," which reads as acknowledging the automated suite, not a browser pass. Both manual rows were flipped and stamped 33272bd anyway. Contrast Phase 2, whose commit body records genuine live iteration with specific visual fixes — 2.5/2.6 are properly earned there. F1 is exactly the class of bug a real /discover pass would have caught.
- **Fix**: Re-open 3.5/3.6 as pending until /discover is actually exercised in a browser (this will also confirm F1's fix).
- **Decision**: FIXED — flipped Progress rows 3.5/3.6 back to `[ ]` in plan.md, each with a note pointing at this finding. `change.md` stays `status: impl_reviewed`; closing 3.5/3.6 with a real browser pass is follow-up work outside this review.

### F8 — Drawer title is a `<div>`; Modal uses `<h2>`

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/_components/drawer.tsx:67
- **Detail**: modal.tsx:65 renders `<h2 id={titleId}>`; Drawer uses a `<div>`. Accessible name still resolves via aria-labelledby, but the dialog has no heading for heading-navigation to find.
- **Fix**: Change to `<h2 id={titleId}>` keeping the existing classes (zero visual change).
- **Decision**: FIXED — `drawer.tsx` now renders `<h2 id={titleId}>` in place of the `<div>`, same classes, no visual change.

### F9 — Spine's undeclared `isbn` prop is used by only one of two callers

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence / Pattern Consistency
- **Location**: src/app/_components/spine.tsx:44,57; book-row.tsx:44 vs discover-book-row.tsx
- **Detail**: Spine gained an `isbn?` prop (not in the plan) feeding only the native title tooltip. book-row passes it; discover-book-row doesn't, so collection spines show ISBN on hover and discover spines don't, unexplained. Tooltip-only exposure is also mouse-only (aria-label suppresses `title` for AT; touch never sees it) — but the drawer shows ISBN properly regardless.
- **Fix**: Pass `isbn={book.isbn}` in discover-book-row too, or drop the prop from Spine and let the drawer own ISBN entirely.
- **Decision**: FIXED — `discover-book-row.tsx` now passes `isbn={book.isbn}` to `Spine`, matching `book-row.tsx`.

### F10 — Three minor items worth recording, none blocking

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: spine-style.utils.ts:56-61, drawer.tsx:45-46, shelf.tsx:7
- **Detail**:
  (a) `relativeLuminance` skips the sRGB→linear transfer function (brightness average, not WCAG luminance). Classifies all 12 current palette entries correctly by accident; `#3C8759` under `text-white/95` at 12.5px is ≈4.4:1, just under AA's 4.5:1.
  (b) `onCancel={onClose}` + `onClose={onClose}` means onClose fires twice per Escape dismissal. Harmless today (idempotent consumers) but diverges from Modal's contract.
  (c) Shelf's ledge is one absolutely-positioned div at the container's bottom; at ~150 books (~12 wrapped rows) only the last row gets a plank. Inherited from the mockup, never shown at this scale there.
- **Fix**: (a) use the WCAG transfer function and assert specific palette classifications; (b) drop `onCancel={onClose}`; (c) accept and record alongside the plan's existing "scale is deliberately deferred" decision.
- **Decision**: FIXED (a, b) / ACCEPTED (c) — `relativeLuminance` now applies the sRGB→linear transfer function; `onPaper` picks whichever of {dark text, white text} gives the higher WCAG contrast ratio against the background rather than testing a magic threshold (same classification result for all 12 current palette entries — 5 light/7 dark — confirmed by direct computation, so no visual change). Added two spec cases pinning specific palette-index classifications, including the borderline green-500 case, via a brute-force title probe against the unexported palette. Dropped `onCancel={onClose}` from `drawer.tsx`; Escape now fires `onClose` exactly once (tightened F6's Escape spec accordingly). (c) — the single-ledge-per-shelf limit at ~150 books is accepted, unchanged, consistent with the plan's existing "scale is deliberately deferred" decision.
