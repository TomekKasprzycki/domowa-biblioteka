---
date: 2026-08-15T17:12:33+02:00
researcher: Tomek Kasprzycki
git_commit: ba953799338822c9de14bc53b93759b90c9ece28
branch: master
repository: domowa-biblioteka
topic: "S-07 isbn-lookup — autofill title and author from ISBN, store the ISBN"
tags: [research, codebase, isbn-lookup, open-library, collection, typeorm, msw]
status: complete
last_updated: 2026-08-15
last_updated_by: Tomek Kasprzycki
last_updated_note: "Added follow-up research for the post-lookup confirmation gate decided 2026-08-15"
---

# Research: S-07 ISBN Lookup

**Date**: 2026-08-15T17:12:33+02:00
**Researcher**: Tomek Kasprzycki
**Git Commit**: `ba953799338822c9de14bc53b93759b90c9ece28`
**Branch**: `master`
**Repository**: `TomekKasprzycki/domowa-biblioteka`

## Research Question

Research slice **S-07 `isbn-lookup`** (`context/foundation/roadmap.md:169-179`) ahead of `/10x-plan`: where the ISBN field plugs into the S-06 add-book modal, what the data layer needs for one nullable `isbn` column, what the test setup requires (including the not-yet-installed `msw`), what S-08/S-09 depend on, and what the Open Library API contract actually is.

Scope confirmed with the developer: codebase **plus** live verification of the external Open Library API.

## Summary

The slice is well-bounded and the groundwork is genuinely in place — S-06 explicitly reserved two things for S-07 (the ISBN field itself, and converting the add form's inputs to controlled), so neither is scope drift. Six findings change how the plan should be written:

1. **Open Library signals "not found" as HTTP 200 with an empty JSON object `{}`, not a 404.** Verified live. `change.md:31-32` says "timeout, non-200 and empty-result all degrade to not found" — that is correct but inverts the priority: non-200 is the rare path, `200 {}` is the *normal* miss. Status-code-based error handling alone would report every miss as a success.
2. **A "found" record may carry no `authors` key at all.** Verified live. So the outcome space is three-valued — found-with-author / found-title-only / not-found — while the design mockup only draws two states.
3. **Practically any well-formed 13-digit string resolves to *some* record** (`9999999999999` returns a real book). Without checksum validation a typo silently autofills the wrong book, and since S-07 renders the ISBN nowhere, that is invisible until S-09.
4. **The existing server-action contract cannot carry a lookup result.** Every action in `src/app/collection/actions.ts` returns `string | null` — error message or null — and `useActionSuccess` reads "no error ⇒ success" off exactly that. A lookup must return *data*. This is the slice's central architectural decision.
5. **The edit form must not touch `isbn`.** The mockup reuses one modal for add and edit and *blanks* the ISBN input on edit (`design.html:976-978`). Wiring that literally through `updateBookAction` would null out a stored ISBN on every edit — silent data loss, invisible until the S-09 drawer.
6. **Keeping the HTTP call server-side sidesteps the `msw` + jsdom trap.** `msw` v2 under a jsdom test environment needs `testEnvironmentOptions.customExportConditions: ['']`; this repo has no such config. A server-side client spec'd in the default node environment needs none of it.

Nothing in the slice is blocked. The open decisions are listed at the end.

## Detailed Findings

### A. The add-book flow as S-06 left it

Seven files under `src/app/collection/`. The add path is: `page.tsx` (async Server Component) → `AddBookModal` (client, owns open state) → shared `Modal` → `AddBookForm`.

- **Shared modal exists** — `src/app/_components/modal.tsx:5`, props `{ open, onClose, title, children, canClose? }`. The native `<dialog>` is driven imperatively (`showModal()`/`close()`) in an effect (`modal.tsx:29-38`); Esc is vetoed on the `cancel` event because `close` is not cancelable (`modal.tsx:44-50`); `onClose` may fire more than once and must be idempotent (`modal.tsx:58-61`).
- **The add form is fully uncontrolled** — three fields (`title`, `author`, `notes`), no `useState`, no `react-hook-form` (not a dependency). Values reach the server only as `FormData`. Submit is `useActionState(addBookAction, null)` (`add-book-form.tsx:14`) with `<form action={formAction}>` (`:19`).
- **Pending state** is `isPending` from `useActionState` — button `disabled` + label swap "Adding…" (`add-book-form.tsx:66-71`). No `useFormStatus`, no `useTransition` anywhere in `src/`.
- **Errors** render as `<p role="alert">` from the action's returned string (`add-book-form.tsx:58-62`).
- **Success** is inferred by `useActionSuccess(isPending, error, onSaved)` (`src/lib/use-action-success.utils.ts:13`) — the pending→idle edge with a null error.
- **Two mechanisms depend on the inputs staying uncontrolled**, and both need re-examination once S-07 converts them:
  - the dirty check scans the live DOM — `formRef.current?.querySelectorAll("input, textarea")` (`add-book-modal.tsx:18-23`). A new ISBN input automatically counts toward "dirty", which is probably desirable but is a behaviour change to the discard prompt.
  - the form resets by remounting on open — `key={String(open)}` (`add-book-modal.tsx:47`). Controlled state must be reset by the same remount or explicitly.
- **`type="button"` inside a form already has precedent** — the Cancel button at `add-book-form.tsx:72-78`. The "Wyszukaj"/"Look up" button follows the same idiom.
- **No client-side async fetch exists anywhere.** `grep` for `fetch|axios|XMLHttpRequest` across `src/` returns nothing, and there is no HTTP wrapper in `src/lib/` (only `data-source.ts`, `data-source-cli.ts`, `db-error.utils.ts`, `generate-id.utils.ts`, `use-action-success.utils.ts`). Nothing in the repo writes to form fields programmatically either — every input is uncontrolled with `defaultValue` or nothing. **Autofill has no existing mechanism to copy.**

### B. The server-action contract problem

All three collection actions share one signature and one return type:

```ts
addBookAction(_prevState: string | null, formData: FormData): Promise<string | null>   // actions.ts:37-40
updateBookAction(...)                                                                   // actions.ts:85-88
deleteBookAction(...)                                                                   // actions.ts:138-141
```

`string | null` is *the error message or null*, not a discriminated union (`actions.ts:82`, `:135`, `:186`). Validation is zod 4, field-by-field with `safeParse`, returning the first issue's message (`actions.ts:21-24`, `:46-60`).

An ISBN lookup has to return `{ title, author }` on success. Three shapes are available, and the plan must pick one:

| Option | Fits existing patterns | Cost |
|---|---|---|
| New server action with a different return type | Breaks the module's uniform `string \| null` contract; `useActionSuccess` does not apply to it | Smallest new surface, no new route |
| Route Handler under `src/app/api/` | Only existing route handler is NextAuth's (`src/app/api/auth/[...nextauth]/route.ts`) — no precedent for a hand-written one; needs its own auth gate | Client `fetch` becomes the first in the repo |
| Client-side `fetch` straight to Open Library | No server code at all | Puts the outbound call and the User-Agent obligation in the browser; no server-side timeout control; CORS-dependent |

Note the auth gate: every existing action opens with `await auth()` (`actions.ts:41-44`). Whichever shape is picked needs the same gate — an unauthenticated lookup endpoint would make this app a free proxy to Open Library.

### C. Open Library — verified contract

Endpoint used by `change.md:26-27`: `https://openlibrary.org/api/books?bibkeys=ISBN:<isbn>&format=json&jscmd=data`. Keyless, no auth. Verified live on 2026-08-15:

**Found** (`ISBN:9780140328721`):
```json
{"ISBN:9780140328721": {
  "title": "Fantastic Mr. Fox",
  "authors": [{"name": "Roald Dahl", "url": "..."}],
  "identifiers": {"isbn_10": ["0140328726"], "isbn_13": ["9780140328721"]},
  "number_of_pages": 96, "publishers": [...], "publish_date": "...", "subjects": [...]
}}
```

**Not found** (`ISBN:abcdef`, and empty input):
```
HTTP/2 200
content-type: application/json

{}
```

Consequences for the plan:

- **The miss is `200` + `{}`.** Treat "response body has no key `ISBN:<what I sent>`" as the not-found condition. Checking `response.ok` alone classifies every miss as a success.
- **The response is keyed by the bibkey echoed back verbatim** — `ISBN:<exact string sent>`. The reader must look up the same normalized string it sent, not the user's raw input.
- **`authors` is optional on a found record.** `ISBN:9780000000002` returns `title: "The three voices of poetry"` with **no `authors` key**. Since `author` is a `required` field on the form (`add-book-form.tsx:37-43`) and non-empty in the entity (`book.entity.ts:22-23`), "found but no author" must fill the title and leave author for the user — a third UI state the mockup does not draw.
- **Junk ISBNs match real records.** `9999999999999` → *"Rómulo Maccio"*; `1234567890` → a real record; `9780000000002` → a real record. Only non-numeric input (`abcdef`) reliably misses. A mistyped digit therefore autofills a *plausible wrong book* rather than failing. ISBN-13 checksum validation before the call is the only defence, and it is cheap.
- **Rate limits and identification** (from the [official API page](https://openlibrary.org/developers/api)): 1 request/second anonymous, 3 requests/second for *identified* requests carrying a `User-Agent` with the application name and a contact email, e.g. `User-Agent: MyLibraryApp (contact@example.org)`. The page also states the APIs are "not intended to serve as a data backend for third-party services". `robots.txt` `Disallow: /api` applies to crawlers, not to API clients. **Sending a descriptive `User-Agent` is the courteous and higher-limit path — and it is only possible if the call is server-side.** This is not recorded in `change.md`.
- **Next.js caching**: `fetch` caching in the App Router is opt-in — the default is `auto no cache` ([Next.js `fetch` reference](https://nextjs.org/docs/app/api-reference/functions/fetch); doc served for v16, behaviour introduced in v15, project is on `next 15.5.18`). A lookup will not be cached unless it asks to be. `cache: "force-cache"` with `next: { revalidate }` is available if repeated lookups of the same ISBN are worth deduplicating.
- **Timeout has no precedent in this repo.** `AbortSignal.timeout(ms)` is available on Node 24 (the runtime here). The PRD guardrail "adding a book takes no more than a few seconds" (`prd.md:45`) is the budget to size it against.

### D. Data layer — one nullable column

`BookEntity` (`src/server/book/book.entity.ts:14-41`) today: `id` (`@PrimaryColumn({type:"uuid"})`), `title`, `author`, `notes` (nullable), `userId`, `owner`, `createdAt`, `updatedAt`. One class-level decorator: `@Unique(["userId","title","author"])` (`:15`). No `@Index`.

- **Nullable precedent is unambiguous** — `@Column({ type: "varchar", nullable: true })` + `notes!: string | null` (`book.entity.ts:26-27`); same shape at `loan.entity.ts:80-81`. `| undefined` appears in no entity, per `AGENTS.md:16`.
- **But the create-input precedent is split.** `createBook`'s parameter is `notes?: string` (`book.repository.ts:10`) and `addBookAction` deliberately passes `undefined` (`actions.ts:62`), while `updateBook` uses `notes: string | null` (`book.repository.ts:46`). The plan has to pick one style for `isbn` and say why.
- **Column type**: every short-text column in the repo is `varchar` with no length (`CreateBookTable.ts:7` → `character varying`). No entity has ever specified a `length`.
- **Migrations are real and committed** — 7 files in `src/migrations/`, `npm run migration:generate` / `migration:run` against `src/lib/data-source-cli.ts` (`package.json:11-14`). `synchronize` is `true` in development only (`data-source.ts:17`).
- **No migration has ever added a column to an existing table.** Every committed statement is `CREATE TABLE`, `ADD CONSTRAINT … FOREIGN KEY`, or `CREATE/DROP INDEX`. `ALTER TABLE "books" ADD "isbn"` would be the first of its kind — there is no in-repo shape to copy.
- **The `synchronize` trap applies directly here.** `context/changes/friend-connections/reviews/plan-review.md:41-47` (F2) records it: `DATABASE_URL` and `DATABASE_URL_UNPOOLED` point at the same Neon database, so once a running dev server has synced the new column, `migration:generate` diffs against an already-migrated database, produces an empty diff, and **writes no migration file**. `auth-scaffold/plan.md:154` documents the workaround (drop the object in Neon before generating, or hand-write the migration). For a pure column addition this is the single most likely way the slice silently ships without a migration.
- **`generateId()`** (`src/lib/generate-id.utils.ts`) is a plain function, not a class, used at `book.repository.ts:14`. Unaffected by this slice.
- **There is no service layer.** `AGENTS.md:23` prescribes `src/server/<feature>/service.ts + repository.ts`, but no `*.service.ts` exists anywhere — server actions call repositories directly. Introducing one for the ISBN client would be a new pattern; `src/lib/` is where the existing non-entity helpers live.
- **There are no DTO files.** `AGENTS.md:32` prescribes `create-book.request.ts` / `book.response.ts`; what exists are per-route view models (`collection.types.ts`, `discover.types.ts`, …). Written rule and repeated practice have drifted, same class as the two drifts already in `lessons.md`.

### E. Do not thread `isbn` into `CollectionBook`

`page.tsx:22-38` hand-maps `BookEntity` → `CollectionBook`; a new entity field reaches the client only if added there. `change.md:36-49` says this slice renders the ISBN nowhere, and S-09 owns display.

Two prior reviews flagged exactly the "shipping fields the UI never renders" class — `borrow-request/reviews/impl-review.md:27-35` (a full user row including `passwordHash`) and `loan-lifecycle/reviews/impl-review.md:51-59` (an unused `email` in a client payload). So the correct move is: **entity + repository + write path only. Leave `CollectionBook` and the `page.tsx` mapper untouched.** S-09 adds the field to both view models when it needs them.

### F. Test setup and the `msw` question

- `jest.config.ts` (17 lines): `preset: "ts-jest"`, `testEnvironment: "node"` globally, transform via `test/tsconfig.json`, `moduleNameMapper` `^@/(.*)$ → <rootDir>/src/$1`, `setupFiles: ["<rootDir>/test/setup.ts"]`. **No `testEnvironmentOptions`, no `setupFilesAfterEnv`, no `projects`.**
- jsdom is opted into per file via `/** @jest-environment jsdom */` on line 1 (26 spec files do). `@testing-library/jest-dom` is imported per spec, not globally.
- `test/setup.ts` is three lines — it loads `.env.local`. Specs hit a **real database**; there is no transaction rollback or test-database isolation.
- Versions that bound the `msw` choice: `jest 30.4.2`, `jest-environment-jsdom 30.4.1` (jsdom 26.1.0), `ts-jest 29.4.11`, `next 15.5.18`, Node 24 runtime, `@types/node` pinned at `20.19.41`. No `"type": "module"` — the suite runs CommonJS. Latest `msw` is **2.15.0** (`engines: node >=18`).
- **The jsdom trap**: jsdom resolves the `browser` export condition, so `msw/node` fails to import unless `testEnvironmentOptions.customExportConditions: ['']` is set ([mswjs/msw#1786](https://github.com/mswjs/msw/issues/1786), [msw jest-jsdom example](https://github.com/mswjs/examples/blob/main/examples/with-jest-jsdom/README.md)). This repo sets no such option, and adding it globally would touch every existing spec's environment.
  **Therefore: keep the Open Library call server-side and spec it in the default node environment.** `msw/node` works there without any jest-config change beyond a setup file. This is the strongest technical argument for option 1 or 2 in section B over a browser-side fetch.
- **Nothing in the repo mocks `fetch` or any outbound call today** — verified by grep across `test/` and `src/`. The only mocking primitives in use are `jest.mock()` of local modules and the `HTMLDialogElement` prototype stub.
- `test/shared/dialog.mock.ts` (46 lines) patches `showModal`/`show`/`close` and exports `pressEscape(dialog)`. Any new dialog-touching spec imports it by relative path.
- **Spec patterns to follow**: client component specs open with the jsdom docblock, `jest.mock("@/app/collection/actions", …)` *before* importing the component, fields queried by `getByLabelText`, submitted payload asserted off `mockAdd.mock.calls[0][1] as FormData` (`test/app/collection/_components/add-book-form.spec.tsx:1-12`, `:29-47`). Given/when/then blocks are used throughout, per `AGENTS.md:48`.
- The collection surface is **already fully spec'd** — `actions.spec.ts`, `page.spec.tsx`, and specs for all five `_components`. S-07 edits existing specs rather than creating a bare feature.
- **Installing a dependency has house phrasing but a gap**: prior plans wrote a `package.json` contract naming the section and packages plus the literal `npm install` command (`db-connection/plan.md:57-63`, `auth-scaffold/plan.md:71-77`), with an "install completes without errors" criterion. **No plan has ever written down the no-`^` pinning rule** — it survived only because the author edited by hand. `change.md:33-34` says to pin `msw`; the plan should state it explicitly, and record the `jest.config.ts` edit as planned scope (unplanned tooling scope was review finding F4 in `db-connection/reviews/impl-review.md:68-76`).

### G. What the design mockup actually specifies

`context/design/design.html` — one modal serves both add and edit (`openAddModal(book)`, `:974-982`).

- **The ISBN field is first, above title and author** (`:657-664`), labelled `ISBN (opcjonalnie)`, placeholder `np. 9788308077254` (unhyphenated), with the modal subtitle "Wpisz ISBN, by uzupełnić dane automatycznie, albo podaj je ręcznie." (`:655`).
- **Lookup is an explicit button press** — `<button class="btn btn-outline-blue btn-sm" onclick="lookupIsbn()">Wyszukaj</button>` (`:661`). Not on-blur, not debounced-on-type.
- **A dedicated status line** `.isbn-status` sits under the input (`:663`) with three visual states (neutral / `.found` green / `.notfound` blue, `:397-402`) and `min-height:16px` so the layout does not jump. A `.spinner` with a `prefers-reduced-motion` clause exists (`:403-409`).
- **Status copy** (`:986-1009`): empty input → "Podaj ISBN, aby wyszukać."; in-flight → spinner + "Szukam w Open Library…"; success → "✓ Znaleziono — pola są nadal edytowalne."; failure → "Nie znaleziono. Wpisz dane ręcznie." **The app ships English** (i18n is parked, `roadmap.md:233`; `design-system/change.md:33-34` calls the mockup's Polish placeholder copy) — so these are three English strings to author, not to copy.
- **On edit, the mockup blanks the ISBN input** (`:976-978` clear `isbnInput.value` and the status line) while pre-filling title and author (`:979-980`). Taken literally into `updateBookAction`, an edit would submit an empty ISBN and null out a stored value. See Open Questions.
- **The mockup does not settle normalisation**: fixture books store hyphenated ISBN-13 (`978-83-08-04521-6`, `:737-748`), the input placeholder is unhyphenated.
- **Four fixture books deliberately carry no ISBN** (`:742`, `:747`, `:754`, `:761`) — `shelf-view/change.md:30-38` reads this as the design confirming both that the column is genuinely nullable and that manual entry is first-class.

### H. Forward compatibility with S-08 and S-09

- **S-08 `design-system`** mentions ISBN nowhere. It extracts seven primitives into `src/app/_components/` — Button, **Field (label+input)**, Card, Pill, LibraryCard, EmptyNote, Avatar (`design-system/change.md:22-24`). The ISBN row is a label + input + adjacent button + status line, i.e. a `Field` variant plus one extra element. S-07 should not pre-build a primitive; it should keep the markup plain enough that S-08 can restyle it without behaviour changes (S-08's own rule: "any existing spec that breaks is evidence of an accidental behaviour change", `:41-43`).
- **Roadmap ordering is deliberate**: build S-07 before S-08 so the add modal is not styled twice (`roadmap.md:53`, `:187`).
- **S-09 `shelf-view`** is the consumer. Its drawer renders ISBN in mono under the author with a designed missing state (`shelf-view/change.md:30-38`), and it is explicit that **"S-07 stores the value and shows nothing; this slice is where it becomes visible"** (`:40-41`). It also owns threading `isbn` through `DiscoverBook` (`src/app/discover/discover.types.ts:9-17`), because the drawer shows ISBN for a friend's books too — **S-07 stays out of `/discover` entirely** (`:42-45`, `roadmap.md:203`).
- The only real forward obligation on S-07 is therefore: **store a value S-09 can render, in a form that reads well in mono.** That makes the normalisation decision (below) an S-09-facing one, not a private detail.

## Code References

Permalinks pinned to `ba95379`.

- [`src/app/collection/_components/add-book-form.tsx:14-19`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/app/collection/_components/add-book-form.tsx#L14-L19) — `useActionState` + uncontrolled `<form action={formAction}>`; where the ISBN field and lookup button land
- [`src/app/collection/_components/add-book-modal.tsx:18-23`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/app/collection/_components/add-book-modal.tsx#L18-L23) — DOM-scanning dirty check that a new input silently joins
- [`src/app/collection/_components/add-book-modal.tsx:47`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/app/collection/_components/add-book-modal.tsx#L47) — `key={String(open)}` reset-by-remount
- [`src/app/_components/modal.tsx:29-61`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/app/_components/modal.tsx#L29-L61) — imperative `showModal()`/`close()`, `cancel` veto, idempotent `onClose`
- [`src/app/collection/actions.ts:37-83`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/app/collection/actions.ts#L37-L83) — `addBookAction`; auth gate, zod field schemas, `string | null` return, `revalidatePath`
- [`src/lib/use-action-success.utils.ts:13`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/lib/use-action-success.utils.ts#L13) — "no error ⇒ success" heuristic that a data-returning action would break
- [`src/server/book/book.entity.ts:14-41`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/server/book/book.entity.ts#L14-L41) — column list, `@Unique(["userId","title","author"])`, nullable `notes` precedent
- [`src/server/book/book.repository.ts:6-11`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/server/book/book.repository.ts#L6-L11) — `createBook`, the `notes?: string` optional-undefined precedent
- [`src/lib/data-source.ts:13-48`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/lib/data-source.ts#L13-L48) — lazy singleton, explicit entity array, `synchronize` in dev only
- [`src/app/collection/page.tsx:22-38`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/src/app/collection/page.tsx#L22-L38) — entity → `CollectionBook` mapper; deliberately **not** to be touched by this slice
- [`jest.config.ts:1-17`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/jest.config.ts#L1-L17) — node env, ts-jest, no `testEnvironmentOptions` (the msw/jsdom constraint)
- [`test/shared/dialog.mock.ts`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/test/shared/dialog.mock.ts) — `showModal`/`close` stub + `pressEscape`
- [`test/app/collection/_components/add-book-form.spec.tsx:1-12`](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/ba953799338822c9de14bc53b93759b90c9ece28/test/app/collection/_components/add-book-form.spec.tsx#L1-L12) — the spec pattern a new field's tests extend
- `context/design/design.html:657-664`, `:986-1009` — ISBN field, lookup button, status line and its four copy states
- `context/design/design.html:801-807` — S-09 drawer ISBN line and its missing state
- `src/migrations/1784061140899-CreateBookTable.ts:7-8` — the `books` DDL a new column alters

## Architecture Insights

- **The repo has one uniform server-action contract and this slice is the first thing that does not fit it.** `(prevState, formData) => Promise<string | null>` plus `useActionSuccess` is a small, consistent idiom across collection, friends, borrow and requests. A lookup returns data, so either the idiom gains a second shape or the lookup lives outside the action layer. Worth deciding explicitly rather than by accident.
- **Written conventions and repeated practice have drifted three times already** (relative imports, inline types, both in `lessons.md`; plus the missing service layer and missing `*.request.ts`/`*.response.ts` DTOs, which no lesson covers yet). S-07 adds a fourth opportunity: `AGENTS.md:23` wants `src/server/<feature>/service.ts`, and an Open Library client is the most service-shaped thing the project has had. Either follow the written rule and create the first service, or put it in `src/lib/` alongside the other helpers and accept the drift knowingly.
- **Degradation is a first-class requirement here, not an edge case.** `change.md:31-32` and `prd.md:139` both insist manual entry never blocks. Combined with the API's three-valued outcome (found / found-without-author / not-found) and the timeout path, the lookup has four terminal states and the form must stay usable in all of them.
- **This slice is a write-path-only change.** Entity, migration, repository input, action input, one new form field, one lookup client. No read path, no view model, no `/discover`. Keeping that boundary is what prevents the "fields the UI never renders" finding that has already landed twice in review.

## Historical Context (from prior changes)

- `context/changes/collection-modals/plan.md:35` — "**Not adding an ISBN field.** That is S-07 (`isbn-lookup`), which builds on the add modal this change creates."
- `context/changes/collection-modals/plan.md:38` — "**Not converting the add form's inputs to controlled.** They stay uncontrolled here; **S-07 converts them when autofill requires it.**" (also `plan-brief.md:32`). Converting them is sanctioned scope, not drift.
- `context/changes/collection-modals/plan.md:34` — `actions.ts` was out of scope for S-06, so S-07 is the first change to touch it since S-05.
- `context/changes/friend-connections/reviews/plan-review.md:41-47` — F2, the `synchronize: true` / `migration:generate` empty-diff trap. Directly applicable.
- `context/changes/auth-scaffold/plan.md:154` — the documented workaround for that trap.
- `context/changes/borrow-request/reviews/impl-review.md:27-35` and `context/changes/loan-lifecycle/reviews/impl-review.md:51-59` — the recurring "client payload carries fields nothing renders" finding.
- `context/changes/db-connection/reviews/impl-review.md:68-76` — F4, unplanned test-tooling scope; the reason a `msw` install and a `jest.config.ts` edit must be named in the plan.
- `context/changes/db-connection/plan.md:57-63` and `context/changes/auth-scaffold/plan.md:71-77` — the house phrasing for adding a dependency (a `package.json` contract + the literal install command). Neither mentions the no-`^` rule.
- `context/foundation/lessons.md:33-38` — every "What We're NOT Doing" item must be cross-checked against phase bodies for the same subject under different wording. S-07's guardrails ("renders nowhere", "stays out of `/discover`") are exactly the kind that a phase can quietly contradict.
- `context/foundation/lessons.md:40-45` — new components must ship a spec; jsdom docblock, mock the actions module, `test/` mirrors `src/`.
- `context/foundation/prd.md:73-75` (FR-003 amendment) and `:139` (§Non-Goals amendment), both dated 2026-08-11 — the un-parking is recorded in the PRD, so this is not scope drift.
- Branch convention in actual use: `feat/S-07-isbn-lookup`. Note that `AGENTS.md:54` mandates squash-merge but **every PR in history landed as a merge commit with per-phase commits preserved** — a documented-vs-practice divergence worth resolving separately.
- Housekeeping: `context/changes/collection-modals/change.md:4` still reads `status: implementing` and all 12 manual Progress boxes are unticked, although PR #9 is merged. Not S-07's job, but S-06 is not formally closed.

## Related Research

None — this is the first `research.md` in `context/changes/`. Existing review artifacts referenced above live under `context/changes/*/reviews/`.

## Open Questions

Each of these needs a decision in `/10x-plan`; none blocks planning.

1. **Where does the lookup live?** New server action with a non-`string | null` return, a Route Handler, or a client-side call. Section B lays out the trade-offs; server-side is strongly favoured by the `msw`/jsdom constraint (section F) and by the `User-Agent` obligation (section C). *Owner: developer. Block: no.*
2. **Does the edit path touch `isbn` at all?** The mockup blanks the field on edit (`design.html:976-978`), which through `updateBookAction` would erase a stored ISBN — invisible until S-09 renders it. Recommended default: **the edit form does not include an ISBN field in this slice**, matching "S-07 renders the ISBN nowhere". *Owner: developer. Block: no.*
3. **Normalisation and validation.** Strip hyphens/spaces and store digits only, or store as entered? Validate the ISBN-13 checksum before calling? The mockup is inconsistent (hyphenated fixtures, unhyphenated placeholder) and S-09 renders the stored string in mono, so this is an S-09-facing choice. Also: accept ISBN-10 as well as ISBN-13? *Still open after the 2026-08-15 confirmation-gate decision — the gate and the checksum defend different failures (see Follow-up Research). Owner: developer. Block: no.*
4. ~~**"Found, but no author" behaviour.**~~ **Resolved 2026-08-15** by the confirmation gate: title fills, author stays empty, and the user cannot confirm without supplying it. See Follow-up Research.
5. **Timeout budget and `User-Agent` string.** What value satisfies "adding a book takes no more than a few seconds" (`prd.md:45`) — and what contact address goes in the `User-Agent`, given Open Library's 1 vs 3 req/s tiers? *Owner: developer. Block: no.*
6. **`isbn` input type in the repository.** Follow `notes?: string` (create) or `notes: string | null` (update)? `AGENTS.md:16` favours `| null`; the create path's existing precedent does not. *Owner: developer. Block: no.*
7. **`src/server/book/book.service.ts` or `src/lib/`?** Whether the Open Library client is the moment to create the service layer `AGENTS.md:23` has always prescribed and the repo has never had. *Owner: developer. Block: no.*
8. **What form does the confirmation gate take?** Added 2026-08-15. The decision is settled (a lookup-fed save must be confirmed); the interaction is not. See Follow-up Research for the three candidate shapes and their costs. *Owner: developer. Block: no.*

## Follow-up Research 2026-08-15T18:04:00+02:00

### Decision: a save that follows a lookup requires explicit confirmation

Recorded in `context/changes/isbn-lookup/change.md` under "Confirmation gate after a lookup". Autofilled data is treated as untrusted input: the user reviews it, corrects a wrong match or completes a missing author, and only then confirms. Fields stay editable throughout — the gate is an acknowledgement step, not a lock.

This follows directly from two verified API behaviours in section C: practically any well-formed 13-digit string resolves to *some* record, and a found record may omit `authors` entirely.

### What this changes in the analysis above

- **Open Question 4 is resolved.** "Found, but no author" stops being a special case needing its own copy and outcome branch. Title fills, author stays empty, and the gate cannot be passed without an author because the field is `required` (`add-book-form.tsx:37-43`) and the column is non-null (`book.entity.ts:22-23`). The three-valued outcome space collapses back to two paths for the *user* — got something, got nothing — with completion handled by the same review step either way.
- **Open Question 3 is not resolved, and the reasoning shifts.** The gate is the last line of defence, not the first. An ISBN-13 checksum rejects a single-digit typo *before* any request goes out; the confirmation catches a well-formed ISBN that returns the wrong book. Confirmation cannot substitute for the checksum, because a user who does not know the book has no way to tell a plausible wrong match from a right one. Both are cheap; the plan should decide them together rather than treating the gate as covering the risk.
- **Nothing in section B changes.** The gate is client-side and pre-submit, so the `string | null` action contract and the `useActionSuccess` "no error ⇒ success" heuristic are untouched. Whichever lookup shape is chosen, the gate sits between the lookup response and `addBookAction`.

### New implementation consequences

- **The form must track provenance.** The gate is conditional on a lookup having occurred — a hand-typed book keeps the current one-step submit, so the manual path does not get slower. That means `AddBookForm` needs state answering "were the current title/author values machine-filled?", which is new state the uncontrolled form does not have today. This reinforces the S-06 hand-off (`collection-modals/plan.md:38`): converting the inputs to controlled is now required, not optional.
- **A secondary question follows: does user editing clear the flag?** If the user overtypes the fetched title, are the values still "from a lookup"? Simplest defensible rule: once a lookup has populated the form, the gate applies to that submission regardless of subsequent edits — provenance is per-attempt, not per-field. Cheaper to implement and to explain than per-field tracking.
- **Interaction with the existing dirty check.** `add-book-modal.tsx:18-23` scans the live DOM for non-empty inputs. A successful lookup fills title and author, so the form becomes "dirty" and the discard prompt will fire on Esc even though the user typed nothing themselves. That is arguably correct — work would be lost — but it is a behaviour change to the S-06 discard flow and should be named in the plan rather than discovered in review.
- **The reset-by-remount path already covers the new state.** `key={String(open)}` (`add-book-modal.tsx:47`) remounts the form subtree on each open, so provenance state resets with everything else. No extra teardown needed.

### Candidate shapes for the gate

Not decided — this is Open Question 8. All three keep the fields editable.

| Shape | How it reads | Cost |
|---|---|---|
| **Two-stage primary button** — after a successful lookup the submit button changes to a confirm affordance ("Confirm and add"), reverting to plain "Add" if the form is cleared | One control, no new surface, the review happens in the form the user is already looking at | Relies on a label change carrying the meaning; needs care so it is announced to screen readers, not just visually different |
| **Explicit acknowledgement control** — a checkbox or "This is the right book" affordance that must be set before submit enables | Hardest to click through by reflex, which is the actual risk being defended against | An extra required interaction on the accelerated path, in tension with the PRD guardrail "adding a book takes no more than a few seconds" (`prd.md:45`) |
| **Confirm dialog on submit** — a second `<dialog>` summarising what will be saved | Reuses the S-06 `Modal`; strongest separation between fetch and write | A modal on top of a modal; nested `<dialog>` + the `canClose` veto and the "`onClose` may fire twice" caveat (`modal.tsx:58-61`) make this the most failure-prone of the three |

The first shape is the lightest fit for the existing form and the guardrail; the second is the strongest defence. Worth resolving in the `/10x-plan` interview against how much friction the accelerated path can absorb.

### Testing consequences

The gate is pure client behaviour, so it is testable in the existing jsdom component-spec pattern with no new infrastructure — `test/app/collection/_components/add-book-form.spec.tsx` extends to cover: lookup succeeds → submit does not fire until confirmed; manual entry → submit fires in one step; lookup returns a title with no author → confirmation is unreachable until author is supplied.

#### Which layer mocks what

`msw` **is** the tool for the ISBN request — it is simply used at one layer, not two. The two test layers mock at different boundaries, and conflating them is the likely misreading:

| Layer | Spec | Jest env | Boundary mocked | Tool |
|---|---|---|---|---|
| Lookup client | new spec for the Open Library client | `node` (default) | the **network** — a real `fetch` leaves the process here | **`msw/node`** |
| Form + gate | `test/app/collection/_components/add-book-form.spec.tsx` (extended) | `jsdom` (docblock) | the **module** — the lookup is replaced at import | `jest.mock(…)`, per the existing repo pattern at `add-book-form.spec.tsx:6-8` |

The client spec is where the verified API contract from section C gets exercised, and only network-level interception can do it faithfully: `200` + `{}` (the normal miss), a found record with `authors`, a found record with **no** `authors` key, a non-200, and a timeout. This is the case `AGENTS.md:45` ("Use msw to mock http request") was written for.

The component specs make no HTTP request at all — there is nothing for `msw` to intercept — so they follow the repo's established `jest.mock` idiom and stay in jsdom.

#### Why this split is also the cheap one

This is the concrete payoff of keeping the call server-side (section B, section F). `msw/node` runs in the default `node` environment with no change to `jest.config.ts` beyond a setup file. Had the fetch gone to the browser instead, `msw` would have to run under `jsdom`, which resolves the `browser` export condition and requires `testEnvironmentOptions.customExportConditions: ['']` — a **global** jest option that would alter the environment of all 26 existing jsdom specs. Scoping `msw` to one server-side spec avoids that blast radius entirely.

`msw` still enters the project in this slice (pinned, no `^`, per `change.md:33-34`); the plan should name both the dependency and any `jest.config.ts` or setup-file edit as planned scope, per `db-connection/reviews/impl-review.md:68-76` (F4, unplanned test tooling).
