# Deploy Plan: Cloudflare Pages → Vercel

**Date:** 2026-06-03
**Project:** domowa-biblioteka — Next.js 15.5.18 App Router
**Context:** `context/foundation/infrastructure.md` recommends Vercel as the deployment platform (researched 2026-06-02). This plan migrates the project off Cloudflare tooling, establishes the Vercel production pipeline, and hardens the deployment per the infrastructure.md risk register.

**Execution order:** Phase 1 → Phase 2 → Phase 3 (local verify) → Phase 4 (manual Vercel setup) → Phase 5 (deploy) → Phase 6 (hardening) → Phase 7 (commit + docs)

---

## Pre-Flight: State Inventory

| Item | Current state | Action |
|---|---|---|
| `wrangler.jsonc` | Untracked (never committed) | Delete |
| `open-next.config.ts` | Untracked | Delete |
| `public/_headers` | Untracked (CF-specific cache header) | Delete — Vercel caches `/_next/static/*` automatically |
| `.open-next/` | Untracked build artifact | Delete |
| `.dev.vars` | 23 bytes, gitignored via `.dev.vars*` | Delete (CF worker secrets, not reusable for Vercel) |
| `package.json` | Modified (working tree has CF deps + scripts) | Remove CF devDeps + scripts |
| `next.config.ts` | Modified (CF dev-init block at bottom) | Remove CF block |
| `.gitignore` | Modified (has CF entries) | Remove CF entries; add `.env.local` |
| `.vercel/project.json` | Placeholder `{"projectId":"_","orgId":"_"}` | Overwritten automatically by `vercel link` |
| `tech-stack.md` | `deployment_target: cloudflare-pages` | Update to `vercel` |

---

## Phase 1 — Remove Cloudflare Artifacts

- [ ] **1.1** Delete `wrangler.jsonc`
- [ ] **1.2** Delete `open-next.config.ts`
- [ ] **1.3** Delete `public/_headers` (CF-only; Vercel auto-adds immutable cache headers for `/_next/static/*`)
- [ ] **1.4** Delete `.open-next/` build artifact directory: `rm -rf .open-next`
- [ ] **1.5** Delete `.dev.vars` (Cloudflare Worker secrets, not portable to Vercel): `rm .dev.vars`

- [ ] **1.6** Edit `package.json` — final `scripts` block must be exactly:
  ```json
  "build": "next build",
  "dev": "next dev",
  "start": "next start",
  "lint": "eslint"
  ```
  Remove from `devDependencies`: `@opennextjs/cloudflare`, `wrangler`

- [ ] **1.7** Edit `next.config.ts` — remove the CF dev-init block at the bottom. Final file:
  ```ts
  import type { NextConfig } from "next";
  const nextConfig: NextConfig = {};
  export default nextConfig;
  ```

- [ ] **1.8** Edit `.gitignore` — remove the CF-specific block:
  ```
  # OpenNext
  .open-next

  # wrangler files
  .wrangler
  .dev.vars*
  !.dev.vars.example
  ```
  Add `.env.local` entry (currently only `.env` is covered — `.env.local` is NOT gitignored by default):
  ```
  .env.local
  ```

- [ ] **1.9** Uninstall CF packages: `npm uninstall @opennextjs/cloudflare wrangler`
  Verify: `node_modules/@opennextjs` and `node_modules/wrangler` no longer exist.
  ⚠ Edge case: if `npm uninstall` errors, run `npm install` to re-sync from the edited `package.json`.

---

## Phase 2 — Add Vercel Config + Update Context

- [ ] **2.1** Create `vercel.json` at project root:
  ```json
  {
    "regions": ["cdg1"]
  }
  ```
  `cdg1` = Paris — closest Vercel serverless region to Poland. Controls where serverless functions (SSR pages, API routes) execute. Static assets always come from global Edge regardless.
  ⚠ Edge case: if Vercel CLI warns that `regions` is unsupported on Hobby, set the region in Dashboard → Project → Settings → Functions → Region and re-deploy.

- [ ] **2.2** Update `context/foundation/tech-stack.md` frontmatter:
  - `deployment_target: cloudflare-pages` → `deployment_target: vercel`
  - Update prose: replace the Cloudflare Pages / wrangler sentence with: *"Deployment target migrated to Vercel (native Next.js 15 support, no adapter layer) per infrastructure.md recommendation (researched 2026-06-02)."*

---

## Phase 3 — Local Verification (Before Touching Vercel)

- [ ] **3.1** `npm install` — re-sync `package-lock.json` after uninstalls. Expect zero warnings about `@opennextjs/cloudflare` or `wrangler`.

- [ ] **3.2** `npx tsc --noEmit` — TypeScript type-check.
  Expect: zero errors.
  If "Cannot find module '@opennextjs/cloudflare'" → `next.config.ts` edit in 1.7 is incomplete.

- [ ] **3.3** `npm run build` — full production build.
  Expect: `.next/` directory written, no CF-related warnings.
  ⚠ Note: `src/app/layout.tsx` uses `next/font/google` (Geist). Build fetches fonts — requires internet access. This is normal and expected on Vercel's build infra.

- [ ] **3.4** `npm run lint` — ESLint check. Expect no errors related to removed imports.

---

## Phase 4 — Vercel Project Setup (Manual Gates)

- [ ] **4.1** 🔒 **MANUAL** — Install Vercel CLI: `npm install -g vercel`
  Verify: `vercel --version` returns a version string.
  Alternative: use `npx vercel` for all subsequent commands.

- [ ] **4.2** 🔒 **MANUAL** — Authenticate: `vercel login`
  Opens browser OAuth flow. Recovery: `vercel login --no-browser` if browser doesn't open.

- [ ] **4.3** 🔒 **MANUAL** — Link project: `vercel link` (run from project root)
  - Existing Dashboard project → "Link to existing project?" → Yes → select `domowa-biblioteka`
  - New project → No → name it `domowa-biblioteka`
  After completion: `.vercel/project.json` is overwritten with real `projectId` + `orgId`.
  ⚠ Do NOT commit `.vercel/project.json` — already gitignored by `.vercel/`.

- [ ] **4.4** 🔒 **MANUAL** — Provision Neon Postgres: `vercel install neon`
  Opens Vercel Marketplace in browser; follow provisioning wizard.
  After completion, `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`) are auto-injected into all environments.
  Verify: `vercel env ls` shows `DATABASE_URL`.

- [ ] **4.5** Pull env vars for local dev: `vercel env pull .env.local`
  `.env.local` is gitignored by the entry added in Step 1.8.

  **Neon scale-to-zero decision point:** Free tier has scale-to-zero on by default (500–1000ms cold start on first query after idle). Acceptable at MVP scale. To disable: Neon Dashboard → Compute → `min_compute_size = 0.25` (paid). Revisit after real traffic data.

---

## Phase 5 — First Production Deploy

- [ ] **5.1** Deploy to production: `vercel --prod`
  Expect: build logs stream, then a `Production: https://domowa-biblioteka.vercel.app` line.

- [ ] **5.2** 🔒 **MANUAL** — Open the production URL in a browser. Confirm scaffold page loads, no 500 errors.

- [ ] **5.3** Check runtime logs: `vercel logs --follow`
  Expect: page request logs, no error-level entries.

- [ ] **5.4** 🔒 **MANUAL** — Verify EU region: browser DevTools → Network → page request → Response Headers → look for:
  ```
  x-vercel-execution-region: cdg1
  ```
  If shows `iad1` (US East): Dashboard → Project → Settings → Functions → Region → Paris (cdg1) → Save → `vercel --prod`.
  Note: this header only appears on SSR routes (Server Components, API routes).

---

## Phase 6 — Post-Deploy Hardening

- [ ] **6.1** 🔒 **MANUAL** — Enable Vercel Access for preview deployments:
  Dashboard → `domowa-biblioteka` → Settings → Deployment Protection → enable "Vercel Authentication"
  Effect: preview URLs require Vercel login. Production URL stays public.
  **Must be done before sharing any preview URLs** — PRD requires friend-gated access; until app auth is implemented, Vercel-level protection prevents raw data exposure.

- [ ] **6.2** 🔒 **MANUAL** — Connect GitHub for auto-deploy:
  Dashboard → Project → Settings → Git → Connect → install Vercel GitHub App → select `domowa-biblioteka` repo
  Effect: every push to `master` auto-deploys to production; every PR gets a preview deployment.
  Verify: push a trivial commit to `master`; new Vercel deployment appears in Dashboard within 30 seconds.

- [ ] **6.3** Tag the first stable deployment for rollback reference:
  ```
  git tag v0.1.0-vercel-baseline
  git push origin v0.1.0-vercel-baseline
  ```
  Rollback: `vercel rollback` (Hobby: one previous deployment only). Deeper: `vercel deploy --prebuilt` from tagged SHA.

- [ ] **6.4** Document risk register decisions in `context/foundation/infrastructure.md`:
  - *Log retention:* Vercel Hobby retains logs 1 hour. Add Axiom (free, 1 GB/month) or Sentry (free, 5k errors/month) before first real user traffic. Integration: Dashboard → Settings → Log Drains.
  - *Commercial gate:* Personal use among known friends = Hobby OK. Any monetization / public context → Pro ($20/month). Review gate: end of milestone 5.
  - *Neon cold start decision:* Deferred — see Phase 4.5.

---

## Phase 7 — Commit

- [ ] **7.1** Stage migration changes:
  ```
  git add package.json package-lock.json next.config.ts .gitignore vercel.json \
    context/foundation/tech-stack.md context/foundation/infrastructure.md \
    context/changes/deployment/deployment_plan.md
  ```
  Do NOT stage: `.vercel/project.json`, `.env.local`

- [ ] **7.2** Commit:
  ```
  git commit -m "chore: migrate deployment from Cloudflare Pages to Vercel"
  ```

- [ ] **7.3** Push to remote: `git push origin master`
  Verify: Vercel Dashboard shows a new production deployment triggered by the push (confirms GitHub App is wired, Step 6.2).

---

## Files Changed Summary

| File | Action |
|---|---|
| `wrangler.jsonc` | DELETE |
| `open-next.config.ts` | DELETE |
| `public/_headers` | DELETE |
| `.open-next/` | DELETE (build artifact) |
| `.dev.vars` | DELETE (CF secrets) |
| `package.json` | EDIT: remove CF scripts + devDeps |
| `next.config.ts` | EDIT: remove CF dev-init block |
| `.gitignore` | EDIT: remove CF entries; add `.env.local` |
| `vercel.json` | CREATE: `{"regions":["cdg1"]}` |
| `context/foundation/tech-stack.md` | EDIT: `deployment_target` value + prose |
| `context/foundation/infrastructure.md` | EDIT: add operational notes (Phase 6.4) |
| `context/changes/deployment/deployment_plan.md` | THIS FILE |

## Risk Register Traceability

| Risk | Addressed in |
|---|---|
| EU region extra latency | Phase 2.1 (`vercel.json` cdg1) + Phase 5.4 (header verification) |
| Preview URLs publicly accessible | Phase 6.1 (Vercel Access before any URL is shared) |
| Neon scale-to-zero cold start | Phase 4.5 (mitigation documented, decision deferred) |
| Logs 1h retention on Hobby | Phase 6.4 (Axiom/Sentry add-on documented) |
| Hobby non-commercial restriction | Phase 6.4 (review gate at milestone 5) |
