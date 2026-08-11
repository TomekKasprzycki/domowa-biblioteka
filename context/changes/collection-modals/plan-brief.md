# S-06: Collection Modals — Plan Brief

> Full plan: `context/changes/collection-modals/plan.md`
> Change identity: `context/changes/collection-modals/change.md`

## What & Why

Adding and editing a book on `/collection` currently happen in page furniture: an always-visible form pinned above the list, and an inline editor that swaps a book's row out from under the user. Both move into modal dialogs, so the page reads as *a collection of books* with an "Add book" action, rather than a form with a list underneath it.

## Starting Point

`page.tsx` stacks a heading, `<AddBookForm />` and `<BookList />` in a column. `BookList` holds an `editingId` and swaps `BookRow` for `EditBookRow` in place. `EditBookRow` carries a hand-rolled success detector (a `wasPending` ref watching the pending → idle edge) because `useActionState` has no success callback — that logic is about to be needed twice. Server actions, validation and `revalidatePath` are all working and stay untouched.

## Desired End State

The page shows a heading, an "Add book" button and the list. Either action opens a focus-trapped dialog over an inert page; saving closes it and the list behind reflects the change. Validation errors render inside the still-open dialog. Esc, backdrop click and Cancel all dismiss — asking first if the user has typed something.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Dialog implementation | Native `<dialog>` | Focus trap, Esc, backdrop and background-inerting come free from the browser; project has no component-system scaffolding to justify Radix/shadcn | Plan mode |
| Change split | S-06 modals, S-07 ISBN separately | Keeps this change free of any schema or server-action edit | Plan mode |
| After a successful add | Close the dialog | Matches the edit dialog, so both behave alike; the book appearing in the list is the confirmation | Plan |
| Dismissing a dirty form | `window.confirm` before discarding | Guards against a mis-pressed Esc; reuses the confirm pattern already at `book-row.tsx:67` | Plan |
| Success detection | Extract to `use-action-success.utils.ts` | Needed by both modals — lift rather than copy the workaround a second time | Plan |

## Scope

**In scope:** shared `Modal` on native `<dialog>`; extracted success hook; add flow moved into a dialog; edit flow moved into a dialog (`edit-book-row.tsx` deleted); jsdom `showModal` stub; specs for everything new, plus `add-book-form` and `book-list` spec backfill; the last relative import in `src/` fixed.

**Out of scope:** any change to `actions.ts`; the ISBN field (S-07); controlled inputs (S-07 needs them, this change doesn't); success toasts; adopting `Modal` on any other page; the rest of the S-01 debt.

## Architecture / Approach

One shared `src/app/_components/modal.tsx` owns the imperative `<dialog>` API — an effect drives `showModal()`/`close()` from an `open` prop, the `close` event syncs dismissal back into React state, and an optional `canClose` guard vetoes the cancelable `cancel` event (Esc) and backdrop clicks. Each feature supplies its own container (`add-book-modal.tsx`, `edit-book-modal.tsx`) holding open-state and dirty-checking; the form components inside stay dumb and just report success upward through the shared hook. `page.tsx` remains a Server Component — only the dialog subtree is client-side.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Modal shell & hook | `Modal`, `useActionSuccess`, jsdom stub, their specs | `cancel` vs `close` event semantics; hook must not fire on mount |
| 2. Add flow | "Add book" trigger + dialog; page rewired; 2 specs | Error must keep the dialog open, not dismiss it |
| 3. Edit flow | `EditBookModal` replaces `EditBookRow`; list rewired; 2 specs | Form must stop rendering its `<li>` wrapper now it's outside the `<ul>` |

**Prerequisites:** S-01 (`collection-management`) shipped — it is. No new dependencies, no migration, no env change.
**Estimated effort:** ~1 session across 3 phases; each phase leaves the app in a working state.

## Open Risks & Assumptions

- jsdom implements neither `showModal()` nor `close()`. The stub at `test/shared/dialog.mock.ts` is load-bearing for every dialog spec; if it drifts from real browser semantics the specs will pass while the UI breaks, so the manual pass is not optional.
- `onClose` can fire more than once for a single dismissal (browser close event, then the effect's own `.close()`). Parent state setters must be idempotent.
- Native `<dialog>` is well supported across the browsers the PRD targets (latest two versions of Chrome, Firefox, Safari, Edge), so no polyfill is planned.
- `window.confirm` is a blunt instrument, consistent with the existing delete guard. If it proves annoying in practice, replacing it with an in-dialog confirmation is a follow-up, not a blocker.

## Success Criteria (Summary)

- A user adds a book without the page ever showing a form they didn't ask for, and the new book appears in the list immediately.
- A user edits a book in a pre-filled dialog and sees the row update on save, with a mistyped duplicate reported inside the dialog rather than losing their input.
- Nothing about which books exist, who owns them, or their loan state changes — this is presentation only.
