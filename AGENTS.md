# Repository Guidelines

Domowa-biblioteka is a social book-lending web app — Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, deployed to Vercel. Solo project.

## Hard Rules

<!-- BEGIN:nextjs-agent-rules -->
**Next.js 15 has breaking changes** — APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

- Tailwind CSS v4 is in use; class syntax and `@tailwindcss/postcss` config differ from v3 — do not follow v3 docs.
- Use the `@/*` path alias instead of relative `../` imports across `src/` (`@/*` → `./src/*`, see `@tsconfig.json`).
- Do not use ^ in package version. No "reflect-metadata": "^0.2.2", use "reflect-metadata": "0.2.2".
- **TypeORM entities: always declare column types explicitly.** Next.js uses SWC which does not support `emitDecoratorMetadata` — TypeORM cannot infer types from TypeScript. Every `@Column()` must include a `type` option, e.g. `@Column({ type: 'varchar' })`. Omitting it throws at runtime.

## Project Structure

- `src/app/` — App Router pages and layouts (`layout.tsx`, `page.tsx`)
- `public/` — static assets
- `src/server/` - services for backend operations and repositories. src/server/<feature>/service.ts + repository.ts


## Commands

- `npm run dev` — dev server at localhost:3000
- `npm run build` — Next.js production build
- `npm run lint` — ESLint v9 (`next/core-web-vitals` + `next/typescript`)

## Coding Conventions

- Files should be named: <feature>.<role>.ts(x). E.g. DTO with create book request: create-book.request.ts, DTO with update user: update-user.request.ts, DTO with book data: book.response.ts. All utils (reusable functions) should be named <function-name>.utils.ts, files with stubs for tests: <feature>.mock.ts
- Types or interfaces should be in *.types.ts file
- Use TanstackQuery for fetching, caching, synchronizing and updating server state  (not yet installed)
- Design for small screens first. Start with base Tailwind classes, then add sm:/md:/lg: overrides — never style desktop first and shrink down.

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

Squash the branch before merging — each PR lands as a single commit on master. No prefix convention established yet.
