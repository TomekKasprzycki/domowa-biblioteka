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
