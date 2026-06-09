# DB Connection (F-01) — Plan Brief

> Full plan: `context/changes/db-connection/plan.md`

## What & Why

Install TypeORM and the PostgreSQL driver so the app can talk to Neon PostgreSQL. This is the foundation slice — nothing else (auth, collections, loans) can be built until a working, schema-managed database connection exists.

## Starting Point

Next.js 15 App Router scaffold with no ORM, no DB driver, no test tooling, and no `src/server/` directory. Neon PostgreSQL credentials are already in `.env.local` (both pooled and unpooled URLs).

## Desired End State

`npm test` passes with a live integration test confirming TypeORM can initialize and query Neon. `npm run migration:run` works. `src/lib/data-source.ts`, `src/server/`, and `src/migrations/` exist and are ready for F-02 to add the User entity.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Entity syntax | Decorator-based | Most idiomatic TypeORM; aligns with how F-02–S-05 entities will be written. |
| Dev synchronize | `true` in dev, `false` in prod | Zero migration boilerplate while the schema is still forming across 7 slices. |
| Migration tooling | TypeORM CLI via `tsx` | `tsx` bypasses ts-node's incompatibility with `"moduleResolution": "bundler"` in tsconfig. |
| App runtime URL | `DATABASE_URL` (pooled) | PgBouncer reduces connection overhead on Vercel serverless invocations. |
| CLI migration URL | `DATABASE_URL_UNPOOLED` | PgBouncer blocks the DDL introspection queries TypeORM migration generation requires. |
| Verification | jest integration test | Establishes test infra early so every subsequent slice can add tests immediately. |
| Entity location | `src/server/<feature>/<feature>.entity.ts` | Co-located with service/repository per AGENTS.md structure. |

## Scope

**In scope:**
- Install typeorm, pg, reflect-metadata, jest, ts-jest, @types/pg, @types/jest, dotenv, tsx
- `tsconfig.json` — add `experimentalDecorators: true`
- `jest.config.ts` + `test/setup.ts` (dotenv for test env)
- `src/lib/data-source.ts` — app singleton (pooled URL, global pattern)
- `src/lib/data-source-cli.ts` — CLI data source (unpooled URL, default export)
- `src/migrations/` and `src/server/` directories
- TypeORM CLI npm scripts + jest scripts
- Integration test: `test/lib/data-source.spec.ts`

**Out of scope:**
- Any domain entities (User, Book, Loan) — added per slice starting F-02
- Auth.js / session setup (F-02)
- MSW, TanStack Query setup (separate concerns)
- Running any schema migrations (no schema yet)

## Architecture / Approach

Two TypeORM data source configs: one singleton for the app (pooled URL, lazy init via `global` pattern, `synchronize: true` in dev) and one for the TypeORM CLI (unpooled URL, default export). All application code calls `getDataSource()` which initializes once and reuses the connection. The `global._typeormDataSource` pattern prevents re-initialization on Next.js hot-module replacement.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Dependencies & TS/Jest config | All packages installed, `experimentalDecorators` enabled, jest configured | ts-jest version compatibility with TypeScript 5 |
| 2. Data source & scaffold | Working data source files, migration CLI, project directories | `tsx` resolving TypeORM CLI path correctly |
| 3. Integration test | `npm test` green, live Neon connectivity confirmed | SSL config or env var not loaded in test environment |

**Prerequisites:** `.env.local` with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (already present)
**Estimated effort:** ~1 session across 3 phases

## Open Risks & Assumptions

- `emitDecoratorMetadata` is NOT added to tsconfig (SWC doesn't support it) — all entity `@Column()` decorators across future slices must explicitly declare their TypeORM type or TypeORM will throw at runtime.
- TypeORM 0.3.x is the assumed version; 0.2.x has a different CLI and decorator API.
- `dotenv` in `test/setup.ts` reads `.env.local` — assumes the file is present locally; CI environments should supply vars via environment secrets.

## Success Criteria (Summary)

- `npm test` passes — integration test confirms live connectivity to Neon
- `npm run migration:run` runs without error
- `npx tsc --noEmit` passes with new tsconfig flags
