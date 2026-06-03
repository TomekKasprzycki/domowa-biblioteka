# Repository Guidelines

Domowa-biblioteka is a social book-lending web app — Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, deployed to Cloudflare Pages via `@opennextjs/cloudflare`. Solo project.

## Hard Rules

<!-- BEGIN:nextjs-agent-rules -->
**Next.js 15 has breaking changes** — APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

- Never run `wrangler pages deploy` directly — always use `npm run deploy`, which runs the OpenNext Cloudflare build pipeline first.
- Tailwind CSS v4 is in use; class syntax and `@tailwindcss/postcss` config differ from v3 — do not follow v3 docs.
- Use the `@/*` path alias instead of relative `../` imports across `src/` (`@/*` → `./src/*`, see `@tsconfig.json`).

## Project Structure

- `src/app/` — App Router pages and layouts (`layout.tsx`, `page.tsx`)
- `open-next.config.ts` — Cloudflare adapter config
- `wrangler.jsonc` — Cloudflare Worker config (project name: `domowa-biblioteka`)
- `public/` — static assets
- `src/server/` - services for backend operations and repositories. src/server/<feature>/service.ts + repository.ts


## Commands

- `npm run dev` — dev server at localhost:3000 (Cloudflare bindings active via `initOpenNextCloudflareForDev`)
- `npm run build` — Next.js production build
- `npm run lint` — ESLint v9 (`next/core-web-vitals` + `next/typescript`)
- `npm run preview` — OpenNext Cloudflare build + local Miniflare run
- `npm run deploy` — OpenNext Cloudflare build + deploy to Pages (requires `wrangler` login)

## Coding Conventions

- Add `"use client"` only when browser APIs or React hooks are needed.
- Component files: PascalCase (`BookCard.tsx`); route directories: kebab-case (`book-details/`).
- Types or interfaces should be in *.types.ts file
- Use TanstackQuery for fetching, caching, synchronizing and updating server state  (not yet installed)

## Testing

- Every exported function/component must have a spec file
- Use jest  (not yet installed)
- Test should be in test/ folder that will mirror src/ folder
- Test file names should be: feature.spec.ts or Component.spec.tsx
- Helper functions for test should be in test/<feature>/helpers.ts or test/<Component>/helpers.ts
- Global mocks or helpers should be in test/shared/ folder
- Use msw to mock http request  (not yet installed)
- Each it block covers one logical outcome
- When testing feature with different input use it.each

## Commit Guidelines

Single commit in history. Use imperative subject line (`Add login page`). No prefix convention established yet.
