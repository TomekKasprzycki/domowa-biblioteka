<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Friend Connections (S-02)

- **Plan**: `context/changes/friend-connections/plan.md`
- **Mode**: Deep
- **Date**: 2026-07-15
- **Verdict**: REVISE → **SOUND** (after triage; all 5 findings resolved)
- **Findings**: 2 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict (at review) | After fixes |
|-----------|---------------------|-------------|
| End-State Alignment | FAIL | PASS |
| Lean Execution | PASS | PASS |
| Architectural Fitness | WARNING | PASS |
| Blind Spots | FAIL | PASS |
| Plan Completeness | PASS | PASS |

## Grounding

6/6 paths ✓, 5/5 symbols ✓, brief↔plan ✓, Progress↔Phase ✓ (3 phases, 27 criteria, all mapped, zero stray checkboxes). No `docs/reference/contract-surfaces.md` — surface check skipped.

## Findings

### F1 — Phase 3 consumes relation data Phase 1 never loads

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 1 item 4 ↔ Phase 3 item 1
- **Detail**: Phase 1's finder contracts specified only WHERE + ordering, no relation loading. Phase 3's `page.tsx` contract resolves "the other user" via loaded `requester`/`addressee` relations. Without `relations: {...}` TypeORM leaves those properties `undefined`; the entity declares them non-nullable (`requester!: UserEntity`), so `tsc --noEmit` (Phase 3's only automated criterion) passes and the page throws `TypeError` on first render. No query in this codebase loads a relation today — `BookEntity.owner` is declared but never used, so there was zero in-repo precedent behind the assumption.
- **Fix A ⭐ Recommended**: Specify relations per-function in Phase 1 (received→`requester`, sent→`addressee`, friends→both) + Phase 1 tests asserting relations populate.
  - Strength: Loads exactly what each caller uses; makes Phase 3's mapping total.
  - Tradeoff: Three slightly different contracts rather than one uniform rule.
  - Confidence: HIGH — verified against TypeORM 1.0.0 FindOneOptions (relations + array-OR both supported on string lookup).
  - Blind spot: First relation load in this codebase — hence the explicit test.
- **Fix B**: Skip relations; join to users explicitly / return a DTO.
- **Decision**: FIXED via Fix A — per-function `relations` added to all three finders; new "Relation loading is mandatory and unverified by the type system" entry in Critical Implementation Details; Phase 1 test contract now asserts relation objects populate.

### F2 — `synchronize: true` in dev will silently void the migration

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 items 2–3
- **Detail**: `src/lib/data-source.ts:15` sets `synchronize: process.env.NODE_ENV === "development"`; `next dev` sets NODE_ENV=development. Once `FriendConnectionEntity` joins the `entities` array, a running dev server DDL-creates `friend_connections` with no migration involved. `migration:generate` diffs metadata against the live DB, and `.env.local`'s `DATABASE_URL` / `DATABASE_URL_UNPOOLED` are pooled/unpooled endpoints for the *same* Neon database — so the diff comes back empty, no migration file is written, `migration:run` trivially passes against a synchronize-created table, and `migration:revert` has nothing to revert. Production (`synchronize: false`) would receive the schema with no migration backing it.
- **Fix**: Add explicit ordering constraint (stop dev server → write entity → generate → run → restart dev).
- **Decision**: FIXED — new "Stop the dev server before generating the migration" entry in Critical Implementation Details; Phase 1 item 3 contract restated; new automated criterion 1.3 verifying the migration file actually exists on disk.

### F3 — Unique constraint doesn't enforce the invariant it implies

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details; Phase 1 items 1 & 4
- **Detail**: `@Unique(["requesterId","addresseeId"])` is unique on the *ordered* tuple, so `(A,B)` and `(B,A)` coexist — it cannot express "at most one connection per pair". The invariant rested entirely on `findConnectionBetween`'s check-then-act with no lock: concurrent mutual invites → both find nothing → both insert → two rows per pair. Then `findConnectionBetween`'s unordered `findOne` returns an arbitrary row (non-deterministic branching), and the rejected-row flip hits a genuine `23505` that Phase 2 mistranslated as "You've already sent an invitation to this user" — a misleading message for corrupted state, wedging the pair with no in-app recovery. The brief accepted the race but not this consequence. S-03/S-04 query this table for access-control decisions.
- **Fix A ⭐ Recommended**: Unique expression index on `(LEAST(requesterId,addresseeId), GREATEST(requesterId,addresseeId))`.
  - Strength: Makes the pair invariant DB-enforced rather than check-then-act; `findConnectionBetween`'s single-row assumption becomes guaranteed.
  - Tradeoff: Requires a hand-written index in the migration (bends "do not hand-write the SQL").
  - Confidence: MED — standard Postgres pattern, unverified against this project's generation flow.
  - Blind spot: Flip path vs. index — asserted in a test.
- **Fix B**: Keep as-is; fix only the mistranslation.
- **Decision**: FIXED via Fix A — `@Unique` removed from the entity contract with rationale; canonical-pair expression index hand-added to the migration as a sanctioned exception; new Critical Implementation Details entry; `sendInvite`'s `23505` handling now re-reads and reports by status; two new test contracts (flip doesn't collide; direct reverse-direction insert is rejected by the DB).

### F4 — `isDuplicateError` is module-private; "reuse verbatim" is impossible

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Key Discoveries; Phase 2 item 1
- **Detail**: The plan claimed `friends/actions.ts` reuses `isDuplicateError` "verbatim". It's declared without `export` at `src/app/collection/actions.ts:23`, and `src/lib/` has no shared error-util module. The implementer would have to either copy-paste it (duplication the plan didn't sanction) or extract it and edit `collection/actions.ts` — an out-of-scope S-01 file listed in no phase. The plan authorized neither.
- **Fix A ⭐ Recommended**: Extract to `src/lib/db-error.utils.ts` in Phase 2.
  - Strength: Matches the `<function-name>.utils.ts` convention (`generate-id.utils.ts` precedent); one definition can't drift.
  - Tradeoff: Touches just-merged S-01 code; needs regression gate.
  - Confidence: HIGH — mechanical extract, existing tests cover the caller.
  - Blind spot: None significant.
- **Fix B**: Copy the helper into `friends/actions.ts`.
- **Decision**: FIXED via Fix A — new Phase 2 item 1 covering the extract, the `collection/actions.ts` edit, and a spec for the shared helper; Key Discoveries corrected; two new automated criteria (`db-error.utils` tests, `collection/actions` regression).

### F5 — Sent/received finders would over-fetch if relations are uniform

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 1 item 4
- **Detail**: Raised only as a hedge in case F1 resolved via Fix B. `findPendingReceived` needs only `requester`, `findPendingSent` only `addressee` — the other party is always the session user. A blanket "load both" rule would join `users` twice per row for nothing.
- **Fix**: Covered by F1 Fix A.
- **Decision**: NO CHANGE NEEDED — F1 Fix A's per-function contracts already load exactly what each caller uses.
