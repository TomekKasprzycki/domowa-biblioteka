# S-09: Shelf View — Implementation Plan

## Overview

Replace the `Card`-row book lists on `/collection` and `/discover` with `design.html`'s signature shelf-of-spines display, and move per-book actions (edit, delete, request-to-borrow) from inline row buttons into a right-side detail drawer opened by clicking a spine.

## Current State Analysis

- **`/collection`**: `CollectionBook[]` renders via `BookList` → `BookRow` (`Card`-based `<li>`, inline `Edit`/`Delete` `Button`s), editing via `EditBookModal` (`Field`-based form + `updateBookAction`), adding via `AddBookModal`/`AddBookForm`. No search/filter exists on this page. `collection.types.ts`'s `CollectionBook` has no `isbn` field.
- **`/discover`**: `DiscoverBook[]` renders via `DiscoverSearch` → `DiscoverBookRow` (`Card`-based `<li>`, `Pill` availability badge collapsed to 3 tones per S-08, inline `Borrow` `Button`/form using `requestBorrowAction`). The availability legend already exists as `AvailabilityLegendItem` (green=available/blue=unavailable dots) above where the shelf will sit. `discover.types.ts`'s `DiscoverBook` also has no `isbn` field.
- **`Avatar`** (`src/app/_components/avatar.tsx:19-26`) already ports the mockup's `hashStr()` algorithm verbatim for deterministic per-name color — the exact algorithm the spine needs, just against a different palette/dimension mapping.
- **`Modal`** (`src/app/_components/modal.tsx`) is a native-`<dialog>` wrapper (`open`/`onClose`/`title`/`children`/`canClose`) with focus-trap, Esc-veto via `canClose`, and backdrop-click handling already solved. `EditBookModal`/`AddBookModal` are the established consumer pattern this plan's `Drawer` will echo (not extend — see Key Discoveries).
- **`deleteBookAction`, `updateBookAction` (via `EditBookModal`), `requestBorrowAction`** are existing, unchanged Server Actions (`(app)/collection/actions.ts`, `app/borrow/actions.ts`) — this slice rewires which UI element triggers them, not their logic.
- **`book.entity.ts:29-30`**'s `isbn: string | null` column already exists (S-07) and is already returned by `findByUserId`/`findByOwnerIds` (plain TypeORM `.find()`, no column-select narrowing) — threading it into the two plain types + page mappings is additive, not a repository change.
- **Zero existing specs assert on CSS classes** (confirmed via S-08's own audit, unchanged since). Any spec that breaks during this change is a genuine behavior regression.

## Desired End State

`/collection` shows the user's books as a shelf of colored spines (hash-derived color/height/width from title, matching the mockup and `Avatar`'s existing algorithm); clicking a spine opens a right-side drawer showing title, author, ISBN (or an italic "No ISBN — added manually" note), and Edit + Delete actions. `/discover` shows a friend's books the same way, with an "On loan" / "Requested" / "Borrowed by you" tag on unavailable spines and a matching status pill + contextual action (request-to-borrow, or an informational note) in the drawer. Everything else from S-08 is unchanged — sidebar, tokens, existing modals, existing discover search/filter.

Verified by: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all green at every phase, plus manual desktop + 375px verification per phase.

### Key Discoveries:

- **Spine is always clickable in the mockup.** Both real call sites (`renderMyShelf`, `renderFriendShelf`) call `buildSpine(book, {clickable:true, ...})` — no non-interactive variant is ever used. `Spine` renders unconditionally as a `<button>` with a full `aria-label` (title + author), never a plain `<div>`.
- **Drawer content differs by context, so it stays a dumb slot-based shell** — title, author, an ISBN line, the spine's color (for the preview swatch), a `statusSlot` (`ReactNode`), and an `actionsSlot` (`ReactNode`). Own-book composition (no status pill, Edit+Delete actions) and friend's-book composition (status pill, one contextual action) both live in their feature consumer, not in the primitive — matching how `LibraryCard` stayed slot-based in S-08 rather than branching internally.
- **`Drawer` duplicates `Modal`'s small open/close `useEffect`, not extends it.** `Modal`'s dialog is centered via its own className; `Drawer` is a right-side sliding panel with entirely different positioning CSS (`design.html:418-425`: `position:fixed; top:0; right:0; bottom:0; width:340px; transform:translateX(100%)/translateX(0)`). The imperative `showModal()`/`close()` wiring is ~10 lines and genuinely identical, but forking `Modal` into a variant-prop primitive would couple two visually unrelated shapes into one component for a trivial amount of saved duplication — not worth it. `Drawer` is its own file.
- **Spine sizing must match the mockup's exact formula** (`design.html:705-706`): `height = 148 + (hash % 65)`, `width = 32 + (hash % 9)` px — not an approximation, since the visual rhythm of the shelf depends on this specific range.
- **One spine palette entry needs dark text, not white.** `spinePalette`'s last entry (`#ECF5EC`, a near-white green) triggers `design.html`'s `.on-paper` class, swapping the rotated title's text color from white to `--green-800` so it doesn't render white-on-near-white. Port this conditional (`color === palette[palette.length - 1]`) into `Spine`.
- **Scale is deliberately deferred (decided 2026-08-20).** The PRD's stated scale is 150+ books per user, and `change.md`'s open risk names this explicitly — but the mockup only ever shows ~10. This slice ships the shelf as-is (spines wrap via `flex-wrap`, the shelf just grows taller); no search bar is added to `/collection` and no list/shelf toggle is built. Revisit only if real usage shows it's actually a problem.
- **Delete gets a new home in the drawer (decided 2026-08-20).** `design.html`'s own-book drawer shows only an Edit action — no Delete. Since `book-row.tsx`'s working Delete button has nowhere else to live once inline row buttons are gone, the own-book drawer's `actionsSlot` gets both Edit and Delete. This is a deliberate, scoped deviation from the mockup's drawer content, not an oversight.
- **Spine-tag reuses the 3 existing availability labels (decided 2026-08-20).** `discover-book-row.tsx` already branches on `status`/`borrowedByViewer`/`requestedByViewer` to choose between "On loan", "Requested", and "Borrowed by you" (all currently `Pill tone="pending"` text). The friend's-shelf spine-tag reuses this exact branching and exact label text, just rendered as the spine's small tag chip instead of a `Pill` — no new copy, no new logic shape.
- **Edit routes through the existing `EditBookModal` (decided 2026-08-20).** The drawer's Edit action closes the drawer and opens `EditBookModal`, mirroring `design.html`'s own `closeDrawer(); openAddModal(book)` sequencing (`design.html:820`) — no second edit form gets built inside the drawer.
- **Drawer state is plain client-side React state, no URL sync (decided 2026-08-20).** Which book's drawer is open (if any) is local `useState` in the shelf's container component, matching how `EditBookModal`/`AddBookModal` already manage open state today. No `?book=<id>` query param.
- **No separate mobile treatment beyond the mockup's own `max-width:90vw` (decided 2026-08-20).** A 340px drawer against a 375px viewport is already ~90% width; this slice keeps that as the sole mobile behavior — no additional breakpoint-specific layout.
- **Row components stay separate files, per plan review F1 (decided 2026-08-20).** `book-row.tsx`/`discover-book-row.tsx` are kept, not deleted — each is repurposed to own its own `Spine`, its own `Drawer` instance (local `open` state), and its own `useActionState` for delete/borrow, exactly mirroring how each row already owns these things today. This preserves AGENTS.md:18's one-component-per-file rule and — more importantly — gives per-book action-state isolation for free: no shared list-level state, no risk of one book's stale error/pending state leaking into another's drawer once only one drawer is visible at a time. It also resolves the Drawer/EditBookModal mutual-exclusivity question (review F2) as a side effect — since drawer-open state is now local to the row, the Edit button's own `onClick` handler closes it in the same synchronous call that notifies the parent, with nothing to coordinate across two independent list-level state variables.
- **`spineStyleFor` is a shared utility, not private to `Spine` (decided 2026-08-20).** Since `Drawer` needs a `spineColor` prop for its preview swatch, and `Spine` needs the same title→color/height/width/onPaper derivation to render itself, both call the same exported `spineStyleFor(title)` independently rather than `Spine` computing it internally with no way for the caller to read it back out.

## What We're NOT Doing

- Not adding search/filter to `/collection`, and not building a list/shelf view toggle (see scale decision above) — deferred until real usage data says otherwise.
- Not deep-linking the drawer via URL query params.
- Not changing any Server Action logic (`deleteBookAction`, `updateBookAction`, `requestBorrowAction`) — only which UI element triggers them.
- Not touching `/friends`, `/requests`, `/borrowing` — those keep their S-08 `LibraryCard`/`Card` treatment; this slice is scoped to the two book-listing pages the mockup's shelf covers.
- Not adding i18n — UI stays English (standing decision from S-08/roadmap), translating the mockup's Polish copy the same way S-08 did.
- Not changing `middleware.ts`, `auth.config.ts`, or the sidebar.
- Not extracting `Modal`'s open/close effect into a shared hook with `Drawer` (see Key Discoveries) — small, deliberate duplication instead.

## Implementation Approach

Bottom-up, mirroring S-08: primitives first (Phase 1 — `Spine`, `Shelf`, `Drawer`, isolated and fully spec'd, nothing consumes them yet), then feature-by-feature (Phase 2 Collection, Phase 3 Discover), each phase a fully-working, independently-verifiable vertical slice.

## Critical Implementation Details

**`Avatar`'s hash algorithm gets extracted, not duplicated a third time.** `Avatar` already contains a private `hashString()` copy of the mockup's `hashStr()`. Phase 1 extracts this into a shared `src/lib/hash-string.utils.ts`, refactors `Avatar` to import it (behavior-neutral — `avatar.spec.tsx` must keep passing unmodified, since the algorithm's output is unchanged), and has a new `src/lib/spine-style.utils.ts` build on top of it.

**`book-row.tsx`/`discover-book-row.tsx` are restyled in place, not deleted.** Both keep their existing props (`book`, and `onEdit` for the collection row) and existing per-book `useActionState` ownership — only their rendered shape changes, from a `Card` row to a `Spine` + local-state `Drawer`. `book-list.tsx`/`discover-search.tsx` change only their outer wrapper (`Shelf` instead of `<ul>`); their own state (`editingId`, search/filter) is untouched.

---

## Phase 1: Shelf/Spine/Drawer Primitives

### Overview

Extract the shared hash utility, then build `Spine`, `Shelf`, and `Drawer` in isolation — fully spec'd, nothing in the app consumes them yet.

### Changes Required:

#### 1. Shared hash utility

**File**: `src/lib/hash-string.utils.ts` (new)

**Intent**: Single source of truth for "deterministic small int from a string," currently duplicated inside `Avatar` and about to be needed again by `Spine`.

**Contract**: Exports `hashString(value: string): number`, the exact algorithm `Avatar` currently has inline (`avatar.tsx:19-26`) — `Avatar` is refactored to import it instead of defining its own copy. No behavior change; `avatar.spec.tsx` passes unmodified.

#### 2. Spine style utility

**File**: `src/lib/spine-style.utils.ts` (new)

**Intent**: Single source of truth for "deterministic color/height/width/onPaper from a title" — `Spine` needs it to render itself, and any component rendering a `Drawer` needs the same derivation independently for the drawer's preview swatch (see Key Discoveries).

**Contract**: Exports `spineStyleFor(title: string): { color: string; height: number; width: number; onPaper: boolean }`, built on `hash-string.utils.ts`'s `hashString` against the mockup's 8-color `spinePalette` (`design.html:696`) and its exact height/width formulas (see Key Discoveries). `onPaper` is `true` iff `color` is the palette's near-white last entry — the same conditional `Spine` needs for text-color contrast.

#### 3. Spine

**File**: `src/app/_components/spine.tsx` (new)

**Intent**: A single clickable book spine — colored, sized, and vertically labeled deterministically from its title, per `design.html:702-734`'s `spineStyleFor`/`buildSpine`.

**Contract**: Props: `title: string`, `author: string`, `tag?: string` (the small chip for an unavailable friend's book — see Key Discoveries), `onClick: () => void`. Always renders a `<button>` (never a `<div>` — see Key Discoveries) with `aria-label` combining title and author, styled from `spineStyleFor(title)` (height/width/background, the near-white-palette-entry dark-text conditional), and the rotated `spine-title` text treatment (`design.html:262-275`).

#### 4. Shelf

**File**: `src/app/_components/shelf.tsx` (new)

**Intent**: The flex row + ledge visual that holds a set of spines — pure layout, no data opinion.

**Contract**: Props: `children: ReactNode`. Renders `design.html:226-241`'s `.shelf` row (flex, wrap, aligned to the bottom) plus its ledge (`::after`-equivalent) — no shelf-label caption (that's page-level composition, following how the Phase 6 legend was composed inline rather than baked into a primitive).

#### 5. Drawer

**File**: `src/app/_components/drawer.tsx` (new)

**Intent**: The right-side sliding detail panel — a dumb slot-based shell, not aware of "own book" vs. "friend's book" (see Key Discoveries).

**Contract**: Props: `open: boolean`, `onClose: () => void`, `spineColor: string` (the caller supplies `spineStyleFor(book.title).color` — `Drawer` does not compute it), `title: string`, `author: string`, `isbn: string | null` (renders `ISBN {value}` when present, or an italicized "No ISBN — added manually" when `null`, per `design.html:801-807`), `statusSlot?: ReactNode`, `actionsSlot?: ReactNode`. Implements its own native-`<dialog>` open/close `useEffect` (duplicated from `Modal`'s pattern, not shared — see Key Discoveries), positioned and animated as `design.html:418-425`'s sliding right panel (`translateX(100%)` → `translateX(0)`, `max-width:90vw`) rather than `Modal`'s centered dialog styling. A close button matching `design.html:426-430`.

#### 6. Specs

**Files**: `test/lib/hash-string.utils.spec.ts`, `test/lib/spine-style.utils.spec.ts`, `test/app/_components/spine.spec.tsx`, `test/app/_components/shelf.spec.tsx`, `test/app/_components/drawer.spec.tsx` (all new); `test/app/_components/avatar.spec.tsx` (unchanged — behavior-neutral refactor)

**Contract**: jsdom docblock, RTL `render`/`screen`, given/when/then, one behavior per `it` (house style). Coverage: `hashString` — same input always yields the same output (property, not a hardcoded magic number, matching `avatar.spec.tsx`'s existing "same name, same color" style); `spineStyleFor` — same title always yields the same `{color, height, width, onPaper}`; the near-white palette entry yields `onPaper: true`, every other entry `onPaper: false`; `Spine` — renders as a `<button>` with the combined `aria-label`, `onClick` fires, `tag` renders when present and is absent when omitted, same title always yields the same rendered style across renders; `Shelf` — renders its children; `Drawer` — renders title/author, ISBN present vs. missing (italic note), `statusSlot`/`actionsSlot` present vs. absent, `onClose` fires on the close button.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes (behavior-neutral phase — every existing spec must still pass unmodified): `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- Not applicable — nothing in the app renders these yet; automated specs are the verification for this phase.

**Implementation Note**: Pause here for manual confirmation before starting Phase 2.

---

## Phase 2: Collection

### Overview

Convert `/collection` onto `Shelf`/`Spine`/`Drawer` — the first real consumer phase.

### Changes Required:

#### 1. Type

**File**: `src/app/(app)/collection/collection.types.ts`

**Intent**: Thread the book's ISBN through, so the drawer can display it.

**Contract**: `CollectionBook` gains `isbn: string | null`.

#### 2. Page mapping

**File**: `src/app/(app)/collection/page.tsx`

**Intent**: Pass the already-fetched `isbn` column into the plain `CollectionBook` objects.

**Contract**: The existing `books.map(...)` gains `isbn: b.isbn` — `findByUserId` already returns it, no query change.

#### 3. Book row & list

**Files**: `src/app/(app)/collection/_components/book-row.tsx` (restyled in place, not deleted — see Key Discoveries), `book-list.tsx` (wrapper change only)

**Intent**: `book-row.tsx` becomes the shelf/drawer's per-book unit — same props, same `useActionState`/delete ownership it already has, just a `Spine` + local-state `Drawer` instead of a `Card` row. `book-list.tsx`'s only change is its outer wrapper.

**Contract**: `book-row.tsx` keeps its existing props (`book: CollectionBook`, `onEdit: () => void`) and its existing `useActionState(deleteBookAction, null)` call. It gains a local `useState<boolean>` (`drawerOpen`) and renders a `<Spine title={book.title} author={book.author} onClick={() => setDrawerOpen(true)} />` (no `tag` — the mockup's own-books shelf never tags a spine) plus a `<Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} spineColor={spineStyleFor(book.title).color} title={book.title} author={book.author} isbn={book.isbn} statusSlot={undefined} actionsSlot={...} />`. `statusSlot` stays `undefined` (own books show no availability pill — matches `design.html:816`'s own-book branch, which sets only a "W Twojej kolekcji" pill; **this plan's own-book drawer omits that pill entirely since it adds no information the page title doesn't already convey** — the one place this plan diverges from `design.html`'s own-book drawer content, alongside the Delete addition below). `actionsSlot` contains an `Edit` `Button` (`onClick={() => { setDrawerOpen(false); onEdit(); }}` — closes the drawer and notifies the parent, which opens `EditBookModal` exactly as it does today) and, unless the book is on loan, a `Delete` `Button` (`variant="decline"`, wired to `deleteBookAction` exactly as today, including the `window.confirm` guard; its error renders via the same `{error && <p role="alert">}` treatment, now placed inside `actionsSlot`). `book-list.tsx` changes only its wrapper — `<Shelf>` instead of `<ul>` of `Card` rows, mapping the same `books` array to `<BookRow>` elements exactly as it does today; its `editingId`/`EditBookModal` state and wiring are untouched. Empty state (`EmptyNote`) unchanged.

#### 4. Specs

**Files**: `test/app/(app)/collection/_components/book-row.spec.tsx` (updated in place — not deleted); `test/app/(app)/collection/_components/book-list.spec.tsx` (minor update: `Shelf` instead of `ul`; also gains an `isbn` value on its existing `CollectionBook` fixture literals, since `isbn` is now a required field)

**Contract**: `book-row.spec.tsx`'s existing behavior assertions (delete fires with the confirm-guard, loan-status hides Delete, `onEdit` fires) move to asserting through the shelf/drawer flow (click spine → drawer opens → assert action) instead of the old inline-button flow — same coverage, same file, new interaction path. `book-list.spec.tsx` also gains an `isbn` value on its existing `CollectionBook` fixture literal(s) (`test/app/(app)/collection/_components/book-list.spec.tsx`), and `test/app/(app)/collection/_components/edit-book-modal.spec.tsx`'s `CollectionBook` fixture likewise gains `isbn`, since `isbn: string | null` is required, not optional.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/collection`: shelf renders with correct spine colors/sizes; clicking a spine opens the drawer with correct title/author/ISBN (including the "added manually" case for a book with no ISBN); Edit from the drawer opens `EditBookModal` with the right book; Delete from the drawer works (including the loan-guard hiding it).
- Mobile (375px): shelf wraps sanely; drawer covers ~full width.

**Implementation Note**: Pause here for manual confirmation before starting Phase 3.

---

## Phase 3: Discover

### Overview

Convert `/discover` onto `Shelf`/`Spine`/`Drawer` — the drawer's friend's-book composition (status pill + contextual action).

### Changes Required:

#### 1. Type

**File**: `src/app/(app)/discover/discover.types.ts`

**Intent**: Thread ISBN through for the drawer, same as Collection.

**Contract**: `DiscoverBook` gains `isbn: string | null`.

#### 2. Page mapping

**File**: `src/app/(app)/discover/page.tsx`

**Intent**: Pass the already-fetched `isbn` column through.

**Contract**: The existing `books.map(...)` gains `isbn: b.isbn`.

#### 3. Book row & display

**Files**: `src/app/(app)/discover/_components/discover-book-row.tsx` (restyled in place, not deleted — see Key Discoveries), `discover-search.tsx` (wrapper change only)

**Intent**: `discover-book-row.tsx` becomes the shelf/drawer's per-book unit for a friend's book — same props, same availability branching, same `useActionState`/borrow ownership it already has, just a `Spine` (with the availability tag) + local-state `Drawer` (status pill + contextual action) instead of a `Card` row.

**Contract**: `discover-book-row.tsx` keeps its existing prop (`book: DiscoverBook`) and its existing `useActionState(requestBorrowAction, null)` call and availability branching (`status === "on_loan"` → `borrowedByViewer ? "Borrowed by you" : "On loan"`; else `requestedByViewer ? "Requested" : undefined`). It gains a local `useState<boolean>` (`drawerOpen`) and renders `<Spine title={book.title} author={book.author} tag={...the branching above, as a plain string instead of a Pill...} onClick={() => setDrawerOpen(true)} />` plus a `<Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} spineColor={spineStyleFor(book.title).color} title={book.title} author={book.author} isbn={book.isbn} statusSlot={<Pill .../>} actionsSlot={...} />`. `statusSlot` renders the matching `Pill` (`tone="active"` "Available" / `tone="pending"` with the same 3-label text as the tag). `actionsSlot`: available+unrequested → a `Borrow` `Button` wired to `requestBorrowAction` exactly as today (including `isPending`/error handling, error rendered via the same `{error && <p role="alert">}` treatment now placed inside `actionsSlot`); otherwise → no button, an informational note ("Will be available again once it's returned" for on-loan, or nothing extra for "Requested"/"Borrowed by you" since the tag already says it). `discover-search.tsx` changes only its wrapper — `<Shelf>` instead of `<ul>` of `Card` rows, mapping `matches` to `<DiscoverBookRow>` elements exactly as it does today. Empty states (`EmptyNote`, both "no friends" and "no matches") unchanged.

#### 4. Specs

**Files**: `test/app/(app)/discover/_components/discover-book-row.spec.tsx` (updated in place — not deleted); `test/app/(app)/discover/_components/discover-search.spec.tsx` (minor update: `Shelf` instead of `ul`; also gains an `isbn` value on its existing `DiscoverBook` fixture literals)

**Contract**: `discover-book-row.spec.tsx`'s existing behavior assertions (availability-state branching, borrow action fires, error renders) move to asserting through the shelf/drawer flow instead of the row's inline Pill/Button — same coverage, same file, new interaction path. `discover-search.spec.tsx`'s `DiscoverBook` fixture literals gain an `isbn` value, since `isbn: string | null` is required, not optional.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/discover`: shelf renders per selected friend; search/filter still narrows the shelf correctly; spine tags read correctly for all 4 states (available/no tag, on-loan, requested-by-you, borrowed-by-you); drawer shows the right status pill + action per state; borrowing a book from the drawer works end-to-end.
- Mobile (375px): shelf wraps sanely; drawer covers ~full width.

---

## Testing Strategy

### Unit Tests

- `hashString`: deterministic (same input → same output), used identically by `Avatar` and `Spine` (Phase 1).
- `Spine`/`Shelf`/`Drawer`: full prop/slot coverage as specified in Phase 1's Specs section.

### Integration Tests

- `book-list.tsx` (Phase 2) and `discover-search.tsx` (Phase 3): every existing behavior (edit, delete, loan-guard, borrow, availability branching, empty states) continues to pass, re-targeted at the shelf/drawer interaction path.

### Manual Testing Steps

1. `/collection`: click through several spines, confirm the drawer shows correct info per book (including a no-ISBN book), edit one, delete one.
2. `/discover`: switch friends, search, confirm spine tags and drawer status/actions are correct for available / on-loan / requested-by-you / borrowed-by-you books; borrow an available book from the drawer.
3. Repeat both at a 375px viewport.
4. Confirm `Avatar`'s rendering is unchanged after the `hashString` extraction (Phase 1's refactor).

## Performance Considerations

No new database load — `isbn` was already being fetched, just not mapped through. No new client-side JS beyond the drawer's local open/close state, which is the same shape `EditBookModal`'s `editingId` state already has.

## Migration Notes

Not applicable — no schema change. `isbn` is an existing column; this plan only threads an already-stored value further through the read path.

## References

- Roadmap item: `context/foundation/roadmap.md` → S-09
- Change identity and decisions: `context/changes/shelf-view/change.md`
- Design source: `context/design/design.html` (spine generator: lines 694-734; drawer: lines 412-444, 682-692, 794-848; collection/discover views: lines 507-523, 592-617)
- Prerequisite: `context/changes/design-system/plan.md` (S-08 — tokens, primitives, `Avatar`'s hash algorithm, `Modal`'s dialog pattern)
- Hash algorithm precedent: `src/app/_components/avatar.tsx:19-26`
- Dialog pattern precedent: `src/app/_components/modal.tsx`
- Spec house style: `test/app/_components/avatar.spec.tsx`, `test/app/_components/library-card.spec.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Shelf/Spine/Drawer Primitives

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit` — a19c771
- [x] 1.2 Linting passes: `npm run lint` — a19c771
- [x] 1.3 Full suite passes: `npm test` — a19c771
- [x] 1.4 Production build passes: `npm run build` — a19c771

### Phase 2: Collection

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit`
- [x] 2.2 Linting passes: `npm run lint`
- [x] 2.3 Full suite passes: `npm test`
- [x] 2.4 Production build passes: `npm run build`

#### Manual

- [x] 2.5 Shelf renders, spine colors/sizes correct, drawer opens with correct info (incl. no-ISBN case), Edit opens EditBookModal, Delete works (incl. loan-guard)
- [x] 2.6 Layout holds at 375px

### Phase 3: Discover

#### Automated

- [ ] 3.1 Type checking passes: `npx tsc --noEmit`
- [ ] 3.2 Linting passes: `npm run lint`
- [ ] 3.3 Full suite passes: `npm test`
- [ ] 3.4 Production build passes: `npm run build`

#### Manual

- [ ] 3.5 Shelf renders per friend, search narrows it, spine tags correct for all 4 availability states, drawer status/action correct per state, borrow works end-to-end
- [ ] 3.6 Layout holds at 375px
