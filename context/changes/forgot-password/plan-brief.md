# Forgot Password — Plan Brief

> Full plan: `context/changes/forgot-password/plan.md`

## What & Why

Domowa Biblioteka has no way to recover a forgotten password today — signing in requires the exact password you already know. This plan adds a self-service reset flow: request a link by email, click it, set a new password. It's the first outbound-email feature in the codebase and the last piece of must-have auth (FR-002) not yet covered.

**Provider note**: this started as a Vercel Marketplace integration (Resend, per `change.md`'s original instruction) but was switched to Gmail SMTP mid-planning at the developer's explicit request, so reset emails send from `domowa.biblioteka.v1@gmail.com` — a requirement Resend can't meet without owning that domain. Resend was installed then removed; see the full plan's Current State Analysis for the tradeoff that was presented before this override.

## Starting Point

Auth is NextAuth v5 (Credentials provider, JWT sessions, no DB session table). Register/login already establish the pattern this plan reuses: a `useActionState`-driven form + a `"use server"` action returning `string | null`. No email-sending capability exists yet.

## Desired End State

A signed-out user follows "Forgot password?" from `/login`, enters their email, and — regardless of whether it's registered — sees the same confirmation. If registered, they get a plain-text email with a one-hour, single-use link. Following it and typing a matching new password twice redirects to `/login?reset=1` with a success banner; the old password stops working.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Email provider | Gmail SMTP (nodemailer), not Marketplace | Developer requires sending from a specific Gmail address, which Resend/Marketplace can't do without owning that domain — explicit override of change.md's original Marketplace-only instruction | Plan |
| Token expiry | 1 hour | Standard window balancing usability and exposure | Plan |
| Token storage | SHA-256 hash only, never the raw value | Same principle as `passwordHash` — a DB read never yields a usable token | Plan |
| Unknown-email handling | Identical generic response as a known email | Prevents email enumeration | Plan |
| Rate limiting | Deferred, explicitly out of scope | Matches personal-scale MVP; no new infra needed | Plan |
| Old tokens on re-request | Deleted (at most one live token per user) | Simpler model, smaller attack surface | Plan |
| Other sessions on reset | Not invalidated | JWT-only sessions have no revocation mechanism — same gap `gdpr-assessment` accepted for account deletion | Plan |
| Post-reset flow | Redirect to `/login`, manual sign-in | Reuses the existing login action/page as-is | Plan |
| Bad-token UX | One generic "invalid or expired" message | Avoids leaking which failure mode occurred | Plan |
| Data model | New `password_reset_tokens` table | Matches the codebase's one-entity-per-concern convention | Plan |
| Email format | Plain text | Matches the minimal ask in `context/design/todo.md`; avoids HTML-email-client complexity | Plan |
| Email test strategy | Mock the send module, never call the real API in tests | Matches existing `jest.mock` conventions; keeps `npm test` fast and deterministic | Plan |
| Confirm-password field | Required, must match | A typo here is worse than at registration — user just proved they're locked out | Plan |

## Scope

**In scope:**
- `password_reset_tokens` table, entity, repository (create + atomic consume)
- Gmail SMTP integration (`nodemailer`) and a `sendPasswordResetEmail` wrapper
- `/forgot-password` request flow (enumeration-safe)
- `/reset-password` consume flow (confirm-password, single-use, expiring)
- `/login` wiring: "Forgot password?" link + post-reset success banner
- Fixing `gdpr-assessment`'s account-deletion cascade so a live reset token doesn't block account deletion

**Out of scope:**
- Rate limiting / abuse throttling
- Session/device invalidation on reset
- Styled HTML email
- Per-failure-reason error messages
- A "change password while signed in" settings page
- Timing-attack mitigation
- A Vercel Marketplace email provider (deliberately dropped in favor of Gmail SMTP)

## Architecture / Approach

Two new public routes each backed by a `"use server"` action following the existing register/login shape. The token itself is generated and hashed server-side (raw token never persisted), stored in a small dedicated table with a hard FK to `users`, and consumed exactly once inside a transaction that also updates the password — mirroring the transactional-consistency approach `gdpr-assessment` established for account deletion. Email sending goes through Gmail SMTP (`nodemailer`, authenticated via an App Password) rather than a transactional-email API, isolated behind one wrapper module so it's the single mock point in tests.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data Layer | Token entity/migration/repository + account-deletion cascade fix | Missing the cascade fix would silently make S-10's account deletion fail for anyone with a pending reset request |
| 2. Email Integration & Request-Reset | Gmail SMTP wrapper, `/forgot-password` request flow | Enumeration-safety regressions if the generic-response rule isn't enforced at the action layer |
| 3. Reset-Password & UI Wiring | `/reset-password` consume flow, `/login` wiring | Getting the confirm-password / token-validation UX wrong in a way that leaks failure-reason detail |

**Prerequisites:** `auth-scaffold` (done); 2-Step Verification + an App Password for `domowa.biblioteka.v1@gmail.com` (developer-owned setup step, needed before Phase 2's manual verification)
**Estimated effort:** ~3 sessions across 3 phases

## Open Risks & Assumptions

- `GMAIL_USER` and `GMAIL_APP_PASSWORD` must be added to the Vercel project (`vercel env add`) before Phase 2's manual verification can send a real email; `npm test` does not depend on it.
- Gmail SMTP is not a Marketplace-provisioned integration — if Google throttles or flags automated sending from this account, there's no fallback provider wired up in this plan.

## Success Criteria (Summary)

- A user who forgot their password can regain access without developer intervention.
- No response from `/forgot-password` reveals whether a given email has an account.
- A used, expired, or otherwise invalid reset link never succeeds, and account deletion is never blocked by a pending reset request.
