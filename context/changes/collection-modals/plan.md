# S-06: Collection Modals — Implementation Plan

## Overview

Move book creation and editing on `/collection` out of inline page furniture and into modal dialogs, built on the native `<dialog>` element with no new dependencies. The page becomes a list of books with an "Add book" trigger, rather than a permanently-open form with a list underneath.

## Current State Analysis

`/collection` renders three things in a column (`src/app/collection/page.tsx:40-49`): a heading, an always-visible `<AddBookForm />`, and `<BookList />`.

- `src/app/collection/_components/add-book-form.tsx` — uncontrolled form, `useActionState(addBookAction, null)`, error rendered inline. Takes no props and has no notion of being dismissed. **Line 4 imports `"../actions"` relatively**, the last such import left in `src/`.
- `src/app/collection/_components/edit-book-row.tsx` — renders as an `<li>` that *replaces* a `BookRow` in place. `book-list.tsx:17-32` swaps between the two based on a local `editingId`. Lines 25-31 carry a hand-rolled "did the action just succeed" detector: a `wasPending` ref watching the pending → not-pending transition with no error, because `useActionState` exposes no success callback.
- `src/app/collection/_components/book-row.tsx` already takes an `onEdit` callback and needs no change. Its delete button (line 67) guards with `window.confirm` — existing precedent for confirm-before-destructive-action.
- Server actions in `src/app/collection/actions.ts` all return `string | null` (error message or success) and call `revalidatePath("/collection")`. **This change touches none of them.**

Test infra is in place (`@testing-library/react`, jsdom via per-file docblock). `test/app/collection/_components/book-row.spec.tsx` is the house pattern. Missing specs today: `add-book-form`, `book-list` — named as S-01 backfill debt in `context/foundation/lessons.md:44`.

## Desired End State

`/collection` shows the heading, an "Add book" button, and the book list. Clicking "Add book" opens a modal containing the existing form; saving closes it and the new book appears in the list. Clicking "Edit" on any row opens a pre-filled modal; saving closes it. Both dialogs trap focus, close on Esc, backdrop click, and Cancel — but prompt for confirmation first if the user has typed something. Validation errors (e.g. duplicate title+author) render *inside* the open dialog rather than dismissing it.

Verified by: `npm run lint`, `npm test`, `npm run build` all green, plus the manual pass in Testing Strategy.

### Key Discoveries

- `<dialog>` is only modal via the imperative `showModal()` — rendering the `open` attribute produces a non-modal dialog with no backdrop, no focus trap, no inert background.
- The `cancel` event is the **only** cancelable hook for Esc; `close` fires after the fact and cannot be vetoed. A dirty-state guard therefore has to live on `cancel`.
- Backdrop clicks report the `<dialog>` itself as `event.target` — there is no separate backdrop node to bind to.
- jsdom implements neither `HTMLDialogElement.showModal()` nor `.close()`; every dialog spec throws `Not implemented: HTMLDialogElement.prototype.showModal` without a stub.
- `edit-book-row.tsx:25-31` already solves success-detection; that logic is about to be needed in two places, so it gets lifted rather than copied.

## What We're NOT Doing

- **Not touching `src/app/collection/actions.ts`.** No server action signature, validation rule, or `revalidatePath` call changes in this change. The action return shape stays `string | null`.
- **Not adding an ISBN field.** That is S-07 (`isbn-lookup`), which builds on the add modal this change creates.
- **Not installing a dialog/UI library.** Native `<dialog>` only.
- **Not adding a success toast or confirmation message.** The book appearing in the list is the confirmation.
- **Not converting the add form's inputs to controlled.** They stay uncontrolled here; S-07 converts them when autofill requires it.
- **Not touching `/discover`, `/friends`, `/requests`, or `/borrowing`.** The shared `Modal` is built for reuse, but no other page adopts it in this change.
- **Not backfilling the remaining S-01 spec debt beyond what this change touches** — `add-book-form.spec.tsx` and `book-list.spec.tsx` land here because both files are edited; nothing else is in scope.

## Implementation Approach

Bottom-up, so nothing is user-visible until its foundation is tested: build and spec the shared `Modal` and the extracted success hook first (Phase 1), then migrate the add flow (Phase 2), then the edit flow (Phase 3). Each phase leaves the app working — after Phase 2 the add flow is modal while edit is still inline, which is a valid intermediate state.

## Critical Implementation Details

**Timing & lifecycle.** Three events fire on `<dialog>` and they are not interchangeable. `cancel` fires on Esc *before* the close and is cancelable — the dirty-state guard belongs here and nowhere else. `close` fires after any close, including a programmatic `.close()`, and is what keeps React state in sync with a browser-initiated dismissal. Because the open/close effect also calls `.close()`, `onClose` will fire a second time with `open` already `false`; the parent's state setter must be idempotent (setting `false` when already `false` is a no-op React bails out of, so no loop — but do not add logic that assumes `onClose` fires exactly once).

**State sequencing.** The success-detection hook reads the pending → not-pending edge. Its `wasPending` ref must be updated *after* the success check on every run, or the very first render (where `isPending` is already `false`) reads as a success and closes the dialog before the user types anything. `edit-book-row.tsx:25-31` has the correct ordering — preserve it exactly when lifting.

---

## Phase 1: Shared Modal Shell & Success Hook

### Overview

The reusable pieces, with specs, before any page consumes them.

### Changes Required:

#### 1. Success-detection hook

**File**: `src/lib/use-action-success.utils.ts` (new)

**Intent**: Lift the `wasPending`-ref success detector out of `edit-book-row.tsx:25-31` so both modals can share it instead of duplicating the workaround. Carry the explanatory comment across — the reason this exists (no success callback on `useActionState`) is not obvious from the code.

**Contract**: `useActionSuccess(isPending: boolean, error: string | null, onSuccess: () => void): void`. Fires `onSuccess` exactly on the pending → not-pending transition when `error` is null. Must not fire on initial mount.

#### 2. Shared modal component

**File**: `src/app/_components/modal.tsx` (new)

**Intent**: Wrap the native `<dialog>` so callers get a modal with focus trapping, Esc handling, and a backdrop without managing the imperative API themselves. Sits beside the existing `src/app/_components/nav.tsx`.

**Contract**: `"use client"`. Props `{ open: boolean; onClose: () => void; title: string; children: ReactNode; canClose?: () => boolean }`.

- `canClose` is the dirty-state guard. When supplied and it returns `false`, Esc and backdrop clicks are suppressed. Default (omitted) is always-closable. It is **not** consulted for programmatic closes.
- Drives `showModal()` / `close()` from a ref in an effect keyed on `open`.
- `cancel` handler: `e.preventDefault()` when `canClose?.() === false`.
- Backdrop: on click, close only when `e.target === dialogRef.current` and the guard allows.
- `close` handler calls `onClose`.
- `aria-labelledby` points at the rendered `title` heading; the heading is rendered by `Modal`, not the caller.
- Mobile-first sizing per AGENTS.md — base classes for small screens with `sm:` overrides. Scrim via Tailwind v4's `backdrop:` variant.

#### 3. jsdom dialog stub

**File**: `test/shared/dialog.mock.ts` (new)

**Intent**: jsdom ships no `showModal`/`close` implementation, so every dialog spec throws without this. Global test helpers live in `test/shared/` per AGENTS.md.

**Contract**: Patches `HTMLDialogElement.prototype.showModal` and `.close()` to toggle the `open` attribute and dispatch a `close` event, so assertions on visibility and the close path both work. Imported for side effects at the top of each dialog spec.

#### 4. Specs

**Files**: `test/lib/use-action-success.utils.spec.ts`, `test/app/_components/modal.spec.tsx` (new)

**Intent**: Cover the two behaviours that are easy to get wrong — the hook not firing on mount, and the modal's guard suppressing Esc/backdrop while still allowing Cancel.

**Contract**: House pattern from `test/app/collection/_components/book-row.spec.tsx` — `/** @jest-environment jsdom */` docblock, `@testing-library/jest-dom` import, given/when/then blocks, one behaviour per `it`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- New specs pass: `npm test`

#### Manual Verification:

- None — nothing is wired into a page yet.

---

## Phase 2: Add Flow

### Overview

`/collection` gains an "Add book" trigger; the existing form moves inside a dialog.

### Changes Required:

#### 1. Add form

**File**: `src/app/collection/_components/add-book-form.tsx`

**Intent**: Let the form tell its container when a save succeeded, so the dialog can close itself. Field markup and validation behaviour are unchanged. Also fix the relative import on line 4 — the last one in `src/`, flagged in `context/foundation/lessons.md:23`.

**Contract**: Gains `{ onSaved: () => void }`. Wires `useActionSuccess` to it. Import becomes `@/app/collection/actions`. The submit button keeps its own label; the Cancel control belongs to the modal container, not the form.

#### 2. Add modal container

**File**: `src/app/collection/_components/add-book-modal.tsx` (new)

**Intent**: Own the open/closed state, render the trigger button, and supply the dirty-state guard.

**Contract**: `"use client"`. No props. Renders an "Add book" button and a `<Modal>` wrapping `<AddBookForm onSaved={close} />`. Tracks dirtiness (any non-empty field) to feed `canClose`; when dirty, prompts via `window.confirm` — same interaction the delete button already uses at `book-row.tsx:67`. Remounts the form on each open so a reopened dialog starts empty.

#### 3. Collection page

**File**: `src/app/collection/page.tsx`

**Intent**: Swap the always-visible form for the modal trigger. The page stays a Server Component — only the modal subtree is client-side.

**Contract**: Line 46 `<AddBookForm />` → `<AddBookModal />`, import updated. No data-fetching changes.

#### 4. Specs

**Files**: `test/app/collection/_components/add-book-form.spec.tsx` (new — S-01 backfill), `test/app/collection/_components/add-book-modal.spec.tsx` (new)

**Contract**: Mock `@/app/collection/actions`. Cover: form renders its three fields and fires `addBookAction` on submit; modal opens on trigger click, closes on successful save, stays open when the action returns an error, and prompts before discarding a dirty form.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Specs pass: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- "Add book" opens the dialog; the page behind it is inert and focus is inside.
- Adding a book closes the dialog and the book appears in the list without a hard refresh.
- Submitting a duplicate title+author shows the error **inside** the still-open dialog.
- Esc, backdrop click and Cancel all close an untouched dialog; each prompts first when a field has been typed into.
- Reopening the dialog shows empty fields.
- Layout holds at a 375px viewport.

**Implementation Note**: Pause here for manual confirmation before starting Phase 3.

---

## Phase 3: Edit Flow

### Overview

The inline row editor becomes a dialog; `BookList` stops swapping row components.

### Changes Required:

#### 1. Edit modal

**Files**: `src/app/collection/_components/edit-book-modal.tsx` (new), `src/app/collection/_components/edit-book-row.tsx` (deleted)

**Intent**: Same form, relocated into a dialog. It must **stop rendering an `<li>` wrapper** — it no longer lives inside the `<ul>`.

**Contract**: Props `{ book: CollectionBook; onClose: () => void }`. Replaces the local `wasPending` effect with `useActionSuccess`. Keeps the `bookId` hidden input and the per-field `id` suffixing that avoids duplicate DOM ids. Supplies a `canClose` guard comparing current field values against the book's original values.

#### 2. Book list

**File**: `src/app/collection/_components/book-list.tsx`

**Intent**: Always render `BookRow`; hoist the editor out of the list into a single dialog driven by the existing `editingId` state.

**Contract**: `editingId` state is retained. Maps every book to `<BookRow>`, and renders one `<EditBookModal>` outside the `<ul>` for the book matching `editingId`. `book-row.tsx` is unchanged.

#### 3. Specs

**Files**: `test/app/collection/_components/edit-book-modal.spec.tsx` (new), `test/app/collection/_components/book-list.spec.tsx` (new — S-01 backfill)

**Contract**: Cover: modal pre-fills from the passed book and fires `updateBookAction`; closes on success; stays open on error. List renders one row per book, shows the empty-state copy for `[]`, and opens the edit dialog for the right book when a row's Edit is clicked.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`
- No references to the deleted file remain: `grep -r "edit-book-row" src/ test/` returns nothing

#### Manual Verification:

- Edit on any row opens a dialog pre-filled with that book's title, author and notes.
- Saving closes the dialog and the row shows the new values without a hard refresh.
- Clearing the notes field and saving persists the clear (the empty-string → `null` rule at `actions.ts:113-116` still holds).
- Renaming a book onto another book's title+author shows the duplicate error inside the open dialog.
- Esc/backdrop/Cancel prompt only after a field has actually been modified.
- A book that is on loan still shows its loan label and hides Delete; Edit still works.
- Layout holds at 375px.

---

## Testing Strategy

### Unit Tests

- `useActionSuccess`: does not fire on mount; fires on pending→idle with no error; does not fire when an error is present.
- `Modal`: calls `showModal` when opened; `onClose` on the `close` event; suppresses Esc and backdrop when `canClose` returns false; ignores clicks on inner content.

### Integration Tests

None. This change adds no server action, repository, or DB behaviour, so there is nothing for the existing DB integration suite to cover.

### Manual Testing Steps

1. Sign in, go to `/collection`, add a book via the dialog — confirm it lands in the list.
2. Retry the same title+author — confirm the error appears inside the dialog and the dialog stays open.
3. Type a title, press Esc — confirm the discard prompt.
4. Edit a book, change the author, save — confirm the row updates.
5. Edit a book, clear its notes, save — confirm the notes disappear.
6. Tab through an open dialog — confirm focus stays trapped and returns to the trigger on close.
7. Repeat 1 and 4 at a 375px viewport.

## Performance Considerations

None material. `page.tsx` stays a Server Component and its two queries are untouched; the change moves existing client components behind a dialog and slightly *reduces* initial DOM.

## Migration Notes

No data migration. `edit-book-row.tsx` is deleted rather than deprecated — it has exactly one consumer (`book-list.tsx`), updated in the same phase.

## References

- Roadmap item: `context/foundation/roadmap.md` → S-06
- Change identity: `context/changes/collection-modals/change.md`
- Success-detection precedent being lifted: `src/app/collection/_components/edit-book-row.tsx:25-31`
- Confirm-before-destructive precedent: `src/app/collection/_components/book-row.tsx:67`
- Spec house style: `test/app/collection/_components/book-row.spec.tsx`
- Applicable lessons: `context/foundation/lessons.md:23` (@/* imports), `:30` (types in `*.types.ts`), `:44` (every component ships a spec)
- Follow-on change: S-07 `isbn-lookup` builds on the Phase 2 add modal

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Shared Modal Shell & Success Hook

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit`
- [x] 1.2 Linting passes: `npm run lint`
- [x] 1.3 New specs pass: `npm test`

### Phase 2: Add Flow

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit`
- [x] 2.2 Linting passes: `npm run lint`
- [x] 2.3 Specs pass: `npm test`
- [x] 2.4 Production build passes: `npm run build`

#### Manual

- [ ] 2.5 Dialog opens, traps focus, background inert
- [ ] 2.6 Save closes dialog and book appears without hard refresh
- [ ] 2.7 Duplicate error renders inside the open dialog
- [ ] 2.8 Esc / backdrop / Cancel close when clean, prompt when dirty
- [ ] 2.9 Reopened dialog starts empty
- [ ] 2.10 Layout holds at 375px

### Phase 3: Edit Flow

#### Automated

- [x] 3.1 Type checking passes: `npx tsc --noEmit`
- [x] 3.2 Linting passes: `npm run lint`
- [x] 3.3 Full suite passes: `npm test`
- [x] 3.4 Production build passes: `npm run build`
- [x] 3.5 No `edit-book-row` references remain

#### Manual

- [ ] 3.6 Edit opens a pre-filled dialog
- [ ] 3.7 Save closes dialog and row updates without hard refresh
- [ ] 3.8 Clearing notes persists the clear
- [ ] 3.9 Duplicate rename error renders inside the open dialog
- [ ] 3.10 Dismiss prompts only when a field was modified
- [ ] 3.11 On-loan book keeps its loan label and hidden Delete; Edit still works
- [ ] 3.12 Layout holds at 375px
