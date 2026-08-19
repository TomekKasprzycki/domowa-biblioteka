# S-07: ISBN Lookup — Plan Brief

> Full plan: `context/changes/isbn-lookup/plan.md`
> Research: `context/changes/isbn-lookup/research.md`

## What & Why

Adding a book currently means typing title and author by hand every time. This slice lets the user optionally enter an ISBN in the add dialog and have those two fields filled in from Open Library, then stores the ISBN on the book. It serves the PRD guardrail that adding a book takes no more than a few seconds (`prd.md:45`), without ever making manual entry harder.

## Starting Point

S-06 moved book creation into a modal dialog and deliberately left two things for this slice: the ISBN field itself, and converting the add form's uncontrolled inputs to controlled (`collection-modals/plan.md:35`, `:38`). The `books` table has no `isbn` column, the codebase makes no outbound HTTP calls at all, and `msw` — mandated by `AGENTS.md:45` — has never been installed.

## Desired End State

The user types an ISBN, presses Look up, and sees title and author appear in editable fields. A confirmation checkbox appears and submit stays disabled until it is ticked, so fetched data is never saved unreviewed. Typing a book in by hand is unchanged — no checkbox, one step. Every failure path leaves the form usable with a message to type the details in. The ISBN is stored and shown nowhere.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Where the lookup runs | Auth-gated Route Handler `GET /api/isbn` | Keeps the timeout and the `User-Agent` under server control while giving the browser an explicit contract. | Plan |
| Confirmation gate | Checkbox that appears only after a lookup, blocking submit | The only candidate shape requiring a distinct, deliberate act — a relabelled button is still one click in the same place. | Plan |
| ISBN validation | Normalise, then verify the check digit before calling | Practically any well-formed 13-digit string matches *some* record upstream, so a typo would otherwise autofill a plausible wrong book. | Research → Plan |
| Edit path | Never writes `isbn` | The mockup blanks the ISBN input on edit; wiring that literally would erase stored values invisibly until S-09. | Research → Plan |
| Timeout | 5 seconds, degrading to "not found" | A false miss is worse than a short wait, because the user then retypes data that was available. | Plan |
| Open Library identification | `OPENLIBRARY_CONTACT` env var, anonymous when unset | Keeps a contact address out of a public repository while earning the 3 req/s tier where it is set. | Plan |
| ISBN display | Rendered nowhere in this slice | S-09's detail drawer owns display, including the designed missing state. | Research |
| HTTP mocking | `msw` deferred; the gateway spec stubs `global.fetch` | A spike proved msw needs four jest config changes plus a second tsconfig here — disproportionate for one outbound call, and now recorded in `lessons.md`. | Plan review |
| Signed-out behaviour | Endpoint redirects to `/login`; the wrapper surfaces it as a distinct state | Middleware gates `/api/isbn` before the handler, so a 401 never reaches the browser — collapsing it into "not found" would lie to a user whose session expired. | Plan review |

## Scope

**In scope:** nullable `isbn` column and its migration; ISBN normaliser with check-digit validation; server-side Open Library gateway; `GET /api/isbn` route handler; `OPENLIBRARY_CONTACT` environment variable; ISBN field, lookup button and status line in the add dialog; confirmation gate; converting the add form's inputs to controlled.

**Out of scope:** installing `msw` or touching `jest.config.ts`; rendering the ISBN anywhere; `/discover` and `DiscoverBook`; the edit dialog and `updateBookAction`; changing the middleware matcher or the public-path list; a unique constraint or index on `isbn`; covers, publisher, year, page count; the `AGENTS.md:23` service layer; response caching; rate limiting our own endpoint; backfilling existing books.

## Architecture / Approach

Browser → thin `isbn-lookup.client.ts` wrapper → `GET /api/isbn` (auth gate, normalise, reject bad checksum) → `openlibrary.client.ts` (5 s timeout, `User-Agent`, absorbs every failure) → Open Library. The endpoint answers a flat `{ found }` shape and never forwards the upstream payload. The confirmation gate is entirely client-side and pre-submit, so the existing `string | null` server-action contract and `useActionSuccess` are untouched. The wrapper module exists so component specs mock a module — the repo's idiom — rather than stubbing global `fetch`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data layer | `isbn` column, migration, normaliser, write path through `addBookAction` | `synchronize: true` in dev makes `migration:generate` produce an empty diff and write no file |
| 2. Lookup stack | Open Library gateway, `/api/isbn` route handler, `OPENLIBRARY_CONTACT` | Not-found is HTTP 200 with `{}`, so status-based error handling reports every miss as success |
| 3. Dialog & gate | ISBN row, autofill, controlled inputs, confirmation checkbox | A checkbox's `.value` is `"on"` regardless of checked state, which would make the dirty check fire the discard prompt permanently |

**Prerequisites:** S-06 `collection-modals` merged (PR #9). A reachable Neon database for the migration and the integration specs. Branch `feat/S-07-isbn-lookup`.
**Estimated effort:** ~3 sessions, one per phase, with a manual verification pause after each.

## Open Risks & Assumptions

- The check digit rejects typos but cannot catch a valid ISBN for the wrong edition; the confirmation gate is the backstop, and it only works if the user actually knows the book.
- A wrong ISBN cannot be corrected in this slice, since the edit path deliberately never writes the column — the workaround until S-09 is delete and re-add.
- Open Library states its APIs are "not intended to serve as a data backend for third-party services"; usage here is one request per explicit button press, which is well inside that intent, but the dependency is external and unversioned.
- `OPENLIBRARY_CONTACT` narrows the `change.md:26-27` note that no new environment variable was needed — that note was about API keys, and this is contact identification. It fails open: an unset variable produces no error, only the slower anonymous tier.
- Converting the add form's inputs to controlled changes two behaviours nothing currently tests: typed values now survive a failed submit (React 19 blanks them today), and Esc after a failed submit now prompts before discarding. Both are covered by new criteria, but they are changes to shipped behaviour, not just additions.
- Departing from `AGENTS.md:45` on msw is deliberate and recorded in `lessons.md`, but it leaves the project still without HTTP-mocking infrastructure for the next integration.

## Success Criteria (Summary)

- A user can add a book by ISBN in two deliberate steps, with both fetched fields still editable.
- A user who types a book in by hand notices no change at all.
- No lookup failure — bad checksum, unknown ISBN, timeout, upstream error — ever blocks adding a book manually.
