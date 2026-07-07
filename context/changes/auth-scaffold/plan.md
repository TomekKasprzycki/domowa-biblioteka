# Auth Scaffold (F-02) Implementation Plan

## Overview

Wire Auth.js v5 (next-auth@beta) into the Next.js 15 App Router with email+password credentials, a TypeORM User entity backed by Neon PostgreSQL, JWT sessions, and middleware-based route protection. This is the authentication foundation that every subsequent slice (S-01 through S-05) depends on.

## Current State Analysis

F-01 (db-connection) is complete: TypeORM + Neon data source is operational, `getDataSource()` singleton in `src/lib/data-source.ts`, `src/server/` is scaffolded. No auth library, no User entity, no sign-in UI, no middleware.

The app currently has:
- `src/lib/data-source.ts` — `getDataSource()` with `synchronize: true` in dev, glob entity path `src/server/**/*.entity.ts`
- `src/lib/data-source-cli.ts` — CLI data source for migration generation
- `src/app/layout.tsx` — bare root layout, no nav
- `src/app/page.tsx` — Next.js default scaffold page

## Desired End State

After this plan completes:
- `npm install` succeeds with next-auth@beta, bcryptjs, and zod installed
- `auth.ts` at project root exports `{ handlers, auth, signIn, signOut }` with a working credentials provider
- `app/api/auth/[...nextauth]/route.ts` handles Auth.js callbacks
- `src/server/user/user.entity.ts` defines the User TypeORM entity; `npm run migration:run` creates the `users` table in production
- `src/server/user/user.repository.ts` provides `findByEmail` and `createUser`; integration tests pass
- `/login` and `/register` pages render, accept submissions, show inline errors, and redirect on success using `callbackUrl`
- `middleware.ts` protects all routes except `/`, `/login`, `/register`, and `/api/auth/**`; unauthenticated access redirects to `/login`
- `src/app/_components/nav.tsx` displays the signed-in user's name and a sign-out button in the root layout
- `npx tsc --noEmit` and `npm run lint` pass

### Key Discoveries

- TypeORM glob `src/server/**/*.entity.ts` is already in `data-source.ts` — no change needed to pick up the User entity in dev; `synchronize: true` auto-creates the table
- Auth.js v5 credentials + database sessions is broken by design — JWT strategy is required; `session: { strategy: "jwt" }` must be set explicitly even without an adapter
- `@auth/typeorm-adapter` deferred to the OAuth slice (v1.5) — no adapter tables (`accounts`, `sessions`, `verification_tokens`) in this change; they'll be added when OAuth is needed
- `searchParams` in Next.js 15 pages is a `Promise` — must be `await`ed in async Server Components (Next.js 15 breaking change)
- `signIn()` from Auth.js v5 throws `NEXT_REDIRECT` on success and `AuthError` on failure — server actions must catch `AuthError` and re-throw everything else
- SWC does not emit decorator metadata — every `@Column()` on User entity needs an explicit `type:` option (from db-connection plan, already in AGENTS.md)

## What We're NOT Doing

- Google/GitHub OAuth providers — deferred to v1.5; credentials path is fully independent
- `@auth/typeorm-adapter` — deferred; no adapter tables in this change
- Email verification flow — out of scope for MVP
- Password reset / forgot-password — out of scope
- Role-based access control — PRD specifies flat role model; all authenticated users are equal
- Session storage in DB — JWT sessions only; no database session records
- Push or email notifications — PRD §Non-Goals

## Implementation Approach

Auth.js v5 without an adapter: credentials provider in `auth.ts` calls `user.repository.findByEmail()` directly, compares the password with bcryptjs, and returns a minimal user object. Auth.js persists the session as a signed JWT cookie. The JWT callback embeds `user.id`; the session callback surfaces it as `session.user.id`. Route protection runs in `middleware.ts` via the `authorized` callback — returns `false` for unauthenticated access to any route not in the public set, which triggers Auth.js's automatic redirect to the sign-in page with `callbackUrl` preserved. Sign-in and sign-up pages use a Server Component / Client Component split: the Server Component reads `searchParams`, the Client Component owns form state via `useActionState` (React 19).

## Critical Implementation Details

**JWT + credentials wiring** — without an adapter, Auth.js assigns a random `id` to the returned user object in the `jwt` callback's `user` parameter. To persist the application's real database UUID, the `jwt` callback must copy `user.id` into the token on first sign-in (`if (user) token.id = user.id`), and the `session` callback must forward it (`session.user.id = token.id as string`). Without this, `session.user.id` is undefined everywhere.

**`signIn()` re-throw pattern** — `signIn()` signals success by throwing `NEXT_REDIRECT` (a special Next.js internal error class). A server action wrapping `signIn()` must catch only `AuthError` and re-throw everything else; swallowing all errors breaks the redirect. Pattern: `} catch (e) { if (e instanceof AuthError) return "Invalid email or password."; throw e; }`.

**Next.js 15 `searchParams` is async** — page components receiving `searchParams` must type it as `Promise<{...}>` and `await` it. Using it synchronously silently returns `undefined` in production builds.

---

## Phase 1: Dependencies, Auth Config & User Foundation

### Overview

Install all new packages, create the complete auth foundation (auth.ts, API route, User entity, user repository, migration), and verify with an integration test. After this phase Auth.js is fully wired and a user record can be created and looked up — no UI yet.

### Changes Required:

#### 1. New dependencies

**File**: `package.json`

**Intent**: Add next-auth@beta as a runtime dependency; add bcryptjs and zod as runtime dependencies; add @types/bcryptjs as a dev dependency.

**Contract**: Under `"dependencies"`: `next-auth`, `bcryptjs`, `zod`. Under `"devDependencies"`: `@types/bcryptjs`. Exact versions resolved by `npm install next-auth@beta bcryptjs zod` and `npm install -D @types/bcryptjs`.

#### 2. AUTH_SECRET environment variable

**File**: `.env.local`

**Intent**: Generate and store the secret that Auth.js uses to sign JWT tokens. This is a manual one-time step — the developer runs `npx auth secret` which appends `AUTH_SECRET=<random>` to `.env.local`.

**Contract**: `AUTH_SECRET` must be present in `.env.local` before the app can start. `npx auth secret` generates it automatically. Do NOT commit `.env.local`.

#### 3. Auth.js main config

**File**: `auth.ts` (project root, next to `package.json`)

**Intent**: Export the Auth.js handler set (`handlers`, `auth`, `signIn`, `signOut`) configured for email+password credentials with JWT sessions. The credentials `authorize()` function looks up the user via `userRepository.findByEmail()` and verifies the password with bcryptjs.

**Contract**: `export const { handlers, auth, signIn, signOut } = NextAuth({ ... })`. Config:
- `session: { strategy: "jwt" }` — required; credentials + database sessions is broken in Auth.js v5
- `providers: [Credentials({ credentials: { email: {}, password: { type: "password" } }, authorize })]`
- `authorize`: parse with zod (`email: z.string().email()`, `password: z.string().min(8)`); call `findByEmail`; compare with `bcrypt.compare`; return `{ id, email, name }` or `null`
- `pages: { signIn: "/login" }`
- `callbacks.jwt`: `if (user) token.id = user.id; return token`
- `callbacks.session`: `session.user.id = token.id as string; return session`

TypeScript session type augmentation (declare in `auth.ts` or a sibling `src/types/auth.types.ts`):
```typescript
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"]
  }
}
```

#### 4. Auth.js API route handler

**File**: `src/app/api/auth/[...nextauth]/route.ts` (new)

**Intent**: Mount the Auth.js GET/POST handlers at the `/api/auth/*` path that Auth.js's client-side callbacks use internally.

**Contract**: `import { handlers } from "@/auth"; export const { GET, POST } = handlers`. No additional logic.

#### 5. User TypeORM entity

**File**: `src/server/user/user.entity.ts` (new)

**Intent**: Define the `users` table schema for the application's User concept. All columns must have explicit TypeORM `type` options (SWC constraint per AGENTS.md).

**Contract**: `@Entity("users")` decorator on class `UserEntity`. Columns:
- `@PrimaryGeneratedColumn("uuid") id: string`
- `@Column({ type: "varchar", unique: true }) email: string`
- `@Column({ type: "varchar" }) passwordHash: string`
- `@Column({ type: "varchar" }) name: string`
- `@CreateDateColumn() createdAt: Date`
- `@UpdateDateColumn() updatedAt: Date`

The `users` table name will need to be reconciled when `@auth/typeorm-adapter` is added in the OAuth slice — noted as a future migration concern.

#### 6. User repository

**File**: `src/server/user/user.repository.ts` (new)

**Intent**: Provide the two database operations auth and registration need: look up a user by email, and create a new user record.

**Contract**: Export two async functions:
- `findByEmail(email: string): Promise<UserEntity | null>` — calls `getDataSource()`, gets the `UserEntity` repository, returns `findOne({ where: { email } })`
- `createUser(data: { email: string; passwordHash: string; name: string }): Promise<UserEntity>` — creates and saves a new `UserEntity` via `repository.save(repository.create(data))`

#### 7. CreateUserTable migration

**File**: `src/migrations/<timestamp>-CreateUserTable.ts` (generated)

**Intent**: Generate and commit the migration that creates the `users` table in production. In development `synchronize: true` handles table creation, but production and CI rely on `migration:run`.

**Contract**: Run `npm run migration:generate src/migrations/CreateUserTable` after the entity is created. Commit the generated file. The migration produces CREATE TABLE, column, and unique-index DDL matching the entity.

> Note: if the dev server has already run and `synchronize` created the `users` table before migration:generate is run, the generated migration may be empty. In that case, drop the `users` table in Neon (`DROP TABLE users CASCADE`) before running migration:generate, or write the migration manually.

#### 8. User repository integration test

**File**: `test/server/user/user.repository.spec.ts` (new)

**Intent**: Verify that `createUser` and `findByEmail` work against the real Neon database, following the pattern established in `test/lib/data-source.spec.ts`.

**Contract**: One `describe('userRepository')` block with three `it` cases:
1. `'creates a new user'` — calls `createUser({ email, passwordHash, name })`, asserts returned entity has `id` and the correct email
2. `'finds user by email'` — calls `findByEmail` with the email just created, asserts result is non-null with matching email
3. `'returns null for unknown email'` — calls `findByEmail('notfound@example.com')`, asserts `null`

`afterAll`: destroy the data source. Use a unique test email (e.g. `test-${Date.now()}@example.com`) to avoid conflicts across runs.

### Success Criteria:

#### Automated Verification:

- `npm install` completes without errors
- `npm run lint` passes
- `npx tsc --noEmit` passes — auth.ts, user.entity.ts, user.repository.ts type-check cleanly
- `npm run migration:generate src/migrations/CreateUserTable` produces a non-empty migration file (requires fresh DB with no `users` table)
- `npm run migration:run` applies the CreateUserTable migration without error
- `npm test` passes — user.repository integration tests green

#### Manual Verification:

- `auth.ts` exists at project root and exports `handlers`, `auth`, `signIn`, `signOut`
- `src/server/user/user.entity.ts` exists with `users` table, all 6 columns, all with explicit TypeORM `type` options
- `src/server/user/user.repository.ts` exports `findByEmail` and `createUser`
- Migration file exists in `src/migrations/`
- `npm run dev` starts without errors (no crashes on import of auth.ts or user.entity.ts)

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Sign-In, Sign-Up & Landing Pages

### Overview

Build the two auth UI pages (sign-in, sign-up) and update the landing page. Each page uses a Server Component / Client Component split: the Server Component reads async `searchParams`, the Client Component owns form state via `useActionState`. Server actions handle sign-in (wrapping `signIn()`) and registration (hash + create user + sign in).

### Changes Required:

#### 1. Login server action

**File**: `src/app/login/actions.ts` (new)

**Intent**: Server action wrapping Auth.js `signIn("credentials", ...)`. Returns an error string on auth failure; on success the redirect is thrown (which React/Next.js handles automatically — do not catch it).

**Contract**: `"use server"` directive. Export `loginAction(prevState: string | null, formData: FormData): Promise<string | null>`. Extract `email`, `password`, `callbackUrl` from `formData`. Call `signIn("credentials", { email, password, redirectTo: callbackUrl || "/" })` inside a try/catch. Catch only `AuthError` — return `"Invalid email or password."` for any `AuthError`. Re-throw all other errors (including NEXT_REDIRECT).

#### 2. Login form Client Component

**File**: `src/app/login/_components/login-form.tsx` (new)

**Intent**: Client Component that owns form state via React 19's `useActionState`, displaying an inline error message when the server action returns one.

**Contract**: `"use client"` directive. Props: `{ callbackUrl: string }`. Use `useActionState(loginAction, null)` — destructure `[error, formAction]`. Render a `<form action={formAction}>` with: hidden `callbackUrl` input, email input, password input, submit button, and — when `error` is non-null — an error paragraph with the error string. No navigation after success; the server action's redirect handles it.

#### 3. Login page

**File**: `src/app/login/page.tsx` (new)

**Intent**: Server Component that reads the async `callbackUrl` from `searchParams` and passes it to `LoginForm`.

**Contract**: `export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> })`. Await `searchParams`, extract `callbackUrl`. Render a centered layout with an `<h1>` and `<LoginForm callbackUrl={callbackUrl ?? "/"} />`.

#### 4. Register server action

**File**: `src/app/register/actions.ts` (new)

**Intent**: Server action that creates a new user account and immediately signs them in. Validates input, hashes the password, calls `createUser`, then calls `signIn` to establish a session.

**Contract**: `"use server"` directive. Export `registerAction(prevState: string | null, formData: FormData): Promise<string | null>`. Extract `email`, `password`, `name` from `formData`. Validate: email is non-empty valid email, password is at least 8 characters, name is non-empty — return a user-facing error string if validation fails. Hash password with `bcrypt.hash(password, 12)`. Call `createUser({ email, passwordHash, name })`. On success call `signIn("credentials", { email, password, redirectTo: "/" })` with the same re-throw pattern as `loginAction`. Catch TypeORM unique-constraint violations (check `error.message` contains `"duplicate key"` or use the TypeORM `QueryFailedError` type) and return `"An account with this email already exists."`.

#### 5. Register form Client Component

**File**: `src/app/register/_components/register-form.tsx` (new)

**Intent**: Client Component with three fields (name, email, password) using `useActionState` for inline error display.

**Contract**: `"use client"` directive. `useActionState(registerAction, null)`. Render form with name input, email input, password input (min length 8), submit button, and inline error paragraph. Add a link to `/login` for users who already have an account.

#### 6. Register page

**File**: `src/app/register/page.tsx` (new)

**Intent**: Thin Server Component wrapper that renders `RegisterForm`.

**Contract**: `export default function RegisterPage()`. Render a centered layout with an `<h1>` and `<RegisterForm />`. No `searchParams` needed (register always redirects to `/`).

#### 7. Landing page

**File**: `src/app/page.tsx` (update)

**Intent**: Replace the Next.js default scaffold with a minimal landing page for the app. Describes the app in one sentence; provides prominent sign-in and sign-up links.

**Contract**: Server Component. Import `auth` from `@/auth` and check `const session = await auth()`. If logged in, show a welcome message with the user's name and a note that the app is coming soon. If not logged in, show the app name, one-line description ("Browse your friends' bookshelves and borrow without the awkward ask."), and two links: `/login` and `/register`.

### Success Criteria:

#### Automated Verification:

- `npx tsc --noEmit` passes
- `npm run lint` passes

#### Manual Verification:

- Visit `/register` — form renders with name, email, password fields; submitting with valid data creates an account and redirects to `/`; submitting with a duplicate email shows inline error "An account with this email already exists."
- Visit `/login` — form renders; submitting with correct credentials signs in and redirects to callbackUrl or `/`; submitting with wrong credentials shows inline "Invalid email or password." without page reload
- Visit `/login?callbackUrl=%2Fbooks` — after successful sign-in, browser lands on `/books` (will show 404 — that's expected; the redirect happened)
- `/` landing page shows sign-in/sign-up links when not authenticated, and the user's name when authenticated

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Route Protection, Nav & Layout

### Overview

Add `middleware.ts` to enforce authentication on all non-public routes, create a session-aware nav Server Component, and update the root layout to include it. After this phase the app is fully gated.

### Changes Required:

#### 1. Route protection middleware

**File**: `middleware.ts` (project root, next to `auth.ts`)

**Intent**: Use Auth.js v5's `authorized` callback to redirect unauthenticated users from all protected routes to `/login`. Public routes: `/`, `/login`, `/register`, and anything under `/api/auth/`.

**Contract**: Export `auth` as default middleware:
```typescript
export default auth
```
Configure the `authorized` callback in `auth.ts` (add to the NextAuth config):
```typescript
callbacks: {
  authorized({ auth: session, request: { nextUrl } }) {
    const isLoggedIn = !!session?.user
    const publicPaths = ["/", "/login", "/register"]
    const isPublic =
      publicPaths.includes(nextUrl.pathname) ||
      nextUrl.pathname.startsWith("/api/auth/")
    if (!isPublic && !isLoggedIn) return false
    return true
  },
  // existing jwt and session callbacks remain
}
```
Export the middleware config matcher to skip Next.js internals:
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

#### 2. Session-aware nav Server Component

**File**: `src/app/_components/nav.tsx` (new)

**Intent**: Display the signed-in user's name and a sign-out button in the top nav. Uses `auth()` server-side to read the session — no client-side JavaScript needed.

**Contract**: `async` Server Component. Import `auth` and `signOut` from `@/auth`. Call `const session = await auth()`. If `session?.user`: render the user's `name` (or `email` as fallback) and a `<form>` with an inline server action calling `await signOut({ redirectTo: "/" })`; the form submits a button labeled "Sign out". If no session: render links to `/login` and `/register`. Minimal Tailwind styling: top bar with flex layout, padding, light background.

#### 3. Root layout update

**File**: `src/app/layout.tsx` (update)

**Intent**: Include `Nav` in the root layout so it appears on every page. Wrap `{children}` with the nav above it.

**Contract**: Import `Nav` from `@/app/_components/nav`. Add `<Nav />` immediately before `{children}` inside the `<body>`. No other layout changes.

### Success Criteria:

#### Automated Verification:

- `npx tsc --noEmit` passes
- `npm run lint` passes

#### Manual Verification:

- While signed out, navigate to any path that doesn't exist (e.g. `/books`) — browser redirects to `/login` with `?callbackUrl=%2Fbooks` in the URL
- `/`, `/login`, `/register` load without redirect when not signed in
- After signing in, nav shows the user's name and a "Sign out" button
- Clicking "Sign out" signs the user out and lands on `/`
- `/` shows the correct landing content (sign-in/up links when logged out, user name when logged in)
- `npm run dev` starts and the full flow (register → auto-sign-in → nav shows name → sign out → redirected to login when accessing protected route) works end-to-end

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before marking the change complete.

---

## Testing Strategy

### Integration Tests:

- `test/server/user/user.repository.spec.ts` — `createUser` and `findByEmail` against real Neon DB (Phase 1)

### Manual Testing Steps:

1. `npm run dev` — dev server starts without errors
2. Visit `/register` — create an account: name "Test User", email, password ≥8 chars — lands on `/`
3. Sign out via nav button — redirected to `/`
4. Visit `/login` — sign in with credentials — lands on `/`, nav shows "Test User"
5. Visit `/login` with wrong password — inline error "Invalid email or password."
6. While signed in, visit `/login?callbackUrl=%2Fbooks` — redirected directly to `/books` (404 expected)
7. Sign out; try navigating to `/books` directly — redirected to `/login?callbackUrl=%2Fbooks`
8. Visit `/` while signed out — landing page with sign-in/up links
9. Visit `/` while signed in — landing page shows user's name

## References

- Roadmap: `context/foundation/roadmap.md` (F-02)
- PRD: `context/foundation/prd.md` (FR-001, FR-002, Access Control)
- Auth.js v5 docs: https://authjs.dev/getting-started/installation
- Auth.js Credentials: https://authjs.dev/getting-started/authentication/credentials
- Auth.js Next.js reference: https://authjs.dev/reference/nextjs
- Prior plan: `context/changes/db-connection/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dependencies, Auth Config & User Foundation

#### Automated

- [x] 1.1 `npm install` completes without errors — 352a864
- [x] 1.2 `npm run lint` passes — 352a864
- [x] 1.3 `npx tsc --noEmit` passes — 352a864
- [x] 1.4 `npm run migration:run` applies CreateUserTable migration — 352a864
- [x] 1.5 `npm test` passes — user.repository integration tests green — 352a864

#### Manual

- [x] 1.6 `auth.ts` exists at project root and exports `handlers`, `auth`, `signIn`, `signOut` — 352a864
- [x] 1.7 `user.entity.ts` has `users` table with all 6 columns, all with explicit TypeORM type options — 352a864
- [x] 1.8 `user.repository.ts` exports `findByEmail` and `createUser` — 352a864
- [x] 1.9 Migration file exists in `src/migrations/` — 352a864
- [x] 1.10 `npm run dev` starts without errors — 352a864

### Phase 2: Sign-In, Sign-Up & Landing Pages

#### Automated

- [x] 2.1 `npx tsc --noEmit` passes — b4e84af
- [x] 2.2 `npm run lint` passes — b4e84af

#### Manual

- [x] 2.3 `/register` form creates account and redirects to `/` — b4e84af
- [x] 2.4 Duplicate email on `/register` shows inline error — b4e84af
- [x] 2.5 `/login` with correct credentials signs in and redirects — b4e84af
- [x] 2.6 `/login` with wrong credentials shows inline error without page reload — b4e84af
- [x] 2.7 `/login?callbackUrl=%2Fbooks` redirects to `/books` after sign-in — b4e84af
- [x] 2.8 `/` landing page shows correct content based on auth state — b4e84af

### Phase 3: Route Protection, Nav & Layout

#### Automated

- [x] 3.1 `npx tsc --noEmit` passes
- [x] 3.2 `npm run lint` passes

#### Manual

- [x] 3.3 Unauthenticated access to protected route redirects to `/login` with `callbackUrl`
- [x] 3.4 `/`, `/login`, `/register` load without redirect when signed out
- [x] 3.5 Nav shows user name and sign-out button when signed in
- [x] 3.6 Sign-out button signs user out and lands on `/`
- [x] 3.7 Full end-to-end flow (register → sign-in → nav → sign-out → redirect) works in `npm run dev`
