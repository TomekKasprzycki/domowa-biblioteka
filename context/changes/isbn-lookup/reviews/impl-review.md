<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-07 ISBN Lookup

- **Plan**: context/changes/isbn-lookup/plan.md
- **Scope**: Full plan (Phases 1-3)
- **Date**: 2026-08-19
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Method

Two parallel sub-agents (plan-drift detection, safety/quality/pattern scan) read every file in
`git diff --name-only ba95379..HEAD` (20 files, matching the plan's file list exactly across all
three phases) against the plan's per-file contracts and the "What We're NOT Doing" guardrails.
Success criteria (`npx tsc --noEmit`, `npm run lint`, `git diff package.json`, `npm test`) were
re-run directly rather than trusted from the phase rituals.

**Plan drift**: all 20 changed files MATCH their plan contract. No DRIFT, no MISSING, no EXTRA.
Every "pay special attention" requirement (normaliser checksum logic, entity column shape,
migration content, repository/action isbn handling, gateway contract incl. edge-runtime
exclusion, route handler, types, client mapper, form controlled/uncontrolled split and
confirmation gate, modal dirty-check fix, comment rewrites) verified true in code. Every
guardrail held: no `isbn` leak into `book-row.tsx`/`page.tsx`/`edit-book-modal.tsx`/`/discover`,
`updateBook` untouched, no service layer created, no msw/jest.config change, no caching, no
rate-limiting.

**Safety/quality/pattern**: no CRITICAL or WARNING. Gateway never throws (every failure path
returns `null` explicitly); `AbortSignal.timeout` genuinely wired into the fetch call; server-side
re-validation via `normalizeIsbn` in `actions.ts` is independent of the client's own check;
lookup results render through auto-escaped JSX, no `dangerouslySetInnerHTML`. Route handler and
gateway match existing repo conventions (auth pattern from `actions.ts`, thin route handler like
the NextAuth catch-all).

## Findings

### F1 — Gateway doesn't defensively URL-encode the ISBN

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/server/book/openlibrary.gateway.ts:11-12
- **Detail**: `normalizedIsbn` is interpolated directly into the request URL with no
  `encodeURIComponent`. Safe today because the only caller (`route.ts`) always passes a value
  that already survived `normalizeIsbn`, which only returns strings matching `^\d{9}[\dX]$` or
  `^\d{13}$` — no characters need encoding. The gateway itself doesn't defend against this
  independent of caller discipline.
- **Fix**: Wrap with `encodeURIComponent(normalizedIsbn)` when building the URL.
- **Decision**: FIXED — bibkey now built as `encodeURIComponent(\`ISBN:${normalizedIsbn}\`)`; gateway spec's URL assertion updated to match.

### F2 — /api/isbn's 401 check is unreachable from the browser (by design)

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/app/api/isbn/route.ts:8-9, src/app/collection/isbn-lookup.client.ts:15-17
- **Detail**: Middleware redirects unauthenticated requests to `/login` before the route handler
  ever runs, so the explicit `auth()` 401 check only matters for non-browser callers — this is
  exactly what the plan intended as defence-in-depth, and both sides are well-commented.
  Flagging only so it's confirmed reviewed, not because anything is broken.
- **Fix**: None needed — working as designed.
- **Decision**: REVIEWED / NO-OP — confirmed intentional defence-in-depth, no code change.

### F3 — Unexpected non-JSON bodies are folded into "unauthenticated"

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/collection/isbn-lookup.client.ts:20-24
- **Detail**: A 200 response whose body fails JSON parsing for a reason unrelated to the
  `/login` redirect (e.g. a malformed proxy response) maps to `"unauthenticated"`, showing
  "Your session has expired..." even when the real cause is unrelated. Narrow edge case; the
  form stays fully usable manually either way.
- **Fix**: Could add a fourth "unknown-error" status with neutral copy, but given how narrow the
  trigger is, skipping is reasonable too.
- **Decision**: FIXED — added `IsbnLookupResult` variant `{ status: "error" }`; `lookupIsbn` now
  distinguishes a non-redirected unparseable body (`error`) from a redirected one
  (`unauthenticated`); `AddBookForm` shows "Something went wrong. Type the details in manually."
  for it. New form spec case added; client-wrapper spec's unparseable-body case updated to assert
  `error` instead of `unauthenticated`.
