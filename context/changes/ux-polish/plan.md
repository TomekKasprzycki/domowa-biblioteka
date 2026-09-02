# S-12: Post-Launch UX Polish Implementation Plan

## Overview

Four independent developer notes from `context/design/todo.md` (captured 2026-08-22), scoped to this slice by `change.md`: land users directly on their collection after sign-in instead of an intermediate welcome page; introduce an `IconButton` primitive and adopt it where a bare-text destructive action sits in a tight card layout; and restructure `/friends` so invite management is collapsed by default (always open in a right column at `lg`/`xl`) with narrower, book-count-driven friend cards matching `context/design/design.html`.

## Current State Analysis

- **Home (`/`)**: `src/app/page.tsx` renders a "Welcome back… Go to your collection" branch when `session?.user` is set. Login (`src/app/login/page.tsx` + `_components/login-form.tsx` + `actions.ts`) and register (`src/app/register/actions.ts`) both default/hardcode their post-auth redirect to `/`.
- **IconButton precedent**: no icon library exists in this codebase — nav icons are emoji by deliberate S-08 decision (`context/changes/design-system/plan-brief.md`: "icon library (emoji stays, per mockup)" was explicitly out of scope). `Spine.tsx` already uses the native `title` attribute for a hover tooltip alongside a full `aria-label` — the pattern this plan reuses for `IconButton`.
- **Book actions moved since the todo note was written**: S-09 (`shelf-view`, already `impl_reviewed`) moved book Edit/Delete out of always-visible rows into `Drawer`'s `actionsSlot` — full-width `Button`s, already scoped to one book via the drawer's title header. Per the confirmed design decision below, `IconButton` does **not** touch these; it debuts on Friends' "Remove" action, the one remaining bare-text destructive action in a tight card header (`src/app/(app)/friends/_components/friend-row.tsx`).
- **Friends page** (`src/app/(app)/friends/page.tsx`): four sequential sections — `SendInviteForm`, `ReceivedInvitesList`, `SentInvitesList`, `FriendsList` — each a `flex flex-col gap-3` stack of full-width `Card`s showing the other user's email. `countBooksForUser(userId)` (`src/server/book/book.repository.ts:25`) already exists and takes an arbitrary `userId`, so it's directly reusable per-friend.
- **`Section`** (`src/app/_components/section.tsx`) already supports `collapsible`/`defaultOpen` via a native `<details>`/`<summary>` — reused for the collapsed admin block, but a single `<details>` can't carry two different default-open states for two breakpoints (see Critical Implementation Details).
- **design.html** (`context/design/design.html:290-317`) defines `.friend-grid` as `grid-template-columns: repeat(auto-fill, minmax(240px,1fr))` and shows both pending and confirmed cards sharing one grid class — the reference for the narrower-card restyle.

## Desired End State

- Any authenticated visit to `/` redirects straight to `/collection`; the welcome branch is gone. Login and register land on `/collection` by default; an explicit deep-link `callbackUrl` (e.g. bounced from a protected route) still wins.
- A new `IconButton` primitive exists (`src/app/_components/icon-button.tsx`), spec'd like `Button`, with a required `aria-label` and a native-`title` hover tooltip.
- Friends' "Remove" action is an `IconButton`; "View collection" stays a text `Button`. Confirmed friend cards show `{bookCount} books on their shelf` instead of email; Received/Sent invite cards keep showing email.
- `/friends` groups the invite form, Received, and Sent under one "Manage invites" block that is closed by default below `lg` and always open in a right-hand column at `lg`/`xl`. All three friend/invite lists render as a `minmax(240px,1fr)` card grid matching `design.html`.

### Key Discoveries:

- `src/server/book/book.repository.ts:25` — `countBooksForUser(userId: string)` has no assumption baked in about "the current user," confirmed safe to call once per friend.
- `src/app/(app)/friends/page.tsx:40-57` — `plainFriends`/`plainReceived`/`plainSent` are already built as plain-object mapping arrays server-side before being handed to Client Components; adding a `bookCount` field is an extension of this existing shape, not a new pattern.
- `test/app/(app)/friends/_components/friend-row.spec.tsx:73,86` queries `getByRole("button", { name: /remove/i })` — the regex matches a substring, so the accessible name changing from `"Remove"` to `"Remove {name} as a friend"` (the `IconButton`'s `aria-label`) does not break these two assertions; only the fixture (missing `bookCount`) and the removed-text assertions elsewhere need updates.
- `src/app/globals.css` defines no custom Tailwind breakpoints — `lg`/`xl` are Tailwind v4 defaults (1024px/1280px), matching the todo note's "l i xl" shorthand directly; no breakpoint-mapping decision needed.

## What We're NOT Doing

- Not touching book Edit/Delete inside `Drawer` (`book-row.tsx`) — they stay full-text `Button`s; only Friends' "Remove" adopts `IconButton` (confirmed design decision).
- Not converting "View collection" to an icon — it stays a text `Button` (confirmed design decision).
- Not switching Received/Sent invite cards from email to book count — showing a collection-size signal for a not-yet-confirmed connection would sit next to S-02's confirmed-friends-only visibility invariant; they keep email (confirmed design decision).
- Not backfilling automated specs for `loginAction`/`registerAction`'s `signIn(...)` call — no `next-auth`/`signIn` mocking harness exists anywhere in this codebase yet, and building one is a tooling change of its own (same category of scope trap as the `msw` lesson in `context/foundation/lessons.md`). Their new redirect targets are covered by manual verification in Phase 1 instead; `login/page.tsx`'s default-value logic (no `signIn` involved) does get an automated spec.
- Not reordering `/friends`' sections beyond what's asked — mobile/`md` keeps today's top-to-bottom order (admin block, then friends); only `lg`/`xl` introduces the 2-column split.
- Not rendering the admin block twice to get a per-breakpoint default-open state — a CSS-only dual-render was considered and rejected during plan review (duplicate `id="email"`, split form state); the single-render `matchMedia` approach in Critical Implementation Details is the chosen mechanism.
- Not changing `middleware.ts` or `auth.config.ts` — `/` stays a public path; the redirect happens inside the page component.

## Implementation Approach

Four phases, ordered from smallest/most isolated to the friends-page layout rework, so each is independently verifiable before the next depends on it: (1) the redirect change touches only auth-adjacent pages/actions and has no dependency on the rest; (2) `IconButton` is built and spec'd in isolation with zero adoption; (3) it's adopted in `FriendRow` alongside the book-count swap (both touch that one file); (4) the page-level layout rework — the highest-risk, most novel piece — comes last, once the row-level content it arranges is already in its final shape.

## Critical Implementation Details

### State sequencing — the admin block's responsive default-open state

A single `<details>` element's `open` attribute is one JS/DOM boolean; it cannot be "closed below `lg`, open at `lg`+" through Tailwind classes alone, because Tailwind's responsive variants only toggle CSS, not attribute defaults.

**The obvious workaround — rendering the admin block twice and toggling copies with `lg:hidden` / `hidden lg:block` — is rejected and must not be reintroduced.** Two simultaneously-mounted copies break in two concrete ways: (1) `SendInviteForm` passes a hardcoded `id="email"` to `Field` (`src/app/(app)/friends/_components/send-invite-form.tsx:19`), and `Field` wires `<label htmlFor={id}>` to `<input id={id}>` (`src/app/_components/field.tsx:27-44`), so two copies put two `<input id="email">` in one document — invalid HTML, and the label resolves to the *first* match in DOM order, which would be the `display:none` copy; (2) each copy holds its own `useActionState`, so text typed on one side of the `lg` boundary vanishes when a resize reveals the other copy.

Instead the admin content renders **once**. `ManageInvitesSection` is a Client Component reading `window.matchMedia("(min-width: 1024px)")` via `useSyncExternalStore` (not `useState` + an effect calling `setOpen` synchronously — that trips this repo's `react-hooks/set-state-in-effect` lint rule; see Phase 4, Change 2's implementation note for the adaptation made during implementation) — forcing `open` true at `lg`/`xl` and deferring to a small separate `manuallyOpen` state below it. The `<details>` `open` attribute is driven from `isLargeScreen || manuallyOpen`. Because `useSyncExternalStore`'s snapshot is read synchronously on first client render rather than after mount in an effect, there's no "closed for one frame" flash at `lg` — an improvement over the plan's original design, not a tradeoff to accept.

## Phase 1: Post-Login Redirect

### Overview

Remove the home page's logged-in branch and repoint login/register's default post-auth destination from `/` to `/collection`, while preserving explicit deep-link `callbackUrl` handling.

### Changes Required:

#### 1. Home page redirect

**File**: `src/app/page.tsx`

**Intent**: An authenticated visit to `/` (typed URL, bookmark, logo click) goes straight to `/collection` instead of rendering the "Welcome back" branch, which is being removed entirely. The unauthenticated branch (title, `accountDeleted` flash message, Create account/Sign in buttons) is unchanged.

**Contract**: After `const session = await auth();`, call `redirect("/collection")` (from `next/navigation`) when `session?.user` is set, before rendering. Delete the `session?.user ? (...) : (...)` conditional's truthy branch and render the existing falsy-branch JSX unconditionally.

#### 2. Login default redirect target

**File**: `src/app/login/page.tsx`

**Intent**: When a user reaches `/login` with no `callbackUrl` query param (the normal "I want to sign in" path, not a bounce-back from a protected route), the form should target `/collection` instead of `/`.

**Contract**: Change the `LoginForm callbackUrl={callbackUrl ?? "/"}` default to `callbackUrl ?? "/collection"`. An explicit `?callbackUrl=...` from `authorized()`'s redirect-to-`/login` behavior is untouched.

#### 3. Login action fallback

**File**: `src/app/login/actions.ts`

**Intent**: Keep the server action's own fallback (used if `callbackUrl` is ever missing from the submitted form data) consistent with the page's new default, for defense in depth.

**Contract**: Change `let callbackUrl = (formData.get("callbackUrl") as string) || "/";` to fall back to `"/collection"`. The existing `startsWith("/")` / `startsWith("//")` open-redirect guard is unchanged.

#### 4. Register redirect target

**File**: `src/app/register/actions.ts`

**Intent**: A freshly registered, auto-signed-in user lands on their (empty) collection rather than the home page.

**Contract**: Change `signIn("credentials", { email, password, redirectTo: "/" })` to `redirectTo: "/collection"`.

### Success Criteria:

#### Automated Verification:

- New spec `test/app/page.spec.tsx`: mocks `@/auth` and `next/navigation`'s `redirect`; asserts `redirect("/collection")` is called when a session is present, and that the welcome/Create-account content renders (no redirect call) when it isn't; asserts the `accountDeleted=1` flash message still renders in the signed-out case.
- New spec `test/app/login/page.spec.tsx`: must `jest.mock("@/app/login/actions", ...)` before importing the page (`LoginForm` imports `loginAction`, which pulls `signIn` from `@/auth` — every existing component spec here mocks its actions module first, e.g. `friend-row.spec.tsx:6-11`). Renders `LoginPage` with no `callbackUrl` search param and asserts the form's hidden `callbackUrl` input defaults to `/collection`; renders with an explicit `callbackUrl` and asserts that value passes through unchanged.
- `npm run lint` passes.

#### Manual Verification:

- Signing in with no prior deep link lands on `/collection`.
- Registering a new account lands on `/collection`.
- Being redirected to `/login?callbackUrl=/requests` by the auth middleware (visit a protected route while signed out) and then signing in lands on `/requests`, not `/collection`.
- Visiting `/` while already signed in redirects immediately to `/collection` with no flash of the old welcome content.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: IconButton Primitive

### Overview

Add a new, isolated `IconButton` component: an emoji icon wrapped in a `<button>` whose accessible name and hover tooltip both come from a required `label` prop. No adoption in this phase.

### Changes Required:

#### 1. IconButton component

**File**: `src/app/_components/icon-button.tsx`

**Intent**: A compact, icon-only action button for contexts where a full-text `Button` doesn't fit — following the todo's requirement that the label "not only describe the function but carry context" (e.g. "Remove Friendly Person as a friend", not just "Remove"). Button-only (no link variant — no current use case needs it, unlike `Button`).

**Known limitation (accepted)**: a native `title` tooltip never fires on touch, and AGENTS.md:35 mandates mobile-first — so on the primary target a sighted user sees only the glyph. Screen-reader users are covered by `aria-label`, and every destructive adopter keeps its `window.confirm` guard naming the subject, which is what catches a mis-tap. Do not add a custom tap-to-reveal tooltip in this slice.

**Contract**: `type IconButtonProps = { icon: ReactNode; label: string; variant: ButtonVariant; size?: ButtonSize; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title">`, exported from the component file (matching `Button`'s own local-type convention — `design-system.types.ts` only holds the cross-cutting enums, not every component's prop shape). Renders a `<button aria-label={label} title={label} ...>`; the icon itself renders inside an `aria-hidden="true"` wrapper span so the accessible name isn't duplicated. Reuses `ButtonVariant`'s color language for the icon's text/hover color (no border/background chrome by default, unlike `Button`) and `ButtonSize` for padding, both imported from `design-system.types.ts`.

### Success Criteria:

#### Automated Verification:

- New spec `test/app/_components/icon-button.spec.tsx`: for each `ButtonVariant`, renders and asserts `getByRole("button", { name: <label> })` is found; asserts the rendered button has a `title` attribute equal to `label`; asserts `disabled`/`onClick`/`type="submit"` props forward correctly (mirroring `test/app/_components/button.spec.tsx`'s structure); asserts the icon content is present but wrapped in an element with `aria-hidden="true"`.
- `npm run lint` passes.

#### Manual Verification:

- Hovering the component in a throwaway page/Storybook-less manual check shows the native tooltip with the full label text. **Deferred by user decision during implementation** — no real adopter exists until Phase 3, and Phase 3's manual step 3.6 (hover the real "Remove" trash icon on `/friends`) is a strict superset of this check with real usage; building throwaway scaffolding here would be pure busywork. Progress row 2.3 is closed out when 3.6 is confirmed, not before.

**Implementation Note**: After completing this phase's automated verification, no isolated manual check remains for this phase — see the deferral note above. Proceed directly to the commit step.

---

## Phase 3: Friends — IconButton Adoption & Book Count

### Overview

Convert `FriendRow`'s "Remove" action to `IconButton` and swap confirmed friends' displayed email for their live book count.

**Scope addition during manual verification (not in the reviewed plan):** while manually testing this phase, the developer asked for the destructive-action confirmation to use app-styled modals instead of the native `window.confirm()` dialog — and, when offered a choice between scoping that to Remove-friend only or an app-wide replacement, chose app-wide. This added Change 4 below (a new `ConfirmModal` primitive) and touches 4 files this phase's plan never named: `src/app/(app)/collection/_components/book-row.tsx`, `edit-book-modal.tsx`, `add-book-modal.tsx`, and `src/app/(app)/borrowing/_components/borrowing-row.tsx` — every remaining `window.confirm()` call site in the codebase (confirmed via `grep -rn "window.confirm" src/`, now zero matches after the migration). None of these files belong to S-12's scope on paper; they're touched here because the alternative — a styled dialog only for the one action this phase happens to touch — would have shipped visibly inconsistent confirmation UX on the very next screen over.

### Changes Required:

#### 1. Friend type gains a book count

**File**: `src/app/(app)/friends/friends.types.ts`

**Intent**: Confirmed friends' rows need a per-friend book count; Received/Sent invites do not (they keep showing email — confirmed design decision).

**Contract**: Add `bookCount: number` to the `Friend` type's `otherUser` object. `ReceivedInvite`/`SentInvite` are unchanged.

#### 2. Friends page fetches book counts

**File**: `src/app/(app)/friends/page.tsx`

**Intent**: Attach each confirmed friend's current shelf size when building `plainFriends`, reusing the same repository query the sidebar already uses for the signed-in user's own count.

**Contract**: Import `countBooksForUser` from `@/server/book/book.repository`. Build `plainFriends` via `Promise.all(friends.map(async (c) => { ...; const bookCount = await countBooksForUser(other.id); return { ...}; }))`, adding `bookCount` into `otherUser`. `plainReceived`/`plainSent` mapping is unchanged.

#### 3. FriendRow: IconButton + book count

**File**: `src/app/(app)/friends/_components/friend-row.tsx`

**Intent**: Replace the text "Remove" `Button` with an `IconButton` carrying a context-specific label; replace the visible email line with the book count, phrased like the sidebar's existing "X book(s) on your shelf" copy.

**Contract**: Import `IconButton` from `@/app/_components/icon-button`. Replace `<Button type="submit" variant="decline" size="sm" ...>Remove</Button>` with `<IconButton type="button" variant="decline" icon="🗑️" label={`Remove ${friend.otherUser.name} as a friend`} disabled={isPending} onClick={() => setConfirmOpen(true)} />` (superseded from a synchronous `window.confirm` guard to opening a `ConfirmModal` — see Change 4). Replace `<p className="text-sm text-ink-faint">{friend.otherUser.email}</p>` with the book-count line (`{bookCount} {bookCount === 1 ? "book" : "books"} on their shelf`).

#### 4. ConfirmModal primitive + app-wide `window.confirm()` replacement

**Files**: `src/app/_components/confirm-modal.tsx` (new); call-site migrations in `src/app/(app)/friends/_components/friend-row.tsx`, `src/app/(app)/collection/_components/book-row.tsx`, `edit-book-modal.tsx`, `add-book-modal.tsx`, and `src/app/(app)/borrowing/_components/borrowing-row.tsx`

**Intent**: Replace the native `window.confirm()` dialog everywhere it's used with an app-styled modal, built on the existing `Modal` primitive. See the scope-addition note above.

**Contract**: `ConfirmModal({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", confirmVariant = "decline", onConfirm, onCancel })` wraps `Modal` with a message paragraph and two `Button`s. Two distinct call-site shapes, since `window.confirm()` was synchronous and a modal isn't:
- **Destructive-action guards** (friend-row, book-row, borrowing-row): the trigger `Button`/`IconButton` changes from `type="submit"` with an `onClick` guard to `type="button"` with `onClick={() => setConfirmOpen(true)}`; the form gains a `ref`; `ConfirmModal`'s `onConfirm` calls `formRef.current?.requestSubmit()` (jsdom 26 and all real browsers support this) and closes the confirm modal; `onCancel` just closes it.
- **Discard-guards** (`edit-book-modal.tsx`, `add-book-modal.tsx`, both driving `Modal`'s synchronous `canClose` prop): `canClose` cannot itself await a modal, so it always vetoes (`return false`) while dirty and opens a `ConfirmModal` as a side effect; that modal's `onConfirm` calls the real `onClose`/`close` callback directly, bypassing `canClose` entirely, since a programmatic close is exempt from the guard by design (see `modal.tsx`'s existing `canClose` contract comment).

### Success Criteria:

#### Automated Verification:

- `test/app/(app)/friends/_components/friend-row.spec.tsx`: fixture gains `bookCount`; confirm-flow tests rewritten for the modal (open → Cancel → not called; open → Remove → called once); add an assertion that the rendered button has `title` = the full contextual label and that the email string is no longer present; add an assertion that the book-count text renders.
- `test/app/(app)/friends/_components/friends-list.spec.tsx`: fixture gains `bookCount`; existing assertions pass unmodified.
- `test/app/(app)/friends/page.spec.tsx`: add a mock for `@/server/book/book.repository`'s `countBooksForUser`; assert it's called once per confirmed friend and the resolved count reaches the rendered row.
- New spec `test/app/_components/confirm-modal.spec.tsx`: open/closed state, title/message rendering, default vs. custom labels, `onConfirm`/`onCancel` firing on button click and backdrop click.
- `test/app/(app)/collection/_components/book-row.spec.tsx`, `edit-book-modal.spec.tsx`, `add-book-modal.spec.tsx`, `test/app/(app)/borrowing/_components/borrowing-row.spec.tsx`: confirm-flow tests rewritten for the modal flow (all pre-existing non-confirm assertions pass unmodified).
- `grep -rn "window.confirm" src/` returns zero matches.
- `npm run lint` passes.
- `npx tsc --noEmit` shows no new errors.

#### Manual Verification:

- On `/friends`, a confirmed friend's card shows their current book count (matches what their own sidebar shows), not their email.
- Clicking the trash icon on a friend card opens a styled confirm modal naming the friend; Cancel leaves the friend in place, confirming removes them.
- Hovering the trash icon shows a tooltip naming the specific friend, not just "Remove".
- Deleting a book, marking a borrowed book returned, and discarding a dirty add/edit-book form all show the same styled `ConfirmModal` (not the browser's native dialog), with correct copy per action.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Friends Page Layout — Admin Collapse, 2-Column, Card Grid

### Overview

Restructure `/friends` into a primary "Your friends" region and a collapsible "Manage invites" region (form + Received + Sent), collapsed by default below `lg` and always open in a right column at `lg`/`xl`; restyle all three lists onto a `design.html`-matching narrow-card grid.

**Scope addition during manual verification (not in the reviewed plan):** the developer asked for `<main>` to reach the right edge of the viewport instead of stopping at the `max-w-[1180px]` cap. That cap lives in the shared `(app)` route-group layout (`src/app/(app)/layout.tsx`), used by every authenticated page — collection, friends, discover, requests, borrowing, account — not just `/friends`. Offered a choice between an app-wide removal and a `/friends`-only override, the developer chose app-wide. Change 4 below removes the cap; it touches one file outside this phase's original list and affects every authenticated page's content width, not only the one this phase is otherwise scoped to.

### Changes Required:

#### 1. Card-grid restyle across all three lists

**Files**: `src/app/(app)/friends/_components/friends-list.tsx`, `received-invites-list.tsx`, `sent-invites-list.tsx`

**Intent**: Replace the current `flex flex-col gap-3` full-width stack with `design.html`'s `.friend-grid` pattern so cards sit side-by-side and shrink to their content width on wide screens.

**Contract**: Change each `<ul className="flex flex-col gap-3">` to a grid equivalent of `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` (Tailwind's arbitrary-value grid utilities). `EmptyNote` fallback rendering is unchanged.

#### 1b. Card-internal restyle to the mockup's column layout

**Files**: `src/app/(app)/friends/_components/friend-row.tsx`, `received-invite-row.tsx`, `sent-invite-row.tsx`

**Intent**: A 240px cell can't hold today's horizontal `justify-between` header (avatar + name pushed against a `Pill`) without crowding or wrapping. `design.html`'s `.friend-card` is `flex-direction: column` (`design.html:294-297`) — avatar+name row, then the status chip, then actions — which is the layout the 240px width was designed around. Without this, Change 1's grid produces cramped cards rather than the mockup's.

**Contract**: In each of the three rows, restructure the card body from `flex items-start justify-between gap-4` (header) + separate action row into the mockup's vertical stack: a `.friend-top`-equivalent row (avatar + name/meta), then the `Pill` as a self-start chip on its own line, then the actions row. `Card`, `Avatar`, and `Pill` themselves are unchanged — only the arrangement inside each row component. Behavior (actions, confirm guards, error regions) is untouched: any existing spec that breaks is evidence of an accidental behavior change, not a spec to update (same rule S-08 and S-09 applied to their restyles).

#### 1c. Section gains a heading level

**File**: `src/app/_components/section.tsx`

**Intent**: `Section` hardcodes `<h2>` (`section.tsx:17,26`). Nesting the "Received"/"Sent" sections inside the "Manage invites" section would put an `h2` inside an `h2` under the page's `h1` — a heading-hierarchy regression introduced by this restructure.

**Contract**: Add an optional `headingLevel?: 2 | 3` prop (default `2`, so every existing call site is unaffected) that selects the rendered heading tag in both the collapsible and non-collapsible branches. The two nested sub-sections in Change 2 pass `3`.

#### 2. Admin block component

**File**: `src/app/(app)/friends/_components/manage-invites-section.tsx` (new)

**Intent**: Bundle `SendInviteForm` + a "Received" sub-heading/list + a "Sent" sub-heading/list into one block that renders exactly once and owns its own responsive open state (see Critical Implementation Details for why a single render is mandatory).

**Contract**: `"use client"` component — `function ManageInvitesSection({ received, sent }: { received: ReceivedInvite[]; sent: SentInvite[] }): ReactNode`. Renders a `<details>` (via `Section` or its own markup) titled "Manage invites", containing `SendInviteForm`, then a "Received" sub-section wrapping `ReceivedInvitesList`, then a "Sent" sub-section wrapping `SentInvitesList` — both sub-sections passing `headingLevel={3}` (Change 1c).

**Implementation note (adapted from the original Contract during Phase 4):** the plan as reviewed specified a `useState` + effect calling `setOpen(mediaQuery.matches)` synchronously in the effect body. That trips this repo's `react-hooks/set-state-in-effect` lint rule (a real, correct finding — setState directly in an effect body, not inside a subscription callback, causes an extra cascading render). The implemented version instead reads `window.matchMedia("(min-width: 1024px)")` via `useSyncExternalStore` — React's purpose-built hook for exactly this "external browser API" case, with an SSR-safe `getServerSnapshot` returning `false` (mobile-first default). A separate small `useState` (`manuallyOpen`) tracks the user's own toggle, meaningful only below `lg`; the `<details>`'s displayed `open` is `isLargeScreen || manuallyOpen`, so a stray click at `lg`/`xl` has no visible effect since `isLargeScreen` keeps forcing it open. Net behavior is identical to the reviewed Contract (closed by default below `lg`, forced open at `lg`/`xl`, user-toggle-driven below it) — only the mechanism changed, and it removes the "one frame closed before opening" flash the original design accepted, since `useSyncExternalStore`'s snapshot is read synchronously on the client's first render rather than after mount in an effect.

#### 3. Page layout: collapse + 2-column

**File**: `src/app/(app)/friends/page.tsx`

**Intent**: Arrange the page as one column on small/medium screens (admin block collapsed, then "Your friends") and two columns at `lg`/`xl` ("Your friends" left/primary, admin block always-open right, per the confirmed design decision).

**Contract**: Wrap the body in a container that is a single column below `lg` and a two-column grid (`1fr` + a fixed admin column of ~280px) at `lg`/`xl`, aligned to the top. Width budget at exactly 1024px: 248px sidebar (`layout.tsx:9`) + `px-10` padding leaves ~696px, so a 280px admin column gives the friends grid ~390px — one 240px card per row at `lg`, two from ~1128px up (independent of Change 4 below — that threshold sits under the old 1180px cap either way). Widening the admin column beyond ~280px pushes the second card further out; that's the tradeoff being priced here. It has exactly two children, in this DOM order: (1) `ManageInvitesSection` (single instance — see Change 2), (2) `FriendsList` inside a non-collapsible `Section title="Your friends"`. Below `lg` they stack in that order, preserving today's admin-content-first ordering. At `lg`/`xl`, grid placement puts `FriendsList` in column 1 and `ManageInvitesSection` in column 2 — use explicit column placement rather than relying on source order, since the admin block comes first in the DOM.

#### 4. `<main>` reaches the viewport's right edge (app-wide)

**File**: `src/app/(app)/layout.tsx`

**Intent**: See the scope-addition note above — `<main>` should no longer stop at a fixed 1180px content width; it should grow with the viewport like the sidebar column already does.

**Contract**: Remove `max-w-[1180px]` from `<main>`'s className (`layout.tsx:11`); keep `min-w-0` (still needed so flex/grid children inside `<main>` can shrink below their content size) and all padding classes unchanged. Affects every authenticated page, not only `/friends` — on very wide viewports, pages with narrower natural content (forms, single-column lists) will now have more surrounding whitespace rather than a hard-stopped column; no page's internal layout assumes the old cap.

### Success Criteria:

#### Automated Verification:

- New spec `test/app/(app)/friends/_components/manage-invites-section.spec.tsx`: renders with sample Received/Sent data and asserts the invite form, Received heading/rows, and Sent heading/rows are all present, with the sub-headings at level 3.
- `test/app/_components/section.spec.tsx`: existing cases pass unmodified (default stays `h2`); add one case asserting `headingLevel={3}` renders an `h3`.
- `test/app/(app)/friends/page.spec.tsx`: existing notice-banner assertions pass unmodified; add an assertion that the invite form renders exactly once (`getAllByLabelText(/friend's email/i)` has length 1) — the regression guard against a dual-render reappearing and reintroducing duplicate ids.
- `manage-invites-section.spec.tsx` additionally covers the open-state logic with a stubbed `window.matchMedia`: closed by default when the query does not match, forced open when it does.
- All pre-existing friends specs (`friend-row`, `received-invite-row`, `sent-invite-row`, and their list specs) pass unmodified after the card-internal restyle — the proof it stayed presentation-only.
- Full test suite passes unmodified after removing `max-w-[1180px]` from `layout.tsx` (no spec asserts on that class; confirms no page's tests depended on the cap).
- `npm run lint` passes.

#### Manual Verification:

- Below 1024px width, `/friends` shows "Your friends" as narrow cards, with a closed "Manage invites" section above/below it that expands on click to reveal the invite form, Received, and Sent.
- At 1024px and above, "Manage invites" is always visible in a right-hand column next to "Your friends", with no collapse/expand control needed.
- Typing an email into the invite form and then resizing across the 1024px boundary keeps the typed text (the single-render guarantee) and leaves the form usable, with its label focusing the visible input on click.
- All three friend/invite card grids visually match `design.html`'s narrower card width at a typical desktop viewport, and each card's internals follow the mockup's column layout (avatar+name row, chip, then actions) without crowding at 240px.
- `<main>` reaches the viewport's right edge on `/friends` and at least one other authenticated page (e.g. `/collection`) at a wide viewport, with no leftover fixed-width gap.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. This is the final phase — confirm the whole slice against the five todo.md items before closing it out.

---

## Testing Strategy

### Unit Tests:

- `IconButton`: full `ButtonVariant` coverage, accessible-name/tooltip correctness, prop forwarding — mirrors `Button`'s existing spec structure.
- `FriendRow`: book-count rendering, `IconButton` label content, confirm-dialog guard still works post-conversion.
- `ManageInvitesSection`: renders its three sub-parts given sample data.

### Integration Tests:

- `FriendsPage`: `countBooksForUser` is invoked once per confirmed friend and the count reaches the row; both admin-block render paths are present in the DOM.

### Manual Testing Steps:

1. Sign in with no deep link → land on `/collection`.
2. Register a new account → land on `/collection`.
3. Get redirected to `/login?callbackUrl=/requests` (visit a protected page signed out) → sign in → land on `/requests`.
4. On `/friends`, verify a confirmed friend's card shows a book count matching their own sidebar, and the trash-icon tooltip/confirm dialog names them specifically.
5. Resize `/friends` across the 1024px boundary and confirm the collapse/2-column behavior described above.

## Performance Considerations

`countBooksForUser` runs once per confirmed friend via `Promise.all` (an N+1-shaped query, same pattern the page already uses for its three top-level fetches). Friend-list sizes in this app are small (personal social graphs, not a public directory), so this is consistent with the existing acceptable-N+1 precedent (`sidebar.tsx`'s own `safeCount` calls) rather than a new performance risk.

## Migration Notes

None — no schema or data changes.

## References

- Related roadmap entry: `context/foundation/roadmap.md` (S-12)
- Developer notes: `context/design/todo.md:2,6-9`
- Design reference: `context/design/design.html:290-317,540-589`
- Prior slice this depends on visually: `context/changes/shelf-view/plan.md` (S-09, moved book actions into `Drawer`)
- Prior slice this extends: `context/changes/design-system/plan.md` (S-08, established `Button`/`Section`/token conventions)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Post-Login Redirect

#### Automated

- [x] 1.1 New spec `test/app/page.spec.tsx` passes (redirect + welcome content + accountDeleted flash) — 65b24b6
- [x] 1.2 New spec `test/app/login/page.spec.tsx` passes (default + explicit callbackUrl) — 65b24b6
- [x] 1.3 `npm run lint` passes — 65b24b6

#### Manual

- [x] 1.4 Sign-in with no deep link lands on `/collection` — 65b24b6
- [x] 1.5 Registering lands on `/collection` — 65b24b6
- [x] 1.6 Deep-link callbackUrl (e.g. `/requests`) still honored after sign-in — 65b24b6
- [x] 1.7 Visiting `/` while signed in redirects immediately, no welcome-content flash — 65b24b6

### Phase 2: IconButton Primitive

#### Automated

- [x] 2.1 New spec `test/app/_components/icon-button.spec.tsx` passes (all variants, title, prop forwarding, aria-hidden icon) — 3688cfb
- [x] 2.2 `npm run lint` passes — 3688cfb

#### Manual

- [x] 2.3 Hover shows native tooltip with full label text — 604820e

### Phase 3: Friends — IconButton Adoption & Book Count

#### Automated

- [x] 3.1 `friend-row.spec.tsx` updated fixture + new assertions pass — 604820e
- [x] 3.2 `friends-list.spec.tsx` updated fixture passes — 604820e
- [x] 3.3 `page.spec.tsx` `countBooksForUser` mock/assertion passes — 604820e
- [x] 3.4 `npm run lint` passes — 604820e
- [x] 3.8 New spec `confirm-modal.spec.tsx` passes — 604820e
- [x] 3.9 `book-row.spec.tsx`, `edit-book-modal.spec.tsx`, `add-book-modal.spec.tsx`, `borrowing-row.spec.tsx` confirm-flow tests pass against the modal flow; all other assertions unmodified — 604820e
- [x] 3.10 `grep -rn "window.confirm" src/` returns zero matches — 604820e
- [x] 3.11 `npx tsc --noEmit` shows no new errors — 604820e

#### Manual

- [x] 3.5 Confirmed friend card shows book count, not email — 604820e
- [x] 3.6 Remove icon: confirm modal + tooltip both name the friend — 604820e
- [x] 3.7 Cancel/confirm on the remove modal behaves as before — 604820e
- [x] 3.12 Book delete, mark-returned, and discard-dirty-form all show the styled ConfirmModal with correct per-action copy — 604820e

### Phase 4: Friends Page Layout — Admin Collapse, 2-Column, Card Grid

#### Automated

- [x] 4.1 New spec `manage-invites-section.spec.tsx` passes — 2db2a1c
- [x] 4.2 `section.spec.tsx` passes unmodified plus the new `headingLevel={3}` case — 2db2a1c
- [x] 4.3 `page.spec.tsx` single-invite-form assertion passes — 2db2a1c
- [x] 4.4 `manage-invites-section.spec.tsx` matchMedia open-state cases pass — 2db2a1c
- [x] 4.5 Pre-existing friends row/list specs pass unmodified after the card restyle — 2db2a1c
- [x] 4.6 `npm run lint` passes — 2db2a1c
- [x] 4.11 Full suite passes unmodified after removing `max-w-[1180px]` from `layout.tsx` — 2db2a1c

#### Manual

- [x] 4.7 Below 1024px: collapsed "Manage invites" expands/collapses correctly above narrow "Your friends" cards — 2db2a1c
- [x] 4.8 At/above 1024px: "Manage invites" always visible in right column, no collapse control — 2db2a1c
- [x] 4.9 Typed invite-form input survives resizing across 1024px; label focuses the visible input — 2db2a1c
- [x] 4.12 `<main>` reaches the viewport's right edge on `/friends` and at least one other page at a wide viewport — 2db2a1c
- [x] 4.10 Card grids and card internals visually match `design.html`'s column-layout cards at 240px — 2db2a1c
