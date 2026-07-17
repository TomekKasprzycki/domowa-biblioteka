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
- **Rule**: <TODO: e.g. "Intra-feature sibling/parent imports may stay relative; reserve @/* for cross-feature imports" — OR — "All src/ imports must use @/*; fix collection + friends together">
- **Applies to**: <TODO: e.g. "App Router feature components under src/app/**/_components">

## Component prop types: inline vs *.types.ts

- **Context**: src/app/friends/_components/received-invites-list.tsx, friends-list.tsx (and src/app/collection/_components/book-list.tsx) — Client Component prop-shape types
- **Problem**: AGENTS.md says "Types or interfaces should be in *.types.ts", but list components export their row/item prop type inline (`ReceivedInvite`, `Friend`, `Book`) and sibling row components import it from the component file. The convention and the repeated pattern have drifted across S-01 and S-02.
- **Rule**: <TODO: e.g. "Component prop/DTO types shared only within one feature's _components may stay co-located with the list component" — OR — "Extract all exported types into <feature>.types.ts">
- **Applies to**: <TODO: e.g. "Client Component prop types under src/app/**/_components">

## Component specs deferred until UI test infra exists

- **Context**: src/app/**/_components/*.tsx across S-01 (collection) and S-02 (friends) — React Client Components with no accompanying spec files
- **Problem**: AGENTS.md requires "Every exported function/component must have a spec file", but no component has one. The repo has no UI test infra installed (`@testing-library/react` and `jest-environment-jsdom` are both absent), and each slice's plan explicitly waives component tests under "What We're NOT Doing". The written rule and the actual, repeated practice have drifted, and the gap compounds with every new feature.
- **Rule**: Component specs remain intentionally deferred. Do NOT add component specs ad hoc per feature — the missing piece is shared infra, not per-file tests. When component coverage is wanted, do it as one dedicated slice that (a) installs `@testing-library/react` + `jest-environment-jsdom`, (b) adds a jsdom jest project/config, (c) backfills specs for existing components, and (d) updates AGENTS.md / the plan template so future slices stop treating component tests as out of scope. Until that slice lands, repository + Server Action integration tests plus manual verification are the accepted coverage boundary.
- **Applies to**: React components under src/app/**; plan authoring (scope/"What We're NOT Doing"); AGENTS.md testing rules
