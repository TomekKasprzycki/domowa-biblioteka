# S-07: ISBN Lookup — Implementation Plan

## Overview

Let the user optionally type an ISBN in the add-book dialog and have title and author fetched from Open Library and filled in. The normalised ISBN is stored on the book; nothing displays it yet (S-09 owns display). Because a well-formed but wrong ISBN returns a plausible wrong book, a save that follows a lookup is gated behind an explicit confirmation.

## Current State Analysis

The add flow after S-06 is `page.tsx` (Server Component) → `AddBookModal` (client, owns open state) → shared `Modal` → `AddBookForm`.

- `src/app/collection/_components/add-book-form.tsx` — three uncontrolled fields (`title`, `author`, `notes`), `useActionState(addBookAction, null)` at line 14, error rendered as `<p role="alert">` at 58-62, success detected by `useActionSuccess` at line 16. A `type="button"` Cancel already sits inside the form (72-78), so a non-submit control in this form has precedent.
- `src/app/collection/_components/add-book-modal.tsx` — dirty check scans the live DOM (`querySelectorAll("input, textarea")`, 18-23) and feeds `canClose`; the form subtree is remounted on every open via `key={String(open)}` (line 47).
- `src/app/collection/actions.ts` — all three actions return `string | null`, validate field-by-field with zod `safeParse` and return the first issue message. `addBookAction` maps empty notes to `undefined` (line 62); `updateBookAction` maps empty notes to `null` (line 116). Every action opens with `await auth()`.
- `src/server/book/book.entity.ts` — `id`, `title`, `author`, `notes` (nullable), `userId`, `owner`, `createdAt`, `updatedAt`. One class decorator, `@Unique(["userId","title","author"])`. No `isbn`.
- `src/server/book/book.repository.ts` — `createBook({ userId, title, author, notes? })` at 6-16; `updateBook` takes `Partial<{title, author, notes: string | null}>` at 43-53.
- `jest.config.ts` — `preset: "ts-jest"`, `testEnvironment: "node"`, jsdom opted into per file via docblock. No `testEnvironmentOptions`, no `setupFilesAfterEnv`.
- No outbound HTTP call exists anywhere in `src/`; no HTTP-mocking library is installed; the only hand-written route handler is NextAuth's.

Full grounding, including the live Open Library contract, is in `context/changes/isbn-lookup/research.md`.

## Desired End State

In the add-book dialog the user can type an ISBN and press "Look up". Title and author fill in from Open Library and stay editable. A confirmation checkbox appears and the submit button stays disabled until it is ticked, so no fetched data is saved without the user having looked at it. A book typed in entirely by hand behaves exactly as it does today — one step, no checkbox. Every failure path (invalid checksum, unknown ISBN, timeout, upstream error) leaves the form fully usable with a message telling the user to type the details in. The ISBN is persisted and displayed nowhere.

Verified by: `npm run lint`, `npm test`, `npm run build` all green, plus the manual pass in Testing Strategy.

### Key Discoveries

- **Open Library signals "not found" as HTTP 200 with body `{}`** — not a 404. Checking `response.ok` alone classifies every miss as a success. The response is keyed by the bibkey echoed back verbatim, so the reader must look under `ISBN:${the exact string sent}`.
- **A found record may carry no `authors` key at all** (`ISBN:9780000000002` returns a title with no authors). "Found" does not imply both fields are available.
- **Practically any well-formed 13-digit string matches some record** — `9999999999999` returns a real book. Checksum validation before the call is the only thing that stops a typo from autofilling a plausible wrong book.
- **`createBook`'s `notes?: string` vs `updateBook`'s `notes: string | null`** — the repo's optional-field precedent is split; `AGENTS.md:16` favours `| null`.
- **`synchronize: true` in dev voids `migration:generate`** — `friend-connections/reviews/plan-review.md:41-47` (F2). A pure column addition is the most likely case to ship with no migration file at all.
- **`<input type="checkbox">.value` is `"on"` regardless of checked state** — so the existing DOM dirty scan would report the form dirty the moment a confirmation checkbox renders. Verified: this turns `test/app/collection/_components/add-book-modal.spec.tsx:85-98` red on both of its assertions.
- **`msw` cannot run under this repo's jest setup without four config changes.** Reproduced against the project's exact versions: importing `msw` — not just `msw/node` — throws `SyntaxError: Cannot use import statement outside a module` from `rettime/build/index.mjs`. `transformIgnorePatterns` alone does not fix it, because this repo's `transform` matches only `^.+\.tsx?$`, so un-ignored `.mjs` files reach no transformer. A working setup needs a `.mjs`/`.js` transform entry, `transformIgnorePatterns`, `moduleFileExtensions`, and a second tsconfig with `allowJs`.
- **React 19 clears uncontrolled fields of a `<form action={…}>` after the action resolves — including when it returns an error.** Measured. So the add form is blanked today on a duplicate-title error while the alert is showing; converting the inputs to controlled changes that, and changes what the modal's dirty check sees afterwards.
- **Middleware gates `/api/isbn` before the route handler runs.** `middleware.ts:8` matches everything but static assets, and `auth.config.ts:16-20` marks only `/`, `/login`, `/register` and `/api/auth/*` public — so an unauthenticated request is redirected to `/login` rather than reaching the handler.

## What We're NOT Doing

- **Not rendering the ISBN anywhere.** No change to `book-row.tsx`, no `isbn` field on `CollectionBook`, no change to the entity→view-model mapper at `page.tsx:22-38`. Display is S-09's job (`shelf-view/change.md:40-41`). This slice's visible outcome is the autofill, not the number.
- **Not touching `/discover` or `DiscoverBook`.** Threading `isbn` to a friend's books belongs to S-09 (`shelf-view/change.md:42-45`).
- **Not adding an ISBN field to the edit dialog, and not letting `updateBookAction` write `isbn`.** `edit-book-modal.tsx` and `updateBook`'s `Partial<...>` input are untouched, so a stored ISBN cannot be erased by an edit. Correcting a wrong ISBN is not possible in this slice — that is accepted, and the mockup's "blank the ISBN input on edit" behaviour (`design.html:976-978`) is deliberately **not** implemented.
- **Not adding a unique constraint or an index on `isbn`.** A user may own two copies; `@Unique(["userId","title","author"])` already guards duplicates (`change.md:28-30`).
- **Not fetching anything beyond title and author.** Covers, publisher, year and page count stay out of scope per the PRD Non-Goals amendment (`prd.md:139`).
- **Not creating the service layer.** `AGENTS.md:23` prescribes `src/server/<feature>/service.ts`, which this repo has never had. An outbound integration gateway is not that service, so this change adds `openlibrary.gateway.ts` and leaves the missing service layer as recorded debt rather than inventing it half-way here.
- **Not installing `msw`, and not modifying `jest.config.ts`.** `AGENTS.md:45` mandates msw for HTTP mocking, and this change knowingly departs from it. A spike proved msw needs four coordinated jest config changes plus a second tsconfig in this repo (see Key Discoveries), and a brittle `transformIgnorePatterns` allow-list that a lockfile refresh can silently invalidate — disproportionate for one outbound call. The gateway's spec stubs `global.fetch` instead. Adopting msw properly is recorded as its own tooling change; the constraint is logged in `context/foundation/lessons.md` so the next slice does not rediscover it.
- **Not caching lookup responses.** Next.js `fetch` caching is opt-in and this change does not opt in.
- **Not rate-limiting our own `/api/isbn` endpoint.** It is auth-gated, so exposure is bounded to signed-in users of a single-user-scale app.
- **Not backfilling `isbn` for existing books**, and not adding a bulk import path.
- **Not building S-08 primitives.** The ISBN row stays plain markup that S-08 can restyle without behaviour change.

## Implementation Approach

Bottom-up, mirroring S-06. Phase 1 makes the column exist and the write path carry an ISBN — provable through the action spec without any UI. Phase 2 builds the lookup stack behind an auth-gated endpoint, still invisible. Phase 3 wires the dialog and adds the confirmation gate, which is the only user-visible phase. Each phase leaves the app working: after Phase 1 an ISBN can be stored but nothing supplies one, after Phase 2 the endpoint answers but nothing calls it.

The ISBN normaliser lands in Phase 1 rather than with the lookup stack, because `addBookAction` must validate what the browser submits — the server does not trust the client's normalisation.

## Critical Implementation Details

**Not-found detection.** The upstream miss is `200` with body `{}`. The client must decide "found" by looking up the key `ISBN:${normalizedIsbn}` in the parsed body and finding an object there — not by `response.ok`, and not by checking whether the body is empty. Because the key echoes the exact string sent, the client must use the same normalised value it put in the query string.

**Migration generation.** `DATABASE_URL` and `DATABASE_URL_UNPOOLED` point at the same Neon database, and `synchronize: true` is on in development (`data-source.ts:17`). If a dev server has run since the entity gained `isbn`, the column already exists upstream, `migration:generate` diffs clean and writes **no file**. Stop any dev server and drop the column in Neon before generating, or hand-write the migration — the workaround recorded at `auth-scaffold/plan.md:154`. Verify the generated file actually contains `ALTER TABLE "books" ADD "isbn"` before moving on.

**Dirty-check selector.** `add-book-modal.tsx:18-23` treats any `input, textarea` with a non-empty trimmed `.value` as dirt. A checkbox's `.value` is the string `"on"` whether or not it is checked, so the confirmation checkbox would make `isDirty()` return `true` permanently and fire the discard prompt on every dismissal. The selector must exclude checkboxes. The ISBN text input, by contrast, *should* count as dirt — that part is intended. Without the fix, `add-book-modal.spec.tsx:85-98` ("dismisses an untouched dialog without prompting") fails on both assertions — a loud break, not a silent one. Note also that the two dirty-path tests at `:100-128` pass even against a permanently-true `isDirty`, so they do not discriminate; the new spec case has to.

**React 19 form reset, and what the controlled conversion changes.** React clears an uncontrolled `<form action={…}>`'s fields once the action resolves, and it does so whether the action succeeded or returned an error string — React cannot tell the difference. Two consequences, both currently untested:

- Today a duplicate-title error blanks the add form while the alert renders. After the conversion, title and author survive the failed submit. This is an improvement, and it needs a regression test so it stays true.
- Because the fields now retain text after a failure, `isDirty()` flips from `false` to `true` on that path, so Esc after a failed submit starts showing the discard prompt where it previously closed silently. This is intended — real work would be lost — but it is a new behaviour and gets its own manual criterion.

The comments at `add-book-modal.tsx:15-17` and `:45-46` both assert that the form is uncontrolled. Both become false and must be rewritten in the same phase.

**Provenance is per-attempt, not per-field.** Once a lookup has populated the form, the confirmation gate applies to that submission regardless of what the user subsequently edits. Do not try to track which individual field is still "machine-filled". The flag resets with the form's remount on reopen (`add-book-modal.tsx:47`), so it needs no explicit teardown.

---

## Phase 1: Data Layer

### Overview

The `isbn` column exists and the add path can persist it. No UI supplies a value yet.

### Changes Required:

#### 1. ISBN normaliser

**File**: `src/lib/normalize-isbn.utils.ts` (new)

**Intent**: One pure function that both the server action and the route handler use to turn raw user input into a canonical ISBN or reject it. Validating the check digit here is what stops a single-digit typo from reaching Open Library and autofilling a plausible wrong book.

**Contract**: `normalizeIsbn(raw: string): string | null`. Strips spaces and hyphens, uppercases a trailing `x`, accepts ISBN-10 and ISBN-13, verifies the check digit, and returns the normalised digits-only string (ISBN-10 keeps a trailing `X`). Returns `null` for anything else, including empty input. No throwing, no I/O.

#### 2. Book entity

**File**: `src/server/book/book.entity.ts`

**Intent**: Add the nullable column. Follows the `notes` precedent exactly.

**Contract**: `@Column({ type: "varchar", nullable: true })` with `isbn!: string | null`, placed after `notes`. No `length`, no `@Index`, and `@Unique(["userId","title","author"])` is not extended. The explicit `type` is required — SWC provides no decorator metadata (`AGENTS.md:14`, `lessons.md:5-10`).

#### 3. Migration

**File**: `src/migrations/<timestamp>-AddBookIsbn.ts` (new)

**Intent**: First `ALTER TABLE … ADD COLUMN` in this repo — every prior migration creates a table or an index, so there is no in-repo shape to copy.

**Contract**: Generated with `npm run migration:generate -- src/migrations/AddBookIsbn`, not hand-written unless generation is blocked. `up` adds `"isbn" character varying` to `books`; `down` drops it. Existing rows take NULL. See Critical Implementation Details before generating.

#### 4. Repository

**File**: `src/server/book/book.repository.ts`

**Intent**: Let `createBook` carry an ISBN. `updateBook` is deliberately left alone so no edit path can write the column.

**Contract**: `createBook`'s input object gains `isbn?: string | null`. Optional rather than required so the existing repository and action fixtures keep compiling — adding a required field to a shared input shape is the fixture-break class flagged at `borrow-request/reviews/plan-review.md:36-44`. Omitted or `null` leaves the column NULL. `updateBook`'s `Partial<...>` is unchanged.

#### 5. Add action

**File**: `src/app/collection/actions.ts`

**Intent**: Read, validate and persist the ISBN submitted with the add form. The server re-normalises rather than trusting the browser.

**Contract**: `addBookAction` reads `formData.get("isbn")`. Absent or empty-after-trim → `null` (a fresh row simply has no ISBN, matching the existing notes-on-add reasoning at `actions.ts:61-62`). A non-empty value is passed through `normalizeIsbn`; `null` back means the input is rejected with a new message constant alongside the existing ones at `actions.ts:26-35`. The normalised value is passed to `createBook`. Return type stays `string | null`; `updateBookAction` and `deleteBookAction` are untouched.

#### 6. Specs

**Files**: `test/lib/normalize-isbn.utils.spec.ts` (new); `test/server/book/book.repository.spec.ts`, `test/app/collection/actions.spec.ts` (extended)

**Intent**: Prove the check digit actually rejects, and that an ISBN survives the write path end to end.

**Contract**: House style — given/when/then, one behaviour per `it`, `it.each` for the table-shaped normaliser cases (`AGENTS.md:46-48`). Normaliser cases: valid ISBN-13, valid ISBN-10, ISBN-10 ending in `X`, hyphenated and spaced input, a single-digit typo that fails the checksum, non-numeric input, empty string. Repository: `createBook` with an ISBN persists it, without one leaves NULL. Action: valid ISBN reaches the row; invalid ISBN returns the rejection message and writes nothing; absent ISBN still creates the book.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Specs pass: `npm test`
- Migration applies cleanly: `npm run migration:run`
- Migration reverts and re-applies cleanly: `npm run migration:revert` followed by `npm run migration:run`

#### Manual Verification:

- The generated migration file actually contains `ALTER TABLE "books" ADD "isbn"`, and existing book rows show NULL in the new column.

**Implementation Note**: Pause here for manual confirmation before starting Phase 2.

---

## Phase 2: Lookup Stack

### Overview

An auth-gated endpoint that turns an ISBN into a title and author. Nothing calls it yet.

### Changes Required:

#### 1. Fetch stub helper

**File**: `test/shared/openlibrary.mock.ts` (new)

**Intent**: Let the gateway's spec drive every upstream response shape without installing msw. Sits beside the existing `dialog.mock.ts`, where global test helpers belong (`AGENTS.md:44`).

**Contract**: Installs and restores a `jest.spyOn(global, "fetch")` stub, and exports named fixtures for the shapes the gateway must handle: a record with `authors`, a record with no `authors` key, `200` with `{}`, a non-2xx, and an abort. Consumers own setup and teardown in their own spec. No new dependency and no change to `jest.config.ts` — see What We're NOT Doing for why msw is deferred to its own tooling change.

#### 2. Open Library gateway

**File**: `src/server/book/openlibrary.gateway.ts` (new)

**Intent**: The single place that talks to Open Library. It absorbs every failure so callers only ever see "found" or "not found" — the guarantee behind "a failed lookup never blocks manual entry" (`change.md:31-32`). Named `.gateway.ts` rather than `.client.ts` because in a Next.js codebase "client" already means "runs in the browser", and the browser-side wrapper in Phase 3 owns that suffix.

**Contract**: `lookupByIsbn(normalizedIsbn: string): Promise<{ title: string; author: string | null } | null>`.

- `GET https://openlibrary.org/api/books?bibkeys=ISBN:${normalizedIsbn}&format=json&jscmd=data`.
- Aborts at 5 seconds via `AbortSignal.timeout(5000)`.
- Sends a `User-Agent` of the form `domowa-biblioteka (${process.env.OPENLIBRARY_CONTACT})` when that variable is set, and omits the header otherwise.
- Returns `null` — never throws — for: a non-2xx status, a body that is not JSON, a body with no `ISBN:${normalizedIsbn}` key, an abort, and any network error.
- On a hit, returns the record's `title` and `authors[0].name`, with `author: null` when `authors` is absent or empty.
- Must not carry `export const runtime = "edge"` anywhere in its import chain — `@/auth` pulls TypeORM and `pg`, and the existing split between `middleware.ts` (imports `auth.config` only) and `src/auth.ts` exists to keep them out of the edge bundle.

#### 3. Environment variable

**Files**: `.env.local` (developer machine), Vercel project settings, `README.md`

**Intent**: `OPENLIBRARY_CONTACT` is the whole reason the identified 3 req/s tier was chosen over the anonymous 1 req/s one. Because the gateway falls back to omitting the header silently, an unset variable produces no error and no signal — the benefit would simply never materialise in production.

**Contract**: A new environment variable holding a contact address, in the form Open Library asks for. Recorded in `README.md` alongside a note that `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are the other two — the repo has no `.env.example`, so the README is the only discoverable place. Set in the Vercel project so the deployed app is identified. This narrows the `change.md:26-27` note that no new environment variable was needed: that note was about API keys, and this is contact identification.

#### 4. Route handler

**File**: `src/app/api/isbn/route.ts` (new)

**Intent**: Expose the lookup to the browser without exposing Open Library. First hand-written route handler in the repo — the only existing one is NextAuth's catch-all.

**Contract**: `GET /api/isbn?isbn=<raw>`.

- `await auth()` first; no session → `401` with no body detail.
- `normalizeIsbn` on the query parameter; `null` → `400`.
- Otherwise calls `lookupByIsbn` and answers `200` with `{ found: false }` or `{ found: true, title, author }`. The upstream payload is never forwarded verbatim.

**Middleware reality**: an unauthenticated request never reaches this handler. `middleware.ts:8` matches every non-static path and `auth.config.ts:16-20` treats only `/`, `/login`, `/register` and `/api/auth/*` as public, so NextAuth redirects to `/login` (`auth.config.ts:12`) before the handler runs. The `auth()` gate above is therefore defence-in-depth rather than the observable behaviour, and it stays for that reason. The middleware matcher and the public-path list are **not** modified by this change — making `/api/*` return real 401s is a shared-config decision that outlives this slice. Phase 3's wrapper is what has to cope with a redirect, and the manual criteria below expect one.

#### 5. Specs

**Files**: `test/server/book/openlibrary.gateway.spec.ts` (new), `test/app/api/isbn/route.spec.ts` (new)

**Intent**: The gateway spec is where the verified upstream contract gets pinned down.

**Contract**: Gateway spec runs in the default node environment and drives the `global.fetch` stub through every branch: a record with `authors`, a record with **no** `authors` key, `200` with `{}`, a non-200, and an abort. It also asserts the request URL carries the exact normalised bibkey, and that the `User-Agent` header is present when `OPENLIBRARY_CONTACT` is set and absent when it is not. Route spec mocks `@/auth` and `@/server/book/openlibrary.gateway` in the established `jest.mock` style and covers 401, 400 on a bad checksum, `found: false`, and `found: true`. No route-handler spec exists in this repo yet, so this establishes the pattern.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Specs pass: `npm test`
- No new runtime or dev dependency was added: `git diff package.json` is empty

#### Manual Verification:

- Signed in, `GET /api/isbn?isbn=9780140328721` in the browser returns `found: true` with title and author.
- Signed in, an ISBN with a broken check digit returns `400`, and a well-formed but unknown ISBN returns `found: false`.
- Signed out, the same URL redirects to `/login` rather than returning `401` — confirming the middleware behaviour Phase 3's wrapper must handle.
- With `OPENLIBRARY_CONTACT` set locally, the outbound request carries the `User-Agent` header; the variable is recorded in `README.md` and set in the Vercel project.

**Implementation Note**: Pause here for manual confirmation before starting Phase 3.

---

## Phase 3: Dialog, Autofill and Confirmation Gate

### Overview

The add dialog gains the ISBN row, the autofill, and the gate. The only user-visible phase.

### Changes Required:

#### 1. Lookup result type

**File**: `src/app/collection/collection.types.ts`

**Intent**: The lookup result shape is shared between the browser wrapper and the form, so it belongs in a `*.types.ts` (`AGENTS.md:33`, `lessons.md:26-31`).

**Contract**: Adds an exported three-variant result type: `{ status: "found"; title: string; author: string | null }`, `{ status: "not-found" }`, and `{ status: "unauthenticated" }`. The third variant exists because of the middleware behaviour documented in Phase 2 — collapsing it into "not found" would tell a user with an expired session that their book does not exist. `CollectionBook` is **not** modified.

#### 2. Browser lookup wrapper

**File**: `src/app/collection/isbn-lookup.client.ts` (new)

**Intent**: A one-function module around `fetch("/api/isbn?…")`. It exists so the form's spec can `jest.mock` a module — the repo's established idiom — rather than stubbing `global.fetch` inside a component spec.

**Contract**: `lookupIsbn(raw: string): Promise<IsbnLookupResult>`. Encodes the query parameter and maps outcomes to the three variants:

- A `200` JSON body maps to `found` or `not-found` as the endpoint reported it.
- **A redirected response or a body that does not parse as JSON maps to `unauthenticated`.** This is the expected shape of a signed-out or session-expired request, because middleware redirects it to the `/login` HTML page — `fetch` follows the redirect and returns a `200` full of HTML, so neither the status code nor `response.ok` reveals the problem. `response.redirected` and a failed `json()` are the signals.
- A network error maps to `not-found`, since nothing distinguishes it from an upstream miss from the browser's side.

#### 3. Add form

**File**: `src/app/collection/_components/add-book-form.tsx`

**Intent**: The substance of the slice. The form gains an ISBN row, autofill, and the confirmation gate, while the manual path stays exactly one step.

**Contract**:

- `title` and `author` become controlled via `useState`, which S-06 explicitly deferred to this change (`collection-modals/plan.md:38`). **The ISBN input is controlled too** — the lookup button reads its value, and the "reject an empty or malformed ISBN without issuing a request" path needs it in state rather than off the DOM. `notes` stays uncontrolled; it is the only field nothing else reads.
- A new field group renders **first**, above Title, matching the mockup (`design.html:657-664`): a text input labelled `ISBN (optional)` with `name="isbn"`, and beside it a `type="button"` control labelled `Look up`, following the Cancel button's idiom at lines 72-78.
- A status line under the group, `role="status"`, carrying five English states: idle (empty), searching, found, not found, and session-expired. Copy is authored fresh — the mockup's Polish is placeholder (`design-system/change.md:33-34`). The line reserves its height so the dialog does not jump when the message appears. The session-expired state tells the user to reload and sign in; it must not read as a failed lookup.
- Pressing Look up with an empty or malformed ISBN shows the not-found state without issuing a request.
- A successful lookup **overwrites** `title` and `author` unconditionally, matching `design.html:1000-1003`; when `author` comes back null only the title is written and the author field is left for the user.
- Provenance flag is set on a successful lookup and never cleared except by remount. When set, a confirmation checkbox renders — labelled so it reads as an assertion about the fetched data — and the submit button is `disabled` until it is checked. The checkbox has no `name` and is never submitted.
- When the flag is unset, the form behaves exactly as today: no checkbox, submit enabled.
- Existing `useActionState` wiring, the `role="alert"` error paragraph, `useActionSuccess`, and the Cancel button are unchanged.
- Mobile-first classes per `AGENTS.md:35`; markup stays plain so S-08 can restyle it.

#### 4. Add modal dirty check

**File**: `src/app/collection/_components/add-book-modal.tsx`

**Intent**: Keep the discard prompt honest now that the form contains a checkbox.

**Contract**: The selector at lines 18-23 excludes checkboxes, because `.value` on a checkbox is `"on"` regardless of checked state and would otherwise mark the form permanently dirty — without this, `add-book-modal.spec.tsx:85-98` fails on both assertions. The ISBN text input deliberately still counts toward dirtiness. Both comments that assert the form is uncontrolled are now false and get rewritten: the one at 15-17 explains the checkbox exclusion instead, and the one at 45-46 explains that the remount resets `useState` as well as DOM values.

#### 5. Specs

**Files**: `test/app/collection/isbn-lookup.client.spec.ts` (new); `test/app/collection/_components/add-book-form.spec.tsx`, `test/app/collection/_components/add-book-modal.spec.tsx` (extended)

**Contract**: jsdom docblock, `jest.mock("@/app/collection/isbn-lookup.client", …)` alongside the existing actions mock. Form cases: a successful lookup fills both fields; a result with a null author fills only the title; the in-flight searching state renders while the promise is pending; an `unauthenticated` result shows the session-expired message and not the not-found one; submit is blocked until the checkbox is ticked after a lookup; a manually typed book submits in one step with no checkbox present; a not-found result leaves the fields untouched and the form usable; the submitted `FormData` carries the ISBN.

**Regression case for the controlled conversion**: after the action resolves with an error, title and author still hold what the user typed. Today React 19 blanks them (see Critical Implementation Details); this test is what keeps the improvement from silently regressing.

Modal cases: an untouched form with the checkbox rendered still closes without a discard prompt — this is the case that discriminates a working `isDirty` from a permanently-true one, which the two existing dirty-path tests at `add-book-modal.spec.tsx:100-128` do not. Plus: Esc after a failed submit now prompts, because the retained field values make the form dirty.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- Typing a real ISBN and pressing Look up fills title and author, and both remain editable.
- The submit button is disabled until the confirmation checkbox is ticked, and the book saves once it is.
- Adding a book by typing title and author only shows no checkbox and saves in one step.
- An ISBN with a broken check digit reports not found without a network request, and the form stays usable.
- An unknown but well-formed ISBN reports not found and the form stays usable.
- Reopening the dialog clears the ISBN field, the status line, the checkbox and the provenance state.
- Esc on an untouched dialog closes without a discard prompt; Esc after typing an ISBN prompts first.
- After a duplicate-title error the typed values are still in the fields, and Esc now prompts before discarding — both are changes from today's behaviour.
- Layout holds at a 375px viewport.

---

## Testing Strategy

### Unit Tests

- `normalizeIsbn`: valid ISBN-13; valid ISBN-10; ISBN-10 with `X` check digit; hyphenated and spaced input; single-digit typo rejected by the checksum; non-numeric input; empty string.
- `lookupByIsbn` (against a `global.fetch` stub): record with authors; record without an `authors` key; `200` with `{}`; non-200; abort. All non-hit paths return `null` and none throw. Plus: the request URL carries the exact normalised bibkey, and the `User-Agent` header appears only when `OPENLIBRARY_CONTACT` is set.
- `lookupIsbn` browser wrapper: a `200` JSON body maps to `found`/`not-found`; a redirected response or an unparseable body maps to `unauthenticated`; a network error maps to `not-found`.
- `AddBookForm`: the autofill, gate and degradation cases listed in Phase 3, plus the regression case proving typed values survive a failed submit.

### Integration Tests

- `book.repository`: `createBook` persists an ISBN, and leaves NULL when none is supplied. Runs against the real database like the existing repository specs.
- `addBookAction`: valid ISBN reaches the row; invalid ISBN returns the rejection message and writes nothing; absent ISBN still creates the book.
- `/api/isbn` route: 401 unauthenticated, 400 on a rejected ISBN, and both found and not-found bodies. The spec calls the handler directly with `@/auth` mocked, so it exercises the handler's own gate — middleware is not in the loop, which is why the signed-out redirect is a manual criterion rather than a spec.

### Manual Testing Steps

1. Sign in, open Add book, type `9780140328721`, press Look up — confirm title and author fill in and the checkbox appears.
2. Try to submit without ticking the checkbox — confirm the button is disabled; tick it and confirm the book saves and the dialog closes.
3. Edit the fetched title before confirming — confirm the edit is what gets saved.
4. Add a book by typing title and author only — confirm no checkbox appears and it saves in one step.
5. Type `9780140328722` (broken check digit) and press Look up — confirm not-found, no request in the network panel, form still usable.
6. Type a well-formed unknown ISBN — confirm not-found and that typing the details manually still works.
7. Reopen the dialog — confirm every ISBN-related control is reset.
8. Repeat steps 1 and 4 at a 375px viewport.

## Performance Considerations

One outbound request per explicit button press, capped at 5 seconds and never on the critical path of a save. No caching is added, so no staleness. Open Library's stated limits are 1 request/second anonymous and 3 request/second identified; a human pressing a button cannot approach either.

## Migration Notes

One additive, nullable column. Existing rows take NULL, which is a valid and designed state — the mockup deliberately includes books with no ISBN (`shelf-view/change.md:30-38`). The migration is independently reversible: `down` drops the column and no code outside this slice reads it. Read the migration-generation warning in Critical Implementation Details before running `migration:generate`.

## References

- Roadmap item: `context/foundation/roadmap.md` → S-07
- Change identity and decisions: `context/changes/isbn-lookup/change.md`
- Research, including the live Open Library contract: `context/changes/isbn-lookup/research.md`
- Predecessor slice and the deferrals it recorded: `context/changes/collection-modals/plan.md:35`, `:38`
- Migration-generation trap: `context/changes/friend-connections/reviews/plan-review.md:41-47`, workaround at `context/changes/auth-scaffold/plan.md:154`
- Plan review that reshaped Phase 2: `context/changes/isbn-lookup/reviews/plan-review.md`
- Spec house style: `test/app/collection/_components/add-book-form.spec.tsx`
- Global test helper precedent: `test/shared/dialog.mock.ts`
- Applicable lessons: `context/foundation/lessons.md:5-10` (explicit `@Column` types), `:19-24` (`@/*` imports), `:26-31` (types in `*.types.ts`), `:33-38` (guardrails cross-checked against phase bodies), `:40-45` (every component ships a spec)
- Consumer slice: S-09 `shelf-view` renders the stored ISBN and threads it through `DiscoverBook`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Data Layer

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit`
- [x] 1.2 Linting passes: `npm run lint`
- [x] 1.3 Specs pass: `npm test`
- [x] 1.4 Migration applies cleanly: `npm run migration:run`
- [x] 1.5 Migration reverts and re-applies cleanly: `npm run migration:revert` then `npm run migration:run`

#### Manual

- [x] 1.6 Migration file contains the `ALTER TABLE "books" ADD "isbn"` statement and existing rows show NULL

### Phase 2: Lookup Stack

#### Automated

- [ ] 2.1 Type checking passes: `npx tsc --noEmit`
- [ ] 2.2 Linting passes: `npm run lint`
- [ ] 2.3 Specs pass: `npm test`
- [ ] 2.4 No new dependency was added: `git diff package.json` is empty

#### Manual

- [ ] 2.5 Signed in, a known ISBN returns `found: true` with title and author
- [ ] 2.6 Broken check digit returns 400; unknown but valid ISBN returns `found: false`
- [ ] 2.7 Signed out, the endpoint redirects to `/login` rather than returning 401
- [ ] 2.8 `User-Agent` is sent when `OPENLIBRARY_CONTACT` is set; variable recorded in README and set on Vercel

### Phase 3: Dialog, Autofill and Confirmation Gate

#### Automated

- [ ] 3.1 Type checking passes: `npx tsc --noEmit`
- [ ] 3.2 Linting passes: `npm run lint`
- [ ] 3.3 Full suite passes: `npm test`
- [ ] 3.4 Production build passes: `npm run build`

#### Manual

- [ ] 3.5 Look up fills title and author, both stay editable
- [ ] 3.6 Submit is disabled until the confirmation checkbox is ticked, then saves
- [ ] 3.7 Manual entry shows no checkbox and saves in one step
- [ ] 3.8 Broken check digit reports not found with no network request
- [ ] 3.9 Unknown valid ISBN reports not found and the form stays usable
- [ ] 3.10 Reopening the dialog resets ISBN field, status line, checkbox and provenance
- [ ] 3.11 Esc prompts only after the form has been touched
- [ ] 3.12 After a duplicate error the typed values survive and Esc now prompts
- [ ] 3.13 Layout holds at 375px
