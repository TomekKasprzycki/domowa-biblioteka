# S-13: Polish Localization Implementation Plan

## Overview

A one-off sweep of every user-facing English string in the app to Polish — page copy, buttons, empty states, server-action error/validation messages, and the password-reset email — matching `context/design/design.html`'s already-established informal-register Polish vocabulary wherever a surface exists in that mockup, and extending the same register/terminology to everything added since (S-10 privacy/account-deletion, S-11 forgot/reset-password, S-12 IconButton/friends-layout copy). No i18n system: no locale routing, no message catalogue, no runtime language switching — literal content changes plus two small, narrowly-scoped helpers (Polish pluralization, `pl-PL` date locale).

## Current State Analysis

Three parallel research passes mapped the actual scope:

- **~42 `src/` files** carry hardcoded English UI text across collection (6), friends (9), discover (3), requests (5), borrowing (3), account (2), auth/public pages (9: home, login, register, forgot-password, reset-password, privacy), and shared `_components` primitives (5: `sidebar.tsx`, `sidebar-nav.tsx`, `drawer.tsx`, `spine.tsx`, `confirm-modal.tsx`'s default prop values). Primitives with no hardcoded text (`button.tsx`, `field.tsx`, `modal.tsx`, `pill.tsx`, `section.tsx`, `card.tsx`, `avatar.tsx`, `empty-note.tsx`, `library-card.tsx`, `shelf.tsx`, `icon-button.tsx`) stay untouched — their callers own the copy.
- **7 server-action files** (`login`, `register`, `forgot-password`, `reset-password`, `account`, `friends`, `collection`, `borrow` actions) carry ~30 English error/validation messages, already extracted as named constants (`DUPLICATE_MESSAGE`, `NOT_FOUND_MESSAGE`, etc.) — translating means changing string *values*, not restructuring code.
- **46 spec files** assert on English UI copy via `getByRole(name:)` / `getByText` / `getByLabelText` / `toHaveTextContent`. Most hit real translatable copy (button labels, dialog titles, form labels, empty states), not just fixture data — these need their assertions updated in lockstep with their source file's translation.
- **Two surfaces outside the obvious "pages and components" sweep**: `src/server/password-reset/send-reset-email.ts` (nodemailer subject + body) and `Intl.DateTimeFormat("en-GB", ...)` at 2 sites (`book-row.tsx`, `pending-return-row.tsx`).
- `src/app/layout.tsx` has `<html lang="en">` and an English `metadata.description` — both need to flip alongside the content itself (leaving `lang="en"` on an all-Polish page is an accessibility/SEO miss, not a stylistic choice).

### Key Discoveries:

- `context/design/design.html` (read in full) already establishes Polish translations, in an informal "Ty/Twoja" register, for every surface it depicts: sidebar nav (`Twoja kolekcja`, `Znajomi`, `Odkrywaj`, `Prośby`, `Wypożyczenia`), collection (`Twoja półka`, `+ Dodaj książkę`, `X pozycji`), friends (`Krąg zaufania`, `Zaproś po e-mailu lub nazwie użytkownika…`, `Wyślij zaproszenie`, `Oczekuje na Ciebie`, `Potwierdzeni znajomi`, `Akceptuj`/`Odrzuć`, `X książek na półce`), discover (`Cudza półka`, `Szukaj po tytule lub autorze…`, `Dostępna`/`Wypożyczona`), requests (`Skrzynka próśb`, `Prośby o wypożyczenie`, `Zatwierdź`/`Odrzuć`, `ZGŁOSZONO: X DNI TEMU`), borrowing (`Stan wypożyczeń`, `Twoje książki u innych`, `Oznacz jako zwrócone`, `Potwierdź odbiór`), and the add/edit-book modal + detail drawer (`Dodaj książkę`, `Edytuj książkę`, `Zapisz książkę`, `Zamknij`, `Poproś o wypożyczenie`, `Brak numeru ISBN — dodano ręcznie`). **Reuse this vocabulary verbatim wherever the English source matches a mockup surface** — it's already the product's shipped design language, not a new translation to invent.
- `request-row.tsx:13-14` has a comment claiming it "matches design.html's 'REPORTED: 2 DAYS AGO' example" — design.html's actual text is Polish (`ZGŁOSZONO: ${r.requested.toUpperCase()}`, with values like `'2 dni temu'`). The comment paraphrased the mockup in English; once this phase lands, the code will match the mockup *literally*, so the comment's wording needs a small correction alongside the string change (Phase 5).
- Surfaces with **no mockup precedent** — S-10 (privacy notice, account deletion), S-11 (forgot/reset-password, the reset email), S-12 (IconButton labels, `ManageInvitesSection`, friend book-count copy) — need fresh translation. Same register, same terminology conventions (`książka/książki/książek` for books, `wypożyczenie`/`wypożyczyć` for loan/borrow, `zaproszenie` for invite, `znajomy/znajomi` for friend(s)).
- `src/lib/*.utils.ts` is the established location/naming convention for small shared helpers (`spine-style.utils.ts`, `normalize-isbn.utils.ts`, etc.), each with a matching `test/lib/*.utils.spec.ts`. The new pluralization helper follows this exactly.
- Exactly 3 call sites need Polish pluralization: `sidebar.tsx` (own book count), `friend-row.tsx` (friend's book count), `request-row.tsx`'s `reportedAgo` (relative day count). Two nouns, one shared helper.
- Several exact English error strings are already asserted verbatim by specs (confirmed via spot-check: `test/app/(app)/collection/actions.spec.ts:116` asserts `"You already have a book with this title and author."`) — translating the constant's value without updating the assertion breaks the spec immediately, not silently.

## Desired End State

Every page, component, empty state, button, form label, server-action error message, and the password-reset email reads in natural, grammatically correct Polish, in a consistent informal register matching `design.html`. `<html lang="pl">` and the page metadata description are Polish. Absolute dates render with Polish month abbreviations. Book/day counts use correct Polish plural agreement. The full test suite passes with every spec assertion updated to match the new Polish strings — proof the sweep is behaviorally complete, not just visually spot-checked.

## What We're NOT Doing

- No i18n library, locale routing, or message catalogue — this stays a literal content sweep, per `change.md`'s explicit scope note. A future multi-locale ask (e.g. keeping an English option) is a separate, larger decision.
- Not touching design-system primitives that take copy as props (`Button`, `Field`, `Modal`, `Pill`, `Section`, `EmptyNote`, `LibraryCard`, `Card`, `Avatar`, `Shelf`, `IconButton`) — only their callers change.
- Not translating fixture/test data (person names, emails, book titles/authors used as test inputs) — those aren't UI copy a real user reads differently in Polish vs. English; only translate assertions that check actual rendered UI text.
- Not deferring any surface — the whole sweep ships together (confirmed decision; see plan-brief).
- Not changing route paths, URL segments, or query param names — no locale routing means no `/pl/` prefix or similar.
- Not touching `console.error`/`console.log` calls (developer-facing, not user-facing) or code comments, except the one `request-row.tsx` comment that becomes factually wrong once the string changes (see Key Discoveries).

## Implementation Approach

Seven phases, ordered bottom-up by shared-dependency-first then feature area — the same shape as S-08 (`design-system`)'s rollout, the only prior slice of comparable file-count and reach in this codebase. Phase 1 covers everything every other page depends on (sidebar/nav render on every authenticated page; the pluralization helper and date-locale change are consumed by later phases). Phases 2–6 then sweep one feature area at a time (collection → friends → discover → requests & borrowing → account), each fully self-contained: page + components + that area's action-error messages + matching specs, verified independently before moving to the next. Phase 7 — auth/public pages, the privacy notice, and the reset-password email — closes the sweep and is the final confirmation pass across the whole app.

## Critical Implementation Details

### Polish plural rule (the pluralization helper's actual logic)

Polish noun plurals split into three CLDR-standard classes for a non-negative integer count `n`: **one** (`n === 1`), **few** (`n % 10` is 2–4 **and** `n % 100` is not 12–14), **many** (everything else — 0, 5–21, 12–14, etc.). This is the one place in the sweep where getting the logic wrong produces a real, easily-missed grammar bug (e.g. "5 książki" instead of "5 książek") rather than just an untranslated string, so the phase below specifies it exactly rather than leaving it as an implementation detail to infer.

## Phase 1: Shared Foundations

### Overview

Everything downstream phases depend on: the root layout's language metadata, the two `Intl.DateTimeFormat` call sites, the Polish pluralization helper, and the always-visible shared components (sidebar, nav, drawer, spine, confirm-modal defaults).

### Changes Required:

#### 1. Root layout language & metadata

**File**: `src/app/layout.tsx`

**Intent**: An all-Polish app with `<html lang="en">` is an accessibility and SEO miss — screen readers and search engines both read the `lang` attribute as authoritative.

**Contract**: `lang="en"` → `lang="pl"`; `metadata.description` translated. `metadata.title` (`"Domowa Biblioteka"`) is already the brand name — unchanged.

#### 2. Date locale

**Files**: `src/app/(app)/collection/_components/book-row.tsx`, `src/app/(app)/requests/_components/pending-return-row.tsx`

**Intent**: Absolute dates (e.g. "12 Mar 2026") should render with Polish month abbreviations to match an all-Polish UI.

**Contract**: Both files' `new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })` → `Intl.DateTimeFormat("pl-PL", {...})` (options object unchanged). Renders e.g. "12 mar 2026".

#### 3. Polish pluralization helper

**File**: `src/lib/pluralize-pl.utils.ts` (new)

**Intent**: Three call sites (book count ×2, relative-day count ×1) need Polish's 3-form plural agreement instead of English's 2-form. One tested helper beats the same branching duplicated three times.

**Contract**:
```ts
export function pluralizePl(count: number, forms: [one: string, few: string, many: string]): string {
  const [one, few, many] = forms;
  if (count === 1) return one;
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return few;
  }
  return many;
}
```
Returns the word form only (not `${count} ${word}`) — callers still build the full string, e.g. `` `${bookCount} ${pluralizePl(bookCount, ["książka", "książki", "książek"])}` ``.

#### 4. Shared `_components` with hardcoded text

**Files**: `src/app/_components/sidebar.tsx`, `sidebar-nav.tsx`, `drawer.tsx`, `spine.tsx`, `confirm-modal.tsx`

**Intent**: These render on every authenticated page (sidebar/nav) or across multiple features (drawer, spine, confirm-modal), so translating them here unblocks every later phase's manual verification.

**Contract**: `sidebar-nav.tsx`'s `NAV_ROUTES` labels → design.html's exact nav vocabulary (`Twoja kolekcja`, `Znajomi`, `Odkrywaj`, `Prośby`, `Wypożyczenia`) plus `Account` (no mockup precedent — S-12 addition) and `Sign out`/`Privacy` translated fresh. `sidebar.tsx`'s brand text is unchanged (`Domowa`/`Biblioteka` already Polish); its book-count line uses the new `pluralizePl` helper. `drawer.tsx`'s `"Close ✕"`, `"No ISBN — added manually"`, and the `ISBN ${isbn}` template translate to design.html's `Zamknij ✕` / `Brak numeru ISBN — dodano ręcznie` / `ISBN ${isbn}`. `spine.tsx`'s tooltip/`aria-label` templates translate their static words (`—`, `ISBN`, `owned by`) to natural Polish while keeping the interpolated `title`/`author`/`owner` values as-is. `confirm-modal.tsx`'s default `confirmLabel`/`cancelLabel` (`"Confirm"`/`"Cancel"`) → `"Potwierdź"`/`"Anuluj"` — every call site that doesn't override these labels picks up the translation automatically; call sites that do pass explicit labels are translated in their own phase.

**Implementation note — cross-phase spec ripple (confirmed while implementing, not fully anticipated in review):** three of this phase's changes are consumed by files that don't get their *own* full translation until a later phase, and each one broke that consumer's spec immediately, not just visually:
- `ConfirmModal`'s default `cancelLabel` change flips the rendered "Cancel" button to "Anuluj" at all 5 existing call sites (`friend-row.tsx` p3, `book-row.tsx`/`edit-book-modal.tsx`/`add-book-modal.tsx` p2, `borrowing-row.tsx` p5) immediately, since none of them override `cancelLabel`.
- `spine.tsx`'s `aria-label`/tooltip change (`"View "` → `"Zobacz: "`, `"owned by "` → `"właściciel: "`) is queried by every consumer that opens a book's drawer via its spine button (`book-row.spec.tsx`/`book-list.spec.tsx`/`collection/page.spec.tsx` p2, `discover-book-row.spec.tsx`/`discover/page.spec.tsx` p4).
- The `pl-PL` date-locale change (Change 2) renders `"12 Mar 2026"` as `"12 mar 2026"` — asserted verbatim by `book-row.spec.tsx`/`collection/page.spec.tsx` (p2) and `pending-return-row.spec.tsx` (p5).

Fix applied: updated only the specific assertion(s) affected by each Phase-1-owned string in all 9 affected spec files, leaving the rest of those files' (still-English) assertions untouched for their own phase to translate. This keeps the full suite green at the end of every phase — including this one — without pulling a later phase's full scope forward. Future phases (2, 3, 4, 5) should expect their own file's spec to already have this one string translated when they get there, and not be surprised by a diff they didn't make.

### Success Criteria:

#### Automated Verification:

- New spec `test/lib/pluralize-pl.utils.spec.ts` covers all three classes (one/few/many) including the 12–14 exception (e.g. `pluralizePl(12, [...])` returns the "many" form, not "few").
- All existing specs for the touched shared components (`sidebar.spec.tsx`, `sidebar-nav.spec.tsx`, `drawer.spec.tsx`, `spine.spec.tsx`, `confirm-modal.spec.tsx`) updated to assert the new Polish strings; full suite for these files passes.
- `npm run lint` passes.
- `npx tsc --noEmit` shows no new errors.

#### Manual Verification:

- Sidebar nav, book-count footer, and sign-out/privacy links read correctly in Polish on any authenticated page.
- A book's detail drawer (both own-collection and a friend's) shows Polish close/status/ISBN text.
- `pluralizePl(1, ...)`, `pluralizePl(3, ...)`, `pluralizePl(12, ...)`, `pluralizePl(22, ...)` spot-checked by hand against real Polish grammar (1 książka / 3 książki / 12 książek / 22 książki).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Collection

### Overview

Translate the collection page, its 4 components, `collection/actions.ts`'s error messages, and matching specs.

### Changes Required:

#### 1. Collection page & components

**Files**: `src/app/(app)/collection/page.tsx`, `_components/add-book-form.tsx`, `_components/add-book-modal.tsx`, `_components/edit-book-modal.tsx`, `_components/book-row.tsx`, `_components/book-list.tsx`

**Intent**: Translate every hardcoded string — headings, `add-book-form.tsx`'s `STATUS_MESSAGES` record, the discard-confirm prompts, book-row's loan-status template literals, the empty-collection note — using design.html's established vocabulary for the add/edit-book modal (`Dodaj książkę`, `Edytuj książkę`, `ISBN (opcjonalnie)`, `Wyszukaj`, `Tytuł`, `Autor`, `Anuluj`, `Zapisz książkę`) and fresh translation for text with no mockup precedent (Edit/Delete drawer actions, added in S-09; the `ConfirmModal` prompts, added in S-12's app-wide rollout).

**Contract**: No structural changes — every string is a like-for-like value swap. `book-row.tsx`'s loan-status template literals (`` `Lent to ${name}${since}` ``, `` `Return pending · ${name}${since}` ``) keep their interpolation, only the static words translate.

#### 2. Collection action error messages

**File**: `src/app/(app)/collection/actions.ts`

**Intent**: Translate the ~11 English error/validation message constants (`Title is required`, `Author is required`, `Notes are too long`, `Book not found or you don't have permission to edit it.`, `You already have a book with this title and author.`, `This book is currently on loan and can't be deleted.`, `That ISBN doesn't look right.`, `This book has borrow requests or borrowing history and can't be deleted.`, the sign-in-required messages, and the zod fallbacks) to Polish, same informal register.

**Contract**: Only the string values change — the named constants, zod schema structure, and control flow are untouched.

### Success Criteria:

#### Automated Verification:

- `test/app/(app)/collection/actions.spec.ts` and every `test/app/(app)/collection/_components/*.spec.tsx` updated to assert the new Polish strings; full suite for this directory passes.
- `npm run lint` passes.

#### Manual Verification:

- Add a book (with and without ISBN lookup), edit a book, delete a book — every label, button, status message, and confirm dialog reads correctly in Polish.
- Trigger at least one validation error (e.g. empty title) and one business-rule error (e.g. duplicate title+author) and confirm the Polish message is correct and natural.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Friends

### Overview

Translate the friends page, its 7 components, `friends/actions.ts`'s error messages, and matching specs.

### Changes Required:

#### 1. Friends page & components

**Files**: `src/app/(app)/friends/page.tsx`, `_components/friends-list.tsx`, `_components/friend-row.tsx`, `_components/manage-invites-section.tsx`, `_components/received-invite-row.tsx`, `_components/received-invites-list.tsx`, `_components/send-invite-form.tsx`, `_components/sent-invite-row.tsx`, `_components/sent-invites-list.tsx`

**Intent**: Translate using design.html's established friends vocabulary (`Krąg zaufania`, `Zaproś po e-mailu lub nazwie użytkownika…`, `Wyślij zaproszenie`, `Oczekuje na Ciebie` → adapted for "Received"/"Sent" section titles, `Potwierdzeni znajomi` → "Your friends", `Akceptuj`/`Odrzuć`, `Potwierdzony`/`Oczekuje` pill text). `friend-row.tsx`'s book-count line uses the Phase 1 `pluralizePl` helper with `["książka", "książki", "książek"]`. `manage-invites-section.tsx` ("Manage invites" heading, S-12 addition) and the `IconButton`'s contextual `aria-label` template (`` `Remove ${name} as a friend` ``) have no mockup precedent — translate fresh, keeping the interpolated name.

**Contract**: Like-for-like value swaps; no structural changes.

#### 2. Friends action error messages

**File**: `src/app/(app)/friends/actions.ts`

**Intent**: Translate the ~9 English error message constants (invalid/unknown email, self-invite, duplicate invite, already-friends, not-found, sign-in-required ×3).

**Contract**: String values only.

### Success Criteria:

#### Automated Verification:

- `test/app/(app)/friends/actions.spec.ts`, `test/app/(app)/friends/page.spec.tsx`, and every `test/app/(app)/friends/_components/*.spec.tsx` updated to assert the new Polish strings; full suite for this directory passes.
- `npm run lint` passes.

#### Manual Verification:

- Send an invite, accept one, reject one, remove a friend — every label, button, pill, and the remove-confirm modal reads correctly in Polish.
- A confirmed friend's book count reads with correct Polish plural agreement (spot-check a friend with 1, and one with a count in the "few"/"many" range if test data allows).
- Below/above 1024px, the "Manage invites" collapsible block's heading and contents are fully Polish.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Discover

### Overview

Translate the discover page and its 2 components. No dedicated action file — borrow requests are handled by `src/app/borrow/actions.ts`, translated in Phase 5.

### Changes Required:

#### 1. Discover page & components

**Files**: `src/app/(app)/discover/page.tsx`, `_components/discover-book-row.tsx`, `_components/discover-search.tsx`

**Intent**: Translate using design.html's established discover vocabulary (`Cudza półka`, `Szukaj po tytule lub autorze…`, `Dostępna`/`Wypożyczona`). `discover-search.tsx`'s `aria-label`s (`"Search by title or author"`, `"Filter by friend"`) and the `"All friends"` option, plus `discover-book-row.tsx`'s status labels (`"Borrowed by you"`, `"On loan"`, `"Requested"`) have no direct mockup line but follow the same established terms (`wypożyczona`, `Twoja`).

**Contract**: Like-for-like value swaps.

### Success Criteria:

#### Automated Verification:

- `test/app/(app)/discover/page.spec.tsx` and every `test/app/(app)/discover/_components/*.spec.tsx` updated to assert the new Polish strings; full suite for this directory passes.
- `npm run lint` passes.

#### Manual Verification:

- Browse a friend's shelf, search by title/author, and filter by friend — every label, placeholder, and availability status reads correctly in Polish.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Requests & Borrowing

### Overview

Translate both requests and borrowing pages (6 components total), the shared `src/app/borrow/actions.ts` error messages, and matching specs.

### Changes Required:

#### 1. Requests & borrowing pages & components

**Files**: `src/app/(app)/requests/page.tsx`, `_components/requests-list.tsx`, `_components/request-row.tsx`, `_components/pending-return-row.tsx`, `_components/pending-returns-list.tsx`, `src/app/(app)/borrowing/page.tsx`, `_components/borrowing-list.tsx`, `_components/borrowing-row.tsx`

**Intent**: Translate using design.html's established vocabulary (`Skrzynka próśb`, `Prośby o wypożyczenie`, `Zatwierdź`/`Odrzuć`, `Stan wypożyczeń`, `Twoje książki u innych`, `Oznacz jako zwrócone`, `Potwierdź odbiór`, `U Ciebie`, `Wypożyczono`/`Zwrot`). `request-row.tsx`'s `reportedAgo` function switches its three return strings (`"today"`, `"1 day ago"`, `` `${diffDays} days ago` ``) to Polish using the Phase 1 `pluralizePl` helper with `["dzień", "dni", "dni"]` (Polish "dzień" shares its few/many form), and its stale comment claiming to match design.html's *English* gloss gets corrected to reflect that the code now matches the mockup's actual Polish text. `borrowing-row.tsx`'s `statusLabel` template literals (`` `Borrowed from ${owner}` ``, etc.) keep interpolation, translate the static words.

**Contract**: Like-for-like value swaps; `reportedAgo`'s three-branch structure is unchanged, only the literal returns and the `pluralizePl` call for the 2+ case.

#### 2. Borrow action error messages

**File**: `src/app/borrow/actions.ts`

**Intent**: Translate the ~12 English error message constants (sign-in-required ×4, book-not-found, own-book, not-friend, already-borrowed, duplicate-request, loan-not-found, return/confirm-not-possible ×2).

**Contract**: String values only.

### Success Criteria:

#### Automated Verification:

- `test/app/borrow/actions.spec.ts` updated to assert the new Polish error strings and passing.
- `test/app/(app)/requests/page.spec.tsx`, `test/app/(app)/borrowing/page.spec.tsx`, and every `_components/*.spec.tsx` under both directories updated to assert the new Polish strings; full suite for both directories passes.
- `npm run lint` passes.

#### Manual Verification:

- Approve a request, decline a request, mark a loan returned, confirm a return — every label, button, and relative-time stamp reads correctly in Polish with correct plural agreement (check a 1-day-old and a several-days-old request if test data allows).
- `Intl.DateTimeFormat("pl-PL", ...)` (from Phase 1) renders correctly on `pending-return-row.tsx`'s "borrowed since" line.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 6: Account

### Overview

Translate the account page, its 1 component, and `account/actions.ts`'s error messages.

### Changes Required:

#### 1. Account page & component

**Files**: `src/app/(app)/account/page.tsx`, `_components/delete-account-form.tsx`

**Intent**: No mockup precedent (S-10 addition) — translate fresh: the "Delete your account" heading and its explanatory paragraph, the type-your-email-to-confirm field label template, and the button states.

**Contract**: Like-for-like value swaps, including the interpolated `` `Type ${email} to confirm` `` label template.

#### 2. Account action error messages

**File**: `src/app/(app)/account/actions.ts`

**Intent**: Translate the 5 English message constants (confirm-email-required, auth-required, email-mismatch, blocked-by-active-loan, conflict).

**Contract**: String values only.

### Success Criteria:

#### Automated Verification:

- `test/app/(app)/account/actions.spec.ts` and `test/app/(app)/account/_components/delete-account-form.spec.tsx` updated to assert the new Polish strings; full suite for this directory passes.
- `npm run lint` passes.

#### Manual Verification:

- The delete-account flow (including the blocked-by-active-loan error, if reachable with test data) reads correctly in Polish end to end.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 7: Auth & Public Pages

### Overview

Translate the home page, login, register, forgot-password, reset-password, the privacy notice, and the password-reset email. Final phase — confirms the whole app end to end.

### Changes Required:

#### 1. Auth & public pages

**Files**: `src/app/page.tsx`, `src/app/login/page.tsx`, `_components/login-form.tsx`, `src/app/register/page.tsx`, `_components/register-form.tsx`, `src/app/forgot-password/page.tsx`, `_components/forgot-password-form.tsx`, `src/app/reset-password/page.tsx`, `_components/reset-password-form.tsx`

**Intent**: No mockup precedent for any of these (all added after design.html) — translate fresh, informal "Ty" register, consistent with everything else. Field labels (`Email`, `Password`, `New password`, `Confirm new password`), button states, the home page's tagline and account-deleted flash message, and each page's status/error banners.

**Contract**: Like-for-like value swaps.

#### 2. Privacy notice

**File**: `src/app/privacy/page.tsx`

**Intent**: Translate the RODO/GDPR compliance content using standard Polish legal terminology — `administrator danych` (data controller), `podstawa prawna przetwarzania` (legal basis for processing), `prawa osoby, której dane dotyczą` (data subject rights) — rather than literal word-for-word translation of the English legal phrasing, per the confirmed decision to keep this in the same sweep while using established terms.

**Contract**: Heading and body-paragraph text changes; document structure (headings: "What we collect, and why", "Legal basis", "Who processes this data", "Your rights") is unchanged, only translated.

#### 3. Auth action error messages

**Files**: `src/app/login/actions.ts`, `src/app/register/actions.ts`, `src/app/forgot-password/actions.ts`, `src/app/reset-password/actions.ts`

**Intent**: Translate the remaining ~10 English error/validation message constants across these 4 files (invalid credentials, name/email/password validation, duplicate-account, sign-in-failed-after-register, invalid-or-expired-link, password-mismatch).

**Contract**: String values only.

#### 4. Password-reset email

**File**: `src/server/password-reset/send-reset-email.ts`

**Intent**: The email a user receives mid-flow should match the Polish UI around it — leaving it English would be the one jarring gap in an otherwise-complete sweep, per the confirmed decision.

**Contract**: `subject: "Reset your Domowa Biblioteka password"` and the `text` body template translate to Polish; the interpolated `resetUrl` and the one-hour expiry detail are preserved.

### Success Criteria:

#### Automated Verification:

- Every `test/app/{page,login,register,forgot-password,reset-password}*.spec.tsx` (and `_components` specs) updated to assert the new Polish strings; full suite for these directories passes.
- `npm run lint` passes.
- `npx tsc --noEmit` shows no new errors.
- Full project test suite passes end to end (not just per-directory) — the final proof the sweep is complete and nothing was missed.
- `grep -rn` for a sample of common English UI words (`"Sign in"`, `"Cancel"`, `"Delete"`, `"Save"`) across `src/app/**/*.tsx` returns no matches outside code comments/prop names — a spot-check safety net, not exhaustive.

#### Manual Verification:

- Full account lifecycle in Polish: register → sign in → forgot password → receive the (translated) reset email → reset password → sign in with new password → visit `/privacy` → delete account.
- `<html lang="pl">` confirmed via browser dev tools; the browser/OS accessibility tooling (or a quick screen-reader spot-check if available) reflects Polish.
- One final pass across all 6 authenticated pages plus the 6 public/auth pages confirms no leftover English text anywhere in the app.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. This is the final phase — confirm the entire app reads correctly in Polish, end to end, before closing out this slice (and, per the roadmap, S-13 was sequenced last specifically so this is the last translation pass the app ever needs for this scope).

---

## Testing Strategy

### Unit Tests:

- `pluralizePl`: all three plural classes, including the 12–14 "many" exception that a naive `n % 10` check would get wrong.
- Every component/action spec: assertions updated to the new Polish strings, proving the translated text actually renders/returns, not just that the source file compiles.

### Integration Tests:

- Per-phase action-spec suites (`collection/actions.spec.ts`, `friends/actions.spec.ts`, `borrow/actions.spec.ts`, `account/actions.spec.ts`) continue exercising real business logic against a live Neon test database — only the expected message strings change.

### Manual Testing Steps:

1. Walk each of the 6 authenticated pages (collection, friends, discover, requests, borrowing, account) plus the 6 public/auth pages, confirming no leftover English text.
2. Exercise at least one validation error and one business-rule error per feature area, confirming Polish error copy.
3. Spot-check Polish plural agreement at all 3 `pluralizePl` call sites with counts in each of the three classes (1 / few / many) where test data allows.
4. Confirm the password-reset email arrives in Polish and the reset link still works.
5. Confirm `<html lang="pl">` via browser dev tools.

## Performance Considerations

None — this is a content-only change; no new queries, renders, or data flows.

## Migration Notes

None — no schema or data changes. No user-visible URL changes (no locale routing), so no redirects or link-rot concerns.

## References

- Related roadmap entry: `context/foundation/roadmap.md` (S-13)
- Developer note: `context/design/todo.md:1` ("przetłumaczyć na polski")
- Vocabulary source: `context/design/design.html` (read in full for this plan)
- Precedent for a whole-app-reach change: `context/changes/design-system/plan.md` (S-08)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared Foundations

#### Automated

- [x] 1.1 New spec `pluralize-pl.utils.spec.ts` covers one/few/many including the 12–14 exception
- [x] 1.2 Shared-component specs (sidebar, sidebar-nav, drawer, spine, confirm-modal) updated and passing
- [x] 1.3 `npm run lint` passes
- [x] 1.4 `npx tsc --noEmit` shows no new errors

#### Manual

- [x] 1.5 Sidebar nav, book-count footer, sign-out/privacy links read correctly in Polish
- [x] 1.6 Book detail drawer (own + friend's) shows Polish close/status/ISBN text
- [x] 1.7 `pluralizePl` spot-checked by hand at 1 / 3 / 12 / 22 against real Polish grammar

### Phase 2: Collection

#### Automated

- [ ] 2.1 `collection/actions.spec.ts` and `_components/*.spec.tsx` updated, full directory suite passes
- [ ] 2.2 `npm run lint` passes

#### Manual

- [ ] 2.3 Add/edit/delete a book — all labels, buttons, status messages, confirm dialogs correct in Polish
- [ ] 2.4 One validation error and one business-rule error confirmed correct and natural in Polish

### Phase 3: Friends

#### Automated

- [ ] 3.1 `friends/actions.spec.ts`, `page.spec.tsx`, `_components/*.spec.tsx` updated, full directory suite passes
- [ ] 3.2 `npm run lint` passes

#### Manual

- [ ] 3.3 Send/accept/reject invite, remove friend — all labels, buttons, pills, confirm modal correct in Polish
- [ ] 3.4 Friend book count reads with correct Polish plural agreement
- [ ] 3.5 "Manage invites" block fully Polish below and above 1024px

### Phase 4: Discover

#### Automated

- [ ] 4.1 `page.spec.tsx` and `_components/*.spec.tsx` updated, full directory suite passes
- [ ] 4.2 `npm run lint` passes

#### Manual

- [ ] 4.3 Browse, search, filter by friend — all labels, placeholders, availability status correct in Polish

### Phase 5: Requests & Borrowing

#### Automated

- [ ] 5.1 `borrow/actions.spec.ts` updated and passing
- [ ] 5.2 `requests/page.spec.tsx`, `borrowing/page.spec.tsx`, and both directories' `_components/*.spec.tsx` updated, full suites pass
- [ ] 5.3 `npm run lint` passes

#### Manual

- [ ] 5.4 Approve/decline/return/confirm flows — all labels, buttons, relative-time stamps correct in Polish with correct plural agreement
- [ ] 5.5 `pl-PL` date locale renders correctly on the pending-return "borrowed since" line

### Phase 6: Account

#### Automated

- [ ] 6.1 `account/actions.spec.ts` and `delete-account-form.spec.tsx` updated, full directory suite passes
- [ ] 6.2 `npm run lint` passes

#### Manual

- [ ] 6.3 Delete-account flow (including blocked-by-active-loan error if reachable) correct in Polish end to end

### Phase 7: Auth & Public Pages

#### Automated

- [ ] 7.1 Auth/public page and component specs updated, full directory suites pass
- [ ] 7.2 `npm run lint` passes
- [ ] 7.3 `npx tsc --noEmit` shows no new errors
- [ ] 7.4 Full project test suite passes end to end
- [ ] 7.5 Spot-check `grep` for common English UI words across `src/app/**/*.tsx` returns no matches outside comments/prop names

#### Manual

- [ ] 7.6 Full account lifecycle (register → login → forgot → reset via emailed link → login → privacy → delete) reads correctly in Polish
- [ ] 7.7 `<html lang="pl">` confirmed via dev tools
- [ ] 7.8 Final pass across all 12 pages confirms no leftover English text anywhere
