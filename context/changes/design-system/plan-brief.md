# S-08: Design System — Plan Brief

> Full plan: `context/changes/design-system/plan.md`

## What & Why

Port the paper-and-green visual identity from `context/design/design.html` across the whole app — new tokens, fonts, a dark sidebar shell replacing the top nav, and 7 reusable primitives (Button, Field, Card, Pill, LibraryCard, EmptyNote, Avatar) — so every repeated UI element exists once instead of being re-typed per feature. Presentation-only by definition, plus two small agreed exceptions.

## Starting Point

24 `_components` files, zero shared primitives, all ad-hoc Tailwind. The ad-hoc styling is unusually consistent (5 button patterns, 1 card-row pattern reused 7×, 5 badge patterns) — a good extraction target. `next/font/google` is already wired up (Geist, currently invisible under a dead `Arial` override). Zero existing specs assert on styling, so the whole suite is a clean regression net.

## Desired End State

Every page carries the new identity: tokens, Fraunces/Inter/JetBrains Mono fonts, a dark sidebar with active-route highlighting and a live book count on every authenticated page, all 23 feature components + Modal rebuilt on the 7 primitives. Public pages (`/`, `/login`, `/register`) get tokens/fonts but no sidebar. No behavior changes beyond the two named additions.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Rollout phasing | Primitives+shell first, then feature-by-feature | Matches how every prior slice (S-01–S-07) was phased — bottom-up, each phase independently verifiable | Plan |
| Nav active-route highlighting | Add it — convert Nav to Server+Client split with `usePathname` | Matches the mockup's clearest wayfinding detail; small, contained interactivity boundary | Plan |
| book-row/discover-book-row interim styling | Plain `Card`, same row layout | Mockup skips straight to shelf spines (S-09's job) — no dedicated reference exists; cheapest, most consistent, naturally throwaway | Plan |
| Sidebar footer book count | In scope — new `countBooksForUser` query | Matches the mockup exactly; mirrors the existing `safeCount()`-guarded badge-count pattern already in Nav | Plan |
| Primitive prop types | One shared `design-system.types.ts` | Matches the existing "one types file per feature/bucket" granularity (`collection.types.ts`) | Plan |
| EmptyNote scope | Empty-state only, no notice/warning tone | Keeps its API single-purpose; the mockup has no warning-box variant to draw from | Plan |
| Primitive test depth | Full variant/prop coverage | These primitives get reused 5–20× each — a broken variant would silently affect many consumers | Plan |
| Long/dynamic content | No truncation logic, natural wrap | Matches how the app already handles this today; no invented constraints | Plan |
| Visual verification | Manual pass per phase + one full 8-page screenshot sweep at the end | Matches this repo's per-phase manual-confirmation convention; automated specs already prove behavior each phase | Plan |
| Modal restyle | In scope, remapped to Card's token language | Shared chrome on the most-used surface (every add/edit) — leaving it unstyled would be jarring | Plan |
| Signed-out nav | Sidebar only on authenticated pages (`(app)` route group); public pages chrome-free | Matches typical dashboard convention; avoids inventing an undesigned sidebar state the mockup never shows | Plan |

## Scope

**In scope:** `@theme` tokens (palette/radius/shadow); font swap to Fraunces/Inter/JetBrains Mono; dark sidebar shell with active-route highlighting and book count; 7 primitives + shared types file; conversion of all 23 feature components + `Modal`; `(app)` route-group restructuring; one new read-only `countBooksForUser` query.

**Out of scope:** shelf/spine view and detail drawer (S-09); `LibraryCard` for plain book listings; a `notice`/`warning` primitive or `EmptyNote` tone; truncation/line-clamp logic; per-phase screenshot ceremony (final sweep only); icon library (emoji stays, per mockup); `prefers-color-scheme` dark mode (dropped, vestigial); any server-action/repository-write/`revalidatePath` change; `middleware.ts`/`auth.config.ts` changes.

## Architecture / Approach

Bottom-up: tokens → primitives (isolated, fully spec'd) → app shell (sidebar + route groups + Modal) → feature-by-feature conversion (Collection → Friends → Discover → Requests & Borrowing → Auth & Home). `LibraryCard` is built in Phase 2 like every other primitive but isn't exercised until Phase 7, where its stamp/tone design actually applies. The sidebar splits into a Server Component (`sidebar.tsx`: session + counts) and a Client Component (`sidebar-nav.tsx`: `usePathname`-driven active state) since `usePathname` can't run server-side and `auth()`/repository calls can't run client-side.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Tokens & Fonts | New `@theme` palette, Fraunces/Inter/JetBrains Mono, dead CSS removed | Low — foundational, no component changes |
| 2. Design System Primitives | Button, Field, Card, Pill, LibraryCard, EmptyNote, Avatar, fully spec'd | LibraryCard is pure invention — no existing markup to generalize from |
| 3. App Shell | Sidebar (Server+Client split), `(app)` route-group move, Modal restyle, book-count query | Route-group move touches every test mirror; Server/Client data-flow boundary must be right |
| 4. Collection | First real consumer phase | ISBN "Look up" button's true mockup variant (`outline-blue`) differs from its current ad-hoc styling |
| 5. Friends | Converts + componentizes the one inline "Sent" list | — |
| 6. Discover | Converts search/filter (bespoke, not Field) + book rows | Pill's 4→3 tone compression (on-loan and requested share blue) |
| 7. Requests & Borrowing | LibraryCard's actual debut | Most novel primitive meeting real dynamic data for the first time |
| 8. Auth & Home + Final Sweep | Last 3 pages + full 8-page visual verification | Closing gate — catches anything the per-phase passes missed |

**Prerequisites:** S-06 `collection-modals` merged (already true — `Modal` exists). A reachable Neon database for the one new repository spec case. Branch `chore/S-08-design-system` (note: a branch of this name already exists in git history but contains only unrelated doc commits already merged to master — safe to reuse or rename at implementation time).
**Estimated effort:** ~8 sessions, one per phase, with a manual verification pause after each.

## Open Risks & Assumptions

- `LibraryCard`'s exact prop shape (stamp label, tone, meta line, pill/actions slots) is a plan-time design decision with no existing code to validate against — real usage in Phase 7 may surface a shape mismatch worth revisiting.
- Pill's 4-tone→3-tone compression (on-loan and requested-by-viewer both become the blue "pending" tone) is a deliberate simplification following the mockup's actual semantic model, but it is a genuine visible change from today's 4-color discover page — flagged for the Phase 6 manual check.
- The `(app)` route-group restructuring is mechanically low-risk (route groups don't affect URLs, confirmed against `middleware.ts`/`auth.config.ts`) but is the widest single file-move in the plan — worth a careful `git mv`-per-route execution in Phase 3 rather than a bulk move.
- No dedicated `research.md` exists for this change — the codebase inventory was gathered fresh during this `/10x-plan` session via parallel sub-agents rather than a separate `/10x-research` pass.

## Success Criteria (Summary)

- Every page visually matches the mockup's paper-and-green identity, fonts, and sidebar shell (authenticated pages) or chrome-free layout (public pages).
- Every pre-existing spec still passes unmodified — proof the restyle stayed behavior-neutral except the two named additions.
- The sidebar's active-route highlight and book count work correctly across all 5 authenticated pages, verified in the final 8-page visual sweep.
