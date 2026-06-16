<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: DB Connection (F-01)

- **Plan**: context/changes/db-connection/plan.md
- **Scope**: All 3 phases (complete)
- **Date**: 2026-06-16
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

Gates: `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm test` ✅ (2/2 against live Neon).

## Findings

### F1 — Race condition in data source lazy-init singleton

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/data-source.ts:18-24
- **Detail**: Two concurrent getDataSource() calls on a cold module can both pass the `!isInitialized` guard and call initialize() twice — realistic under App Router concurrent requests. A failed initialize() also leaves g._typeormDataSource set-but-uninitialized, so the next call re-enters initialize() on a half-built instance.
- **Fix**: Cache the in-flight initialize() promise on the global and await that; clear the cached instance on init failure.
  - Strength: One global handles both the race and the failed-init retry; matches the singleton intent the plan states.
  - Tradeoff: A few extra lines around the global; slightly less obvious than current straight-line code.
  - Confidence: HIGH — standard memoized-promise pattern.
  - Blind spot: Neon cold-start concurrency in this app is unmeasured; the race may be rare in practice.
- **Decision**: FIXED — memoized-promise pattern applied to getDataSource()

### F2 — App vs. CLI data source entities mismatch

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/lib/data-source.ts:12 vs src/lib/data-source-cli.ts:11
- **Detail**: App data source uses `entities: []`; the CLI uses `entities: ['src/server/**/*.entity.ts']`. The plan specified this split deliberately, but it means the app runtime will not register entities — getRepository() will fail the moment the first entity lands, even though CLI migration generation works. Latent today (src/server/ holds only .gitkeep). Plan-level defect, not implementation drift.
- **Fix A ⭐ Recommended**: Point the app data source at the same `'src/server/**/*.entity.ts'` glob (or share one options object).
  - Strength: App runtime resolves repositories; removes a guaranteed future break; single source of truth for entities.
  - Tradeoff: App eagerly globs the filesystem at init — fine under tsx/dev, verify it resolves post-`next build`.
  - Confidence: HIGH — standard single-config TypeORM setup.
  - Blind spot: Whether the compiled-output path resolves the same glob in production isn't yet verified (see F3).
- **Fix B**: Leave as-is; align entities in the slice that adds the first entity (F-02 auth).
  - Strength: No change now; keeps this change minimal.
  - Tradeoff: Ships a known footgun; next author must remember the mismatch or hit a confusing repository error.
  - Confidence: MEDIUM — depends on the next author catching it.
  - Blind spot: Easy to forget once this change is archived.
- **Decision**: FIXED via Fix A — entities: [] changed to glob 'src/server/**/*.entity.ts'

### F3 — App data source migrations glob won't resolve in prod build

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/lib/data-source.ts:13
- **Detail**: `migrations: ['src/migrations/*.ts']` is a .ts glob resolved against CWD at runtime. After `next build` (bundled, no tsx) it matches nothing. Harmless today because migrations run only via the CLI data source — the app data source never executes them — but it's dead/misleading config on the runtime path.
- **Fix**: Drop `migrations` from the app data source; keep migration execution in data-source-cli.ts only.
- **Decision**: FIXED — removed migrations key from app data source; kept in data-source-cli.ts only

### F4 — Unplanned test tooling additions

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: test/tsconfig.json, jest.config.ts:6-8,13
- **Detail**: test/tsconfig.json (jest/node types for specs), a ts-jest `transform` override, and `modulePathIgnorePatterns: ['<rootDir>/.open-next/']` were added beyond the plan. All benign and supportive of the planned test setup — not new product surface — but undocumented in the plan.
- **Fix**: Note the test/tsconfig.json + jest transform as a one-line plan addendum so future reviews treat the plan as ground truth.
- **Decision**: FIXED — added addendum in plan.md Phase 1

### F5 — SSL depends on implicit sslmode in the connection string

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/data-source.ts (no explicit ssl option)
- **Detail**: Neither data source sets an explicit `ssl` option; SSL works only because `.env.local` carries `sslmode=require`. The test run emitted a real pg warning: 'require'/'prefer' will lose verify-full semantics in pg v9. If a future env omits sslmode, the connection silently drops to non-SSL.
- **Fix**: Assert sslmode is present, or set an explicit `ssl: { rejectUnauthorized: true }` so SSL isn't env-dependent.
- **Decision**: FIXED — added ssl: { rejectUnauthorized: true } to both data sources
