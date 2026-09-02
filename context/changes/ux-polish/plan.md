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

Instead the admin content renders **once**. `ManageInvitesSection` is a Client Component owning the open state: it initialises to closed (mobile-first, and the value the server renders) and, in an effect, syncs to `window.matchMedia("(min-width: 1024px)")` — forcing open at `lg`/`xl` and restoring user-controlled collapse below it. The `<details>` `open` attribute is driven from that state. Consequence to accept: at `lg` the block paints collapsed for one frame before the effect opens it, since the server render cannot know the viewport width.

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

**Contract**: Import `IconButton` from `@/app/_components/icon-button`. Replace `<Button type="submit" variant="decline" size="sm" ...>Remove</Button>` with `<IconButton type="submit" variant="decline" icon="🗑️" label={`Remove ${friend.otherUser.name} as a friend`} disabled={isPending} onClick={...same confirm guard...} />`. Replace `<p className="text-sm text-ink-faint">{friend.otherUser.email}</p>` with the book-count line (`{bookCount} {bookCount === 1 ? "book" : "books"} on their shelf`).

### Success Criteria:

#### Automated Verification:

- `test/app/(app)/friends/_components/friend-row.spec.tsx`: fixture gains `bookCount`; existing "does not submit"/"submits the remove action" assertions still pass unmodified (accessible-name regex `/remove/i` still matches); add an assertion that the rendered button has `title` = the full contextual label and that the email string is no longer present; add an assertion that the book-count text renders.
- `test/app/(app)/friends/_components/friends-list.spec.tsx`: fixture gains `bookCount`; existing assertions pass unmodified.
- `test/app/(app)/friends/page.spec.tsx`: add a mock for `@/server/book/book.repository`'s `countBooksForUser`; assert it's called once per confirmed friend and the resolved count reaches the rendered row.
- `npm run lint` passes.

#### Manual Verification:

- On `/friends`, a confirmed friend's card shows their current book count (matches what their own sidebar shows), not their email.
- Clicking the trash icon on a friend card shows the same confirm dialog as before, with the friend's name in it; cancelling leaves the friend in place, confirming removes them.
- Hovering the trash icon shows a tooltip naming the specific friend, not just "Remove".

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Friends Page Layout — Admin Collapse, 2-Column, Card Grid

### Overview

Restructure `/friends` into a primary "Your friends" region and a collapsible "Manage invites" region (form + Received + Sent), collapsed by default below `lg` and always open in a right column at `lg`/`xl`; restyle all three lists onto a `design.html`-matching narrow-card grid.

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

**Contract**: `"use client"` component — `function ManageInvitesSection({ received, sent }: { received: ReceivedInvite[]; sent: SentInvite[] }): ReactNode`. Renders a `<details>` (via `Section` or its own markup) titled "Manage invites", containing `SendInviteForm`, then a "Received" sub-section wrapping `ReceivedInvitesList`, then a "Sent" sub-section wrapping `SentInvitesList` — both sub-sections passing `headingLevel={3}` (Change 1c). Owns `const [open, setOpen] = useState(false)` plus an effect subscribing to `window.matchMedia("(min-width: 1024px)")` that forces `open` true while the query matches; below `lg` the user's own toggle governs. The `<details>` must reflect state via its `open` prop and update state from its own `toggle` event, so browser-initiated toggles and React state don't diverge (same class of trap as `Modal`/`Drawer`'s `close`-event handling, `modal.tsx:58-61`).

#### 3. Page layout: collapse + 2-column

**File**: `src/app/(app)/friends/page.tsx`

**Intent**: Arrange the page as one column on small/medium screens (admin block collapsed, then "Your friends") and two columns at `lg`/`xl` ("Your friends" left/primary, admin block always-open right, per the confirmed design decision).

**Contract**: Wrap the body in a container that is a single column below `lg` and a two-column grid (`1fr` + a fixed admin column of ~280px) at `lg`/`xl`, aligned to the top. Width budget at exactly 1024px: 248px sidebar (`layout.tsx:9`) + `px-10` padding leaves ~696px, so a 280px admin column gives the friends grid ~390px — one 240px card per row at `lg`, two from ~1180px up. Widening the admin column beyond ~280px pushes the second card further out; that's the tradeoff being priced here. It has exactly two children, in this DOM order: (1) `ManageInvitesSection` (single instance — see Change 2), (2) `FriendsList` inside a non-collapsible `Section title="Your friends"`. Below `lg` they stack in that order, preserving today's admin-content-first ordering. At `lg`/`xl`, grid placement puts `FriendsList` in column 1 and `ManageInvitesSection` in column 2 — use explicit column placement rather than relying on source order, since the admin block comes first in the DOM.

### Success Criteria:

#### Automated Verification:

- New spec `test/app/(app)/friends/_components/manage-invites-section.spec.tsx`: renders with sample Received/Sent data and asserts the invite form, Received heading/rows, and Sent heading/rows are all present, with the sub-headings at level 3.
- `test/app/_components/section.spec.tsx`: existing cases pass unmodified (default stays `h2`); add one case asserting `headingLevel={3}` renders an `h3`.
- `test/app/(app)/friends/page.spec.tsx`: existing notice-banner assertions pass unmodified; add an assertion that the invite form renders exactly once (`getAllByLabelText(/friend's email/i)` has length 1) — the regression guard against a dual-render reappearing and reintroducing duplicate ids.
- `manage-invites-section.spec.tsx` additionally covers the open-state logic with a stubbed `window.matchMedia`: closed by default when the query does not match, forced open when it does.
- All pre-existing friends specs (`friend-row`, `received-invite-row`, `sent-invite-row`, and their list specs) pass unmodified after the card-internal restyle — the proof it stayed presentation-only.
- `npm run lint` passes.

#### Manual Verification:

- Below 1024px width, `/friends` shows "Your friends" as narrow cards, with a closed "Manage invites" section above/below it that expands on click to reveal the invite form, Received, and Sent.
- At 1024px and above, "Manage invites" is always visible in a right-hand column next to "Your friends", with no collapse/expand control needed.
- Typing an email into the invite form and then resizing across the 1024px boundary keeps the typed text (the single-render guarantee) and leaves the form usable, with its label focusing the visible input on click.
- All three friend/invite card grids visually match `design.html`'s narrower card width at a typical desktop viewport, and each card's internals follow the mockup's column layout (avatar+name row, chip, then actions) without crowding at 240px.

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

- [x] 2.1 New spec `test/app/_components/icon-button.spec.tsx` passes (all variants, title, prop forwarding, aria-hidden icon)
- [x] 2.2 `npm run lint` passes

#### Manual

- [ ] 2.3 Hover shows native tooltip with full label text

### Phase 3: Friends — IconButton Adoption & Book Count

#### Automated

- [ ] 3.1 `friend-row.spec.tsx` updated fixture + new assertions pass
- [ ] 3.2 `friends-list.spec.tsx` updated fixture passes
- [ ] 3.3 `page.spec.tsx` `countBooksForUser` mock/assertion passes
- [ ] 3.4 `npm run lint` passes

#### Manual

- [ ] 3.5 Confirmed friend card shows book count, not email
- [ ] 3.6 Remove icon: confirm dialog + tooltip both name the friend
- [ ] 3.7 Cancel/confirm on the remove dialog behaves as before

### Phase 4: Friends Page Layout — Admin Collapse, 2-Column, Card Grid

#### Automated

- [ ] 4.1 New spec `manage-invites-section.spec.tsx` passes
- [ ] 4.2 `section.spec.tsx` passes unmodified plus the new `headingLevel={3}` case
- [ ] 4.3 `page.spec.tsx` single-invite-form assertion passes
- [ ] 4.4 `manage-invites-section.spec.tsx` matchMedia open-state cases pass
- [ ] 4.5 Pre-existing friends row/list specs pass unmodified after the card restyle
- [ ] 4.6 `npm run lint` passes

#### Manual

- [ ] 4.7 Below 1024px: collapsed "Manage invites" expands/collapses correctly above narrow "Your friends" cards
- [ ] 4.8 At/above 1024px: "Manage invites" always visible in right column, no collapse control
- [ ] 4.9 Typed invite-form input survives resizing across 1024px; label focuses the visible input
- [ ] 4.10 Card grids and card internals visually match `design.html`'s column-layout cards at 240px
