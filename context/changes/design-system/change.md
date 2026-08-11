---
change_id: design-system
title: "S-08: Design System — tokens, fonts, sidebar shell, reusable primitives"
status: new
created: 2026-08-11
updated: 2026-08-11
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
