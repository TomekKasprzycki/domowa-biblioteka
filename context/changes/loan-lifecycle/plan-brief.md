# S-05: Loan Lifecycle — Plan Brief

> Full plan: `context/changes/loan-lifecycle/plan.md`

## What & Why

S-04 shipped a one-way borrow — once a book goes out, nothing brings it back. This slice closes the loop with a two-sided return handshake: the borrower marks "I returned it", the book stays unavailable, and the owner confirms "I received it back", which closes the loan and frees the book (FR-011). It also gives the owner a standing view of who has which book and since when (FR-010). Together these complete US-01, the PRD's primary success criterion.

## Starting Point

`LoanEntity` has three states (`requested`, `active`, `declined`) and a Postgres partial unique index, `loans_one_active_per_book`, that is the sole guarantee behind "a book is never both available and borrowed". `/requests` is the owner's action inbox, `/borrowing` is the borrower's read-only list with no controls, and `/collection` carries no loan data at all. An owner can currently delete a book that is out on loan — an unguarded consistency hole.

## Desired End State

A borrower clicks **I returned it** on `/borrowing` and confirms the dialog; the book shows as "Return pending" and stays unavailable to every friend. The owner — alerted by a distinct nav badge — opens `/requests`, sees the book under **Awaiting your confirmation**, and clicks **I received it back**. The loan closes, the book becomes borrowable again, and the borrower finds it under a collapsed **Past loans** section. Meanwhile `/collection` shows the owner "Lent to Ania · since 12 Mar" for anything that's out.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Sequencing | Plan S-05, not FR-012 (reviews) | Reviews are parked and blocked by the book-identity problem; S-05 is the next must-have and finishes the core loop | Plan |
| Return-pending model | New `RETURN_PENDING` status, index predicate widened | Keeps one readable status machine — exactly what S-04's recorded decision anticipated | Plan |
| Index handling | **Rename** to `loans_one_open_per_book`, don't just re-predicate | The synchroniser never compares an index's `where` clause; renaming makes a stale dev index loud instead of silent | Plan |
| "Unavailable" semantics | `findOpenLoan*` = `active` + `return_pending`, expressed in 3 places only | No caller has to remember the new state | Plan |
| Owner confirms at | `/requests` inbox, second section | Already the owner's action home and already badge-backed | Plan |
| FR-010 view | Inline on `/collection` book rows | S-04 explicitly earmarked this; the collection *is* the owner's book list | Plan |
| Nav badges | Separate counts for requests vs pending returns | Owner knows which action waits before clicking; without a return signal a book can stay locked forever | Plan |
| Closed loans | Collapsed "Past loans" on `/borrowing`; `/requests` stays actionable-only | Borrower keeps history; an inbox shouldn't accumulate done items | Plan |
| Undo a return | No undo — `window.confirm` guard instead | Cheap mis-click prevention without a reverse transition or a race | Plan |
| Delete guard | Block deleting a book with **any** loan row + catch FK `23503` | The FK is `ON DELETE NO ACTION`, so Postgres already blocks *every* loan row — today that's an unhandled 500. Consequence: a book that has ever been borrowed can't be deleted | Plan review (F1) |
| Borrower-name reads | Two readers: relation-free for `/discover`, owner-scoped with `requester` for `/collection` | Keeps S-04's privacy boundary (owner sees the name, other friends don't) structural rather than dependent on careful `map()`s | Plan review (F3) |
| Overdue | Elapsed duration only, no loan period | FR-010 asks for "since when"; overdue is already blocked by the notifications Non-Goal | Plan |
| Owner never confirms | Book stays locked — no timeout, no override | Pre-settled in the roadmap; not re-litigated | Roadmap |

## Scope

**In scope:** `RETURN_PENDING` + `RETURNED` statuses; index rename/widen migration; `markReturned`/`confirmReturn` repository transitions and Server Actions; borrower return button + past-loans section; owner confirmation section + second nav badge; FR-010 loan state on `/collection`; delete guard.

**Out of scope:** loan periods, due dates, overdue logic; notifications; undo of a return; owner-initiated return; timeout/override for an unconfirmed return; owner-side loan history; blocking book *edits* during a loan; S-01 lessons-debt backfill.

## Architecture / Approach

Bottom-up, mirroring S-04. The organising idea: **"unavailable" stops meaning `status = 'active'` and starts meaning "an open loan exists"** (`active | return_pending`). That shift is expressed in exactly three places — the partial unique index predicate, the `findOpen*` repository readers, and nowhere else. Layers go DB invariant → guarded Server Actions → borrower UI → owner UI → owner's standing view.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. State machine & DB invariant | New statuses, renamed/widened unique index, `markReturned`/`confirmReturn`, invariant test | The index is the whole guarantee; `synchronize` can't create it, so every env must run the migration |
| 2. Return Server Actions | Both transitions with full guard matrix + 4-path revalidation | Getting the actor asymmetry right (borrower matched on `requesterId`, owner on `ownerId`) |
| 3. Borrower return flow | "I returned it" + confirm dialog + collapsed past loans | New Client Component row where the list was previously server-only |
| 4. Owner confirm flow | Confirmation section on `/requests` + separate nav badges | Nav renders in the root layout — an unguarded count would 500 every page |
| 5. Collection state & delete guard | FR-010 inline display; deletion blocked while on loan | First collection component specs; touching S-01 code that carries known lessons debt |

**Prerequisites:** S-04 (borrow-request) complete — done, on `feat/S-04-borrow-request`. Neon DB access to apply the index migration.
**Estimated effort:** ~3–4 sessions across 5 phases.

## Open Risks & Assumptions

- The renamed partial unique index ships only via migration. `npm run migration:run` must reach **every** environment including local dev — otherwise dev runs with no uniqueness guarantee at all.
- Rolling back the migration is only safe while no loan sits in `return_pending`; the narrower predicate would let such a book be re-borrowed.
- The delete guard's pre-check is a read-then-write; the `23503` catch is what makes a true race safe rather than a 500.
- **Accepted consequence:** once a book has been borrowed even once, it can never be deleted. This is the trade for keeping the borrower's "Past loans" history intact. If it proves annoying in use, the escape hatch is a soft-delete or a title snapshot on the loan row — neither is in this slice.
- The nav now issues two count queries on every authenticated page render. Both are served by the existing `loans_owner_status` index; S-04's "cut the badge if hot" judgement now applies to the pair.
- Roadmap statuses are stale (S-04 shows `proposed` but has shipped); this plan does not reconcile them.

## Success Criteria (Summary)

- The full US-01 loop completes across two accounts: request → approve → return → confirm, after which the book is borrowable again.
- A book with a return awaiting confirmation never reads as available to any friend — proven by an automated invariant test, not just by inspection.
- The owner can see, on `/collection`, which of their books are out, to whom, and since when — and cannot delete one while it's out.
