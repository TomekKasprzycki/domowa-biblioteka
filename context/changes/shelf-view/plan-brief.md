# S-09: Shelf View — Plan Brief

> Full plan: `context/changes/shelf-view/plan.md`

## What & Why

Replace the `Card`-row book lists on `/collection` and `/discover` with `design.html`'s signature shelf-of-spines display — colored vertical spines standing on a shelf ledge, sized and colored deterministically from each title. Selecting a spine opens a right-side detail drawer carrying that book's title, author, ISBN, and its actions (edit/delete for your own books, request-to-borrow for a friend's). This is the second of the two mockup-driven visual changes (S-08 did tokens/primitives/sidebar; S-09 changes how books themselves are presented and acted on).

## Starting Point

Both pages already use S-08's `Card` primitive for a plain row-list view — an intentional interim look, since S-08 explicitly deferred the shelf/spine paradigm to this change. `Avatar` already ports the mockup's exact hash-color algorithm (for person initials); `Modal` already solves native-`<dialog>` open/close/focus-trap plumbing. Both are reused, not rebuilt.

## Desired End State

`/collection`: your books stand on a shelf as colored spines; click one to see its title, author, ISBN (or "added manually" if none), and Edit/Delete. `/discover`: a friend's books render the same way, with a small tag on unavailable spines ("On loan" / "Requested" / "Borrowed by you") and a matching status + borrow action in the drawer.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scale (150+ books) | Ship shelf as-is, no search/toggle | Mockup only shows ~10; defer scale mitigation until real usage proves it's a problem | Plan (user-confirmed) |
| Delete's new home | Add to drawer next to Edit | Mockup's own-book drawer has no Delete, but the existing Delete button needs somewhere to live | Plan (user-confirmed) |
| Spine-tag content | Reuse the 3 existing availability labels | Zero new copy/logic — same branching `discover-book-row.tsx` already has | Plan (user-confirmed) |
| Edit action wiring | Reuse existing `EditBookModal` | Mirrors the mockup's own close-drawer-then-open-modal sequencing; zero new form code | Plan (user-confirmed) |
| Drawer deep-linking | No URL sync, plain client state | Matches how `EditBookModal`/`AddBookModal` already manage open state | Plan (user-confirmed) |
| Mobile drawer width | Rely on mockup's own `max-width:90vw` | 340px against 375px is already ~90% width — no extra breakpoint needed | Plan (user-confirmed) |
| Modal vs. Drawer code sharing | Duplicate the small open/close effect, don't extract a shared hook | Two visually unrelated shapes (centered vs. sliding panel) aren't worth coupling for ~10 lines | Plan |
| Hash algorithm reuse | Extract `Avatar`'s existing hash into a shared util, `Spine` imports it | Avoids a third copy of the same algorithm; behavior-neutral refactor | Plan |
| Row component ownership | Keep `book-row.tsx`/`discover-book-row.tsx` as separate files, restyled in place | Preserves AGENTS.md's one-component-per-file rule and gives per-book `useActionState` isolation for free | Plan review (F1) |
| Spine color sharing | Extract `spineStyleFor(title)` as its own shared util, not private to `Spine` | `Drawer`'s preview swatch needs the same color independently — the caller derives it, `Spine` doesn't report it back | Plan review (F1) |

## Scope

**In scope:**
- `Spine`, `Shelf`, `Drawer` primitives (Phase 1)
- `/collection` shelf + drawer conversion, including Edit/Delete (Phase 2)
- `/discover` shelf + drawer conversion, including availability tags/status/borrow (Phase 3)
- `isbn` threaded into `CollectionBook`/`DiscoverBook` (already stored, not yet exposed)

**Out of scope:**
- Search/filter on `/collection`, or a list/shelf view toggle
- URL-deep-linkable drawer state
- Any change to Server Action logic (`deleteBookAction`, `updateBookAction`, `requestBorrowAction`)
- `/friends`, `/requests`, `/borrowing` (stay on S-08's `LibraryCard`/`Card`)
- i18n

## Architecture / Approach

Bottom-up like S-08: build the 4 new primitives/utils in isolation first (nothing consumes them), then convert Collection, then Discover — each phase a complete, independently-verifiable vertical slice. `Drawer` is a dumb slot-based shell (title/author/isbn/spineColor/statusSlot/actionsSlot); each row component (`book-row.tsx`/`discover-book-row.tsx`, kept as separate files per the plan review) composes its own drawer content and owns its own drawer-open state and action hook, mirroring how each row already owns these things today.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Primitives | `Spine`, `Shelf`, `Drawer`, spec'd, unconsumed | Getting the hash-derived sizing/coloring formula pixel-exact to the mockup |
| 2. Collection | Shelf + drawer with Edit/Delete replaces the card list | Re-targeting existing delete/loan-guard specs onto the new interaction path without losing coverage |
| 3. Discover | Shelf + drawer with availability tags/borrow replaces the card list | 4-state availability branching (available/on-loan/requested/borrowed-by-you) must stay correct once moved off `Pill` text |

**Prerequisites:** S-08 (design-system) — done.
**Estimated effort:** ~3 sessions across 3 phases, similar granularity to S-08's later phases.

## Open Risks & Assumptions

- Shelf scale at 150+ books is explicitly deferred, not solved — if real usage shows it's unusable, that's a follow-up slice (search bar or list/shelf toggle), not a defect in this plan.
- The own-book drawer omits `design.html`'s "W Twojej kolekcji" ("In your collection") status pill entirely (adds no information the page context doesn't already give) — a second small, deliberate deviation from the mockup's own-book drawer content, alongside the already-decided Delete addition.

## Success Criteria (Summary)

- Both pages render a shelf of correctly colored/sized spines instead of card rows.
- Every existing behavior (edit, delete, loan-guard, borrow, availability states, empty states) still works, reachable through the spine → drawer flow.
- Full regression: every pre-existing spec passes unmodified in intent (re-targeted where the interaction path changed).
