---
project: Domowa Biblioteka
version: 1
status: draft
created: 2026-06-09
updated: 2026-09-02  <!-- S-11 (forgot-password) marked impl_reviewed — plan + implementation + review complete, see context/changes/forgot-password/ -->
prd_version: 1
main_goal: market-feedback
top_blocker: capacity
---

# Roadmap: Domowa Biblioteka

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline (2026-06-09).
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Znajomi rzadko wymieniają się książkami — nie dlatego, że nie chcą, ale dlatego, że nikt nie wie, co kto ma na półce, a pytanie bezpośrednie bywa krępujące. Domowa Biblioteka usuwa tę barierę: przeglądalna kolekcja znajomego pozwala odkrywać i prosić o wypożyczenie bez inicjowania rozmowy. Hipoteza produktu: usunięcie pytania zmienia zachowanie — wypożyczenia między znajomymi zaczynają się dziać.

## North star

Gwiazda przewodnia — pierwszy slice, którego ukończenie udowadnia, że produkt działa: najmniejszy end-to-end przepływ użytkownika weryfikujący główną hipotezę produktu, umieszczony jak najwcześniej, bo wszystko inne ma znaczenie tylko gdy to działa.

**S-04: borrow-request — Użytkownik może poprosić o wypożyczenie książki, a właściciel może zatwierdzić lub odrzucić prośbę.** To pierwszy moment, w którym hipoteza *"usunięcie pytania zmienia zachowanie"* jest weryfikowalna z prawdziwymi użytkownikami: znajomy przejrzał katalog i wysłał prośbę bez inicjowania rozmowy.

## At a glance

| ID   | Change ID             | Outcome (user can …)                                                              | Prerequisites    | PRD refs                       | Status   |
|------|-----------------------|-----------------------------------------------------------------------------------|------------------|--------------------------------|----------|
| F-01 | db-connection         | (foundation) TypeORM installed, Neon data source configured                       | —                | Access Control, Business Logic | ready    |
| F-02 | auth-scaffold         | (foundation) Auth.js wired, User entity, session middleware active                | F-01             | FR-001, FR-002, Access Control | proposed |
| S-01 | collection-management | add books to and view their personal collection                                   | F-02             | FR-003, FR-004                 | proposed |
| S-02 | friend-connections    | send, accept, and reject friend invitations                                       | F-02             | FR-005, FR-006                 | proposed |
| S-03 | friend-discovery      | browse and search a confirmed friend's book collection                            | F-02, S-01, S-02 | FR-007, US-01                  | proposed |
| S-04 | borrow-request        | request to borrow a book; owner can approve or decline                            | S-03             | FR-008, FR-009, US-01          | proposed |
| S-05 | loan-lifecycle        | view loan state of their books and close loans via two-sided return confirmation  | S-04             | FR-010, FR-011, US-01          | blocked  |
| S-06 | collection-modals     | add and edit books in a modal dialog instead of inline forms                       | S-01             | FR-003, FR-004                 | proposed |
| S-07 | isbn-lookup           | autofill title and author by ISBN when adding a book                              | S-06             | FR-003, Guardrails             | proposed |
| S-08 | design-system         | see the app in its designed visual identity                                       | S-06             | NFR (usable, responsive)       | proposed |
| S-09 | shelf-view            | browse books as spines on a shelf and act on one via a detail drawer              | S-08             | FR-004, FR-007                 | proposed |
| S-10 | gdpr-assessment        | read a privacy notice and permanently delete their account, cascading across books, friends, and loans | F-02, S-01, S-02, S-04 | Access Control, Non-Goals | proposed |
| S-11 | forgot-password        | reset a forgotten password via an emailed link                                    | F-02              | FR-002, Access Control          | impl_reviewed |
| S-12 | ux-polish              | land on their collection right after sign-in, use accessible icon buttons, and read a reorganized friends list | S-09              | NFR (usable, responsive)    | proposed |
| S-13 | polish-localization    | use the app in Polish                                                             | S-09, S-10, S-11, S-12 | NFR (usable)                | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme            | Chain                                                 | Note                                                                |
|--------|------------------|-------------------------------------------------------|---------------------------------------------------------------------|
| A      | Pętla wypożyczeń | `F-01` → `F-02` → `S-01` → `S-03` → `S-04` → `S-05` | Główna must-have path; prowadzi do gwiazdy przewodniej S-04. S-02 dołącza przy S-03. |
| B      | Graf znajomych   | `F-02` → `S-02`                                      | Równolegle z S-01; dołącza do Stream A przy S-03.                   |
| C      | UX kolekcji      | `S-01` → `S-06` → `S-07`                             | Dodane 2026-08-11 po ukończeniu Stream A. Nie blokuje nic w A ani B — czysto usprawnienie dodawania książek. |
| D      | Warstwa wizualna | `S-06` → `S-08` → `S-09` → `S-12`                    | Dodane 2026-08-11 na podstawie `context/design/design.html`. S-08 to czysty re-skin; S-09 zmienia sposób prezentacji książek. Kolejność względem S-07: buduj S-07 najpierw, bo modal z makiety zawiera już pole ISBN. S-12 dołączony 2026-08-22 jako kontynuacja tej samej warstwy (`context/design/todo.md`). |
| E      | Zgodność (RODO)  | `F-02, S-01, S-02, S-04` → `S-10`                    | Dodane 2026-08-22 po `context/changes/gdpr-assessment/research.md`. Nie blokuje A/B/C/D — wymaga tylko encji, które już istnieją. |
| F      | Auth — reset hasła | `F-02` → `S-11`                                    | Dodane 2026-08-22 z `context/design/todo.md`. Niezależne od reszty; pierwsza funkcja wysyłająca e-mail w projekcie. |
| G      | Lokalizacja      | `S-09, S-10, S-11, S-12` → `S-13`                    | Dodane 2026-08-22 — unpark pozycji "Polish UI / i18n" (patrz Parked). Celowo ostatni w kolejności, żeby tłumaczyć nowe UI z S-10/S-11/S-12 tylko raz. |

## Baseline

What's already in place in the codebase as of 2026-06-09 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — Tailwind CSS v4 aktywny (`src/app/globals.css:1`); tylko scaffold pages (`layout.tsx`, `page.tsx`); brak dodatkowych tras ani komponentów.
- **Backend / API:** absent — brak `app/api/`, server actions ani `src/server/`.
- **Data:** partial — Neon PostgreSQL credentials w `.env.local`; brak TypeORM, schematu ani migracji. TypeORM wybrany jako ORM (decyzja użytkownika).
- **Auth:** absent — brak NextAuth / Auth.js ani żadnego auth providera.
- **Deploy / infra:** present — Vercel (`vercel.json`, region `cdg1`); brak CI/CD workflows.
- **Observability:** absent — brak loggingu ani error trackingu.

## Foundations

### F-01: DB Connection

- **Outcome:** (foundation) TypeORM installed, Neon PostgreSQL data source configured, entities directory scaffolded — every subsequent slice can define and migrate its own entities without re-configuring the connection.
- **Change ID:** db-connection
- **PRD refs:** Access Control (multi-user persistent accounts require a DB), Business Logic (loan state consistency is a hard data-layer constraint)
- **Unlocks:** F-02 (User entity), and transitively S-01 through S-05
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** TypeORM's data-source singleton must be initialised once per process, not per request — the standard risk in Next.js App Router serverless environments. Use a module-level singleton with lazy initialisation.
- **Status:** ready

### F-02: Auth Scaffold

- **Outcome:** (foundation) Auth.js v5 wired with email + password (and optionally Google/GitHub OAuth); User entity in DB; session middleware active; unauthenticated users redirected to sign-in on all protected routes.
- **Change ID:** auth-scaffold
- **PRD refs:** FR-001, FR-002, Access Control
- **Unlocks:** S-01, S-02, S-03, S-04, S-05 — every slice requires an authenticated user context
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** OAuth scope — implement Google/GitHub at launch or defer to v1.5 with email + password only? Owner: developer. Block: no (email + password path is clear; OAuth is additive and can be wired independently).
- **Risk:** Auth.js v5 + Next.js 15 App Router — version-sensitive combination; v4 patterns are incompatible. Read Auth.js v5 docs before starting (per AGENTS.md: Next.js 15 has breaking changes).
- **Status:** proposed

## Slices

### S-01: Collection Management

- **Outcome:** User can add a book to their personal collection (title + author as minimum fields) and view their full collection.
- **Change ID:** collection-management
- **PRD refs:** FR-003, FR-004
- **Prerequisites:** F-02
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Book entity is the shared data model for lending, search, and future ISBN enrichment. Define only must-have fields (title, author, userId, createdAt) — premature schema growth creates migration debt for every downstream slice.
- **Status:** proposed

### S-02: Friend Connections

- **Outcome:** User can send a friend invitation to another registered user (by email or username), and can accept or reject incoming invitations.
- **Change ID:** friend-connections
- **PRD refs:** FR-005, FR-006
- **Prerequisites:** F-02
- **Parallel with:** S-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Friend connection is the privacy access gate — a bug here silently exposes a user's catalog to non-friends. Test the "collection visible only to confirmed friends" invariant explicitly before marking done (PRD §Guardrails).
- **Status:** proposed

### S-03: Friend Discovery

- **Outcome:** User can browse and search (by title or author) the book collection of any confirmed friend, with each book's current availability (available / borrowed by whom) visible.
- **Change ID:** friend-discovery
- **PRD refs:** FR-007, US-01
- **Prerequisites:** F-02, S-01, S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** Search at 150+ books — server-side filtering by title/author is sufficient for MVP; no full-text search engine needed. Owner: developer. Block: no.
- **Risk:** NFR (loan state consistency) requires availability status reflects real loan state at page load — no opportunistic caching that could return stale "available" for a book already on loan.
- **Status:** proposed

### S-04: Borrow Request ★ (North Star)

- **Outcome:** User can request to borrow a specific book from a friend's collection, and the book owner can approve or decline the request; an approved request creates an active loan record and marks the book unavailable.
- **Change ID:** borrow-request
- **PRD refs:** FR-008, FR-009, US-01
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** How does the owner discover pending requests without push notifications (non-goal)? In-app inbox or badge on the collection page? Owner: developer. Block: no (design choice, does not block planning).
- **Risk:** Borrow approval must atomically create the loan record and mark the book unavailable — concurrent requests for the same book must result in exactly one approved loan (PRD §Business Logic). Use a DB-level transaction or optimistic lock.
- **Status:** proposed

### S-05: Loan Lifecycle

- **Outcome:** User can see the current loan state of their books (which books are lent out, to whom, since when), and a loan can be closed via two-sided confirmation: borrower marks "I returned it", owner confirms "I received it back."
- **Change ID:** loan-lifecycle
- **PRD refs:** FR-010, FR-011, US-01
- **Prerequisites:** S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Two-sided return state machine: borrower marks "returned" → book enters "return pending" state (still unavailable to others); owner must confirm receipt to close the loan. If owner never confirms, the book stays permanently unavailable — no timeout, no override. Without push notifications, the owner must check the app to see pending returns; a visible badge/inbox from S-04 covers this.
- **Status:** proposed

### S-06: Collection Modals

- **Outcome:** User adds a book and edits an existing book through a modal dialog, so `/collection` reads as a list of books rather than a permanently-open form with a list underneath.
- **Change ID:** collection-modals
- **PRD refs:** FR-003, FR-004
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Built on the native `<dialog>` element — no dialog dependency is installed and none is being added. `<dialog>` only becomes modal via the imperative `showModal()`, and jsdom implements neither `showModal()` nor `close()`, so component specs need a shared stub. The browser's own Esc-to-dismiss must be reflected back into React state via the `close` event, or the dialog and its parent disagree about whether it is open.
- **Status:** proposed

### S-07: ISBN Lookup

- **Outcome:** When adding a book, the user can enter an ISBN and have title and author fetched and filled in automatically; the fields stay editable and the ISBN is stored on the book. Manual entry remains fully supported. The stored ISBN is not displayed by this slice — the design mockup places ISBN display in the S-09 detail drawer (revised 2026-08-11).
- **Change ID:** isbn-lookup
- **PRD refs:** FR-003, NFR / Guardrails ("adding a book takes no more than a few seconds")
- **Prerequisites:** S-06 (the ISBN field lives inside the add modal)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** First outbound third-party HTTP call in the codebase (Open Library, keyless). A slow or failing lookup must never block manual entry — timeout, non-200 and empty-result all degrade to "not found" with the form still usable. Also the first change needing `msw`, which AGENTS.md mandates for HTTP mocking but which is not yet installed.
- **Status:** proposed

### S-08: Design System

- **Outcome:** The app carries the visual identity from `context/design/design.html` — paper-and-green palette, Fraunces/Inter/JetBrains Mono type, a dark sidebar shell replacing the top nav — and every repeated UI element (button, labelled field, card, pill, library card, empty note, avatar) exists once as a reusable component in `src/app/_components/` instead of being re-typed per feature.
- **Change ID:** design-system
- **PRD refs:** NFR ("usable on the latest two major versions of Chrome, Firefox, Safari, Edge"), AGENTS.md mobile-first rule
- **Prerequisites:** S-06 (the shared `Modal` is one of the surfaces being restyled)
- **Parallel with:** S-07 — but see Streams note: building S-07 first avoids styling the add modal twice
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The widest-reaching change so far — all 8 pages and most of the 22 feature components. It is presentation-only by definition, so **any existing spec that breaks is evidence of an accidental behaviour change, not a spec that needs updating**. `src/app/globals.css` is still the Next.js scaffold default (unused dark-mode block, `body { font-family: Arial }`) and gets rewritten wholesale. Tokens belong in Tailwind v4's `@theme` so they generate real utilities rather than forcing arbitrary-value classes everywhere.
- **Status:** proposed

### S-09: Shelf View

- **Outcome:** A user's own collection and a friend's collection are shown as coloured book spines standing on a shelf rather than as list rows, and selecting a spine opens a detail drawer carrying that book's title, author, ISBN and actions (edit, or request a borrow).
- **Change ID:** shelf-view
- **PRD refs:** FR-004, FR-007, US-01
- **Prerequisites:** S-08
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** Whether spines stay scannable at the PRD's stated 150+ books, given the author is hidden and long titles truncate. Owner: developer. Block: no — resolve by looking at a real shelf on screen; a list/shelf toggle is the fallback.
- **Risk:** The only change in Stream D that alters behaviour rather than appearance. Per-book actions move out of always-visible rows and into a drawer, which is one extra interaction to reach them. Spines must stay keyboard-reachable (render as `<button>`) and carry a full `aria-label`, since the visible title is vertical and clipped. Build the drawer on the native `<dialog>` reused from S-06 rather than a positioned div — focus trapping, Esc and background inerting come free.
- **Depends on S-07 for data:** the drawer renders ISBN (added to the mockup 2026-08-11), including a designed missing state for hand-entered books. This slice also has to thread `isbn` through `DiscoverBook`, since the drawer shows it for a friend's books and S-07 deliberately stays out of `/discover`. If S-07 has not landed, the drawer's ISBN line has no source — sequence accordingly.
- **Status:** proposed

### S-10: Privacy & Data Rights (RODO)

- **Outcome:** User can read a privacy notice explaining what personal data is collected and why, and can permanently delete their own account — cascading the deletion across their books, friend connections, and loan history.
- **Change ID:** gdpr-assessment
- **PRD refs:** Access Control, Non-Goals (gap — no existing FR covers data rights yet; see Open Roadmap Questions #3)
- **Prerequisites:** F-02, S-01, S-02, S-04
- **Parallel with:** S-11, S-12
- **Blockers:** —
- **Unknowns:** Data export (GDPR Art. 15/20) is out of scope for this slice's first cut — ships notice + deletion only; export is a fast-follow if ever requested. Owner: developer. Block: no.
- **Risk:** Account deletion must cascade correctly across `BookEntity`, `FriendConnectionEntity`, and `LoanEntity` — an incomplete cascade leaves orphaned rows referencing a deleted user, or silently fails to remove a friend's visibility into the deleted user's data. A book currently on loan complicates deletion — decide during planning whether deletion is blocked while an active loan exists or the loan is force-closed. Separately, `context/changes/gdpr-assessment/research.md` found the Neon database region (`us-east-1`, USA) doesn't match the deliberately-chosen Vercel function region (`cdg1`, EU) — an undocumented cross-border data transfer. Resolving that (migrate the DB to an EU Neon region, or document a legal transfer basis) is part of fully closing this slice's risk, not just the notice/deletion UI.
- **Status:** proposed

### S-11: Forgot Password

- **Outcome:** A user who forgot their password can request a reset link by email and set a new password, without contacting the app owner.
- **Change ID:** forgot-password
- **PRD refs:** FR-002 (extends sign-in/session), Access Control
- **Prerequisites:** F-02
- **Parallel with:** S-10, S-12
- **Blockers:** —
- **Unknowns:** Which transactional-email provider to use — this is the first outbound-email requirement in the codebase (S-07's ISBN lookup is inbound HTTP only). Resolve via a real Marketplace integration during `/10x-plan` rather than hand-rolling SMTP. Owner: developer. Block: no.
- **Risk:** A password-reset token must be single-use, time-limited, and validated server-side before the new password is accepted — a reused or unexpired token is an account-takeover vector. First slice touching security-sensitive email delivery; treat provider setup (API key, sender domain/DNS) as part of the plan, not an afterthought.
- **Status:** impl_reviewed — plan, implementation, and `/10x-impl-review` all complete; see `context/changes/forgot-password/`
- **Source:** `context/design/todo.md` (developer note: "dodaj opcję: zapomniałem hasła. wyślij link na mail z linkiem do resetu")

### S-12: Post-Launch UX Polish

- **Outcome:** After signing in, a user lands directly on their collection instead of a welcome page; every icon-only action button (edit, delete, …) is reachable by keyboard and screen reader with a specific label (e.g. "Delete The Left Hand of Darkness", not just "Delete"); and the friends list shows each friend's shelf size instead of their email, with administrative actions collapsed by default and a two-column layout on large screens, matching `context/design/design.html`.
- **Change ID:** ux-polish
- **PRD refs:** NFR (usable, responsive), Guardrails
- **Prerequisites:** S-09
- **Parallel with:** S-10, S-11
- **Blockers:** —
- **Unknowns:** —
- **Risk:** `IconButton` is a new primitive added to `src/app/_components/design-system.types.ts`'s variant set and gets adopted by every existing delete/edit action across collection and friends — same "any existing spec that breaks is evidence of an accidental behaviour change" caveat that applied to S-08 applies here, since this is presentation-plus-navigation, not new business logic. The friends-list change (email → book count) needs a `countBooksForUser`-style query per friend card, mirroring the pattern already used for the sidebar's own book count (added during S-08 planning).
- **Status:** proposed
- **Source:** `context/design/todo.md` (developer notes, captured 2026-08-22: post-login redirect, IconButton, friends admin-section collapse + 2-col layout, book count instead of email, narrower friend cards)

### S-13: Polish Localization

- **Outcome:** The app's UI copy — page text, buttons, server-action error messages — is in Polish instead of English, matching the design mockup's language and the PRD's Polish-speaking persona.
- **Change ID:** polish-localization
- **PRD refs:** NFR (usable), Vision & Problem Statement (Polish persona)
- **Prerequisites:** S-09, S-10, S-11, S-12
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** Scope is a one-off string sweep to Polish, not a full i18n system — no locale routing, no message catalogue, no runtime language switching. If multi-locale support (e.g. keeping an English option) is wanted later, that's a separate, larger decision needing locale routing and a message catalogue, and would touch most existing specs since they assert on English text today. Owner: developer. Block: no.
- **Risk:** The widest-reaching change since S-08 — nearly every component and spec asserts on English user-facing text. Sequenced last among the new slices specifically so each string is translated once, after S-10/S-11/S-12 land their own new UI copy (privacy notice, delete-account flow, reset-password screen, IconButton labels, friends-list copy) rather than translating twice.
- **Status:** proposed
- **Source:** `context/design/todo.md` (developer note: "przetłumaczyć na polski"); unparks the "Polish UI / i18n" item below.

## Backlog Handoff

| Roadmap ID | Change ID             | Suggested issue title                                       | Ready for `/10x-plan` | Notes                                 |
|------------|-----------------------|-------------------------------------------------------------|-----------------------|---------------------------------------|
| F-01       | db-connection         | Set up TypeORM + Neon PostgreSQL data source                | yes                   | Run `/10x-plan db-connection`         |
| F-02       | auth-scaffold         | Wire Auth.js v5 — email+password, session, protected routes | no                    | Awaits F-01 completion                |
| S-01       | collection-management | Collection: add and view personal books                     | no                    | Awaits F-02                           |
| S-02       | friend-connections    | Friends: send, accept, reject invitations                   | no                    | Awaits F-02; parallel with S-01       |
| S-03       | friend-discovery      | Discovery: browse and search a friend's collection          | no                    | Awaits S-01 + S-02                    |
| S-04       | borrow-request        | Borrow: request, approve, decline — loan record created     | no                    | Awaits S-03                           |
| S-05       | loan-lifecycle        | Loans: view state, two-sided return confirmation            | no                    | Awaits S-04                           |
| S-06       | collection-modals     | Collection: add and edit books in a modal dialog            | yes                   | Run `/10x-plan collection-modals`     |
| S-07       | isbn-lookup           | Collection: autofill title and author from ISBN             | yes                   | S-06 merged (PR #9)                   |
| S-08       | design-system         | Design: tokens, fonts, sidebar shell, reusable primitives   | yes                   | Build after S-07 — see Streams note   |
| S-09       | shelf-view            | Design: book-spine shelf and per-book detail drawer         | no                    | Awaits S-08                           |
| S-10       | gdpr-assessment        | Privacy: notice + right-to-erasure (account deletion)       | yes                   | Run `/10x-plan gdpr-assessment` — research done, see `context/changes/gdpr-assessment/research.md` |
| S-11       | forgot-password        | Auth: forgot-password email reset flow                      | done                  | Implemented & reviewed — see `context/changes/forgot-password/` |
| S-12       | ux-polish              | UX: icon buttons, post-login redirect, friends list layout  | yes                   | Run `/10x-plan ux-polish` — source: `context/design/todo.md` |
| S-13       | polish-localization    | i18n: one-off Polish string sweep                            | no                    | Awaits S-10, S-11, S-12 (translates their new UI copy too) |

## Open Roadmap Questions

1. **OAuth scope (FR-001)** — Implement Google/GitHub OAuth at launch alongside email + password, or defer OAuth to v1.5? Owner: developer. Block: F-02 partially — email + password path is unblocked; OAuth is additive. **Status 2026-08-11:** deferred in practice — `auth-scaffold` shipped credentials-only and its plan defers `@auth/typeorm-adapter` plus the `accounts`/`sessions` tables to a future OAuth slice. FR-001 is the only must-have PRD requirement not yet delivered; no roadmap item covers it.
2. **Book identity / deduplication (PRD Open Question 2)** — S-07 stores an ISBN, which is a *partial* answer only. Books added manually (no ISBN) still have no canonical identity, and two users can enter the same title with different spellings. Promoting FR-012 (reviews) to must-have still needs a real dedup strategy. Owner: developer. Block: no.
3. **PRD has no Privacy/Legal section (RODO)** — S-10 (`gdpr-assessment`) covers the buildable part (notice + account deletion), but `prd.md` itself has no FR/NFR naming a legal basis for processing, a data-retention policy, or the Neon US-region data-residency gap found during research. Owner: developer. Block: no — S-10 can proceed without a PRD amendment, but the PRD should eventually name this explicitly. See `context/changes/gdpr-assessment/research.md` §Gaps for the full list.

## Parked

- **Book cover images / photo uploads** — Why parked: PRD §Non-Goals — image storage infrastructure cost disproportionate to v1 value.
- **Push / email notifications** — Why parked: PRD §Non-Goals — separate infrastructure concern; users check app manually in v1. Does not cover S-11's password-reset email — that's a single transactional/security message, not a product notification (loan reminders, borrow alerts, etc.), and stays out of scope here.
- **Public profiles** — Why parked: PRD §Non-Goals — privacy requirement; catalog never visible outside confirmed friend circle.
- **Native mobile app** — Why parked: PRD §Non-Goals — responsive web is the delivery target for v1.
- ~~**Polish UI / i18n**~~ — **Unparked 2026-08-22.** Promoted to S-13 (`polish-localization`) per developer request (`context/design/todo.md`). Scope is narrower than a full i18n system: a one-off string sweep to Polish across UI copy and server-action messages — no locale routing, no message catalogue, no runtime language switching. Why it was parked originally still applies to a *future* multi-locale ask: the design mockup (`context/design/design.html`) is written in Polish and the PRD persona is Polish-speaking, but the app shipped English throughout including server-action error messages; 2026-08-11 decided to keep S-08/S-09 purely visual and treat the mockup's Polish as placeholder copy. If multi-locale (not just single-locale Polish) is ever wanted, that remains a separate, larger future decision requiring locale routing and a message catalogue.
- **Public feed / activity stream** — Why parked: PRD §Non-Goals — private utility, not a social platform.
- **Wishlist / "want to read" catalog** — Why parked: PRD §Non-Goals — only owned books in scope.
- ~~**ISBN lookup / external book enrichment**~~ — **Unparked 2026-08-11.** Promoted to S-07 (`isbn-lookup`) by developer decision. Scope is narrower than the original parked item: lookup of title + author by ISBN and storage of the ISBN itself, nothing else. Cover images and full bibliographic enrichment (publisher, year, page count) stay out of scope. `prd.md` §Non-Goals was amended to match — see PRD note dated 2026-08-11.
- **Reviews (FR-012)** — Why parked: nice-to-have priority; book identity / deduplication problem blocks promotion to must-have (PRD Open Question 2).

## Done

(Empty on first generation. `/10x-archive` appends an entry here when a change matching a roadmap item is archived.)
