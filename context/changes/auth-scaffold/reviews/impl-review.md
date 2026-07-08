<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: auth-scaffold (F-02) — post-fix

- **Plan**: context/changes/auth-scaffold/plan.md
- **Scope**: Full plan, 3 phases + post-review fixes
- **Date**: 2026-07-07
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 4 observations

## Automated Checks

| Check | Result |
|-------|--------|
| npx tsc --noEmit | PASS |
| npm run lint | PASS |
| npm run build | PASS (previously failing, now fixed) |
| npm test | PASS (verified at phase commits) |

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — migration hardcodes uuid_generate_v4() without extension guard

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/migrations/1783452029224-CreateUserTable.ts:7
- **Detail**: Migration uses DEFAULT uuid_generate_v4() which requires the uuid-ossp PostgreSQL extension. The migration already ran successfully on Neon (which has the extension), but any fresh DB without uuid-ossp will fail at migration:run with an obscure error. Postgres 13+ ships gen_random_uuid() built-in.
- **Fix A ⭐ Recommended**: Switch DEFAULT to gen_random_uuid() — no extension dependency, standard on PG 13+ including Neon.
  - Strength: No extension dependency; portable across all PG 13+.
  - Tradeoff: Existing DB unaffected; fresh DBs need the updated migration.
  - Confidence: HIGH — Neon uses PG 16, gen_random_uuid() is built-in.
  - Blind spot: Check no other migration references uuid_generate_v4().
- **Fix B**: Add `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` to up() — makes the dependency explicit rather than implicit.
  - Strength: No column change; forwards-compatible.
  - Tradeoff: Still an optional extension dependency.
  - Confidence: HIGH.
  - Blind spot: None significant.
- **Decision**: FIXED (Fix A — DEFAULT changed to gen_random_uuid())

### F2 — callbackUrl accepted from form without app-level validation

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/login/actions.ts:13-15
- **Detail**: callbackUrl flows from formData directly into signIn()'s redirectTo without an application-level guard. Auth.js v5 blocks external-origin redirects internally, so open-redirect is not currently exploitable. Risk is reliance on framework internals.
- **Fix**: Add guard: `if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) callbackUrl = "/";`
- **Decision**: FIXED

### F3 — test teardown diverges from established isInitialized guard pattern

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: test/server/user/user.repository.spec.ts:afterAll
- **Detail**: data-source.spec.ts guards teardown with isInitialized before calling destroy(). The new test calls getDataSource() + destroy() unconditionally — if initialization failed, afterAll throws too, masking the real failure.
- **Fix**: Store DataSource in suite-scoped variable; check isInitialized before destroy().
- **Decision**: FIXED

### F4 — integration test data accumulates in Neon DB without cleanup

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: test/server/user/user.repository.spec.ts
- **Detail**: Each run inserts a unique user row (via Date.now() email) but never deletes it. No active breakage, but data accumulates across runs.
- **Fix**: Add afterAll cleanup: delete the created user by testEmail before destroying the DataSource.
- **Decision**: FIXED

### F5 — plan letter overstated "all 6 columns with explicit type:" — specialized decorators correctly omit it

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/server/user/user.entity.ts
- **Detail**: @PrimaryGeneratedColumn("uuid"), @CreateDateColumn(), @UpdateDateColumn() don't carry type: — correctly so. The SWC constraint applies only to @Column() where TypeORM relies on reflect-metadata. Specialized decorators encode type in their name. Implementation is correct; plan wording was overly conservative.
- **Fix**: Accept/dismiss — plan wording artifact, not a code defect.
- **Decision**: ACCEPTED-AS-RULE (lesson saved; plan wording updated to be precise)
