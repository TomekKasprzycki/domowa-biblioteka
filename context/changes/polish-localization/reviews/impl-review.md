<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-13 Polish Localization

- **Plan**: context/changes/polish-localization/plan.md
- **Scope**: All 7 phases (full plan)
- **Date**: 2026-09-04
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Missed reuse of design.html's established empty-search copy

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/app/(app)/discover/_components/discover-search.tsx:70
- **Detail**: design.html:784 already establishes "Brak książek pasujących do szukanej frazy." for exactly this no-search-results scenario. The plan's Key Discoveries explicitly calls for reusing mockup vocabulary verbatim wherever a surface matches, but the shipped code uses a generic "Nic tu nie ma..." instead — losing the more specific, already-approved copy. No spec asserts this string, so fixing it is safe.
- **Fix**: Replace `Nic tu nie ma...` with `Brak książek pasujących do szukanej frazy.` to match the mockup exactly.
- **Decision**: FIXED

### F2 — "Email" field label not translated to "E-mail"

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/login/_components/login-form.tsx:21 (also src/app/register/_components/register-form.tsx:17 and src/app/forgot-password/_components/forgot-password-form.tsx:18)
- **Detail**: Plan's Phase 7 intent explicitly lists "Email" among the field labels to translate. The friends invite form already established "E-mail znajomego" elsewhere in this same sweep, so the bare English word "Email" reads inconsistently against that precedent.
- **Fix**: Change `label="Email"` to `label="E-mail"` in all three files.
- **Decision**: FIXED (also updated the `/email/i` regex to `/e-mail/i` in `test/app/forgot-password/_components/forgot-password-form.spec.tsx`, the only spec querying this label)

### F3 — Dead "one" plural branch in request-row.tsx (harmless, plan-specified)

- **Severity**: 👁️ OBSERVATION
- **Dimension**: Architecture (minor code quality)
- **Location**: src/app/(app)/requests/_components/request-row.tsx:22
- **Detail**: diffDays===1 is special-cased earlier in the same function, so the "one" form ("dzień") passed into this pluralizePl(...) call is unreachable here. Not a bug — the plan specified this exact three-branch structure with a full pluralizePl(...,["dzień","dni","dni"]) call, so it's a deliberate, plan-mandated redundancy.
- **Decision**: SKIPPED (informational only, matches plan's explicit contract — no action needed)

## Sub-agent notes (not standalone findings)

- Two parallel review agents confirmed: no safety/security issues; no control-flow, type, or signature changes anywhere in the ~50 changed `src/` files (pure string-value swaps as intended); design-system primitives (Button, Field, Modal, Pill, Section, EmptyNote, LibraryCard, Card, Avatar, Shelf, IconButton) have zero diff; no i18n library/locale-routing added; no route path changes; `src/lib/pluralize-pl.utils.ts` follows sibling `*.utils.ts` conventions with a matching spec.
- Two candidate findings from the sub-agents were checked against `design.html` and found to be exact, correct reuses of the mockup's own vocabulary (not defects): `requests-list.tsx`'s two-sentence empty state (design.html:863, verbatim match) and `add-book-form.tsx`'s "Zapisz książkę" vs. `add-book-modal.tsx`'s "Dodaj książkę" (both are explicitly listed mockup vocabulary, used correctly in different contexts). Dropped as false positives.
- All automated success criteria verified: full 492-test suite passes, lint clean, `tsc --noEmit` shows only 2 pre-existing unrelated errors (confirmed present on HEAD before this phase's work), grep spot-check for leftover English UI words returns no matches.
