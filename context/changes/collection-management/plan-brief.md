# Collection Management (S-01) — Plan Brief

> Full plan: `context/changes/collection-management/plan.md`

## What & Why

Users can add books (title, author, optional notes) to a personal collection, view it, and edit or delete entries they own. This is the first product slice after the auth foundation (F-02) — it makes the app's core data object (`Book`) exist, which every later slice (friend discovery, borrowing, loans) is built on top of.

## Starting Point

No `Book` entity, repository, or `/collection` route exists yet — only `UserEntity` and the auth flow. The home page currently shows a placeholder: "Your collection is coming soon." Auth, session access (`await auth()`), and automatic route protection are already fully wired from F-02.

## Desired End State

A signed-in user visits `/collection`, adds a book through an inline form, sees their books listed newest-first, can edit any book inline, and can delete a book after confirming. Adding an exact duplicate (same title+author they already own) is rejected with a friendly message. Nav and home page link to the real page instead of the placeholder.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Scope of actions | Full CRUD (add, view, edit, delete) | User chose to go beyond the roadmap's minimum (add+view) to give a correction path for mistakes. |
| Duplicate books | Rejected via unique constraint (userId+title+author) | Prevents accidental double-submits; a true second physical copy is an edge case accepted as out of scope for v1. |
| Owner relation | `@ManyToOne` relation + plain `userId` column | Idiomatic TypeORM, and later slices (discovery, borrowing) will need to join Book→User anyway. |
| Field validation | Required, trimmed, max ~255 chars | Matches the existing zod pattern from register/login actions. |
| List layout | Simple stacked list, newest first | Matches the existing hand-rolled Tailwind style; sorting/search is deferred to S-03. |
| Add-book placement | Inline form on `/collection` | PRD guardrail: adding a book should take a few seconds, not a page navigation. |
| Edit/delete UI | Inline edit-in-place + `window.confirm()` for delete | No modal component exists yet; avoids adding new UI infrastructure for a small feature. |
| Testing bar | Repository tests + Server Action logic tests (mocked `@/auth` only) | Establishes action-level coverage for the security-sensitive ownership checks, without introducing component/rendering test infra (a Module 3 concern per this project's CLAUDE.md). |

## Scope

**In scope:** Book entity + migration, ownership-scoped repository CRUD, three Server Actions (add/edit/delete) with validation and duplicate handling, `/collection` page with inline add/edit/delete UI, nav + home page links.

**Out of scope:** Friend visibility/sharing, search/sort/filter, cover images, ISBN lookup, pagination, soft-delete/undo, rich text notes, component-level UI tests.

## Architecture / Approach

Mirrors the existing `UserEntity` → repository → Server Action → page/`_components` pipeline exactly, extended with edit/delete. The one architectural rule worth flagging: ownership checks (`userId` match) live in the repository's `WHERE` clause on every mutation, not as a separate check-then-act step in the action layer — so there's no gap where a mutation could act on a book it doesn't own.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Book Entity, Migration & Repository | `BookEntity`, migration, ownership-scoped CRUD repository, repository tests | Getting the dual `userId` column + `@ManyToOne` relation pattern right without TypeORM fighting itself over the column |
| 2. Server Actions | `addBookAction`/`updateBookAction`/`deleteBookAction` with validation + duplicate handling, plus this project's first Server Action tests | Mocking `@/auth` correctly is a new test pattern for this codebase |
| 3. Collection Page UI & Navigation | `/collection` page, inline add/edit/delete UI, nav + home page links | Inline edit-in-place state management (only one row editable at a time) is new UI complexity beyond the existing static-form pages |

**Prerequisites:** auth-scaffold (F-02) merged — confirmed done.
**Estimated effort:** ~3 short sessions, one per phase.

## Open Risks & Assumptions

- The `notes` field's exact max length (2000 chars) is an implementer's reasonable default, not a business requirement — adjust freely if it doesn't fit the UI.
- Cross-user ownership manual verification (Phase 2) assumes access to a scratch script or two browser sessions; no automated multi-user UI test is planned.

## Success Criteria (Summary)

- A user can add, view, edit, and delete books in their own collection end-to-end via the UI.
- Duplicate title+author for the same user is rejected; a different user can never mutate another user's book.
- `npx tsc --noEmit`, `npm run lint`, and `npm test` all pass.
