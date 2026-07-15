# Collection Management (S-01) Implementation Plan

## Overview

Users can add books (title, author, optional notes) to their personal collection, view their full collection, and edit or delete entries they own. This is the first product slice built on top of the merged auth foundation (F-02), and introduces the second entity in the system (`BookEntity`) alongside the established `UserEntity`.

## Current State Analysis

- No `Book` entity, repository, or `/collection` route exists yet (`src/server/` contains only `src/server/user/`).
- `src/app/page.tsx` currently shows a placeholder line for signed-in users: `"Your collection is coming soon."` — this plan replaces it.
- Auth, session, and route protection are fully wired (F-02, merged): `await auth()` gives `session.user.id` in any Server Component or Server Action; any route not listed in `src/auth.config.ts`'s `publicPaths` is automatically protected by `middleware.ts`.
- The entity/repository/action/UI/test conventions are well established by `UserEntity` / `user.repository.ts` / `register/login` actions and pages — this plan follows them exactly for `Book`.
- Only two test files exist today (`test/server/user/user.repository.spec.ts`, `test/lib/data-source.spec.ts`), both real-DB integration tests with no mocking. There is no precedent yet for testing a Server Action — this plan establishes that pattern (mocking only `@/auth`'s session, nothing else).

### Key Discoveries:

- `src/server/user/user.entity.ts:1-29` — every `@Column()` needs an explicit `type:` because this project's SWC build doesn't emit decorator metadata (documented constraint, `context/foundation/lessons.md` / db-connection plan). Specialized column decorators (`@PrimaryGeneratedColumn`, `@CreateDateColumn`, `@UpdateDateColumn`) must NOT get a `type:` option.
- `src/server/user/user.repository.ts:6-19` — repositories are plain exported async functions, each independently calling `await getDataSource()`, and use `ds.getRepository<Entity>("tablename")` (string-based lookup), not the class reference — this avoids the cross-chunk class-identity bug just fixed in auth-scaffold (Next.js dev-mode recompiles route chunks independently, producing distinct class instances of the same file).
- `src/lib/data-source.ts:3,16` — the runtime data source requires every entity to be explicitly imported and added to the `entities: [...]` array (glob-based loading breaks under Next.js/SWC bundling at runtime). `src/lib/data-source-cli.ts` keeps its glob and needs no change — it runs under `tsx`, outside Next's bundler.
- `src/auth.config.ts:16-17` — route protection is allowlist-of-public-paths; `/collection` is protected automatically simply by not adding it there.
- `src/app/register/actions.ts:1-55` — Server Action convention: `"use server"`, module-level zod schema, `.safeParse()` against manually-built `formData.get(...)` object, signature `(prevState, formData) => Promise<ErrorState>` for `useActionState`, typed `QueryFailedError` + Postgres code `23505` guard for unique-constraint violations returned as a friendly message.
- `src/app/register/_components/register-form.tsx` — client component wired via `useActionState`, submit button disabled while `isPending`, errors rendered as `<p role="alert">`.
- `AGENTS.md` (updated after this plan was reviewed, discovered at implementation kickoff): a new hard rule requires application-generated ids — "Handle id for database entities in application. Create IdGenerator which will create UUID and add it to new entity. Do not let database handle id." `UserEntity` still uses `@PrimaryGeneratedColumn("uuid")` (DB-generated) and is out of this plan's scope to change; `BookEntity` is the first entity built under the new rule, so it uses `@PrimaryColumn({ type: "uuid" })` populated by an app-level `generateId()` utility instead. This is an intentional, approved divergence from `UserEntity`'s id strategy, not an oversight.

## Desired End State

A signed-in user can visit `/collection`, add a book via an inline form (title + author required, notes optional), see their books listed newest-first, edit any of their own books inline, and delete any of their own books after a confirmation prompt. Attempting to add an exact title+author duplicate they already own is rejected with a friendly message. The home page and nav link to the real `/collection` page instead of the placeholder text.

**Verification**: `npx tsc --noEmit`, `npm run lint`, and `npm test` all pass; manual walkthrough of add/edit/delete/duplicate-rejection/logged-out-redirect succeeds (see per-phase Manual Verification).

## What We're NOT Doing

- Sharing or visibility to friends — the collection remains visible only to its owner in this slice (S-02/S-03 introduce friend access).
- Sorting, filtering, or search UI — deferred to S-03 (friend-discovery), which introduces search across a larger, multi-owner dataset.
- Cover images, photo uploads, or ISBN/external book lookup — explicit PRD non-goals.
- Pagination — out of scope given the target per-user data volume (PRD `target_scale.data_volume: small`).
- Soft-delete, undo, or a trash/recovery flow — delete is a hard delete.
- Rich text or markdown in the `notes` field — plain text only, same as title/author.
- Component-level/rendering UI tests — no `@testing-library/react`/jsdom infra is added in this slice; automated coverage stays at the repository and Server Action logic layers, matching this project's existing test style and its Module 3 (later) testing-strategy boundary. UI behavior is covered by manual verification steps below.

## Implementation Approach

Follow the exact `UserEntity` → `user.repository.ts` → Server Action → page/`_components` pattern already established by auth-scaffold, extended with edit/delete. Ownership (a user can only mutate their own books) is enforced at the repository query level — `WHERE id = ? AND userId = ?` — not as a separate check-then-act step in the action layer, so there is no window where a mutation could act on a book the caller doesn't own.

## Critical Implementation Details

**Owner relation shape**: `BookEntity` needs both a plain `userId` column (for `WHERE userId = ?` queries in the repository) and a `@ManyToOne` relation to `UserEntity` (idiomatic TypeORM, needed for joins in later slices like friend-discovery). Declare both mapped to the same column:

```ts
@Column({ type: "uuid" })
userId!: string;

@ManyToOne(() => UserEntity)
@JoinColumn({ name: "userId" })
owner!: UserEntity;
```

Always write through the plain `userId` field when creating/querying in this slice's repository — don't set `owner` directly, to avoid TypeORM trying to manage the same column two ways.

**Ownership-scoped mutations**: `updateBook` and `deleteBook` must include `userId` in their `WHERE` clause (via `repo.update({ id, userId }, ...)` / `repo.delete({ id, userId })` style scoping, not a separate `findOne` followed by an unscoped `save`/`delete`). Return `null` (update) / `false` (delete) when the affected row count is zero — this covers "not found" and "not owned" identically, so the action layer can't accidentally leak which case occurred.

**Inline edit-in-place state**: `book-list.tsx` is a client component tracking a single `editingId: string | null` in local state. Clicking "Edit" on a row sets `editingId` to that book's id, swapping that row's display into an inline form (its own `useActionState(updateBookAction, null)` instance) with a "Cancel" button that resets `editingId` to `null`. Only one row is editable at a time. A successful Save must *also* reset `editingId` back to display mode — discovered at manual-verification time that `useActionState` has no built-in "on success" callback, so `EditBookRow` detects the pending→not-pending transition with no error (via a `wasPending` ref, to avoid firing on initial mount where `isPending` also starts `false`) and calls an `onSaved` prop, wired to the same `setEditingId(null)` as `onCancel`.

**Delete confirmation**: no modal/dialog component exists in this codebase yet. Use a native `window.confirm()` gate on the delete button's `onClick` (call `e.preventDefault()` if the user cancels, otherwise let the form submit through to `deleteBookAction`) — no new UI dependency needed.

**Testing `@/auth` in Server Action tests**: existing tests never mock anything (real DB, real everything). Server Action tests for `addBookAction`/`updateBookAction`/`deleteBookAction` need a fixed fake session without going through a real sign-in flow — mock only the `auth` export from `@/auth` (`jest.mock("@/auth", () => ({ auth: jest.fn() }))`), and let everything else (the repository, the real DB) run for real, consistent with this project's "integration test, not unit test" style.

## Phase 1: Book Entity, Migration & Repository

### Overview

Establish the data layer: the `Book` entity, its migration, and a repository exposing ownership-scoped CRUD functions.

### Changes Required:

#### 1. UUID generator utility

**File**: `src/lib/generate-id.utils.ts`

**Intent**: Satisfy the project's id-generation hard rule (see Key Discoveries) — ids are generated by the application, not the database. Shared by any future entity, starting with `Book`.

**Contract**: `export function generateId(): string` — returns `crypto.randomUUID()` (Node's built-in `crypto`, already used implicitly via `pg`/`typeorm`'s runtime; no new dependency).

#### 2. UUID generator tests

**File**: `test/lib/generate-id.utils.spec.ts`

**Intent**: Satisfy this project's "every exported function must have a spec file" testing rule (`AGENTS.md`).

**Contract**: Assert `generateId()` returns a well-formed UUID (matches the standard UUID regex) and that two successive calls return different values.

#### 3. Book entity

**File**: `src/server/book/book.entity.ts`

**Intent**: Define the `Book` entity per the roadmap's minimal-fields guidance (title, author, userId, createdAt) plus the optional `notes` field and `updatedAt`, mirroring `user.entity.ts`'s structure except for `id` (see Key Discoveries — application-generated, not DB-generated).

**Contract**: `@Entity("books")` class `BookEntity` with `id` (`@PrimaryColumn({ type: "uuid" })` — populated by `generateId()` in the repository at creation time, NOT `@PrimaryGeneratedColumn`), `title` (`@Column({ type: "varchar" })`), `author` (`@Column({ type: "varchar" })`), `notes` (`@Column({ type: "varchar", nullable: true })`), `userId` + `owner` relation (see Critical Implementation Details above), `createdAt`/`updatedAt` (`@CreateDateColumn()`/`@UpdateDateColumn()`). Class-level `@Unique(["userId", "title", "author"])` enforces the no-duplicate-per-user rule decided during planning.

#### 4. Register the entity with the runtime data source

**File**: `src/lib/data-source.ts`

**Intent**: Make the app's TypeORM connection aware of `BookEntity` (the CLI data source's glob picks it up automatically — no change needed there).

**Contract**: Import `BookEntity` from `@/server/book/book.entity` and add it to the `entities` array: `entities: [UserEntity, BookEntity]`.

#### 5. Migration

**File**: `src/migrations/<generated-timestamp>-CreateBookTable.ts`

**Intent**: Create the `books` table matching the entity above.

**Contract**: Generate via `npm run migration:generate -- src/migrations/CreateBookTable` (per the existing `migration:generate` script) after the entity is written — do not hand-write the SQL. Review the generated file for the FK constraint on `userId` → `users.id`, the composite unique constraint, and confirm the `id` column has no DB-side default/generation expression (application-supplied) before running `npm run migration:run`.

#### 6. Book repository

**File**: `src/server/book/book.repository.ts`

**Intent**: Expose ownership-scoped CRUD functions following `user.repository.ts`'s plain-function, string-lookup style.

**Contract**:
- `createBook(data: { userId: string; title: string; author: string; notes?: string }): Promise<BookEntity>` — generates the id via `generateId()` and sets it explicitly on the entity before `repo.save` (the column has no DB-side default).
- `findByUserId(userId: string): Promise<BookEntity[]>` — ordered by `createdAt` descending
- `updateBook(id: string, userId: string, data: Partial<{ title: string; author: string; notes: string | null }>): Promise<BookEntity | null>` — scoped update, `null` if no row matched
- `deleteBook(id: string, userId: string): Promise<boolean>` — scoped delete, `true` iff a row was removed

#### 7. Repository tests

**File**: `test/server/book/book.repository.spec.ts`

**Intent**: Mirror `test/server/user/user.repository.spec.ts`'s real-DB integration style for the new repository, including the ownership-scoping and duplicate-constraint behavior.

**Contract**: Cover: create + findByUserId round-trip (including asserting `id` is a well-formed UUID set by `createBook`, not left undefined); update succeeds for the owner and returns `null` for a different `userId`; delete succeeds for the owner and returns `false` for a different `userId`; creating a second book with the same `userId`+title+author raises a `QueryFailedError` with Postgres code `23505`. Use a per-test-run unique fixture (timestamp-suffixed title, as the existing spec does for email) and clean up + `ds.destroy()` in `afterAll`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit` (no dedicated typecheck script exists in this project)
- Linting passes: `npm run lint`
- Migration applies cleanly: `npm run migration:run`
- UUID generator tests pass: `npm test -- generate-id`
- Repository tests pass: `npm test -- book.repository`

#### Manual Verification:

- Inspect the `books` table via the Neon console (or `psql`) after `migration:run` and confirm columns, the FK to `users`, and the composite unique constraint match the entity
- Confirm `npm run migration:revert` cleanly drops the table (rollback works)

---

## Phase 2: Server Actions

### Overview

Wire `addBookAction`, `updateBookAction`, and `deleteBookAction` on top of the repository, with validation, session/auth checks, and duplicate-constraint handling.

### Changes Required:

#### 1. Collection Server Actions

**File**: `src/app/collection/actions.ts`

**Intent**: Provide the three mutating actions the UI will call, following `register/actions.ts`'s validation + error-handling shape.

**Contract**:
- Module-level zod schema: `title` (string, trim, min 1, max 255), `author` (string, trim, min 1, max 255), `notes` (optional string, trim, max 2000, empty string treated as absent). A separate `bookId: z.string().uuid()` check guards `updateBookAction`/`deleteBookAction` (see below) — `bookId` is read from a hidden form field, and Server Actions are directly reachable POST endpoints, not just via the rendered form, so a malformed value must not reach the repository as a raw string.
- All three actions call `revalidatePath("/collection")` (from `next/cache`) immediately after a successful mutation, before returning `null` — discovered at manual-verification time: invoking a Server Action does **not** by itself invalidate the client Router Cache, so without this, `/collection` kept rendering the pre-mutation RSC payload until a hard refresh (confirmed by testing update in a real browser).
- `addBookAction(prevState: string | null, formData: FormData): Promise<string | null>` — `auth()` for `session.user.id`; on missing session return an error string (defensive; route is already middleware-protected); parse form fields; call `createBook`; catch `QueryFailedError` code `23505` → `"You already have a book with this title and author."`; other errors re-thrown; on success, `revalidatePath("/collection")` then return `null`.
- `updateBookAction(prevState: string | null, formData: FormData): Promise<string | null>` — the edit form is always submitted in full (every field pre-filled, not a partial patch), so unlike `addBookAction`, an empty `notes` field here is unambiguous: it means the user cleared it, and must be passed through as `notes: null` (not omitted) so `updateBook` actually clears the column. Same `title`/`author` validation, plus a required `bookId` field from a hidden input validated with `z.string().uuid()` (a failed parse maps to the same not-found/not-owned message below, rather than reaching the repository); call `updateBook(bookId, session.user.id, data)`; `null` result → `"Book not found or you don't have permission to edit it."`; duplicate-constraint handling same as add; on success, `revalidatePath("/collection")` then return `null`.
- `deleteBookAction(prevState: string | null, formData: FormData): Promise<string | null>` — required `bookId` field, validated the same way as `updateBookAction`; call `deleteBook(bookId, session.user.id)`; `false` result → same not-found/not-owned message; on success, `revalidatePath("/collection")` then return `null`.

#### 2. Server Action tests

**File**: `test/app/collection/actions.spec.ts`

**Intent**: Establish this project's first Server Action test, covering validation, auth, ownership, and duplicate handling — everything real except the session.

**Contract**: `jest.mock("@/auth", () => ({ auth: jest.fn() }))`, set a fixed fake `session.user.id` per test via the mock's return value. Cover: valid add creates a real row (verify via `findByUserId`); missing/blank title returns the validation error string without touching the DB; add of an existing title+author combo returns the friendly duplicate message; update/delete succeed for the owning fake user and return the not-found/not-owned message when the mock session's `userId` differs from the book's owner. Clean up created rows in `afterAll`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Action tests pass: `npm test -- collection/actions`

#### Manual Verification:

- After running the action tests, inspect the DB directly (Neon console/`psql`) to confirm created/updated/deleted rows match expectations
- Manually invoke `updateBookAction`/`deleteBookAction` with a `userId` that doesn't own the target book (e.g. via a scratch script) and confirm the not-found/not-owned message is returned and no row is mutated

---

## Phase 3: Collection Page UI & Navigation

### Overview

Build the `/collection` page: inline add form, list of owned books, inline edit-in-place, delete with confirmation — and link it from the nav and home page.

### Changes Required:

#### 1. Collection page

**File**: `src/app/collection/page.tsx`

**Intent**: Server component that loads the signed-in user's books and renders the add form + list, mirroring the server/client split used by `register/page.tsx`.

**Contract**: `await auth()` for the session; `await findByUserId(session.user.id)`; map the resulting `BookEntity[]` to plain objects before rendering — e.g. `const plainBooks = books.map(b => ({ id: b.id, title: b.title, author: b.author, notes: b.notes, createdAt: b.createdAt }))` — since TypeORM entities are class instances and cannot be passed as props across the Server→Client boundary (Next.js RSC only accepts plain objects); render `<AddBookForm />` and `<BookList books={plainBooks} />`.

#### 2. Add-book form

**File**: `src/app/collection/_components/add-book-form.tsx`

**Intent**: Client component for the inline add flow, matching `register-form.tsx`'s `useActionState` wiring.

**Contract**: `useActionState(addBookAction, null)`; fields `title`, `author` (required), `notes` (optional textarea); submit disabled while pending; error rendered as `<p role="alert">`.

#### 3. Book list with inline edit/delete

**Files**: `src/app/collection/_components/book-list.tsx`, `src/app/collection/_components/book-row.tsx`, `src/app/collection/_components/edit-book-row.tsx` (split into one component per file per this project's convention, discovered/confirmed at implementation time — `book-list.tsx` exports the shared `Book` plain-object type used by the other two).

**Intent**: Client components rendering the owned books, with per-row inline edit (via local `editingId` state, see Critical Implementation Details) and delete-with-confirm.

**Contract**: `book-list.tsx` exports `type Book = { id: string; title: string; author: string; notes: string | null; createdAt: Date }` (a plain serializable shape, not `BookEntity[]` — TypeORM entities are class instances and cannot cross the Server→Client boundary as props) and `BookList({ books: Book[] })`, which renders each row as `BookRow` (display + Edit/Delete) or, when its id matches local `editingId` state, `EditBookRow` (inline `useActionState(updateBookAction, null)` form, pre-filled, hidden `bookId`, Save/Cancel). `BookRow`'s Delete button is gated by `window.confirm(...)` before submitting a `useActionState(deleteBookAction, null)` form with hidden `bookId`.

#### 4. Navigation link

**File**: `src/app/_components/nav.tsx`

**Intent**: Give signed-in users a way to reach `/collection` from anywhere.

**Contract**: Add a "Collection" link to `/collection` in the authenticated branch, alongside the existing sign-out control.

#### 5. Home page placeholder

**File**: `src/app/page.tsx`

**Intent**: Replace the "Your collection is coming soon." placeholder now that the feature exists.

**Contract**: Replace the placeholder `<p>` with a link to `/collection` for signed-in users.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- Sign in, click the nav "Collection" link, land on `/collection`
- Add a book via the inline form; it appears in the list immediately without a manual refresh
- Attempt to add the exact same title+author again; see the friendly duplicate-rejection message, no new row created
- Click Edit on a book, change a field, Save; confirm the updated values persist after the page re-renders
- Click Edit, then Cancel; confirm no changes were saved
- Click Delete, cancel the browser confirm; confirm the book is still present
- Click Delete, accept the confirm; confirm the book is removed from the list
- Sign out and navigate directly to `/collection`; confirm redirect to `/login`
- Visit the home page signed in; confirm the placeholder text is gone and the link to `/collection` works

---

## Testing Strategy

### Unit Tests:

- None distinct from the integration tests below — this project has no unit-test-with-mocked-DB convention; repository and action logic are tested against a real database (only `@/auth` is mocked, and only in Phase 2's action tests).

### Integration Tests:

- `test/server/book/book.repository.spec.ts` (Phase 1) — CRUD + ownership-scoping + duplicate-constraint behavior against the real DB.
- `test/app/collection/actions.spec.ts` (Phase 2) — validation, auth, ownership, duplicate handling at the Server Action layer, real DB + mocked session.

### Manual Testing Steps:

1. Full add → view → edit → delete walkthrough (see Phase 3 Manual Verification).
2. Duplicate-add rejection.
3. Cross-user ownership check: confirm one user cannot edit/delete another user's book (can be exercised via two browser sessions/incognito, or via the scratch-script check in Phase 2).
4. Logged-out redirect from `/collection`.

## Performance Considerations

None beyond what's already in place — target data volume is small (PRD `target_scale`), and `findByUserId` is a single indexed-by-FK query with no pagination needed at this scale.

## Migration Notes

This migration only creates a new table (`books`) with a FK to the existing `users` table — no existing data to migrate or backfill.

## References

- Prior pattern: `src/server/user/user.entity.ts`, `src/server/user/user.repository.ts`, `src/app/register/actions.ts`, `src/app/register/_components/register-form.tsx`
- Roadmap: `context/foundation/roadmap.md` (S-01)
- PRD: `context/foundation/prd.md` (FR-003, FR-004)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Book Entity, Migration & Repository

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit` — 636e01a
- [x] 1.2 Linting passes: `npm run lint` — 636e01a
- [x] 1.3 Migration applies cleanly: `npm run migration:run` — 636e01a
- [x] 1.4 Repository tests pass: `npm test -- book.repository` — 636e01a
- [x] 1.7 UUID generator tests pass: `npm test -- generate-id` — 636e01a

#### Manual

- [x] 1.5 Inspect the `books` table schema/constraints via Neon console/psql — 636e01a
- [x] 1.6 Confirm `npm run migration:revert` cleanly drops the table — 636e01a

### Phase 2: Server Actions

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit` — 641a27a
- [x] 2.2 Linting passes: `npm run lint` — 641a27a
- [x] 2.3 Action tests pass: `npm test -- collection/actions` — 641a27a

#### Manual

- [x] 2.4 Inspect DB state after action tests to confirm created/updated/deleted rows — 641a27a
- [x] 2.5 Confirm cross-user update/delete attempt is rejected via scratch-script check — 641a27a

### Phase 3: Collection Page UI & Navigation

#### Automated

- [x] 3.1 Type checking passes: `npx tsc --noEmit`
- [x] 3.2 Linting passes: `npm run lint`

#### Manual

- [ ] 3.3 Nav link reaches `/collection`
- [ ] 3.4 Add book appears immediately in list
- [ ] 3.5 Duplicate add rejected with friendly message
- [ ] 3.6 Edit persists changes; Cancel discards them
- [ ] 3.7 Delete: cancel keeps book, accept removes it
- [ ] 3.8 Logged-out redirect from `/collection` to `/login`
- [ ] 3.9 Home page placeholder replaced with working `/collection` link
