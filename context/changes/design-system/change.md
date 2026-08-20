---
change_id: design-system
title: "S-08: Design System — tokens, fonts, sidebar shell, reusable primitives"
status: implementing
created: 2026-08-11
updated: 2026-08-20
archived_at: null
roadmap_id: S-08
prd_refs:
  - NFR (browser support / responsive)
prerequisites:
  - collection-modals
---

## Notes

Port the visual identity from `context/design/design.html`: paper-and-green
palette, Fraunces (display) / Inter (body) / JetBrains Mono (metadata), and a
dark 248px sidebar shell replacing the current top nav.

Second half of the change, and the reason it was requested: every reusable UI
element gets extracted into `src/app/_components/` instead of being re-typed per
feature. Seven primitives agreed 2026-08-11 — **Button, Field (label+input),
Card, Pill, LibraryCard, EmptyNote, Avatar**.

Decisions (2026-08-11):
- Tokens go in Tailwind v4's `@theme` block, not loose CSS variables, so they
  generate real utilities (`bg-paper`, `border-line`) rather than forcing
  `[var(--x)]` arbitrary values at every call site.
- Fonts via `next/font/google`, not the mockup's `<link>` to
  fonts.googleapis.com — self-hosted, no render-blocking third-party request.
- **UI stays English.** The mockup's Polish is placeholder; real localisation is
  parked on the roadmap as a separate item.
- Variant props follow the AGENTS.md enum rule: `as const` object plus
  `keyof typeof`, not a bare string union.

`src/app/globals.css` is still the untouched Next.js scaffold (unused
`prefers-color-scheme` block, `body { font-family: Arial }`) and gets rewritten
wholesale rather than amended.

Presentation-only by definition: no server action, repository or
`revalidatePath` call changes. Any existing spec that breaks is evidence of an
accidental behaviour change, not a spec to update.

### Planning decisions (2026-08-19)

Full plan: `context/changes/design-system/plan.md`. Two deliberate, narrow
exceptions to "presentation-only," both agreed during planning:

- **Sidebar active-route highlighting.** The mockup's sidebar highlights the
  current page; today's nav has no such behaviour. Nav splits into
  `sidebar.tsx` (Server Component: session + counts) and `sidebar-nav.tsx`
  (Client Component: `usePathname`-driven active state).
- **Sidebar footer book count.** The mockup shows a live "N books on your
  shelf" count. One new read-only query, `countBooksForUser`, mirrors the
  existing `safeCount()`-guarded pattern `countIncomingRequests`/
  `countPendingReturns` already use.

Other decisions: rollout is primitive-shell-first then feature-by-feature
(8 phases); `book-row`/`discover-book-row` get the plain `Card` primitive,
not `LibraryCard`, since the mockup has no reference for a plain book list
(it jumps straight to S-09's shelf/spines); `LibraryCard`'s stamp treatment
is scoped to requests/loans/returns only; primitive prop types live in one
shared `src/app/_components/design-system.types.ts`; `EmptyNote` stays
empty-state-only (no notice/warning tone); the 7 primitives get full
variant-coverage specs, not smoke tests; no truncation/line-clamp logic is
added anywhere; visual verification is a manual pass per phase plus one
full 8-page screenshot sweep at the end; `Modal` is restyled in-scope to
match the new `Card` language even though it isn't one of the 7 named
primitives; and the sidebar renders only on authenticated pages via a new
`(app)` route group — `/`, `/login`, `/register` stay chrome-free, since the
mockup never designs a signed-out sidebar state.

Also discovered during planning: Pill's colour model compresses from 4
tones (zinc/amber/blue/green) to 3 (green/blue/neutral) — "on loan" and
"requested by viewer" both become the blue "pending" tone, matching the
mockup's actual semantics (blue = not immediately actionable), distinguished
by label text rather than colour.
