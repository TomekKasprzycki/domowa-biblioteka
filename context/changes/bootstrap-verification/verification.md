---
bootstrapped_at: 2026-05-29T20:05:57Z
starter_id: next
starter_name: Next.js
project_name: domowa-biblioteka
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: next
package_manager: npm
project_name: domowa-biblioteka
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

Solo developer building a social book-lending web app in 5 after-hours weeks; TypeScript preference and Cloudflare Pages deployment drove the custom path. Next.js clears all four agent-friendly quality gates — typed, convention-based, massively popular in training data, thoroughly documented — and bootstrapper confidence is verified (end-to-end tested). Auth is the single technology-forcing feature (FR-001/FR-002: email+password + OAuth); Next.js's NextAuth/Auth.js ecosystem handles this well. Cloudflare Pages deployment is supported in the Next.js card via @cloudflare/next-on-pages; the extra wrangler configuration step versus defaulting to Vercel was flagged in conversation and accepted. Can-judge-agent came back false on the self-check — the course scaffolding compensates. No payments, realtime, AI, or background jobs in scope per PRD non-goals. CI on GitHub Actions with auto-deploy-on-merge.

## Pre-scaffold verification

| Signal        | Value                                      | Severity | Notes                                      |
| ------------- | ------------------------------------------ | -------- | ------------------------------------------ |
| npm package   | create-next-app v16.2.6 published 2026-05-29 | fresh  | resolved from cmd_template                 |
| GitHub repo   | not run                                    | —        | docs_url (https://nextjs.org/docs) is not a GitHub URL |

## Scaffold log

**Resolved invocation**: `npx create-next-app@latest bootstrap-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
**Strategy**: scaffold into a temp directory (`bootstrap-scaffold/`) then move files up
**Exit code**: 0
**Files moved**: 12 (9 root files + 3 directories: src/, public/, node_modules/)
**Conflicts (.scaffold siblings)**: CLAUDE.md.scaffold
**.gitignore handling**: append-merged (22 Next.js entries appended after `# from next` separator; 7 existing cwd entries preserved)
**.bootstrap-scaffold cleanup**: deleted

Note: `create-next-app` rejects directory names beginning with a period; the temp directory was named `bootstrap-scaffold` (without a leading dot) rather than `.bootstrap-scaffold`.

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 2 MODERATE, 0 LOW
**Direct vs transitive**: 1/0 direct of total 2/0 MODERATE (next is direct; postcss is transitive via next's bundled copy)

#### CRITICAL findings

None.

#### HIGH findings

None.

#### MODERATE findings

**postcss** (transitive via next)
- Advisory: GHSA-qx2v-qp2m-jg93
- Description: PostCSS has XSS via Unescaped `</style>` in its CSS Stringify Output
- Affected range: < 8.5.10 (bundled inside `node_modules/next/node_modules/postcss`)
- CWE: CWE-79 (CVSS 6.1)
- Fix: next 9.3.3 (semver-major downgrade — not recommended; wait for a patched minor)

**next** (direct, surfaces postcss finding)
- Severity: moderate (via bundled postcss)
- Fix available: next 9.3.3 (semver-major downgrade — not recommended)

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                    | Value                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| bootstrapper_confidence | verified                                                                       |
| quality_override        | false                                                                          |
| path_taken              | custom                                                                         |
| self_check_answers      | typed: true, from_official_starter: true, conventions: true, docs_current: true, can_judge_agent: false |
| team_size               | solo                                                                           |
| deployment_target       | cloudflare-pages                                                               |
| ci_provider             | github-actions                                                                 |
| ci_default_flow         | auto-deploy-on-merge                                                           |
| has_auth                | true                                                                           |
| has_payments            | false                                                                          |
| has_realtime            | false                                                                          |
| has_ai                  | false                                                                          |
| has_background_jobs     | false                                                                          |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review `CLAUDE.md.scaffold` — the scaffold wrote its own CLAUDE.md; your existing one was preserved. Decide whether to merge the two versions or discard the scaffold copy.
- Address the 2 MODERATE postcss findings per your project's risk tolerance — they live inside Next.js's bundled postcss copy; the fix version is a semver-major downgrade. Watch for a patched next minor.
- Add `@cloudflare/next-on-pages` and configure `wrangler.toml` before deploying to Cloudflare Pages.
