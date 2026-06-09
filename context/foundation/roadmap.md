---
project: Domowa Biblioteka
version: 1
status: draft
created: 2026-06-09
updated: 2026-06-09  <!-- S-05 unblocked: owner non-confirmation = book stays locked, no override -->
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

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme            | Chain                                                 | Note                                                                |
|--------|------------------|-------------------------------------------------------|---------------------------------------------------------------------|
| A      | Pętla wypożyczeń | `F-01` → `F-02` → `S-01` → `S-03` → `S-04` → `S-05` | Główna must-have path; prowadzi do gwiazdy przewodniej S-04. S-02 dołącza przy S-03. |
| B      | Graf znajomych   | `F-02` → `S-02`                                      | Równolegle z S-01; dołącza do Stream A przy S-03.                   |

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

## Open Roadmap Questions

1. **OAuth scope (FR-001)** — Implement Google/GitHub OAuth at launch alongside email + password, or defer OAuth to v1.5? Owner: developer. Block: F-02 partially — email + password path is unblocked; OAuth is additive.

## Parked

- **Book cover images / photo uploads** — Why parked: PRD §Non-Goals — image storage infrastructure cost disproportionate to v1 value.
- **Push / email notifications** — Why parked: PRD §Non-Goals — separate infrastructure concern; users check app manually in v1.
- **Public profiles** — Why parked: PRD §Non-Goals — privacy requirement; catalog never visible outside confirmed friend circle.
- **Native mobile app** — Why parked: PRD §Non-Goals — responsive web is the delivery target for v1.
- **Public feed / activity stream** — Why parked: PRD §Non-Goals — private utility, not a social platform.
- **Wishlist / "want to read" catalog** — Why parked: PRD §Non-Goals — only owned books in scope.
- **ISBN lookup / external book enrichment** — Why parked: PRD §Non-Goals — deferred to v2; books added manually in v1.
- **Reviews (FR-012)** — Why parked: nice-to-have priority; book identity / deduplication problem blocks promotion to must-have (PRD Open Question 2).

## Done

(Empty on first generation. `/10x-archive` appends an entry here when a change matching a roadmap item is archived.)
