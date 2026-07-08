# Auth Scaffold (F-02) — Plan Brief

> Full plan: `context/changes/auth-scaffold/plan.md`

## What & Why

Wire Auth.js v5 (email+password credentials, JWT sessions) into the Next.js 15 App Router so every subsequent feature slice has an authenticated user context to work with. This is the last foundation piece before collection management, friend connections, and borrowing can be built. Without it, none of S-01 through S-05 can start.

## Starting Point

F-01 (db-connection) is complete: TypeORM + Neon `getDataSource()` singleton is in place, `src/server/**/*.entity.ts` glob is already wired. There is no auth library, no User entity, no sign-in UI, no middleware. The app has a bare layout and the Next.js default home page.

## Desired End State

A user can register with name + email + password, sign in, and sign out. All routes except `/`, `/login`, and `/register` redirect to sign-in when unauthenticated, with `callbackUrl` preserved. A session-aware nav in the root layout shows the signed-in user's name. The `users` table exists in Neon and can be migrated via `npm run migration:run`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| OAuth (Google/GitHub) | Deferred to v1.5 | Credentials path is independent; OAuth is additive with no rework needed | Plan |
| Auth.js TypeORM adapter | Deferred to OAuth slice | No adapter tables needed with credentials-only; avoids reconciling `users` table schemas now | Plan |
| Session strategy | JWT (forced) | Credentials + database sessions is broken by design in Auth.js v5 | Research |
| Password hashing | bcryptjs (cost 12) | Pure JS, no native bindings, standard choice for Next.js serverless | Research |
| Form error display | Inline via `useActionState` | User chose inline errors; requires Server/Client component split per page | Plan |
| Post-login redirect | `callbackUrl` | User wants to land on the page they were trying to reach | Plan |
| Nav component | Server Component in layout | Shows user name + sign-out; uses `auth()` server-side, no client JS needed | Plan |
| User entity fields | id, email, passwordHash, name, createdAt, updatedAt | PRD needs user identity for friend discovery and borrow requests | Plan |

## Scope

**In scope:** next-auth@beta install, auth.ts config, API route handler, User TypeORM entity + migration, user repository, `/login` and `/register` pages, landing page update, route protection middleware, session-aware nav in layout.

**Out of scope:** Google/GitHub OAuth, email verification, password reset, role-based access, `@auth/typeorm-adapter`, push/email notifications.

## Architecture / Approach

Auth.js v5 without an adapter. `auth.ts` at project root is the single config entry point. Credentials `authorize()` queries the TypeORM `users` table via `user.repository.findByEmail()`, verifies the bcryptjs hash, and returns `{ id, email, name }`. Auth.js wraps this in a signed JWT cookie. The `jwt` callback embeds `user.id`; the `session` callback surfaces it as `session.user.id`. Middleware uses the Auth.js `authorized` callback — returns `false` for unauthenticated requests to non-public paths, triggering automatic redirect to `/login?callbackUrl=<path>`. Sign-in/up pages use a Server Component (async searchParams) + Client Component (`useActionState`) split per Next.js 15 App Router conventions.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Dependencies, Auth Config & User Foundation | auth.ts wired, User entity + migration, user repository, integration tests | AUTH_SECRET must be in .env.local before app starts; migration:generate may be empty if synchronize already ran |
| 2. Sign-In, Sign-Up & Landing Pages | Working /login and /register UI, server actions, callbackUrl support | signIn() throws NEXT_REDIRECT on success — must re-throw non-AuthError exceptions |
| 3. Route Protection, Nav & Layout | middleware gates all non-public routes, nav shows session state | authorized callback in auth.ts must not accidentally protect /api/auth/* routes (Auth.js internals) |

**Prerequisites:** F-01 (db-connection) complete — TypeORM + Neon data source operational, `src/server/` scaffolded.
**Estimated effort:** ~2 sessions across 3 phases.

## Open Risks & Assumptions

- `users` table name will conflict with `@auth/typeorm-adapter`'s `users` table when OAuth is added in v1.5 — the OAuth slice will need a migration to align schemas or configure the adapter to use the existing entity.
- `synchronize: true` in dev may auto-create the `users` table before `migration:generate` is run, producing an empty migration. Mitigation: run `migration:generate` before first `npm run dev`, or drop the table manually first.
- Auth.js v5 is still in `@beta` — minor breaking changes between beta versions are possible; pin the version in `package.json` after install.

## Success Criteria (Summary)

- `/register` creates a user, `/login` authenticates them — full credentials loop works end-to-end
- Any non-public route visited while signed out redirects to `/login` with `callbackUrl` preserved
- Session-aware nav visible on every page showing the signed-in user's name
