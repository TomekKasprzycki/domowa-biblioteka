# Repository Guidelines

Domowa-biblioteka is a social book-lending web app — Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, deployed to Vercel. Solo project.

## Hard Rules

<!-- BEGIN:nextjs-agent-rules -->
**Next.js 15 has breaking changes** — APIs, conventions, and file structure may differ from training data. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

- Tailwind CSS v4 is in use; class syntax and `@tailwindcss/postcss` config differ from v3 — do not follow v3 docs.
- Use the `@/*` path alias instead of relative `../` imports across `src/` (`@/*` → `./src/*`, see `@tsconfig.json`).
- Do not use ^ in package version. No "reflect-metadata": "^0.2.2", use "reflect-metadata": "0.2.2".
- **TypeORM entities: always declare column types explicitly.** Next.js uses SWC which does not support `emitDecoratorMetadata` — TypeORM cannot infer types from TypeScript. Every `@Column()` must include a `type` option, e.g. `@Column({ type: 'varchar' })`. Omitting it throws at runtime.
- Never commit to master. Master branch should be protected: no push directly to master allowed.
- In API optional fields use <some type> | null. Do not use <some type> | undefined. In update use PUT method.
- Handle id for database entities in application. Create IdGenerator which will create UUID and add it to new entity. Do not let database handle id.
- Every component should be in separate file.

## Project Structure

- `src/server/` - services for backend operations and repositories. src/server/<feature>/service.ts + repository.ts


## Commands

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
- Each it block tests one case: one input, one set of related assertions. Do not test two distinct behaviors (e.g. success + error) in the same it block.
- When testing feature with different input use it.each
- Test should contains 3 blocks: given / when / then.
- When testing function expected value should be mocked and assert with result.

## Commit Guidelines

When starting the implementation of a new plan, create a new branch named: <feat|fix|refactor|chore>/<id>-<change-id>, where id and change-id should be taken from roadmap.md
Squash the branch before merging — each PR lands as a single commit on master. No prefix convention established yet.
