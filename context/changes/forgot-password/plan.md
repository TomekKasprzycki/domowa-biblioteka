# S-11: Forgot Password Implementation Plan

## Overview

Domowa Biblioteka has no way for a user who forgot their password to regain access — `src/auth.ts`'s Credentials provider only supports signing in with a password you already know. This plan adds a self-service reset flow: a public "forgot password" form that emails a single-use, time-limited reset link via Gmail SMTP (this project's first outbound-email integration), and a public "reset password" page that consumes that link to set a new password.

## Current State Analysis

- Auth is NextAuth v5 (beta) with a `Credentials` provider and JWT-strategy sessions (`src/auth.ts`, `src/auth.config.ts`) — there is no database session table and no built-in password-reset support to build on. This is fully custom.
- The register/login pattern is consistent and reusable: a `"use server"` action shaped `(prevState: string | null, formData: FormData) => Promise<string | null>`, driven by `useActionState` in a client form built from `Field` + `Button` (`src/app/register/actions.ts` + `_components/register-form.tsx`, `src/app/login/actions.ts` + `_components/login-form.tsx`).
- Route protection is a single allow-list in `src/auth.config.ts:16` (`publicPaths`); any route not in it requires a session.
- `src/lib/db-error.utils.ts` already has `isDuplicateError` / `isForeignKeyViolation` helpers keyed off Postgres error codes, used by `registerAction` and the `gdpr-assessment` cascade-delete.
- **Email provider: Gmail SMTP, not a Vercel Marketplace integration — a deliberate, explicit override.** `change.md` originally instructed "use a real Vercel Marketplace transactional-email integration rather than hand-rolling SMTP." That was followed first: Resend was installed via `vercel integration add resend/resend-email` (Free tier). It was then **removed** (`vercel integration remove resend --yes`) once the actual requirement surfaced — the developer wants reset emails to be genuinely sent *from* `domowa.biblioteka.v1@gmail.com`, which Resend cannot do (sending "from" an address requires DNS-verified ownership of its domain, and nobody can verify `gmail.com`). Gmail SMTP, authenticated as that exact mailbox via an App Password, is the only way to satisfy that requirement — the developer confirmed this override knowingly after the tradeoff (no Marketplace integration, App Password as a secret to manage) was presented.
- The `nodemailer` package (CJS-only, no ESM build at all) is the standard choice for this — even less ESM risk than the `resend` SDK per `context/foundation/lessons.md`'s `msw` caution. It ships no bundled TypeScript types, so `@types/nodemailer` is needed as a devDependency, matching the existing `@types/bcryptjs` pattern in `package.json`.
- **Gmail SMTP prerequisite**: the `domowa.biblioteka.v1@gmail.com` account must have 2-Step Verification enabled to generate an App Password (Google no longer allows plain-password SMTP auth). Generating that App Password is a manual, one-time setup step outside this plan's automated scope — see Phase 2's Manual Verification.
- **This removes the Resend-era delivery restriction entirely.** Gmail SMTP can send to any recipient directly (a personal Gmail account's ~500-recipients/day cap is far above this app's scale), so — unlike the original Resend-sandbox plan — Phase 2 and Phase 3 manual verification can now test against arbitrary real user emails, not just the sending account's own inbox.
- No `GMAIL_USER` or `GMAIL_APP_PASSWORD` env var exists yet in the Vercel project (`vercel env ls` confirmed only Neon/Postgres vars are present). The developer must add both via `vercel env add` before Phase 2's manual verification can send a real email; `npm test` does not depend on this (the send call is mocked).

### Key Discoveries:

- **`gdpr-assessment`'s account-deletion cascade will FK-violate on an outstanding reset token.** `src/server/account-deletion/account-deletion.repository.ts`'s `deleteAccount` deletes `loans`, `friend_connections`, and `books` before the `users` row, inside one transaction, precisely because every FK is `ON DELETE NO ACTION` (see that plan's research). The new `password_reset_tokens` table will have the exact same FK shape (`userId REFERENCES users(id) ON DELETE NO ACTION`), so a user with a live, unused reset token would hit the same class of FK violation on account deletion — except this one is *not* a transient race (nothing will insert a new token concurrently the way a friend can insert a loan), so letting it fall through to the existing `isForeignKeyViolation` → `"conflict"` mapping would tell the user to "try again" forever. Phase 1 extends the cascade to delete the user's `password_reset_tokens` rows in the same transaction, before the `users` delete.
- **`account-deletion.repository.ts` already has an uncommitted local edit** (from a prior session): `DeleteAccountResult` was extracted from an inline `export type` into `src/server/account-deletion/account-deletion.types.ts`, plus a comment on the `ownedBooks` snapshot. Phase 1 edits this same file for the cascade fix above; the pre-existing uncommitted diff will land together with Phase 1's change in the same commit — this is expected, not a merge conflict to resolve.
- `src/lib/hash-string.utils.ts`'s `hashString` is a **non-cryptographic** hash for UI color-picking (ported from `design.html`) — it must not be reused for the token digest. The precedent for a real security-hash is inline `crypto.createHash("sha256")` in `account-deletion.repository.ts:85` (`deletedUserIdHash`); this plan follows that same inline-`crypto` idiom rather than inventing a shared hashing util.
- New entities in this codebase use `@PrimaryColumn({ type: "uuid" })` + `generateId()` (`src/lib/generate-id.utils.ts`), not `@PrimaryGeneratedColumn`, matching `LoanEntity`, `BookEntity`, `FriendConnectionEntity`, and `AccountDeletionLogEntity` — `UserEntity`'s DB-generated PK predates this convention and is not the pattern to copy.
- FK columns follow `LoanEntity`'s shape: a plain `@Column({ type: "uuid" }) fooId` alongside a `@ManyToOne(() => UserEntity) @JoinColumn({ name: "fooId" })` relation, with the migration adding the constraint via a separate `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION` statement (see `1784749796897-CreateLoanTable.ts`).
- No env var for the app's own base URL exists anywhere in `src/`. The reset email needs an absolute URL; Vercel injects `VERCEL_URL` automatically in every deployed environment, so no new required env var needs documenting for the hosted case — only local dev needs a `localhost` fallback.

## Desired End State

A signed-out visitor on `/login` can follow a "Forgot password?" link to `/forgot-password`, enter their email, and — regardless of whether that email has an account — see the same confirmation message. If the email is registered, they receive a plain-text email sent from `domowa.biblioteka.v1@gmail.com` via Gmail SMTP, containing a `/reset-password?token=...` link valid for one hour and usable once. Following that link and submitting a new password (typed twice, must match) sets a new `passwordHash` on their account and redirects to `/login?reset=1`, where a success banner confirms the change and they sign in normally with the new password. An expired, already-used, or malformed link shows one generic "invalid or expired" message with a way back to `/forgot-password`.

**Verification:** `npm test`, `npm run build`, and `npm run lint` all pass; a new integration test proves token single-use, expiry, and per-user invalidation-on-re-request; a new test proves account deletion still succeeds and leaves no orphaned token row; manual click-through confirms the full request → email → reset → sign-in loop against a real recipient email.

## What We're NOT Doing

- **Rate limiting / abuse throttling** on reset requests. Accepted risk for a solo-dev, friend-circle-scale MVP — the 1-hour expiry and single-use token are the only throttle. Someone could spam a target's inbox, or (far less likely at this scale) approach Gmail's ~500-recipients/day sending cap; not mitigated here. This also means anyone who knows a victim's email can repeatedly call `/forgot-password` to invalidate the victim's own in-flight reset link before they use it (Phase 1's `createPasswordResetToken` deletes all prior unused tokens on every new request) — an unauthenticated way to indefinitely deny that person's password recovery. Accepted for the same reason as the rest of this deferral.
- **Invalidating other active sessions/devices** when a password is reset. JWT-strategy sessions have no server-side session table (`src/auth.config.ts:11`) to revoke against; `gdpr-assessment` already accepted the identical gap for account deletion. A device with an existing valid JWT keeps working until that token's natural expiry.
- **Styled/branded HTML email.** Plain text only — a subject line, one or two sentences, and the raw reset URL.
- **Distinguishing *why* a link failed** (expired vs. already-used vs. malformed vs. unknown token) in the UI. One generic message for all four cases, to avoid confirming a token ever existed or was valid.
- **A "change password while signed in" settings flow.** `context/design/todo.md`'s separate "administer own account" item (update profile / delete) is out of scope here; this plan only covers the signed-out forgot/reset loop.
- **Timing-attack mitigation** (padding response latency so a known-email request takes the same time as an unknown-email one). Accepted low risk at this scale, same reasoning as the rate-limiting deferral.
- **A Vercel Marketplace email integration.** Resend was installed then deliberately removed in favor of Gmail SMTP (see Current State Analysis) — no Marketplace provider is used for email in this plan.
- **Cleanup of expired, never-used token rows.** A token that's requested, never clicked, and never superseded by a later request just sits in `password_reset_tokens` past its `expiresAt` forever — negligible at this app's scale, not addressed here.

## Critical Implementation Details

**Cascade ordering (account deletion).** `deleteAccount` in `src/server/account-deletion/account-deletion.repository.ts` must delete a user's `password_reset_tokens` rows — via the transaction's `manager`, not a fresh repository call — before its final `users` delete. Insert this as a new step between the existing `friend_connections` delete and the `users` delete (loan/book/friend-connection ordering is unaffected). Follow the same manager-only rule the rest of that function already documents: no repository function opens its own connection inside this transaction.

**Token storage is hash-only.** `createPasswordResetToken` generates the raw token (`crypto.randomBytes(32).toString("hex")`), returns it to the caller exactly once, and persists only `crypto.createHash("sha256").update(rawToken).digest("hex")`. Never log the raw token or return it from any other function — the emailed URL is its only other home.

**Single-use via delete, not a flag.** A token is "used" by deleting its row inside the same transaction that updates `users.passwordHash` — there is no `usedAt` column. This means a replayed link (the row is already gone) and a genuinely-never-issued token both simply fail the `findOne` lookup and return `"invalid"`, which is what produces the one generic error message by construction rather than by separate-casing.

**Enumeration-safety is enforced below the UI, not just in it.** `requestPasswordResetAction` must redirect to the identical `/forgot-password?sent=1` URL on every non-validation-error path — unknown email, known email with a successful send, and known email where `sendPasswordResetEmail` throws. A Gmail SMTP failure must be caught and logged server-side as `console.error("password reset email send failed", error)` **only** — never include `resetUrl` or the raw token in that log call (see "Token storage is hash-only" above) — and never surfaced to the caller or allowed to change the response shape or timing-visible control flow.

**Testing redirect()-terminated actions.** Both `requestPasswordResetAction` (Phase 2) and `resetPasswordAction` (Phase 3) call `next/navigation`'s `redirect()` as their success path's final statement, which throws a special `NEXT_REDIRECT` signal rather than returning a value. Specs covering the success path must `jest.mock("next/navigation")` (or catch and assert on the thrown digest) and verify success via DB-visible side effects (a token row created, or a `passwordHash` change), not a returned value.

## Phase 1: Data Layer — Token Entity, Migration & Account-Deletion Cascade Fix

### Overview

Add the `password_reset_tokens` table, its entity and repository (create + consume), and extend the existing account-deletion cascade so a live token never blocks a user from deleting their account. No UI or public actions yet — verified entirely through integration tests against the real DB.

### Changes Required:

#### 1. Password-reset token entity

**File**: `src/server/password-reset/password-reset-token.entity.ts`

**Intent**: The durable record backing a single outstanding reset request.

**Contract**: `PasswordResetTokenEntity` mapped to table `password_reset_tokens`: `id` (`@PrimaryColumn({ type: "uuid" })`, app-generated via `generateId()`), `userId` (`@Column({ type: "uuid" })` + `@ManyToOne(() => UserEntity)` / `@JoinColumn({ name: "userId" })`), `tokenHash` (`@Column({ type: "varchar" })`, the SHA-256 hex digest), `expiresAt` (`@Column({ type: "timestamptz" })`), `createdAt` (`@CreateDateColumn()`). Declare a unique `@Index` on `tokenHash` (lookup key) and a plain `@Index` on `userId` (Postgres does not auto-index FK columns — same rationale as `LoanEntity`'s indexes) for the invalidate-on-request delete.

#### 2. Migration for the new table

**File**: `src/migrations/<timestamp>-CreatePasswordResetTokenTable.ts`

**Intent**: Schema for the token table, including its FK to `users`.

**Contract**: Mirror `1784146760613-CreateFriendConnectionTable.ts`'s raw-SQL style: `CREATE TABLE "password_reset_tokens" (...)`, a unique index on `tokenHash`, a plain index on `userId`, and `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT ... FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION` (matching `1784749796897-CreateLoanTable.ts`'s FK style), plus the matching `down()`.

#### 3. Register the new entity in the runtime data source

**File**: `src/lib/data-source.ts`

**Intent**: Skipping this makes `getRepository()` calls for the new entity fail to resolve metadata at runtime — same requirement `AccountDeletionLogEntity` had in `gdpr-assessment`.

**Contract**: Import `PasswordResetTokenEntity` and add it to the `entities: [...]` array.

#### 4. Token repository — create and consume

**File**: `src/server/password-reset/password-reset.repository.ts`

**Intent**: The two data-layer operations the rest of the feature needs: mint a token for a user (invalidating any prior ones), and atomically consume a token to change a password.

**Contract**: `createPasswordResetToken(userId: string): Promise<string>` — generates the raw token, deletes any existing `password_reset_tokens` rows for `userId` (enforces "at most one live token" per the plan's decision), inserts the new row with `expiresAt` one hour out, and returns the **raw** token (never the hash) for the caller to embed in the email URL. `resetPasswordWithToken(rawToken: string, newPasswordHash: string): Promise<"invalid" | "success">` — hashes the input token, and inside one `dataSource.transaction()` call: looks up the row by `tokenHash` via the transaction's `manager` (not `getRepository()`), returns `"invalid"` if no row exists or `expiresAt` has passed, otherwise updates `UserEntity.passwordHash` and deletes the token row via the same `manager`, returning `"success"`.

#### 5. Extend the account-deletion cascade

**File**: `src/server/account-deletion/account-deletion.repository.ts`

**Intent**: Close the FK-violation gap described in Key Discoveries — deleting an account must not be blocked, forever, by a token the user never used.

**Contract**: Inside `deleteAccount`'s existing transaction, add a step deleting `password_reset_tokens` rows where `userId` matches, positioned before the final `users` delete (after the `friend_connections` delete is a natural slot — order relative to `books`/`loans` doesn't matter since there's no FK between them). Use the transaction's `manager` directly, per that function's existing manager-only rule.

### Success Criteria:

**Prerequisite ordering** — same as `gdpr-assessment` Phase 1: run `npm run db:start` → `npm run migration:generate -- src/migrations/CreatePasswordResetTokenTable` → `npm run migration:run` → `npm test`, in order, since `synchronize` is dev-only and tests run with `NODE_ENV=test`.

#### Automated Verification:

- New integration test `test/server/password-reset/password-reset.repository.spec.ts` passes: `createPasswordResetToken` returns a fresh raw token each call and deletes any prior token row for that user (only the latest remains queryable); `resetPasswordWithToken` updates `passwordHash` and deletes the token row on a valid, unexpired token; returns `"invalid"` for an unknown token hash, for an expired token (seeded with a past `expiresAt`), and when called a second time with the same (now-consumed) token.
- Extended `test/server/account-deletion/account-deletion.repository.spec.ts` (or a new adjacent test) passes: a user with a live, unused `password_reset_tokens` row can still be deleted via `deleteAccount`, and the token row is gone afterward alongside the other cascaded tables.
- `npm test` passes
- `npm run build` passes
- `npm run lint` passes

#### Manual Verification:

- After `npm run migration:run`, confirm the `password_reset_tokens` table exists with the expected columns and FK constraint via a DB client

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Email Integration & Request-Reset Action

### Overview

Wire up Gmail SMTP, add the base-URL helper, and build the public request-reset action, form, and page. `/forgot-password` becomes reachable while signed out.

### Changes Required:

#### 1. Add the `nodemailer` dependency

**File**: `package.json`

**Intent**: The SMTP client used to send authenticated as `domowa.biblioteka.v1@gmail.com`.

**Contract**: Add `nodemailer` (pinned, latest stable at implementation time — `9.x` per current npm view) to `dependencies`, and `@types/nodemailer` (pinned, `8.x`) to `devDependencies` — the package ships no bundled types, matching why `@types/bcryptjs` exists alongside `bcryptjs`.

#### 2. Base-URL helper

**File**: `src/lib/get-base-url.utils.ts`

**Intent**: Build an absolute URL for the reset link — Server Actions have no implicit request origin.

**Contract**: `getBaseUrl(): string` — returns `process.env.NEXT_PUBLIC_APP_URL` if set, else `` `https://${process.env.VERCEL_URL}` `` when `VERCEL_URL` is present (Vercel injects this automatically in every deployed environment), else `"http://localhost:3000"` for local dev.

#### 3. Reset-email sender

**File**: `src/server/password-reset/send-reset-email.ts`

**Intent**: The single place that knows how to talk to Gmail SMTP — isolated so tests can mock exactly this module, matching the codebase's `jest.mock("@/auth")` / `jest.mock("next/cache")` convention.

**Contract**: `sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>` — creates a `nodemailer` transport via `nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })` and sends a plain-text email `from: `"Domowa Biblioteka" <${process.env.GMAIL_USER}>`` with a subject and a body containing `resetUrl`. Throws on failure — the caller (the request action) is responsible for catching it, per the enumeration-safety rule in Critical Implementation Details.

#### 4. Request-reset server action

**File**: `src/app/forgot-password/actions.ts`

**Intent**: Session-less entry point: validate the email, and — without ever revealing whether it matched an account — create a token and send the email for real users only.

**Contract**: `requestPasswordResetAction(prevState: string | null, formData: FormData): Promise<string | null>` — matches the existing `registerAction`/`loginAction` shape exactly. Zod-validates `email`; on validation failure returns the issue message (stays on the page, red inline error — no new state shape). Otherwise looks up the user via `findByEmail`, and if found calls `createPasswordResetToken` + `sendPasswordResetEmail` (catching and logging any send failure — see Critical Implementation Details), then **always** calls `redirect("/forgot-password?sent=1")` from `next/navigation` as the final statement, regardless of whether a user was found or the send succeeded — mirroring how `deleteAccountAction` redirects on success. No `forgot-password.types.ts` file is needed.

#### 5. Forgot-password page and form

**File**: `src/app/forgot-password/page.tsx`, `src/app/forgot-password/_components/forgot-password-form.tsx`

**Intent**: The public entry point, styled consistently with `/login` and `/register`, plus the post-request confirmation banner.

**Contract**: `page.tsx` is an async Server Component reading `searchParams: Promise<{ sent?: string }>` (mirroring `src/app/page.tsx`'s `accountDeleted` prop) and mirrors `src/app/register/page.tsx`'s structure (heading + form, `/privacy` link); renders a one-time confirmation banner — "If that email is registered, we've sent a password reset link." — using the same banner classes as `page.tsx`'s `accountDeleted` banner when `sent === "1"`. `forgot-password-form.tsx` is a client component using `useActionState(requestPasswordResetAction, null)`, an `email` `Field`, and renders the returned error string inline (red text), matching `login-form.tsx`/`register-form.tsx` exactly.

#### 6. Open the route to unauthenticated visitors

**File**: `src/auth.config.ts`

**Contract**: Add `"/forgot-password"` to `publicPaths`.

### Success Criteria:

#### Automated Verification:

- New `test/app/forgot-password/actions.spec.ts` passes (real DB, `jest.mock("@/server/password-reset/send-reset-email")`, `jest.mock("next/navigation")` per the redirect-testing note in Critical Implementation Details): an invalid email format returns a validation-error string without redirecting; a request for a registered email redirects to `/forgot-password?sent=1`, calls the mocked `sendPasswordResetEmail` exactly once, and leaves a matching `password_reset_tokens` row in the DB; a request for an unregistered email redirects to the **identical** `/forgot-password?sent=1` and does **not** call the mocked send function.
- New `test/app/forgot-password/_components/forgot-password-form.spec.tsx` passes: renders the email field, calls the mocked action on submit, and renders a returned error string inline.
- `npm test` passes
- `npm run build` passes
- `npm run lint` passes

#### Manual Verification:

- Enable 2-Step Verification on `domowa.biblioteka.v1@gmail.com` if not already on, generate an App Password, and set `GMAIL_USER` + `GMAIL_APP_PASSWORD` via `vercel env add` (pull locally too); request a reset for a real test email and confirm it arrives, sent from `domowa.biblioteka.v1@gmail.com`
- Request a reset for an email that has no account and confirm the page shows the identical confirmation message

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Reset-Password Action & UI Wiring

### Overview

Build the token-consuming reset action and page, and connect the whole loop from `/login`.

### Changes Required:

#### 1. Reset-password server action

**File**: `src/app/reset-password/actions.ts`

**Intent**: Validate the new password (typed twice, must match) and the token, then consume it.

**Contract**: `resetPasswordAction(prevState: string | null, formData: FormData): Promise<string | null>` — Zod schema for `token` (non-empty string), `password` (min 8), `confirmPassword` (min 8), with a `.refine()` requiring `password === confirmPassword`; on validation failure returns the first issue's message. Otherwise `bcrypt.hash`es the new password (cost 12, matching `registerAction`) and calls `resetPasswordWithToken`. On `"invalid"`, returns `"This link is invalid or has expired. Request a new one."`. On `"success"`, calls `redirect("/login?reset=1")` from `next/navigation` as the final statement (no code after it, matching how `signOut` is used as a terminal call in the `gdpr-assessment` delete-account action).

#### 2. Reset-password page and form

**File**: `src/app/reset-password/page.tsx`, `src/app/reset-password/_components/reset-password-form.tsx`

**Intent**: The link target from the email; hosts the new-password form.

**Contract**: `page.tsx` is an async Server Component reading `searchParams: Promise<{ token?: string }>`. If `token` is missing or empty, render the same generic "invalid or expired" message with a link to `/forgot-password` and skip rendering the form (no DB call on page load — full validation happens at submit). Otherwise render `ResetPasswordForm` with the token passed down. `reset-password-form.tsx` is a client component using `useActionState(resetPasswordAction, null)` with a hidden `token` input, `password` and `confirmPassword` `Field`s, and a submit `Button` that stays disabled until the two typed values match (mirroring `gdpr-assessment`'s `delete-account-form.tsx` confirm-match pattern); the returned error string renders inline.

#### 3. Wire up `/login`

**File**: `src/app/login/page.tsx`, `src/app/login/_components/login-form.tsx`

**Intent**: Make the new flow discoverable, and confirm success after the redirect back from a reset.

**Contract**: `login/page.tsx` extends its `searchParams` type to include `reset?: string` and renders a one-time success banner when `reset === "1"` (same pattern as `src/app/page.tsx`'s `accountDeleted` banner). `login-form.tsx` adds a `<Link href="/forgot-password">Forgot password?</Link>` near the password field, styled like the existing "Register" / "Sign in" links at the bottom of the form.

#### 4. Open the route to unauthenticated visitors

**File**: `src/auth.config.ts`

**Contract**: Add `"/reset-password"` to `publicPaths`.

### Success Criteria:

#### Automated Verification:

- New `test/app/reset-password/actions.spec.ts` passes (real DB): a valid, unexpired token sets the new `passwordHash` (verified via `bcrypt.compare`) and deletes the token row; a mismatched `confirmPassword` returns a validation error and leaves the password unchanged; an expired token (seeded past `expiresAt`) returns the generic invalid-link message; replaying an already-consumed token (call the action twice with the same token) returns the generic invalid-link message on the second call; a missing/empty token returns the generic invalid-link message.
- New `test/app/reset-password/_components/reset-password-form.spec.tsx` passes: submit stays disabled until `password` and `confirmPassword` match, then fires the mocked action.
- `npm test` passes
- `npm run build` passes
- `npm run lint` passes

#### Manual Verification:

- Full loop: request a reset for a real test email, open the emailed link, submit a mismatched confirm value (rejected, unchanged), then submit a matching new password — confirm the `/login?reset=1` banner appears and the new password signs in successfully while the old one no longer works
- Click an already-used link a second time, and separately a link with a garbage/missing `token` query param — confirm both show the generic invalid-link message
- Confirm "Forgot password?" is visible and reachable from `/login` while signed out

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- None beyond what the integration tests below cover — this feature has no pure-function logic complex enough to warrant isolated unit tests beyond the repository/action integration specs.

### Integration Tests:

- Token lifecycle: create → single unexpired use succeeds → reuse fails; expiry enforced; re-request invalidates the prior token.
- Request action: identical response for known vs. unknown email, with the mocked email-send only firing for known emails.
- Reset action: password-match validation, successful reset + old-password invalidation, expired/reused/missing-token rejection.
- Account-deletion cascade: a live token no longer blocks `deleteAccount`.

### Manual Testing Steps:

1. From `/login`, follow "Forgot password?" to `/forgot-password`.
2. Request a reset for a real test email; confirm the generic confirmation message and that the email arrives from `domowa.biblioteka.v1@gmail.com`.
3. Request a reset for a non-existent email; confirm the identical confirmation message.
4. Open the emailed link, try a mismatched confirm-password (rejected), then a matching new password — confirm redirect to `/login?reset=1` with the success banner.
5. Sign in with the new password; confirm the old password no longer works.
6. Reopen the same (now-consumed) email link and confirm the generic invalid-link message.

## Performance Considerations

None beyond the single transaction in `resetPasswordWithToken` — token volume per user is trivial (at most one live row, by design).

## Migration Notes

The new `password_reset_tokens` table is additive only. No existing data is touched or migrated.

## References

- Related change: `context/changes/forgot-password/change.md`
- Register/login action pattern: `src/app/register/actions.ts`, `src/app/login/actions.ts`
- Transaction + cascade precedent: `src/server/account-deletion/account-deletion.repository.ts`, `context/changes/gdpr-assessment/plan.md`
- FK migration style: `src/migrations/1784749796897-CreateLoanTable.ts`
- Confirm-match form precedent: `context/changes/gdpr-assessment/plan.md` Phase 3, `delete-account-form.tsx`
- Public-route allow-list: `src/auth.config.ts:16`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data Layer — Token Entity, Migration & Account-Deletion Cascade Fix

#### Automated

- [ ] 1.1 New repository integration test passes: create/consume, single-use, expiry, per-user invalidation
- [ ] 1.2 Account-deletion cascade test passes: live token no longer blocks deleteAccount
- [ ] 1.3 npm test passes
- [ ] 1.4 npm run build passes
- [ ] 1.5 npm run lint passes

#### Manual

- [ ] 1.6 Migration creates `password_reset_tokens` table with expected columns and FK

### Phase 2: Email Integration & Request-Reset Action

#### Automated

- [ ] 2.1 New actions test passes: validation error, known-email send, unknown-email identical response
- [ ] 2.2 forgot-password-form spec passes
- [ ] 2.3 npm test passes
- [ ] 2.4 npm run build passes
- [ ] 2.5 npm run lint passes

#### Manual

- [ ] 2.6 Real reset email received, sent from domowa.biblioteka.v1@gmail.com via Gmail SMTP
- [ ] 2.7 Unregistered-email request shows the identical confirmation message

### Phase 3: Reset-Password Action & UI Wiring

#### Automated

- [ ] 3.1 New reset actions test passes: success, mismatch, expired, reused, missing-token
- [ ] 3.2 reset-password-form spec passes
- [ ] 3.3 npm test passes
- [ ] 3.4 npm run build passes
- [ ] 3.5 npm run lint passes

#### Manual

- [ ] 3.6 Full request → email → mismatch-rejected → success → /login?reset=1 → sign-in loop verified
- [ ] 3.7 Reused and missing-token links both show the generic invalid-link message
- [ ] 3.8 "Forgot password?" reachable from /login while signed out
