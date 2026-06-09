# DB Connection (F-01) Implementation Plan

## Overview

Install TypeORM and the PostgreSQL driver, configure a data source singleton safe for Next.js App Router serverless, scaffold the `src/server/` and `src/migrations/` directories, set up jest with ts-jest, and verify connectivity to Neon PostgreSQL via an integration test. This is the foundation slice — every subsequent change (auth, collections, loans) depends on it.

## Current State Analysis

The project has Next.js 15 (App Router), TypeScript strict mode, Tailwind CSS v4, and is deployed to Vercel (region cdg1). Neon PostgreSQL credentials are already in `.env.local` — both the pooled URL (`DATABASE_URL`) and the direct unpooled URL (`DATABASE_URL_UNPOOLED`). No ORM, no DB driver, no test tooling, and no `src/server/` directory exist yet.

## Desired End State

After this plan completes:
- `npm install` succeeds with TypeORM, pg, reflect-metadata, jest, ts-jest, tsx, and dotenv installed.
- `npx tsc --noEmit` passes with `experimentalDecorators: true` in tsconfig.
- `src/lib/data-source.ts` exports a `getDataSource()` function that returns an initialized TypeORM DataSource using `DATABASE_URL`.
- `src/lib/data-source-cli.ts` exports a default DataSource using `DATABASE_URL_UNPOOLED` for CLI use.
- `src/server/` and `src/migrations/` directories exist and are tracked.
- `npm run migration:run` executes without error (no migrations to apply is acceptable).
- `npm test` runs and passes — the integration test confirms the data source initializes and a `SELECT 1` query returns successfully.

### Key Discoveries:

- `DATABASE_URL` (pooled, PgBouncer) and `DATABASE_URL_UNPOOLED` (direct connection) are already present in `.env.local` — the split is already there; we just need to use the right URL in each context.
- `tsconfig.json` uses `"module": "esnext"` + `"moduleResolution": "bundler"` — these are Next.js App Router settings that `ts-node` doesn't understand, making `tsx` the correct CLI runner for TypeORM.
- AGENTS.md naming convention (`<feature>.<role>.ts`) applies to DTOs and utils; infrastructure modules like the data source follow conventional names.
- `src/server/` is defined in AGENTS.md as `src/server/<feature>/service.ts + repository.ts` — the directory structure is expected but not yet created.

## What We're NOT Doing

- Installing or configuring Auth.js / session management (F-02)
- Defining any domain entities (User, Book, Loan) — this change scaffolds the entities pattern; entities are added per-slice
- Running any migrations — no schema exists yet; `synchronize: true` in dev covers early development
- Setting up MSW or TanStack Query (separate concerns, noted in AGENTS.md as "not yet installed")
- Adding a test API route (`/api/db-check`) — the integration test covers verification

## Implementation Approach

Three phases: (1) install all packages and update TypeScript/jest config, (2) create the data source files and project scaffold, (3) write and run the integration test. The data source uses a Node.js `global` variable pattern to survive Next.js hot-module replacement in development. The TypeORM CLI uses a separate data source config pointing at the unpooled URL so DDL migrations bypass PgBouncer.

## Critical Implementation Details

**SWC does not support `emitDecoratorMetadata`** — Next.js 15 compiles with SWC, which honours `experimentalDecorators: true` (enabling the decorator syntax) but does NOT emit TypeScript type metadata. As a result, TypeORM cannot auto-infer column types from TypeScript types. Every `@Column()` decorator on every entity in every subsequent slice **must** explicitly declare its TypeORM type (e.g. `@Column({ type: 'varchar' })`). Omitting the type will cause TypeORM to throw at runtime. This constraint applies to all future entities; document it in AGENTS.md after this change lands.

**Global singleton for Next.js hot reload** — in development, Next.js re-evaluates modules on each hot reload, which resets module-level variables. Storing the DataSource on the Node.js `global` object preserves the connection across reloads and prevents "too many clients" errors on Neon's connection limit.

---

## Phase 1: Dependencies & TypeScript/Jest Configuration

### Overview

Install all required packages and update the two config files that control TypeScript compilation and jest execution. No source files change in this phase — only config and package manifest.

### Changes Required:

#### 1. Package dependencies

**File**: `package.json`

**Intent**: Add TypeORM, the PostgreSQL driver, and reflect-metadata as runtime dependencies; add jest, ts-jest, @types/pg, @types/jest, dotenv, and tsx as dev dependencies.

**Contract**: Under `"dependencies"`: `typeorm`, `pg`, `reflect-metadata`. Under `"devDependencies"`: `jest`, `ts-jest`, `@types/jest`, `@types/pg`, `dotenv`, `tsx`. Exact versions resolved by `npm install`.

#### 2. TypeScript config — enable decorators

**File**: `tsconfig.json`

**Intent**: Enable the experimental decorator syntax that TypeORM's `@Entity`, `@Column`, and `@PrimaryGeneratedColumn` decorators require.

**Contract**: Add `"experimentalDecorators": true` to `compilerOptions`. Do **not** add `emitDecoratorMetadata` — SWC does not support it; explicit column types are required on all entities instead (see Critical Implementation Details).

#### 3. Jest configuration

**File**: `jest.config.ts` (new)

**Intent**: Configure jest to use ts-jest for TypeScript transformation, target the node environment (no DOM needed for DB tests), and resolve the `@/*` path alias to match tsconfig.

**Contract**: `preset: 'ts-jest'`, `testEnvironment: 'node'`, `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`, `testMatch: ['<rootDir>/test/**/*.spec.ts']`, `setupFiles: ['<rootDir>/test/setup.ts']`.

#### 4. Test environment setup

**File**: `test/setup.ts` (new)

**Intent**: Load `.env.local` before any test runs so the integration test can read `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

**Contract**: Import `dotenv` and call `config({ path: '.env.local' })`. This file is referenced by `jest.config.ts`'s `setupFiles` array.

### Success Criteria:

#### Automated Verification:

- `npm install` completes without errors
- `npx tsc --noEmit` passes (no type errors introduced by new config)
- `npm run lint` passes

#### Manual Verification:

- `package.json` `dependencies` contains `typeorm`, `pg`, `reflect-metadata`
- `package.json` `devDependencies` contains `jest`, `ts-jest`, `@types/jest`, `@types/pg`, `dotenv`, `tsx`
- `tsconfig.json` contains `"experimentalDecorators": true`
- `jest.config.ts` exists at project root

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Data Source & Project Scaffold

### Overview

Create the data source files, add npm scripts for TypeORM CLI and jest, and create the `src/migrations/` and `src/server/` directories. After this phase, the project has working TypeORM infrastructure and the CLI can generate/run migrations.

### Changes Required:

#### 1. App data source singleton

**File**: `src/lib/data-source.ts` (new)

**Intent**: Export a `getDataSource()` function that returns an initialized TypeORM DataSource using the pooled `DATABASE_URL`. The singleton must survive Next.js hot-module replacement in development by storing the instance on `global`.

**Contract**: The exported function signature is `export async function getDataSource(): Promise<DataSource>`. Internally it checks `global._typeormDataSource`, creates a new DataSource if absent, and calls `initialize()` if not yet initialized. DataSource config: `type: 'postgres'`, `url: process.env.DATABASE_URL`, `synchronize: process.env.NODE_ENV === 'development'`, `entities: []` (empty array — populated as entities are added per slice), `migrations: ['src/migrations/*.ts']`. The `global` augmentation pattern:

```typescript
const g = global as typeof global & { _typeormDataSource?: DataSource };
```

#### 2. CLI data source config

**File**: `src/lib/data-source-cli.ts` (new)

**Intent**: Provide a TypeORM DataSource for CLI use (migration:generate, migration:run, migration:revert). Uses `DATABASE_URL_UNPOOLED` to bypass PgBouncer, which blocks the DDL introspection queries TypeORM migration tooling requires.

**Contract**: `import 'reflect-metadata'` at the top. Default export: `new DataSource({ type: 'postgres', url: process.env.DATABASE_URL_UNPOOLED, synchronize: false, entities: ['src/server/**/*.entity.ts'], migrations: ['src/migrations/*.ts'] })`. Default export is required — TypeORM CLI looks for it.

#### 3. Project directories

**Files**: `src/migrations/.gitkeep`, `src/server/.gitkeep` (both new)

**Intent**: Create the migration and server directories so they exist in git and future slices can add files without separate directory-creation steps.

**Contract**: Empty `.gitkeep` files. TypeORM CLI will write generated migration files into `src/migrations/`; feature services and repositories go under `src/server/<feature>/`.

#### 4. npm scripts — TypeORM CLI and jest

**File**: `package.json`

**Intent**: Wire the TypeORM CLI (via `tsx` to avoid ts-node ESM/CJS conflicts with the Next.js tsconfig) and expose migration and test commands.

**Contract**: Add to `"scripts"`:
- `"typeorm": "tsx node_modules/typeorm/cli.js"` — base CLI command
- `"migration:generate": "npm run typeorm -- migration:generate -d src/lib/data-source-cli.ts"`
- `"migration:run": "npm run typeorm -- migration:run -d src/lib/data-source-cli.ts"`
- `"migration:revert": "npm run typeorm -- migration:revert -d src/lib/data-source-cli.ts"`
- `"test": "jest"`
- `"test:watch": "jest --watch"`

### Success Criteria:

#### Automated Verification:

- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm run migration:run` completes without error (no migrations to apply is acceptable output)

#### Manual Verification:

- `src/lib/data-source.ts` exists and exports `getDataSource`
- `src/lib/data-source-cli.ts` exists with a default export
- `src/migrations/` and `src/server/` directories exist in the file tree
- Running `npm run typeorm -- --help` prints the TypeORM CLI help text

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Integration Test & Verification

### Overview

Write the integration test that proves the data source initializes and the application can talk to Neon PostgreSQL. Running `npm test` green is the acceptance gate for this entire change.

### Changes Required:

#### 1. Data source integration test

**File**: `test/lib/data-source.spec.ts` (new)

**Intent**: Verify that `getDataSource()` returns an initialized DataSource and that a live query against Neon succeeds. This is an integration test — it hits the real database.

**Contract**: One `describe('getDataSource')` block with two `it` cases: (1) `'initializes the data source'` — calls `getDataSource()`, asserts `dataSource.isInitialized === true`; (2) `'can execute a query'` — runs `dataSource.query('SELECT 1')`, asserts the result is truthy. After all tests, close the data source with `afterAll(() => dataSource.destroy())`.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0 — both test cases pass
- `npx tsc --noEmit` still passes

#### Manual Verification:

- Test output shows the two passing cases under `getDataSource`
- No "too many clients" or SSL errors in the test run output
- `npm run dev` starts without error (data source initializes on first request if tested via browser)

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before marking the change complete.

---

## Testing Strategy

### Integration Tests:

- `test/lib/data-source.spec.ts` — data source initialization and live query (this change)
- Each subsequent slice adds `test/server/<feature>/<feature>.spec.ts` for its service/repository

### Manual Testing Steps:

1. Run `npm test` — both cases in `data-source.spec.ts` must be green
2. Run `npm run dev` and confirm the dev server starts without DB errors
3. Run `npm run migration:run` — should print "No migrations are pending" or succeed silently
4. Run `npm run typeorm -- migration:generate src/migrations/SmokeTest` (optional) — confirms CLI can generate a file

## Performance Considerations

The `getDataSource()` singleton with the `global` pattern ensures at most one connection pool per Node.js process regardless of how many server components or route handlers import it. PgBouncer (pooled URL) further reduces actual TCP connections to Neon.

## References

- Roadmap: `context/foundation/roadmap.md` (F-01)
- AGENTS.md: project structure, naming conventions, test rules

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dependencies & TypeScript/Jest Configuration

#### Automated

- [x] 1.1 `npm install` completes without errors
- [x] 1.2 `npx tsc --noEmit` passes
- [x] 1.3 `npm run lint` passes

#### Manual

- [x] 1.4 `package.json` dependencies contain typeorm, pg, reflect-metadata
- [x] 1.5 `package.json` devDependencies contain jest, ts-jest, @types/jest, @types/pg, dotenv, tsx
- [x] 1.6 `tsconfig.json` contains `experimentalDecorators: true`
- [x] 1.7 `jest.config.ts` exists at project root

### Phase 2: Data Source & Project Scaffold

#### Automated

- [ ] 2.1 `npx tsc --noEmit` passes
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `npm run migration:run` completes without error

#### Manual

- [ ] 2.4 `src/lib/data-source.ts` exists and exports `getDataSource`
- [ ] 2.5 `src/lib/data-source-cli.ts` exists with a default export
- [ ] 2.6 `src/migrations/` and `src/server/` directories exist
- [ ] 2.7 `npm run typeorm -- --help` prints TypeORM CLI help

### Phase 3: Integration Test & Verification

#### Automated

- [ ] 3.1 `npm test` exits 0 — both test cases pass
- [ ] 3.2 `npx tsc --noEmit` still passes

#### Manual

- [ ] 3.3 Test output shows two passing cases under `getDataSource`
- [ ] 3.4 No SSL or connection errors in test run output
- [ ] 3.5 `npm run dev` starts without DB errors
