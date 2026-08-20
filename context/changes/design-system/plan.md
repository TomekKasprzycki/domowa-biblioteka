# S-08: Design System — Implementation Plan

## Overview

Port the paper-and-green visual identity from `context/design/design.html` across the whole app: new design tokens and fonts, a dark 248px sidebar shell replacing the top nav (authenticated pages only), and 7 reusable primitives (Button, Field, Card, Pill, LibraryCard, EmptyNote, Avatar) extracted into `src/app/_components/` and adopted by every existing feature component. Presentation-only by definition, with two small, explicitly-agreed exceptions: sidebar active-route highlighting and a sidebar footer book-count query.

## Current State Analysis

- **8 pages, 24 `_components` files** (23 feature components + the shared `Modal`), zero shared UI primitives today — every button, field, card-row and badge is ad-hoc Tailwind utility classes, hand-typed per component.
- **The ad-hoc styling is unusually consistent already**: exactly 5 button visual patterns, 1 field pattern (label + input, `rounded-lg border border-zinc-300 px-3 py-2 text-sm`), 1 card-row pattern reused near-verbatim across 7 list components, 5 badge/pill patterns. Only two border-radii exist anywhere (`rounded-lg`, `rounded-full`).
- **`LibraryCard` and `Avatar` have zero current analog** — no stamp/ticket-style book display and no initials-circle exist anywhere in the codebase. Both are pure inventions driven entirely by the mockup, not extractions.
- **The mockup jumps straight from "list of books" to "shelf of spines"** (spines are S-09's job, blocked on this change). `book-row.tsx` / `discover-book-row.tsx` have no dedicated new-palette reference — they get the plain `Card` primitive, same row layout, as an interim look.
- **The mockup only designs a signed-in sidebar** — no signed-out state exists in `design.html`. Today's top nav renders on every page (`src/app/layout.tsx:32`), swapping its link set based on session. The new sidebar drops this pattern: authenticated pages get the sidebar via a new `(app)` route group; `/`, `/login`, `/register` get a chrome-free centered layout, matching how a typical dashboard app keeps its internal nav out of public/auth pages.
- **The current nav has no active-route highlighting** (`src/app/_components/nav.tsx` is a pure async Server Component, no `usePathname` anywhere). The mockup's `.nav-item.active` state requires a Client Component for the nav-links portion.
- **The sidebar footer's "10 książek na półce" book count is new** — no `countBooksForUser`-shaped query exists on `book.repository.ts` today (only `findByUserId`, which returns full rows). One new `count()` query, following the exact `safeCount()`-guarded pattern the existing request/return badges already use.
- **Zero existing specs assert on CSS classes, styles, or snapshots** (verified across the whole suite via grep for `toHaveClass`, `className` string-matching, `toHaveStyle`, `toMatchSnapshot`). Any spec that breaks during this change is a genuine behavior regression, not a false positive from a styling assertion — except the nav specs, which are a deliberate full replacement (see Key Discoveries).
- **`next/font/google` is already wired up** (`src/app/layout.tsx:2,6-14`), currently loading Geist Sans/Mono — but no component anywhere uses the resulting `font-sans`/`font-mono` utilities, and `globals.css:25` hardcodes `body { font-family: Arial, Helvetica, sans-serif; }`, which wins visually today. So no font is actually Tailwind-controlled right now; swapping to Fraunces/Inter/JetBrains Mono is a clean replacement, not a behavior change to anything currently visible.
- **Tailwind v4, CSS-first config** — no `tailwind.config.ts` exists; all configuration lives in `src/app/globals.css` via `@theme`/`@theme inline`.

Full grounding is this planning session's own research (no separate `research.md` was written for this change — codebase inventory was gathered via parallel sub-agents during `/10x-plan`).

## Desired End State

Every page carries the paper-and-green identity: `@theme` tokens for the palette, radii and shadows; Fraunces (display) / Inter (body) / JetBrains Mono (metadata) fonts; a dark sidebar on every authenticated page with active-route highlighting and a live book count; and all 23 feature components plus `Modal` rebuilt on top of 7 shared primitives instead of hand-typed Tailwind. Public pages (`/`, `/login`, `/register`) get the new tokens and fonts but no sidebar. No user-facing behavior changes except the two named additions (active-route highlighting, sidebar book count) — every other existing spec continues to pass unmodified, proving the restyle is behavior-neutral.

Verified by: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all green at every phase, plus a full 8-page desktop + 375px visual sweep as the final phase's manual verification.

### Key Discoveries:

- **Pill's color semantics compress from 4 tones to 3.** The mockup uses blue for *every* "not immediately actionable" state — a pending friend invite (`status-pending`), a book currently on loan (the shelf legend's blue dot, and `.spine-tag`'s `background:var(--blue-500)`), and (by the same logic) a book the viewer has requested but not yet received. Today's app has 4 distinct pill colors (zinc "On loan", amber "Requested", blue "return-pending"/"pending invite", green "active"/"confirmed"). Per the mockup's actual model, "On loan" and "Requested by you" both become the same blue tone, differing only in label text — this is a deliberate simplification following the design source, not an oversight. `Pill` ships 3 tones: `active` (green), `pending` (blue), `mine` (neutral — paper background, line border).
- **The mockup's actual button system has 4 color variants, not 5.** `design.html`'s `.btn-primary` (solid green), `.btn-ghost` (green outline), `.btn-outline-blue` (blue outline — used for the ISBN "Look up" button specifically), `.btn-decline` (transparent, amber/brown text+border), plus a `.btn-sm` size modifier. Several of today's plain underlined-text actions (Edit, Delete, Approve, Decline, Accept, Reject, Remove) become real `size="sm"` pill buttons under the new system (`ghost`/`decline`/`primary` variant, matching the mockup's request/loan cards, which render "Zatwierdź"/"Odrzuć" as solid/outline pills, not text links). This is a real visual upgrade for those actions, not just a recolor — worth being deliberate about during each feature phase.
- **`Button` needs to render as either a `<button>` or a `next/link` `<Link>`.** The home page's CTAs (`src/app/page.tsx`) are link-styled-as-button today (`page.tsx:34` primary, `page.tsx:40` ghost, both `px-6 py-2.5`) — an `href` prop switches `Button` to `Link` rendering while keeping identical visual variants.
- **`Field` does not cover the discover page's search bar or friend picker.** The mockup's `.search-input` is a visually distinct, unlabeled pill-shaped input (no `.field label`) — `discover-search.tsx`'s search box and friend `<select>` keep their own (token-updated) bespoke styling rather than being forced into `Field`'s labeled shape.
- **Replacing `nav.tsx` is a deliberate full rewrite, not an incremental edit.** The existing `nav.tsx` (top bar) is replaced by `sidebar.tsx` (Server Component: session + all three counts) + `sidebar-nav.tsx` (Client Component: `usePathname`-based active-state for the 5 nav links). `test/app/_components/nav.spec.tsx` is deleted and replaced by new specs for both files — this is expected, not a signal of accidental behavior change, because the component is intentionally being restructured, not restyled in place.
- **Moving 5 feature route folders into an `(app)` route group is a mechanical but wide-reaching change.** `collection/`, `discover/`, `friends/`, `requests/`, `borrowing/` (and their `_components/` and matching `test/app/**` mirrors) move under `src/app/(app)/`. Route groups don't affect the URL (`(app)/collection/page.tsx` still serves `/collection`), and `middleware.ts`'s matcher / `auth.config.ts`'s public-path list both match on URL path, so neither needs to change. Parentheses in a directory name are valid on POSIX filesystems and Jest's default `testMatch` glob has no trouble with them — confirmed no special Jest config is needed, but this is worth a smoke-check early in Phase 3 rather than discovering a glob issue mid-way.
- **`Avatar`'s background color needs a deterministic algorithm, not fixed per-person colors.** The mockup's demo avatars (`TK`, `KN`, `MW`, `OZ`) use hand-picked colors with no visible formula — but the mockup's spine renderer (`design.html:697-701`, `hashStr`/`spinePalette`) already establishes the app's pattern for "deterministic color from a name." `Avatar` reuses that shape: hash the display name (or email, if no name) to an index into a small fixed palette drawn from the new green/blue tokens, so the same person always gets the same color without per-instance configuration.

## What We're NOT Doing

- **Not building the shelf/spine view or the detail drawer.** Both are S-09, which is blocked on this change landing first. `book-row.tsx` and `discover-book-row.tsx` keep their current list-row structure, just restyled onto `Card`.
- **Not giving `LibraryCard` to `book-row.tsx` or `discover-book-row.tsx`.** `LibraryCard`'s stamp treatment is scoped to what the mockup actually designed it for — request cards, loan-out cards, pending-return cards, and borrowed-by-me cards (Phase 7). Plain book listings use `Card`.
- **Not adding a `notice`/`warning` tone to `EmptyNote`, and not building a separate Notice/Alert primitive.** The one ad-hoc amber banner (`friends/page.tsx`'s not-a-friend redirect notice) keeps its own one-off styling, restyled onto the new tokens, but stays outside the primitive system — recorded as debt, not solved here.
- **Not adding truncation or line-clamp logic to any primitive.** Content wraps naturally, matching how the app already handles long titles/names today (no truncation exists anywhere currently). The mockup's only truncation rule (`.spine-title`'s `text-overflow:ellipsis`) belongs to S-09's spine view, not this change.
- **Not doing a screenshot-based visual check after every phase.** Each phase gets a normal developer manual pass; the full desktop + 375px screenshot sweep across all 8 pages happens once, as the final phase's manual verification.
- **Not installing an icon library or hand-drawing SVG icons.** Nav icons stay the mockup's own choice — emoji, inline in the link label span, exactly as `design.html` specifies. Zero new dependency.
- **Not preserving the `prefers-color-scheme` dark-mode block.** It's vestigial today (no toggle, and currently masked by the dead `Arial` override) and the mockup is a single fixed "paper" theme with no dark variant — dropped as part of the wholesale `globals.css` rewrite `change.md` already commits to.
- **Not changing any server action, repository write path, or `revalidatePath` call.** The one new query (`countBooksForUser`) is additive and read-only, mirroring the existing `countIncomingRequests`/`countPendingReturns` pattern exactly.
- **Not touching `src/app/api/**`** (NextAuth catch-all, `/api/isbn`) — no route handler is presentation.
- **Not changing `middleware.ts` or `auth.config.ts`'s public-path list** — the `(app)` route group is invisible to both; they already match on URL path.

## Implementation Approach

Bottom-up, mirroring how every prior slice has phased: foundational layers first (tokens, fonts), then the primitives that depend on them (isolated, fully spec'd, nothing consumes them yet), then the app shell (sidebar + route-group restructuring + Modal), then feature-by-feature conversion of every consumer, in the order that lets each phase ship a fully-restyled, independently-verifiable vertical slice of the app. `LibraryCard` isn't exercised until Phase 7 (Requests & Borrowing) — it's built and spec'd in Phase 2 like every other primitive, but its real design intent (stamp + rotated label + state-driven tone) only becomes visible once something actually renders it.

## Critical Implementation Details

**Route-group restructuring touches test mirrors too.** Moving `src/app/collection/**` → `src/app/(app)/collection/**` (and discover/friends/requests/borrowing alongside it) means `test/app/collection/**` → `test/app/(app)/collection/**` must move in lockstep, per AGENTS.md's "test mirrors src" rule. Do this as a clean `git mv` per route in Phase 3, not a copy-then-delete — preserves history and avoids a window where both old and new specs exist and double-count.

**The Sidebar Server/Client split changes how badge/count data flows.** Today, `nav.tsx` is one async Server Component that fetches session + both loan counts directly. The new `sidebar.tsx` keeps that same fetching (plus the new book count), but must pass the three counts and session-derived display name down as props to `sidebar-nav.tsx` (the Client Component that needs `usePathname()` for active-state) — `usePathname` cannot run in the Server Component, and `auth()`/repository calls cannot run in the Client Component. Get this boundary right in Phase 3 before any consuming feature phase touches sidebar behavior.

---

## Phase 1: Tokens & Fonts

### Overview

Rewrite `globals.css` wholesale with the new `@theme` palette, swap fonts, and remove the vestigial dark-mode/Arial cruft. No component changes yet — this phase is the foundation every later phase's utility classes (`bg-paper`, `text-ink`, `font-display`, etc.) depend on existing.

### Changes Required:

#### 1. Fonts

**File**: `src/app/layout.tsx`

**Intent**: Replace Geist Sans/Mono with the mockup's three-font system.

**Contract**: `next/font/google` imports change from `Geist`/`Geist_Mono` to `Fraunces` (display), `Inter` (body), and `JetBrains_Mono` (metadata) — all three are available directly from `next/font/google`. Each exposes a CSS variable via its `variable` option (e.g. `--font-fraunces`, `--font-inter`, `--font-jetbrains-mono`), applied as `className`s on `<html>` exactly as Geist's variables are today (`layout.tsx:29`). `RootLayout` no longer renders `<Nav />` — see Phase 3.

#### 2. Design tokens

**File**: `src/app/globals.css`

**Intent**: Full rewrite (not amendment, per `change.md`) of the `@theme` block with the mockup's palette, radius and shadow values, wired to the new font variables.

**Contract**: `@theme inline` gains: `--color-paper`, `--color-paper-card`, `--color-ink`, `--color-ink-soft`, `--color-ink-faint`, `--color-line`; a `--color-green-*` scale (950/800/700/600/500/300/150/100) and `--color-blue-*` scale (700/500/300/100), matching `design.html:19-31` exactly; an `--color-amber-*` pair (700/200) for the decline-button/notice-banner accent, matching `design.html`'s inline `.btn-decline` values (`#8A5A3D`/`#E3D2C4`) since the mockup never promoted these to root variables; `--font-display`/`--font-sans`/`--font-mono` mapped to the three new `next/font` variables (Inter takes the `--font-sans` slot so it becomes the implicit body/default font, matching how Geist Sans is wired today); `--radius-card: 10px`; `--shadow-card`/`--shadow-panel` matching `design.html:38-39`. Remove the `@media (prefers-color-scheme: dark)` block and the `body { font-family: Arial... }` line entirely; `body`'s background/color come from the new `--color-paper`/`--color-ink` tokens instead.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes (behavior-neutral phase — every existing spec must still pass unmodified): `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- Every page's body background is the new paper tone and text renders in Inter (visible via browser devtools computed font-family, since no component yet uses `font-display`/`font-mono` explicitly).
- No console warnings about missing font files or failed Google Fonts fetches.

**Implementation Note**: Pause here for manual confirmation before starting Phase 2.

---

## Phase 2: Design System Primitives

### Overview

Build all 7 primitives in isolation — fully speced, nothing in the app consumes them yet.

### Changes Required:

#### 1. Shared types

**File**: `src/app/_components/design-system.types.ts` (new)

**Intent**: One shared types file for the whole primitive set, matching the existing "one types file per feature/bucket" granularity (`collection.types.ts`, `discover.types.ts`) rather than inventing a per-component convention.

**Contract**: Exports the `as const` + `keyof typeof` variant/tone/size types each primitive needs: `ButtonVariant` (`primary`/`ghost`/`outline-blue`/`decline`), `ButtonSize` (`default`/`sm`), `PillTone` (`active`/`pending`/`mine`), `LibraryCardTone` (`default`/`pending-return`). Field/Card/EmptyNote/Avatar don't need exported variant types (no variant prop), so their prop shapes stay inline in their own component files per the existing convention — only genuinely shared/cross-file types belong here.

#### 2. Button

**File**: `src/app/_components/button.tsx` (new)

**Intent**: One component covering every button-shaped element in the app — solid/outline/decline color variants, default/small sizes, and either a real `<button>` or a `next/link` `<Link>` depending on whether an `href` is passed.

**Contract**: Props: `variant: ButtonVariant`, `size?: ButtonSize` (default `"default"`), `href?: string` (switches to `Link` rendering), plus the union of native `<button>` props (`type`, `onClick`, `disabled`, etc.) when `href` is absent. Visual mapping per variant/size follows `design.html:178-195` (`.btn-primary`/`.btn-ghost`/`.btn-outline-blue`/`.btn-decline`, `.btn-sm`, `.btn:disabled`).

#### 3. Field

**File**: `src/app/_components/field.tsx` (new)

**Intent**: The label+input pattern repeated in every form across the app.

**Contract**: Props: `label: string`, `id: string`, `as?: "input" | "textarea"` (default `"input"`), plus the relevant native props (`name`, `type`, `required`, `placeholder`, `rows`, `value`/`onChange` for controlled usage). Renders `design.html:386-396`'s label+input structure with the new tokens. Does not cover unlabeled/search-style inputs (see Key Discoveries) — those stay bespoke in `discover-search.tsx`.

#### 4. Card

**File**: `src/app/_components/card.tsx` (new)

**Intent**: The shared outer chrome for every list-row and card-shaped container — the single highest-leverage extraction, since 7+ components currently duplicate this wrapper byte-for-byte.

**Contract**: Props: `as?: "li" | "div"` (default `"div"`), `children`. Renders `design.html:294-297`'s card chrome (paper-card background, line border, `--radius-card`, `--shadow-card`, padding) — no internal layout opinion; consumers keep composing their own header/body/actions inside.

#### 5. Pill

**File**: `src/app/_components/pill.tsx` (new)

**Intent**: The small rounded status badge, in the 3 tones the mockup's actual color model supports (see Key Discoveries on the 4→3 compression).

**Contract**: Props: `tone: PillTone`, `children`. Visual mapping: `active` → `design.html:312`'s green pair, `pending` → `design.html:313`'s blue pair, `mine` → `design.html:364`'s paper/line-border neutral pair.

#### 6. EmptyNote

**File**: `src/app/_components/empty-note.tsx` (new)

**Intent**: The empty-state message container, replacing today's bare `<p className="text-sm text-zinc-500">`.

**Contract**: Props: `children`. Renders `design.html:366-369`'s dashed-border, centered, paper-card empty-state box. No tone/variant prop (see What We're NOT Doing).

#### 7. Avatar

**File**: `src/app/_components/avatar.tsx` (new)

**Intent**: The initials circle for a person, wholly new to this codebase.

**Contract**: Props: `name: string` (display name; caller passes email when no name is set, matching how `nav.tsx:91` already falls back today). Computes 2-letter initials (first letter of the first two words; single letter if the name is one word). Background color is chosen deterministically from a hash of `name` into a small fixed palette drawn from the green/blue tokens (see Key Discoveries) — same person always gets the same color, no per-instance color prop needed. Renders `design.html:154-161`'s circle sizing/typography.

#### 8. LibraryCard

**File**: `src/app/_components/library-card.tsx` (new)

**Intent**: The stamp-and-ticket card for requests, loans and returns — the most novel primitive, with no existing analog to generalize from.

**Contract**: Props: `stampLabel: string` (the rotated vertical label — e.g. "Request", "Loaned out", "Return", "With you"; English per `change.md`'s UI-stays-English decision, translating `design.html`'s Polish stamp text), `tone: LibraryCardTone` (`default` green-striped stamp vs. `pending-return` blue-striped stamp, per `design.html:351-355`), `title: string`, `subtitle: string`, `metaLabel?: string` (the uppercase mono meta line, e.g. "REPORTED: 2 DAYS AGO"), `pill?: ReactNode` (slot for a `Pill` instance), `actions?: ReactNode` (slot for one or more `Button`s). Renders `design.html:322-350`'s two-column layout: fixed-width striped stamp strip with the rotated `stampLabel`, and a body column stacking title/subtitle/meta/pill/actions.

#### 9. Specs

**Files**: `test/app/_components/button.spec.tsx`, `field.spec.tsx`, `card.spec.tsx`, `pill.spec.tsx`, `empty-note.spec.tsx`, `avatar.spec.tsx`, `library-card.spec.tsx` (all new)

**Intent**: Full variant coverage, per the agreed testing depth — these primitives get reused 5-20× each, so a broken variant here silently affects every consumer.

**Contract**: jsdom docblock, RTL `render`/`screen`, given/when/then, one behavior per `it` (house style, `test/app/_components/nav.spec.tsx` / `book-row.spec.tsx` as the pattern). Coverage per primitive: `Button` — one `it` per variant asserting the right element (`<button>` vs `<a>` when `href` is set) and disabled state; `Field` — `as="input"` vs `as="textarea"`, label association via `getByLabelText`; `Card` — `as="li"` vs `as="div"`, children render; `Pill` — one `it` per tone; `EmptyNote` — renders children; `Avatar` — initials computed correctly for one-word and multi-word names, same name always yields the same background color across renders; `LibraryCard` — both tones render distinct stamp styling, all slots (`pill`, `actions`, `metaLabel` present/absent) render correctly.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- Not applicable — nothing in the app renders these yet; automated specs are the verification for this phase.

**Implementation Note**: Pause here for manual confirmation before starting Phase 3.

---

## Phase 3: App Shell — Sidebar Nav + Route Groups + Modal

### Overview

Replace the top nav with the dark sidebar, split authenticated pages into an `(app)` route group, and restyle the shared `Modal`. The first phase where the new visual identity becomes visible on a real page.

### Changes Required:

#### 1. Route-group restructuring

**Files**: `src/app/collection/**` → `src/app/(app)/collection/**`, `src/app/discover/**` → `src/app/(app)/discover/**`, `src/app/friends/**` → `src/app/(app)/friends/**`, `src/app/requests/**` → `src/app/(app)/requests/**`, `src/app/borrowing/**` → `src/app/(app)/borrowing/**`, plus their `test/app/**` mirrors

**Intent**: Give authenticated pages a shared layout (the sidebar) without touching public pages. See Key Discoveries and Critical Implementation Details for why this is safe (URL paths unaffected, no middleware/auth-config change needed) and how to execute it (`git mv`, not copy-delete).

**Contract**: Pure directory moves — no file contents change in this step. `src/app/borrow/actions.ts` (server actions, no `page.tsx`) is unaffected and stays where it is.

#### 2. Sidebar

**Files**: `src/app/_components/sidebar.tsx` (new), `src/app/_components/sidebar-nav.tsx` (new); `src/app/_components/nav.tsx` and `test/app/_components/nav.spec.tsx` deleted

**Intent**: Replace the top nav with the dark sidebar shell. Split into a Server Component (data) and a Client Component (interactivity) — see Critical Implementation Details.

**Contract**: `sidebar.tsx` — async Server Component, carries over `nav.tsx`'s `auth()` call and the existing `safeCount()`-guarded `countIncomingRequests`/`countPendingReturns` fetches, plus the new `countBooksForUser` fetch (see change 4 below); renders the brand block (`design.html:470-475`, decorative CSS shape, no image asset), passes session-derived display name + all three counts to `sidebar-nav.tsx`, and renders the sidebar-foot (`Avatar` + name + book count, `design.html:496-502`). Returns `null`/omits sidebar chrome when there's no session — but since the sidebar only lives in `(app)/layout.tsx` now (change 3), an unauthenticated request never reaches it anyway (middleware already redirects to `/login` first).

`sidebar-nav.tsx` — Client Component, receives the 5 static nav routes + the two loan counts as props, uses `usePathname()` to add `.nav-item.active`-equivalent styling (`design.html:130`) to whichever link matches the current route, renders the request-count and return-count badges (as `Pill`, `tone="pending"`) exactly as `nav.tsx:67-82` does today, and keeps the sign-out `"use server"` form (`nav.tsx:93-105`) unchanged.

#### 3. Root & app-group layouts

**Files**: `src/app/layout.tsx`, `src/app/(app)/layout.tsx` (new)

**Intent**: Root layout becomes chrome-free (fonts + html/body only); the sidebar-and-content grid lives only in the new `(app)` group layout.

**Contract**: `src/app/layout.tsx` drops `<Nav />` and any grid/flex wrapper — just `<html>`/`<body>` with the font variable classNames, per `design.html:62-66` NOT applying at this level. `src/app/(app)/layout.tsx` renders `<div className="...">` with the `248px 1fr` grid (`design.html:62-66`, mobile breakpoint at 860px per `design.html:452-463`), `<Sidebar />` as the first grid column, `{children}` as the second.

#### 4. Book count query

**File**: `src/server/book/book.repository.ts`

**Intent**: The one new (read-only, additive) query this change introduces.

**Contract**: `countBooksForUser(userId: string): Promise<number>` — `repo.count({ where: { userId } })`, mirroring `loan.repository.ts`'s `countIncomingRequests`/`countPendingReturns` shape exactly.

#### 5. Modal restyle

**File**: `src/app/_components/modal.tsx`

**Intent**: Remap the shared dialog chrome to the new tokens so it visually composes with `Card` (agreed as in-scope beyond the roadmap's 7 named primitives, since it's shared chrome on the most-used surface in the app).

**Contract**: `modal.tsx:62`'s dialog element and `:64`'s content wrapper move from `zinc`/`white`/`black` values to `--color-paper-card`, `--color-line`, `--shadow-card`-equivalent values; title (`:65-67`) picks up `font-display`. No structural or behavioral change — `showModal()`/`close()`/`canClose` logic untouched.

#### 6. Specs

**Files**: `test/app/_components/sidebar.spec.tsx`, `sidebar-nav.spec.tsx` (new); `test/app/_components/modal.spec.tsx` (unchanged — presentation-only); `test/server/book/book.repository.spec.ts` (extended)

**Contract**: `sidebar.spec.tsx` follows `nav.spec.tsx`'s established pattern (mock `@/auth`, `@/server/loan/loan.repository`, `@/server/book/book.repository`; `render(await Sidebar())`) — same coverage as today's nav spec (session gating, badge show/hide-at-zero, failure-degrades-to-0 for all three counts) plus the new book-count cases. `sidebar-nav.spec.tsx` is a Client Component spec (jsdom) covering active-link styling per route via a mocked `usePathname`. `book.repository.spec.ts` gains one `it`: `countBooksForUser` returns the right count for a user with books and `0` for a user with none.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`
- Every route still resolves to its original URL after the `(app)` move: manually confirmed via `npm run build`'s route listing (no route path changes vs. pre-move)

#### Manual Verification:

- Signed in: sidebar renders on `/collection`, `/discover`, `/friends`, `/requests`, `/borrowing`, with the current page highlighted and the correct request/return/book counts.
- Signed out: `/`, `/login`, `/register` render with no sidebar, centered content only.
- Sign-out from the sidebar still works and redirects to `/`.
- The add/edit book `Modal` visually matches the new Card language.
- Mobile (375px): sidebar collapses to the horizontal scrollable bar per the mockup's 860px breakpoint.

**Implementation Note**: Pause here for manual confirmation before starting Phase 4.

---

## Phase 4: Collection

### Overview

Convert the collection feature onto the new primitives — the first real consumer phase.

### Changes Required:

#### 1. Book display & list

**Files**: `src/app/(app)/collection/_components/book-row.tsx`, `book-list.tsx`

**Intent**: Move the book row onto `Card`; empty state onto `EmptyNote`.

**Contract**: `book-row.tsx`'s outer `<li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">` becomes `<Card as="li">`; Edit/Delete become `Button` instances (`variant="ghost"`/`variant="decline"`, `size="sm"`) replacing today's underlined text links (see Key Discoveries); loan-status text keeps its current treatment (no pill in the mockup for this state). `book-list.tsx`'s empty-state `<p>` becomes `<EmptyNote>`.

#### 2. Add/Edit forms & modals

**Files**: `src/app/(app)/collection/_components/add-book-form.tsx`, `add-book-modal.tsx`, `edit-book-modal.tsx`

**Intent**: Move every field onto `Field`, every button onto `Button` with the mockup's actual variant per role.

**Contract**: Title/Author/Notes fields become `<Field as="input">`/`<Field as="textarea">`. The ISBN input keeps its own row (label + input + button side-by-side, `design.html:657-664`) — `Field` covers the input, the "Look up" button becomes `<Button variant="outline-blue" size="sm">` (matching `design.html:661`'s `.btn-outline-blue.btn-sm` exactly — this is the one button whose mockup-true variant differs from its current ad-hoc "secondary/zinc" styling, see Key Discoveries). Save/Add becomes `<Button variant="primary">`; Cancel becomes `<Button variant="ghost">`. The ISBN confirmation checkbox (added in S-07) keeps its current plain `<input type="checkbox">` — not a primitive, no mockup equivalent to extract from.

#### 3. Page

**File**: `src/app/(app)/collection/page.tsx`

**Intent**: Page heading picks up the new type scale.

**Contract**: `<h1 className="text-2xl font-semibold tracking-tight text-zinc-900">` becomes `<h1 className="font-display text-3xl font-semibold text-ink">` (or the app's chosen heading scale — match `design.html:171`'s `.topbar h1{font-size:30px}`), page wrapper's zinc-900 text token swaps to `text-ink`.

#### 4. Specs

**Files**: `test/app/(app)/collection/_components/*.spec.tsx` (all existing collection specs, moved and unmodified in assertions — only import paths change if any relative imports exist), plus updated mocks if `Button`/`Field`/`Card` need mocking for isolation (unlikely, since these are presentational and RTL renders through them fine)

**Contract**: No new test cases required — existing behavior specs (submit fires the right action, error renders, dirty-check works) continue to pass unmodified against the new markup, since queries are by role/label/text, not by class.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/collection`: add a book (with and without ISBN lookup), edit a book, delete a book — all visually restyled, all behavior identical to before.
- Mobile (375px): the add/edit dialog and book list remain usable.

**Implementation Note**: Pause here for manual confirmation before starting Phase 5.

---

## Phase 5: Friends

### Overview

Convert the friends feature, including componentizing the one inline card that isn't extracted yet.

### Changes Required:

#### 1. Friend & invite rows

**Files**: `src/app/(app)/friends/_components/friend-row.tsx`, `friends-list.tsx`, `received-invite-row.tsx`, `received-invites-list.tsx`

**Intent**: `Card` + `Avatar` + `Button` + `EmptyNote`, matching `design.html:294-314`'s friend-card layout (avatar, name, meta, status chip).

**Contract**: Row containers become `Card`; person initials become `Avatar`; the status chip (`Confirmed`/`Pending`, `design.html:307-313`) becomes `Pill` (`tone="active"`/`tone="pending"`); Accept/Reject/Remove become `Button` (`variant="primary"`/`"decline"`, `size="sm"`) replacing today's text links; empty states become `EmptyNote`.

#### 2. Send-invite form & the inline "Sent" list

**Files**: `src/app/(app)/friends/_components/send-invite-form.tsx`; new `src/app/(app)/friends/_components/sent-invite-row.tsx`, `sent-invites-list.tsx`; `src/app/(app)/friends/page.tsx`

**Intent**: `send-invite-form.tsx` moves onto `Field`/`Button`. The "Sent" invites list (`friends/page.tsx:80-100`), currently inline JSX not its own component, gets extracted into `sent-invite-row.tsx`/`sent-invites-list.tsx` following the exact pattern of `received-invite-row.tsx`/`received-invites-list.tsx` — restyled at the same time it's componentized, since doing it separately would mean writing the old-style markup once just to replace it immediately after.

**Contract**: New files follow the established list/row split (list renders `EmptyNote` when empty, maps rows otherwise; row renders one `Card`). No new behavior — same data, same fields, same (lack of) actions the inline version has today.

#### 3. Page

**File**: `src/app/(app)/friends/page.tsx`

**Intent**: Heading + the ad-hoc amber notice banner (not-a-friend redirect) get new tokens.

**Contract**: Heading matches Phase 4's pattern. The notice banner (`friends/page.tsx:63-69`, `role="alert"`) keeps its bespoke markup (see What We're NOT Doing) but its `amber-200`/`amber-50`/`amber-800` classes swap to the new `--color-amber-*` tokens added in Phase 1.

#### 4. Specs

**Files**: existing friends specs moved (no assertion changes); new `sent-invite-row.spec.tsx`, `sent-invites-list.spec.tsx` (new components need specs per lessons.md)

**Contract**: New specs follow `received-invite-row.spec.tsx`/`received-invites-list.spec.tsx`'s exact pattern (closest sibling).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/friends`: send an invite, accept/reject a received invite, view sent invites, remove a friend — all restyled, all behavior identical.
- Mobile (375px) layout holds.

**Implementation Note**: Pause here for manual confirmation before starting Phase 6.

---

## Phase 6: Discover

### Overview

Convert the discover feature — the one page whose search/filter controls stay bespoke rather than becoming `Field`.

### Changes Required:

#### 1. Book row

**File**: `src/app/(app)/discover/_components/discover-book-row.tsx`

**Intent**: `Card` + `Pill` (3-tone system) + `Button`.

**Contract**: Row container becomes `Card`. Availability badge: `available` → `Pill tone="active"`; both `on_loan` and "requested by viewer" collapse to `Pill tone="pending"` (see Key Discoveries) — the distinguishing information stays in the pill's label text ("On loan" vs. "Requested"), not its color. Borrow button becomes `Button variant="primary" size="sm"`.

#### 2. Search & filter

**File**: `src/app/(app)/discover/_components/discover-search.tsx`

**Intent**: Token-only restyle — search input and friend `<select>` keep their bespoke (unlabeled) shape per Key Discoveries, matching `design.html:601-606`'s `.search-input` styling directly rather than going through `Field`. Empty-results message becomes `EmptyNote`.

**Contract**: `search-input`-equivalent Tailwind classes swap zinc/white values for the new paper/line/ink tokens; structure and `aria-label`s unchanged.

#### 3. Page

**File**: `src/app/(app)/discover/page.tsx`

**Intent**: Heading + legend restyle.

**Contract**: Heading matches established pattern. The availability legend (`design.html:609-612`, two colored dots) gets new token colors matching the 3-tone Pill system (green dot = available, blue dot = unavailable/pending).

#### 4. Specs

**Files**: existing discover specs moved, no assertion changes

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/discover`: switch friends, search/filter, borrow a book — all restyled, all behavior identical. Availability states (available / on loan / requested by you) remain visually distinguishable via label text even though on-loan and requested now share a pill color.
- Mobile (375px) layout holds.

**Implementation Note**: Pause here for manual confirmation before starting Phase 7.

---

## Phase 7: Requests & Borrowing

### Overview

Convert both loan-adjacent features — where `LibraryCard` finally gets used.

### Changes Required:

#### 1. Request cards

**Files**: `src/app/(app)/requests/_components/request-row.tsx`, `requests-list.tsx`

**Intent**: `request-row.tsx` becomes the first real `LibraryCard` consumer.

**Contract**: `request-row.tsx` renders `<LibraryCard stampLabel="Request" tone="default" title={book title} subtitle={requester description} metaLabel={"REPORTED: " + relative date} pill={<Pill tone="pending">Pending</Pill>} actions={approve + decline Buttons} />`, matching `design.html:869-885`'s request-card structure. Approve/Decline become `Button variant="primary"`/`variant="decline"`, `size="sm"`. `requests-list.tsx`'s empty state becomes `EmptyNote`.

#### 2. Pending returns

**File**: `src/app/(app)/requests/_components/pending-return-row.tsx`, `pending-returns-list.tsx`

**Intent**: `LibraryCard` with the `pending-return` (blue-striped) tone.

**Contract**: `<LibraryCard stampLabel="Return" tone="pending-return" ... actions={confirm Button} />`, matching `design.html:908-923`'s pending-return card and `:351-355`'s blue-stamp variant. `pending-returns-list.tsx`'s section heading picks up `font-display`.

#### 3. Loans (outgoing + incoming)

**Files**: `src/app/(app)/borrowing/_components/borrowing-row.tsx`, `borrowing-list.tsx`

**Intent**: `LibraryCard` for both the "books I've lent out" and "books I'm borrowing" cases — `design.html:892-899`'s two datasets (`loanedOut`/`borrowedByMe`) share one card shape with different stamp labels.

**Contract**: Active loan → `stampLabel="Loaned out"`, `tone="default"`; a loan in return-pending state (only relevant on the "lent out" side) → `stampLabel="Return"`, `tone="pending-return"` with a confirm-receipt `Button`; a book borrowed from a friend → `stampLabel="With you"`, `tone="default"`, with a "Mark as returned" `Button variant="outline-blue" size="sm"` (matching `design.html:951`'s `.btn-outline-blue.btn-sm`). `borrowing-list.tsx`'s `<details>` past-loans disclosure and empty states restyle onto the new tokens (disclosure isn't a primitive — no mockup equivalent — just token-level restyle).

#### 4. Pages

**Files**: `src/app/(app)/requests/page.tsx`, `src/app/(app)/borrowing/page.tsx`

**Intent**: Heading + section-heading restyle, matching Phase 4's pattern.

#### 5. Specs

**Files**: existing requests/borrowing specs moved, no assertion changes

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/requests`: approve/decline a request, confirm a pending return — `LibraryCard`'s stamp/tone read correctly for each state.
- `/borrowing`: mark a borrowed book as returned; view past-loans disclosure.
- Mobile (375px) layout holds, including `LibraryCard`'s two-column (stamp + body) structure.

**Implementation Note**: Pause here for manual confirmation before starting Phase 8.

---

## Phase 8: Auth & Home + Final Visual Sweep

### Overview

The last two public pages and the home page, plus the full cross-page verification the whole change has been building toward.

### Changes Required:

#### 1. Auth forms

**Files**: `src/app/login/_components/login-form.tsx`, `src/app/register/_components/register-form.tsx`

**Intent**: `Field` + `Button`, matching Phase 4's form pattern (these forms live outside the `(app)` group, so they get tokens/primitives but never see the sidebar).

**Contract**: Fields become `Field as="input"`; submit becomes `Button variant="primary"` (full-width, matching current `w-full`); the login/register cross-link keeps its current plain-text-with-inline-link structure, restyled onto ink/green tokens.

#### 2. Auth & home pages

**Files**: `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/page.tsx`

**Intent**: Headings pick up `font-display`; home page's two CTA links become `Button href="..." variant="primary"|"ghost"` (see Key Discoveries on Button's `href` mode).

**Contract**: No structural change — same conditional signed-in/signed-out content on the home page, same centered layout (now living outside the `(app)` group's sidebar entirely).

#### 3. Specs

**Files**: existing login/register/home specs, no assertion changes

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`
- Full suite passes: `npm test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/`, `/login`, `/register`: sign in, register, navigate home — restyled, no sidebar, behavior identical.
- **Full 8-page visual sweep** (this change's final manual gate): every page at desktop width and at 375px — `/`, `/login`, `/register`, `/collection`, `/discover`, `/friends`, `/requests`, `/borrowing` — confirming consistent use of tokens/fonts/primitives, no leftover zinc/emerald/blue/amber ad-hoc classes, no layout breakage, and that the two intentional behavior additions (sidebar active-route highlighting, sidebar book count) work correctly across the whole authenticated app.
- Full regression: every pre-existing spec still passes (already covered by Automated Verification, restated here as the plan's closing confirmation that the restyle stayed behavior-neutral).

---

## Testing Strategy

### Unit Tests

- `countBooksForUser`: returns the correct count for a user with books, `0` for a user with none (Phase 3).
- Each of the 7 primitives: full variant/prop coverage as specified in Phase 2's Specs section.
- `sidebar-nav.tsx`: active-link styling applied to the route matching a mocked `usePathname()`, not applied to the others.

### Integration Tests

- `sidebar.tsx`: session gating, all three counts (request/return/book) show/hide/degrade-to-0 correctly — direct port of `nav.spec.tsx`'s existing coverage plus the new count.
- Every existing feature spec (collection, friends, discover, requests, borrowing, auth) continues to pass unmodified against the restyled markup — the primary regression signal for this entire change.

### Manual Testing Steps

1. Sign in; confirm the sidebar renders with the correct active-route highlight on each of the 5 pages.
2. Confirm the sidebar footer shows the correct book count and updates after adding/deleting a book.
3. Walk through the full user journey on `/collection` (add via ISBN + manual, edit, delete), `/friends` (invite, accept, reject, remove), `/discover` (search, filter, borrow), `/requests` (approve, decline), `/borrowing` (mark returned, confirm return) — confirming every action still works and the new primitives render correctly for every state.
4. Sign out; confirm `/`, `/login`, `/register` render without a sidebar, and sign-in/registration still work.
5. Repeat steps 1–4 at a 375px viewport.
6. Full desktop + 375px screenshot sweep of all 8 pages as the final closing check.

## Performance Considerations

Fonts are self-hosted via `next/font/google` (no render-blocking third-party request, per `change.md`'s decision) — no new performance risk. No new client-side JavaScript beyond `sidebar-nav.tsx`'s `usePathname()` subscription, which is minimal. No new database load beyond one additional `COUNT` query per page render (mirroring the two that already exist).

## Migration Notes

Not applicable — no data migration. The one schema-adjacent change (`countBooksForUser`) is a new read query against the existing `books` table, no new column or index.

## References

- Roadmap item: `context/foundation/roadmap.md` → S-08
- Change identity and decisions: `context/changes/design-system/change.md`
- Design source: `context/design/design.html`
- Prerequisite: `context/changes/collection-modals/plan.md` (S-06, the shared `Modal` this change restyles)
- Enum convention precedent: `src/server/loan/loan.types.ts:3-11` (`LoanStatus`)
- Existing badge-count pattern this change extends: `src/app/_components/nav.tsx` (being replaced by `sidebar.tsx`/`sidebar-nav.tsx`)
- Spec house style: `test/app/_components/nav.spec.tsx`, `test/app/collection/_components/book-row.spec.tsx`
- Consumer slice: S-09 `shelf-view`, blocked on this change, builds the shelf/spine view and detail drawer on top of these primitives

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Tokens & Fonts

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit` — 7cdf0df
- [x] 1.2 Linting passes: `npm run lint` — 7cdf0df
- [x] 1.3 Full suite passes: `npm test` — 7cdf0df
- [x] 1.4 Production build passes: `npm run build` — 7cdf0df

#### Manual

- [x] 1.5 Body background/text use the new paper/ink tokens; Inter renders as the default font
- [x] 1.6 No console warnings about fonts

### Phase 2: Design System Primitives

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit` — f9bf3c6
- [x] 2.2 Linting passes: `npm run lint` — f9bf3c6
- [x] 2.3 Full suite passes: `npm test` — f9bf3c6
- [x] 2.4 Production build passes: `npm run build` — f9bf3c6

### Phase 3: App Shell — Sidebar Nav + Route Groups + Modal

#### Automated

- [x] 3.1 Type checking passes: `npx tsc --noEmit`
- [x] 3.2 Linting passes: `npm run lint`
- [x] 3.3 Full suite passes: `npm test`
- [x] 3.4 Production build passes: `npm run build`
- [x] 3.5 Every route resolves to its original URL after the `(app)` move

#### Manual

- [x] 3.6 Signed-in sidebar renders on all 5 authenticated pages with correct active-route highlight and counts
- [x] 3.7 Signed-out pages (`/`, `/login`, `/register`) render with no sidebar
- [x] 3.8 Sign-out from the sidebar works and redirects to `/`
- [x] 3.9 Modal visually matches the new Card language
- [x] 3.10 Sidebar collapses correctly at 375px

### Phase 4: Collection

#### Automated

- [ ] 4.1 Type checking passes: `npx tsc --noEmit`
- [ ] 4.2 Linting passes: `npm run lint`
- [ ] 4.3 Full suite passes: `npm test`
- [ ] 4.4 Production build passes: `npm run build`

#### Manual

- [ ] 4.5 Add (with and without ISBN lookup), edit, delete a book — restyled, behavior identical
- [ ] 4.6 Layout holds at 375px

### Phase 5: Friends

#### Automated

- [ ] 5.1 Type checking passes: `npx tsc --noEmit`
- [ ] 5.2 Linting passes: `npm run lint`
- [ ] 5.3 Full suite passes: `npm test`
- [ ] 5.4 Production build passes: `npm run build`

#### Manual

- [ ] 5.5 Send, accept, reject, view sent, remove — restyled, behavior identical
- [ ] 5.6 Layout holds at 375px

### Phase 6: Discover

#### Automated

- [ ] 6.1 Type checking passes: `npx tsc --noEmit`
- [ ] 6.2 Linting passes: `npm run lint`
- [ ] 6.3 Full suite passes: `npm test`
- [ ] 6.4 Production build passes: `npm run build`

#### Manual

- [ ] 6.5 Search, filter, borrow — restyled; availability states stay distinguishable via label text
- [ ] 6.6 Layout holds at 375px

### Phase 7: Requests & Borrowing

#### Automated

- [ ] 7.1 Type checking passes: `npx tsc --noEmit`
- [ ] 7.2 Linting passes: `npm run lint`
- [ ] 7.3 Full suite passes: `npm test`
- [ ] 7.4 Production build passes: `npm run build`

#### Manual

- [ ] 7.5 Approve/decline a request, confirm a pending return — LibraryCard stamp/tone correct per state
- [ ] 7.6 Mark a borrowed book returned; past-loans disclosure works
- [ ] 7.7 Layout holds at 375px, including LibraryCard's two-column structure

### Phase 8: Auth & Home + Final Visual Sweep

#### Automated

- [ ] 8.1 Type checking passes: `npx tsc --noEmit`
- [ ] 8.2 Linting passes: `npm run lint`
- [ ] 8.3 Full suite passes: `npm test`
- [ ] 8.4 Production build passes: `npm run build`

#### Manual

- [ ] 8.5 Sign in, register, navigate home — no sidebar, behavior identical
- [ ] 8.6 Full 8-page visual sweep at desktop and 375px: consistent tokens/fonts/primitives, no leftover ad-hoc classes, both intentional behavior additions work correctly
- [ ] 8.7 Full regression confirmed (every pre-existing spec passes)
