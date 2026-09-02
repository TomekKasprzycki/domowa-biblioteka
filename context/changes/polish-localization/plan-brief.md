# S-13: Polish Localization — Plan Brief

> Full plan: `context/changes/polish-localization/plan.md`

## What & Why

A one-off sweep of every user-facing English string in the app to Polish — page copy, buttons, empty states, server-action error messages, and the password-reset email — matching `design.html`'s already-shipped Polish vocabulary and informal register wherever it exists, and extending it to everything added since. Not a full i18n system: no locale routing, no message catalogue, no runtime language switching, per `change.md`'s own scope note. Sequenced last on the roadmap specifically so S-10/S-11/S-12's new UI copy gets translated once, not twice.

## Starting Point

The app has shipped entirely in English despite `design.html` (the visual mockup) and the PRD persona (Marta) both being Polish. `design.html` already establishes translated vocabulary for every surface it depicts — nav, collection, friends, discover, request/loan cards, the add/edit-book modal, the detail drawer — but nothing built since that mockup (S-10 privacy/account-deletion, S-11 forgot/reset-password, S-12 IconButton/friends-layout) has a Polish reference to draw from.

## Desired End State

Every page, component, error message, and the password-reset email reads in natural, grammatically correct Polish, consistently informal in register. `<html lang="pl">`. Absolute dates use Polish month abbreviations. Book/day counts use correct 3-way Polish plural agreement. The full test suite passes with every spec assertion updated to match — proof the sweep is behaviorally complete.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Privacy Notice translation | Same sweep, using standard Polish RODO terms (not literal word-for-word) | Keeps this one pass; established legal vocabulary (`administrator danych`, `podstawa prawna przetwarzania`) is low-risk to get right without a separate legal-review workflow | Plan (user-confirmed) |
| Date locale | `Intl.DateTimeFormat` switches `"en-GB"` → `"pl-PL"` at both sites | A Polish UI with English month abbreviations ("12 Mar") would read as an obvious miss; 1-line change per site | Plan (user-confirmed) |
| Pluralization | One shared `pluralize-pl.utils.ts` helper (3 call sites) | Polish's 3-form plural agreement (1/few/many) would otherwise be copy-pasted 3×; matches this repo's existing `<name>.utils.ts` convention, not the i18n message-catalogue the roadmap rules out | Plan (user-confirmed) |
| Register | Informal "Ty" everywhere — UI, error messages, and the reset email | One consistent voice matching design.html and the app's personal, friends-lending-books tone; no reason to split by surface type | Plan (user-confirmed) |
| Spec-assertion strategy | Update each of the 46 affected spec files' assertions to the new Polish string, in lockstep | Matches this codebase's existing testing-library convention everywhere; no precedent for data-testid, and introducing one now would bundle a testing-philosophy change into a translation-only slice | Plan (user-confirmed) |
| Password-reset email | Translate it too | It's user-facing copy in the exact flow being localized — the one flow (account security) where an English gap would be most jarring | Plan (user-confirmed) |
| Delivery scope | Ship the whole sweep together, no deferral | This is the last roadmap slice before shipping; a half-Polish app is a worse state than finishing a mechanical, low-risk sweep | Plan (user-confirmed) |

## Scope

**In scope:**
- ~42 `src/` files with hardcoded UI text across all 6 authenticated pages, all 6 public/auth pages, and 5 shared `_components` primitives
- ~30 server-action error/validation message constants across 7 action files
- The password-reset email (subject + body)
- `<html lang>` + metadata description
- 2 `Intl.DateTimeFormat` locale switches
- A new Polish-pluralization helper (`src/lib/pluralize-pl.utils.ts`)
- ~46 spec files' assertions, updated in lockstep with their source file

**Out of scope:**
- Any i18n library, locale routing, or message catalogue
- Design-system primitives that take copy as props (`Button`, `Field`, `Modal`, etc.) — only their callers change
- Fixture/test data (names, emails, book titles used as test inputs)
- `console.error`/developer-facing logging and code comments (except one now-inaccurate comment in `request-row.tsx`)
- Introducing `data-testid`-based test queries

## Architecture / Approach

Seven phases, ordered bottom-up by shared-dependency-first then feature area — the same shape as S-08 (`design-system`), the only prior slice of comparable reach. Phase 1 covers everything every other page depends on (sidebar/nav, the pluralization helper, the date-locale change). Phases 2–6 sweep one feature area at a time, each self-contained (page + components + that area's action errors + specs) and independently verified. Phase 7 closes with auth/public pages, the privacy notice, the reset email, and a full-app final pass.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Shared Foundations | `lang="pl"`, date locale, `pluralizePl` helper, sidebar/nav/drawer/spine/confirm-modal | Getting the Polish plural rule (the 12–14 exception) wrong is an easy, hard-to-notice grammar bug |
| 2. Collection | Page + 4 components + ~11 action errors | Low — mechanical value swaps |
| 3. Friends | Page + 7 components + ~9 action errors | Uses the pluralization helper; "Manage invites" (S-12) has no mockup precedent |
| 4. Discover | Page + 2 components | Low — mechanical value swaps |
| 5. Requests & Borrowing | 2 pages + 6 components + ~12 shared `borrow` action errors | `reportedAgo`'s relative-time strings need the pluralization helper too |
| 6. Account | Page + 1 component + 5 action errors | No mockup precedent (S-10) — fresh translation |
| 7. Auth & Public Pages | 6 pages + privacy notice + reset email + full-app final pass | Privacy notice needs accurate RODO terminology; final phase carries the whole-app manual sign-off |

**Prerequisites:** All met — S-09 (shelf-view), S-10 (gdpr-assessment), S-11 (forgot-password), S-12 (ux-polish) are all `impl_reviewed`.
**Estimated effort:** ~7 sessions, one per phase, each with a manual verification pause — comparable in scale to S-08's 8-phase rollout.

## Open Risks & Assumptions

- ~95 files touched app-wide (largest single-slice diff in the project's history, larger than S-08) — but every individual edit is mechanical (string value swap), not architectural, so the size is a volume risk (time, review fatigue) rather than a correctness risk.
- Several server-action error messages are already exact-string-asserted by specs — a translated constant with a stale spec assertion fails loudly (test failure), not silently, but every touched action file's spec needs updating in the same phase, not as an afterthought.
- Polish pluralization is centralized in one helper, but its correctness at the 12–14 boundary (`"many"`, not `"few"`) is easy to get subtly wrong if re-implemented ad hoc anywhere outside the helper — Phase 1's automated test explicitly covers this case.
- No native Polish speaker review is built into this plan beyond the implementer's own translation judgment and the developer's manual verification pass per phase — acceptable for a small-audience app per the PRD's target scale, but worth naming as a real limitation rather than assuming AI-translated Polish needs no human check.
- **Discovered during Phase 1**: shared-component string changes (`ConfirmModal`'s default Cancel label, `Spine`'s aria-label, the date-locale switch) ripple into later phases' spec files immediately, since those components are already consumed by not-yet-translated pages. Phase 1 fixed only the specific affected assertions in each of the 9 rippled spec files, not those files' full translation — later phases should expect one string already translated when they get to their own file, not a surprise diff.

## Success Criteria (Summary)

- A Polish-speaking user can complete the full account lifecycle (register → browse → borrow → return → delete account) without encountering a single English word, including the password-reset email.
- Every automated test passes with assertions matching the new Polish text — the sweep is proven complete, not just visually spot-checked.
- Polish plural agreement (książka/książki/książek, dzień/dni) and Polish date formatting are grammatically correct throughout.
