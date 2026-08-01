# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## TypeORM SWC constraint applies only to @Column(), not specialized decorators

- **Context**: src/server/user/user.entity.ts — TypeORM entity under Next.js with SWC compiler
- **Problem**: Plans for this constraint said "all columns must have explicit type: options", causing confusion about @PrimaryGeneratedColumn, @CreateDateColumn, @UpdateDateColumn which don't need it.
- **Rule**: The SWC constraint (no reflect-metadata) only applies to `@Column()` decorators. Always add an explicit `type:` option to every `@Column()`. Specialized decorators (`@PrimaryGeneratedColumn`, `@CreateDateColumn`, `@UpdateDateColumn`, etc.) encode their type in the decorator name and do NOT need a `type:` option.
- **Applies to**: TypeORM entity files under Next.js/SWC; plan authoring for entity changes

## Zawsze weryfikuj przed wdrożeniem

- **Context**: AGENTS.md i pliki reguł dla AI
- **Problem**: Agent ignoruje reguły
- **Rule**: Zawsze weryfikuj przed wdrożeniem
- **Applies to**: all

## Intra-feature imports: @/* alias vs relative paths

- **Context**: src/app/friends/_components/*.tsx and src/app/collection/_components/*.tsx — App Router feature folders with sibling/parent imports
- **Problem**: AGENTS.md mandates "Use the @/* path alias instead of relative ../ imports across src/", but both the collection (S-01) and friends (S-02) feature components import via "../actions" and "./sibling". The written rule and the actual, repeated code pattern have drifted — each new feature copies the relative style from the last.
- **Rule**: The written rule wins — all cross-module imports under src/ use the @/* alias, including sibling ("./x") and parent ("../x") imports within a feature folder. Friends (S-02) was converted in commit 585a4d3; collection (S-01) still uses relative imports and is outstanding debt to bring in line (do it as a small standalone cleanup, not bundled into a feature slice). Do not copy the relative style into new features.
- **Applies to**: all imports across src/ (App Router pages/components, server, lib); strongest for src/app/**/_components

## Component prop types: inline vs *.types.ts

- **Context**: src/app/friends/_components/received-invites-list.tsx, friends-list.tsx (and src/app/collection/_components/book-list.tsx) — Client Component prop-shape types
- **Problem**: AGENTS.md says "Types or interfaces should be in *.types.ts", but list components export their row/item prop type inline (`ReceivedInvite`, `Friend`, `Book`) and sibling row components import it from the component file. The convention and the repeated pattern have drifted across S-01 and S-02.
- **Rule**: The written rule wins — exported prop/DTO/shared types live in a `<feature>.types.ts` file, not inline in a component. Friends (S-02) types were extracted to src/app/friends/friends.types.ts in commit 585a4d3; collection's inline `Book` type (S-01) is outstanding debt to extract (small standalone cleanup). A type used only inside one component file and never exported may stay local; the moment a second file imports it, it belongs in `*.types.ts`.
- **Applies to**: exported types across src/ (component props, DTOs, shared shapes); strongest for src/app/**/_components

## Plan scope guardrails must be cross-checked against phase bodies

- **Context**: context/changes/loan-lifecycle/plan.md — "What We're NOT Doing" vs Phase 5 changes 1 and 5
- **Problem**: The guardrail listed the inline `Book` type and missing collection component specs as S-01 debt explicitly not to backfill. Phase 5 then specified creating `collection.types.ts` (change 1) and adding book-row and page specs (change 5). The two sections contradicted each other. The implementer followed the phase bodies and surfaced it, but neither `/10x-plan` nor `/10x-plan-review` caught the contradiction — plan review checked "What We're NOT Doing" for items reappearing in phases, yet passed because the overlap was worded differently in each place.
- **Rule**: When writing a plan, every item in "What We're NOT Doing" must be checked against the phase bodies for the same subject matter under different wording; when reviewing a plan, treat this cross-check as mandatory rather than pattern-matching on identical phrasing. If a phase genuinely needs to do a thing the guardrail excludes, amend the guardrail rather than leaving both.
- **Applies to**: plan authoring and plan review; strongest where a plan touches a feature carrying known debt

## Component specs: UI test infra is installed — write specs going forward

- **Context**: src/app/**/_components/*.tsx and src/app/**/*.tsx — React components. Infra added during S-02 (friend-connections).
- **Problem**: AGENTS.md requires "Every exported function/component must have a spec file", but early slices shipped none because no UI test infra existed and each plan waived component tests under "What We're NOT Doing". That gap has now been closed for the tooling.
- **Rule**: UI test infra is installed — `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jest-environment-jsdom` (all pinned, no `^`). Component specs live in `test/` mirroring `src/`, named `<component>.spec.tsx`, and start with the `/** @jest-environment jsdom */` docblock (the global jest env stays `node` so DB integration specs are unaffected). Import `@testing-library/jest-dom` at the top of each spec. Client components: mock the actions module (`jest.mock("@/app/<feature>/actions", ...)`) and assert render output + that the right action fires on submit. Async Server Components: mock `@/auth` and `render(await Component())`. New components MUST ship with a spec. The friends components (S-02) are covered; collection (S-01) components are outstanding backfill debt (standalone cleanup). test/tsconfig.json needs `"jsx": "react-jsx"` because the root tsconfig uses `"jsx": "preserve"` for SWC.
- **Applies to**: all React components under src/app/**; jest/tsconfig test setup; AGENTS.md testing rules
