# S-12: Post-Launch UX Polish — Plan Brief

> Full plan: `context/changes/ux-polish/plan.md`

## What & Why

Four developer notes from `context/design/todo.md` (2026-08-22), scoped to this slice by `change.md`: land signed-in users directly on their collection instead of an intermediate welcome page; introduce an icon-only `IconButton` primitive with a contextual, labeled tooltip; and restructure `/friends` so invite management is out of the way by default while confirmed-friend cards show shelf size instead of email, matching `context/design/design.html`.

## Starting Point

Book Edit/Delete already moved into a spacious `Drawer` during S-09 (shipped, `impl_reviewed`) — full-text buttons, already scoped to one book via the drawer's title. `Friends` still shows a bare-text "Remove" button and full email per row, in a `flex-col` stack rather than a card grid. Login/register/home all default their post-auth landing to `/`. No icon library exists anywhere in the app (icons are deliberately emoji, per S-08).

## Desired End State

Signing in or registering lands on `/collection`; visiting `/` while signed in redirects there too, with the old welcome branch gone entirely. `/friends` shows narrow, `design.html`-matching cards: confirmed friends display their book count and a small trash-icon "Remove" action (tooltip + confirm dialog both naming the friend); invite management (send + Received + Sent) is collapsed by default and always visible in a right-hand column at `lg`/`xl`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| IconButton placement | Friends "Remove" only — not book Edit/Delete | Since S-09, book actions live in a spacious Drawer with plenty of room; converting those to icon-only would remove clear labels for zero space benefit | Plan (user-confirmed) |
| "View collection" action | Stays a text Button | It's the primary reason to be on the card — icon-only would hide the app's core discovery entry point | Plan (user-confirmed) |
| Admin-block scope | Invite form + Received + Sent bundled as one collapsible unit | Matches "sprawy administracyjne" as one bundle distinct from "Your friends," the page's primary content | Plan (user-confirmed) |
| Large-screen behavior | Always open in the right column at `lg`/`xl`; collapse only applies below `lg` | Todo note reads as two separate rules for two breakpoint ranges; large screens have room, so hiding by default there wastes it | Plan (user-confirmed) |
| Received/Sent card content | Keep email, don't switch to book count | Showing shelf size for a not-yet-confirmed connection would mismatch S-02's confirmed-friends-only visibility invariant | Plan (user-confirmed) |
| Card-grid restyle scope | All three lists (Received, Sent, Friends) | design.html reuses one grid class for both pending and confirmed cards — one visual pattern for "a person" across the page | Plan (user-confirmed) |
| Delivery scope | Ship all 5 items together, no deferral | All are small and already fully scoped by todo.md; splitting adds coordination overhead for little benefit | Plan (user-confirmed) |
| Responsive collapse mechanism | Single render; a client component reads a `matchMedia` query via `useSyncExternalStore` | A single `<details>` can't carry two default-open states per breakpoint (dual-render rejected in plan review — duplicate `id="email"`, split form state); `useSyncExternalStore` replaced the plan's original `useState`+effect design during implementation after it tripped `react-hooks/set-state-in-effect` | Plan review; adapted in Phase 4 |
| Confirmation dialog styling | Replace `window.confirm()` app-wide with a new styled `ConfirmModal` primitive | Developer feedback during Phase 3 manual verification asked for a styled confirm; offered scoped-to-friend-remove vs. app-wide, developer chose app-wide for visual consistency across all 5 destructive/discard confirmations | Implementation (user-directed) |
| ConfirmModal presentation | Centered message/buttons; dialog sizes to content via a new `Modal` `sizeClassName` prop | Further developer feedback ("text should be in center", "modal should be fit-content") during the same Phase 3 verification pass; `sizeClassName` defaults to the existing fixed width so `AddBookModal`/`EditBookModal` are unaffected | Implementation (user-directed) |

## Scope

**In scope:**
- Home/login/register default post-auth redirect → `/collection`, preserving explicit deep-link `callbackUrl`
- New `IconButton` primitive, fully spec'd
- `FriendRow`: Remove → IconButton; email → live book count (via existing `countBooksForUser`)
- **Added mid-implementation:** new `ConfirmModal` primitive, replacing `window.confirm()` at all 5 call sites app-wide (friend-remove, book-delete, 2 discard-guards, borrowing-return) — not part of the reviewed plan; see Phase 3 in the full plan
- `/friends`: collapsible "Manage invites" block (form + Received + Sent), always-open right column at `lg`/`xl`
- **Added mid-implementation:** `<main>`'s `max-w-[1180px]` cap removed app-wide (`src/app/(app)/layout.tsx`) so it reaches the viewport's right edge — not part of the reviewed plan; see Phase 4 in the full plan
- **Added mid-implementation:** `ConfirmModal` centers its message/buttons and sizes to content, via a new optional `sizeClassName` prop on `Modal` (default unchanged — `AddBookModal`/`EditBookModal` unaffected) — not part of the reviewed plan; see Phase 3 in the full plan
- Narrower `design.html`-matching card grid across all three friend/invite lists, including restyling each card's internals to the mockup's column layout so they don't crowd at 240px

**Out of scope:**
- Book Edit/Delete inside `Drawer` (stays full-text)
- Book count on Received/Sent invite cards (privacy mismatch with friend-confirmation gate)
- Reordering `/friends` sections beyond the stated collapse/2-column behavior
- Backfilling automated specs for `loginAction`/`registerAction`'s `signIn()` call (no mocking harness exists yet — same category of gap as the `msw` lesson in `lessons.md`; covered by manual verification instead)
- Rendering the admin block twice for a per-breakpoint default-open state (rejected in plan review — duplicate `id="email"` and split form state)
- Account-page "update profile" and password double-entry-on-register (separate todo.md items, not part of `change.md`'s S-12 scope)

## Architecture / Approach

Four phases, smallest/most isolated first: (1) redirect targets (auth pages/actions only), (2) `IconButton` built and spec'd in isolation, (3) adopted in `FriendRow` alongside the book-count swap (same file), (4) the `/friends` page-level layout rework, which depends on the row-level content already being in its final shape. The layout rework's key constraint: a single `<details>` can't carry two default-open states per breakpoint, and duplicating the block to work around that would produce duplicate `id="email"` inputs and split form state — so the admin block renders once as a client component reading `window.matchMedia("(min-width: 1024px)")` via `useSyncExternalStore`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Post-Login Redirect | `/`, `/login`, `/register` land on `/collection` by default; deep links preserved | Low — isolated, no shared dependencies |
| 2. IconButton Primitive | New component, full spec coverage, zero adoption yet | Low — isolated by design |
| 3. Friends: IconButton + Book Count | `FriendRow`'s Remove action + email→book-count swap | Existing spec fixtures need a `bookCount` field or they fail to compile |
| 4. Friends Page Layout | Collapsible admin block, `lg`/`xl` 2-column, card-grid restyle on all 3 lists | `<details>` open state must stay in sync between React, the browser's own toggle, and the matchMedia listener |

**Prerequisites:** None beyond what's already merged (S-08 design-system primitives, S-09 shelf-view's Drawer).
**Estimated effort:** ~4 sessions, one per phase, each with a manual verification pause.

## Open Risks & Assumptions

- ~~The admin block's `matchMedia`-driven open state means at `lg` it paints collapsed for one frame before the effect opens it.~~ Resolved during implementation: `useSyncExternalStore` reads the query synchronously on first client render, so no flash occurs. Still worth a manual check at exactly 1024px.
- `loginAction`/`registerAction` redirect-target changes rely on manual verification only, since no `signIn()` mocking harness exists — flagged explicitly rather than silently skipped, consistent with how this codebase has handled similar test-infra gaps before (`lessons.md`).
- `IconButton`'s tooltip is a native `title`, which never fires on touch — on the mobile-first target a sighted user sees only the glyph. Accepted: `aria-label` covers assistive tech and the `ConfirmModal` (naming the friend) catches mis-taps.
- At exactly 1024px the friends grid gets ~390px next to a 280px admin column, so it stays one card wide until ~1180px. The 2-column split is a layout win at `xl` more than at `lg`.
- `ConfirmModal`'s app-wide rollout was not part of the reviewed plan or its plan-review pass — it touches 4 files outside S-12's original file list. Automated coverage is thorough (all 5 call sites re-spec'd, `grep` confirms zero remaining `window.confirm()`), but it hasn't been through `/10x-plan-review`; worth a mention if this change goes through `/10x-impl-review`.
- The `<main>` width-cap removal (Phase 4) is app-wide and also wasn't through `/10x-plan-review` — no page's tests or internal layout assumed the old 1180px cap (verified: full suite passes unmodified), but it's a visual change on every authenticated page, not just `/friends`.
- `ConfirmModal`'s centered/fit-content styling and `Modal`'s new `sizeClassName` prop weren't through `/10x-plan-review` either (caught and documented after the fact by `/10x-impl-review`, F1) — low risk (the prop is additive and defaults to the prior fixed width), but the same "document scope additions when they happen" discipline this plan applied to its two bigger additions almost didn't get applied here.

## Success Criteria (Summary)

- A user never sees the old "Welcome back" page — signing in, registering, or visiting `/` while signed in all land on `/collection` (deep links still respected).
- `/friends` cards are narrower and match `design.html`; confirmed friends show book count, Received/Sent keep email; Remove is an icon with a name-specific tooltip and confirm dialog.
- Below 1024px, invite management is tucked away by default; at 1024px+, it's always visible alongside "Your friends" with no extra click.
