---
project: Domowa Biblioteka
version: 1
status: draft
created: 2026-05-29
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 5
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Friends who read books rarely borrow from each other — not because they don't want to, but because no one knows what anyone else owns. The social cost of sending a "do you have anything by X?" message is just high enough that the borrow never happens. Instead, people buy books they could have read from a friend's shelf, or miss them entirely.

The insight is that removing the *ask* changes the behavior. A public, always-browsable catalog of your friends' books means you can discover and request without imposing. The collection becomes visible; the friction disappears; books actually circulate.

## User & Persona

**Primary persona: Marta, avid reader with a bookish circle**

Marta reads 20–30 books a year and has a shelf of 150+ books at home. She has 5–10 friends who also read regularly. She's in a WhatsApp group where people occasionally mention what they're reading, but no one thinks to offer borrows or ask for them — it would feel intrusive. When she finishes a book she loved, she wishes her friends could read it too; when she starts a new one, she has no idea whether she's duplicating something sitting on a friend's shelf.

She reaches for this product the moment she decides to read something new and wonders whether she has to buy it.

## Success Criteria

### Primary
- A user can sign up, add books to their collection, connect with a friend, and that friend can browse the collection and submit a borrow request that the owner sees and confirms — the full social borrow loop completes end-to-end.
- Loan state is accurate: who has which book, since which date, is always consistent.

### Secondary
- Owner receives a notification (in-app or email) when a borrowed book has been out longer than the agreed loan period.

### Guardrails
- A user's collection is visible only to confirmed friends — never publicly searchable or browsable by strangers.
- Borrow requests are never silently lost — the book owner always receives the request.
- Adding a book to the collection takes no more than a few seconds — not a multi-step per-book form.
- Loan state must never become inconsistent (book shown as both available and borrowed simultaneously).

## User Stories

### US-01: Complete borrow loop

- **Given** Marta is logged in, has at least one book in her collection, and has a confirmed friend connection with Ania
- **When** Ania browses Marta's collection, requests to borrow a book, and Marta approves the request
- **Then** the book is marked as on-loan to Ania with the current date, and both users can see the updated loan state

#### Acceptance Criteria
- The book appears as "borrowed by Ania" in Marta's collection view
- Ania sees the book listed as "currently borrowed from Marta" in her loans view
- The loan start date is recorded accurately

## Functional Requirements

### Authentication

- FR-001: User can register with email + password or via OAuth (Google/GitHub). Priority: must-have
  > Socrates: Counter-argument considered: "OAuth adds implementation complexity for marginal gain in a small friend-group app where email suffices." Resolution: kept as written; OAuth is low-cost with modern libraries and reduces friction at sign-up. Flagged for stack selection — if OAuth proves costly, it can be deferred to v1.5.

- FR-002: User can sign in to their account and sign out, with session persisting across browser restarts. Priority: must-have
  > Socrates: Counter-argument considered: "Session persistence (stay logged in) is the harder problem — the FR should explicitly include it." Resolution: FR updated to include session persistence explicitly. Sign-out and persistent sessions are both must-have.

### Collection management

- FR-003: User can add a book to their personal collection (title and author as minimum required fields). Priority: must-have
  > Socrates: Counter-argument considered: "Title + author may be too sparse to distinguish editions." Resolution: minimal fields are the right MVP call. ISBN lookup and enrichment are explicitly deferred to v2 (captured in Non-Goals).

- FR-004: User can view their own collection. Priority: must-have

### Social / friends

- FR-005: User can send a friend invitation to another registered user (by email or username). Priority: must-have
  > Socrates: Counter-argument considered (FR-005 + FR-006 together): "A two-sided accept/reject flow is over-engineered for a trusted friend group — auto-accept would be simpler." Resolution: kept as two-sided; rejection is important for privacy — a user must be able to refuse visibility to someone they don't want to share with.

- FR-006: User can accept or reject an incoming friend invitation. Priority: must-have

### Discovery

- FR-007: User can browse and search (by title or author) the book collection of any confirmed friend. Priority: must-have
  > Socrates: Counter-argument accepted: "Browse alone is too passive — a catalog becomes unusable above ~30 books without at least a title search." Resolution: FR revised to bundle search/filter with browse. A flat scrolling list is insufficient for the target library size.

### Borrowing

- FR-008: User can request to borrow a specific book from a friend's collection. Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-009: Book owner can approve or decline a borrow request for one of their books. Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-010: User can see the current loan state of their own books (which books are lent out, borrowed by whom, since when). Priority: must-have
  > Socrates: (See FR-011 for the related counter-argument about return confirmation.)

- FR-011: A loan is closed by two-sided confirmation: borrower marks "I returned it" and owner confirms "I received it back." Priority: must-have
  > Socrates: Counter-argument accepted: "Marking a return requires coordination — who clicks 'returned'? Single-actor return can create state conflicts." Resolution: FR revised to require two-sided confirmation. Borrower initiates the return; owner confirms receipt. This prevents the book showing as simultaneously returned and still out.

### Reviews

- FR-012: User can leave a review (rating + optional text) on any book in the system. Priority: nice-to-have
  > Socrates: No counter-argument; nice-to-have is the right priority. The book-identity / deduplication problem (reviews scatter without a canonical ID) is noted as a dependency if reviews are promoted to must-have in a future version.

## Non-Functional Requirements

- A book's availability status shown to a browsing friend always reflects the real loan state — stale "available" for an already-borrowed book is a consistency failure.
- A user's collection is never reachable by anyone outside their confirmed friend circle — not by URL guessing, not by search engines, not by unauthenticated access.
- Any user-initiated action (adding a book, sending a borrow request, accepting a friend invitation) produces a visible response within 2 seconds under normal conditions.
- The app is usable on the latest two major versions of Chrome, Firefox, Safari, and Edge on desktop.

## Business Logic

A book can only be borrowed by one person at a time — the app decides availability, and a borrow request can only be fulfilled when no active loan exists for that book.

When a borrower requests a book, the app checks whether the book currently has an open loan. If it does, the request is blocked (the book is shown as unavailable). If it does not, the request is forwarded to the owner for approval. Owner approval creates an active loan record that marks the book as unavailable for all other users until the loan is closed by two-sided confirmation (borrower marks returned, owner confirms receipt). The availability state a user sees in a friend's catalog always reflects the real loan state at the time of the page load.

A secondary rule governs visibility: a book catalog is accessible only to users with a confirmed mutual friend connection. The friend confirmation acts as an access gate — without it, the catalog and borrow request flow are both blocked, regardless of whether the requester knows the owner's username.

## Access Control

Multi-user web app with persistent accounts. Sign-up via email + password or OAuth (Google/GitHub). No guest mode.

**Role model: flat.** Every registered user has the same capabilities once a mutual friend connection is established. There are no admin roles or tier distinctions in the MVP. The friend-connection acts as the access gate: you can see and borrow from friends' collections only after both sides have confirmed the connection. An unauthenticated user who reaches a gated route is redirected to sign-in.

## Non-Goals

- **No book cover images or photo uploads in v1.** Adding image storage increases infrastructure complexity disproportionate to v1 value.
- **No push or email notifications in v1.** Notification infrastructure is a separate concern; users check the app manually for borrow requests and loan state.
- **No public profiles.** A collection is never visible outside the confirmed friend circle — not by URL, not by search, never.
- **No mobile app in v1.** Responsive web is the delivery target; a native iOS/Android app is out of scope.
- **No public feed, activity stream, or social network features.** The app is a private utility for a known friend group, not a social platform.
- **No wishlist or "want to read" catalog.** The collection covers only books the user owns; desire/reading-list tracking is out of scope.
- **No ISBN lookup or external book database enrichment in v1.** Books are added manually by title and author; barcode scan and Goodreads/Google Books integration are deferred to v2.

## Open Questions

1. **OAuth provider scope** — FR-001 includes Google/GitHub as OAuth options alongside email + password. If implementation cost is higher than expected, OAuth may be deferred to v1.5 (email + password only for initial launch). Owner: developer. Resolve by: tech-stack selection step.
2. **Book identity and deduplication** — FR-012 (reviews, nice-to-have) requires a canonical book identity to prevent reviews scattering across duplicate manual entries with slightly different titles or author spellings. This is a blocking dependency for promoting reviews to must-have. Owner: TBD. Resolve by: v2 scoping.
3. **Two-sided return confirmation UX** — FR-011 requires a clear flow: borrower initiates return, owner confirms receipt. The exact sequence (what happens if the owner never confirms, whether there is a timeout, how both parties are notified of each step) is unresolved. Owner: developer/designer. Resolve by: implementation planning.
