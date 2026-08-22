# S-10: Privacy Notice & Account Deletion — Plan Brief

> Full plan: `context/changes/gdpr-assessment/plan.md`
> Research: `context/changes/gdpr-assessment/research.md`

## What & Why

Domowa Biblioteka processes real personal data (email, password, social graph, loan history) for a Polish/EU user base but has no privacy notice and no way to delete an account — GDPR/RODO applies and neither right is implemented. This plan ships the first cut: a public privacy notice and a self-service, cascading account-deletion flow.

## Starting Point

No cascade deletes exist anywhere — every FK from `books`, `friend_connections`, and `loans` back to `users` is `ON DELETE NO ACTION`, so deleting a user today throws a raw FK error. No transaction has ever been used in the codebase; multi-step loan operations rely on single conditional updates. No `/account`, `/settings`, or `/privacy` route exists.

## Desired End State

A signed-out visitor reads `/privacy` (linked from `/login`, `/register`, and the sidebar) describing what's collected, why, and by which processors. A signed-in user reaches `/account`, types their email to confirm, and permanently deletes their account — cascading across books, friend connections, and loans, leaving a minimal audit trace, then signs them out with a confirmation banner on `/`. Deletion is refused with a clear message if the user is party to any open loan.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Active loan handling | Block deletion until loans resolve | Matches the existing PRD hard constraint that loan-state consistency can't be silently broken; no deadlock-breaking mechanism is needed if this is rare. |
| Cascade mechanism | Application-level transaction (new `deleteAccount` orchestrator) | The active-loan rule needs application logic to run before any row is touched, which a blind DB cascade can't express; keeps FKs as `NO ACTION` as a safety net against a future missed entity. |
| Confirmation UX | Type-to-confirm (email) | Strong deliberate-action friction for an irreversible operation with no new auth code needed. |
| Notice placement | Public `/privacy`, linked from `/login`, `/register`, and in-app nav | GDPR notice must be visible before/at data collection, not only after sign-in. |
| Account page scope | Delete-account only | Matches `change.md`'s explicit first-cut scope; profile-update UI is a future, unrelated slice. |
| Data residency (Neon US region) | Document in the notice + infra risk register; don't migrate | Keeps this plan's scope at notice+deletion; turns a silent gap into a documented, conscious decision per the roadmap's guidance. |
| Deletion audit trail | Minimal log (hashed former user id + timestamp), kept indefinitely | User's explicit choice — gives a support/debugging trail while avoiding retaining any personal data. |
| Notice depth | Full-but-concise (categories, purpose, legal basis, processors, deletion right) | Actually resolves Open Roadmap Question #3 instead of a token one-liner. |
| Verification | Automated cross-table integration test + manual click-through | Catches exactly the kind of cross-table orphan bug a UI click-through can't see; matches the codebase's existing real-DB integration-test convention. |

## Scope

**In scope:** privacy notice page (public), account-deletion server action + page, transactional cascade delete across books/friend_connections/loans, active-loan blocking check, minimal deletion-audit log, nav/login/register links, infrastructure risk-register documentation of the Neon US-region gap.

**Out of scope:** data export (Art. 15/20), actually migrating the Neon DB region, a general account-settings/profile-update page, password re-authentication for deletion, a deadlock-breaking mechanism for stuck loans, DPA verification with Vercel/Neon, a general data-retention policy, a new design-system "danger" button variant.

## Architecture / Approach

One new transactional orchestrator (`deleteAccount`, in a new `src/server/account-deletion/` module) owns the full cascade order inside a single `dataSource.transaction()` — the first transaction in this codebase. It checks the active-loan predicate up front, then deletes loans → friend connections → books → writes the audit log → deletes the user, in that order, every query issued through the transaction's own `EntityManager` (no existing repository function can participate — they each open their own connection). The existing `ON DELETE NO ACTION` FKs are the real concurrency backstop: anything the up-front check missed makes the transaction roll back, which the orchestrator reports as a `"conflict"` result rather than throwing. Everything else (action, pages, nav) follows existing codebase conventions exactly — no new libraries, no new design-system primitives.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data Layer | Audit-log entity/migration + transactional cascade delete + active-loan check, with integration tests | First transaction in the codebase — ordering must be exact or FK errors leave a confusing partial state |
| 2. Server Actions & Auth Wiring | `deleteAccountAction` (type-to-confirm, blocking message, sign-out) + `/privacy` public-route allow-list | Getting the type-to-confirm validation and post-signOut redirect sequencing right |
| 3. UI, Notice Content & Docs | `/account` + `/privacy` pages, nav/login/register links, home confirmation banner, infra risk-register entry | Privacy notice content must actually be accurate and complete, not just present |

**Prerequisites:** `auth-scaffold`, `collection-management`, `friend-connections`, `borrow-request` (all already implemented in the codebase per the research).
**Estimated effort:** ~3 sessions across 3 phases — Phase 1 is the highest-risk, most novel phase (first transaction); Phases 2–3 are mostly following established patterns.

## Open Risks & Assumptions

- Assumes "open loan" (blocking deletion) means `status IN ('active', 'return_pending')` per the existing `OPEN_LOAN_STATUSES` constant — a `requested` (pending, not yet approved) loan does NOT block deletion since no book has changed hands yet.
- The data-residency documentation (Neon US region) makes the gap visible but does not resolve it — a future infra change is still needed to actually migrate the region.
- Deleting a book that's on loan cascades correctly only because loans are deleted first in the same transaction; if a future entity adds another FK to `books` or `users` without updating this cascade, the transaction will fail loudly (by design) rather than silently leaving orphans.
- A deleted user's JWT stays valid in any other tab or device until it expires — sessions are JWT-strategy with no database session table, so `signOut()` only clears the acting browser. Accepted, not mitigated: reads render empty and writes fail, but every query is scoped by a `userId` that now matches nothing, so there is no cross-user exposure.

## Success Criteria (Summary)

- A user can read the privacy notice without an account and can permanently delete their account when signed in, with nothing left behind in books/friend_connections/loans.
- Deletion is safely refused (not silently broken) while an open loan involves the user in any role.
- The Neon US-region data-residency gap is documented, not silently ignored, closing Open Roadmap Question #3's PRD/privacy gap.
