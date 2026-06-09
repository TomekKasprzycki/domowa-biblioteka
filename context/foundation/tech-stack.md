---
starter_id: next
package_manager: npm
project_name: domowa-biblioteka
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
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
---

## Why this stack

Solo developer building a social book-lending web app in 5 after-hours weeks; TypeScript preference and Cloudflare Pages deployment drove the custom path. Next.js clears all four agent-friendly quality gates — typed, convention-based, massively popular in training data, thoroughly documented — and bootstrapper confidence is verified (end-to-end tested). Auth is the single technology-forcing feature (FR-001/FR-002: email+password + OAuth); Next.js's NextAuth/Auth.js ecosystem handles this well. Deployment target migrated to Vercel (native Next.js 15 support, no adapter layer) per infrastructure.md recommendation (researched 2026-06-02). Can-judge-agent came back false on the self-check — the course scaffolding compensates. No payments, realtime, AI, or background jobs in scope per PRD non-goals. CI on GitHub Actions with auto-deploy-on-merge.
