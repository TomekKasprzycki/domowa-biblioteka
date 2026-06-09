---
project: domowa-biblioteka
researched_at: 2026-06-02
recommended_platform: Vercel
runner_up: Cloudflare Workers
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Next.js 15
  runtime: Node.js (serverless functions)
  database: external (Neon via Vercel Marketplace recommended)
---

## Recommendation

**Deploy on Vercel.**

Vercel is the native home of Next.js 15 — no adapter layer, no runtime translation, no edge-runtime restrictions on auth middleware. For a solo developer building a social book-lending MVP in 5 after-hours weeks, Vercel's zero-configuration Next.js support eliminates the class of deployment bugs that cost days to debug (bundle limits, middleware incompatibilities, adapter-specific CLI hangs). The Hobby tier covers 10k–100k monthly requests with 1M serverless invocations free. MCP is in public beta and usable. The primary constraint to watch: Hobby is non-commercial — if the app ever monetises or goes beyond personal use, Pro ($20/month) is required. Function region must be manually set to EU.

Note: the project's `tech-stack.md` specifies `deployment_target: cloudflare-pages` and `@opennextjs/cloudflare` is installed. Switching to Vercel requires removing those packages and updating `wrangler.jsonc` / `open-next.config.ts`. Cloudflare Workers remains the runner-up and requires minimal migration back if needed.

## Platform Comparison

| Platform | CLI-first | Managed | Agent docs | Deploy API | MCP | Total |
|---|---|---|---|---|---|---|
| Vercel | Pass | Pass | Pass | Pass | Partial | **9** |
| Cloudflare Workers | Pass | Pass | Pass | Partial | Pass | **9** |
| Netlify | Pass | Pass | Pass | Pass | Pass | **10** |
| Fly.io | Pass | Partial | Partial | Pass | Partial | **7** |
| Render | Partial | Partial | Pass | Pass | Partial | **7** |
| Railway | Partial | Partial | Partial | Partial | Partial | **5** |

Cloudflare Deploy API scored Partial due to active silent-hang bug (#1273, opened 2026-05-22). Netlify scored highest on raw criteria (10/10) but active caching bugs in the OpenNext adapter (catch-all routes, redirect caching, #3511/#3460) make it risky for an app where stale borrow state is explicitly a PRD consistency failure. Fly.io eliminated its free tier (Jul 2024) and Managed Postgres starts at $38/month — cost-prohibitive at MVP scale. Railway has no CLI rollback and unmanaged Postgres. Render requires $7–27/month and free tier has 60-second cold starts.

### Shortlisted Platforms

#### 1. Vercel (Recommended)

Native Next.js 15 support with no adapter. Full Node.js runtime available for all API routes — no edge-runtime restrictions affecting auth libraries (NextAuth, Lucia) or ORMs (Drizzle, Prisma). CLI covers deploy, rollback, and logs. Docs are maximally agent-readable (llms.txt + llms-full.txt). Hobby tier handles MVP traffic comfortably. Main gaps vs Cloudflare: MCP in beta (not GA), and Hobby is non-commercial only.

#### 2. Cloudflare Workers

Already configured in the project. Best-in-class MCP (GA, Code Mode). Free tier very generous for request volume. Lost the recommendation due to active deploy hang bug (#1273), mandatory paid plan for SSR CPU, and lack of Node Middleware support — a significant constraint given NextAuth's middleware needs.

#### 3. Netlify

Highest raw score (10/10). GA MCP server. Active caching bugs in the OpenNext adapter create a stale-content risk that directly conflicts with the PRD requirement: "availability status shown to a browsing friend always reflects the real loan state." Dropped from recommendation for this reason.

## Anti-Bias Cross-Check: Vercel

### Devil's Advocate — Weaknesses

1. **Hobby tier is non-commercial only** — any monetisation or professional-context usage requires Pro ($20/month). A course project that goes public sits in a gray area.
2. **Function region defaults to US East (`iad1`)** — Polish users experience +100–150ms latency on all SSR/API calls unless `cdg1` (Paris) or `fra1` (Frankfurt) is configured manually.
3. **Rollback on Hobby = one step** — no multi-step rollback history; bugs introduced more than one deploy ago require manual re-deploy from commit history.
4. **Runtime logs: 1-hour retention on Hobby** — overnight incidents leave no trace by morning.
5. **Vercel Postgres and KV deprecated** — replaced by Neon + Upstash via Marketplace; adds external vendor dependencies.

### Pre-Mortem — How This Could Fail

Aplikacja deployuje się na Hobby bez problemów. W tygodniu 3 deweloper udostępnia link znajomym — Vercel flaguje konto za "commercial-like usage patterns" w multi-user social app i wymagany jest upgrade na Pro ($20/month). Jednocześnie region funkcji nadal US East — polscy użytkownicy mają 200ms latencji per request. Neon Postgres na scale-to-zero dodaje 500–1000ms cold start po idle, co łącznie przekracza wymaganie 2 sekund z PRD. Preview URLs dla pull requestów są publicznie dostępne — dane testowe widoczne bez autentykacji (Vercel Access niezakonfigurowane). Tydzień 4: deweloper naprawia region, konfiguruje Access, przechodzi na Pro — dwa tygodnie poświęcone na infra zamiast features. Projekt dostarczony, ale z opóźnieniem i wyższym kosztem niż zakładano.

### Unknown Unknowns

- **Neon Postgres (Marketplace) ma scale-to-zero** — pierwsze zapytanie po idle: 500–1000ms. Połączone z cold startem funkcji może przekroczyć 2-sekundowy wymóg PRD. Konfiguracja `min_compute_size` na Neon wyłącza scale-to-zero (płatna opcja).
- **Preview deployments są publicznie dostępne domyślnie** — każdy PR preview URL dostępny bez autentykacji. Vercel Access musi być skonfigurowane explicite dla projektów z danymi użytkowników.
- **Jeden region funkcji dla całego projektu na Hobby** — per-route regional config wymaga Pro.
- **`NEXT_PUBLIC_*` vars baked at build time** — zmiana publicznych zmiennych środowiskowych wymaga pełnego rebuildu, nie tylko aktualizacji sekretów w dashboardzie.
- **Fluid Compute redukuje, ale nie eliminuje cold starty** — przy sporadycznym ruchu (znajomi wchodzą od czasu do czasu) cold starty nadal będą odczuwalne.

## Operational Story

- **Preview deploys**: Każdy push do PR tworzy unikalny preview URL (`<branch>-<project>.vercel.app`). Domyślnie publicznie dostępne — skonfiguruj Vercel Access (bezpłatne) przed zaproszeniem użytkowników testowych. Preview deployments dostępne dla wszystkich gałęzi; nie wymagają dodatkowej konfiguracji CI.
- **Secrets**: Zmienne środowiskowe przechowywane w Vercel Project Settings → Environment Variables. CLI: `vercel env add SECRET_NAME`. Neon i Upstash auto-injektują swoje zmienne po `vercel install neon` / `vercel install upstash`. Tokeny nie trafiają do `.env.local` committed do repo.
- **Rollback**: `vercel rollback [deployment-id]` — natychmiastowy, bez rebuildu, jedyna poprzednia wersja produkcyjna na Hobby. Dla wcześniejszych wersji: `vercel deploy --prebuilt` z poprzedniego commita.
- **Approval**: Każdy push do `main` automatycznie deployuje na produkcję (auto-deploy-on-merge z tech-stack.md). Akcje wymagające człowieka: zmiana tieru planu, usunięcie projektu, rotacja primary secret. Agent może: deployować, rollbackować, czytać logi, zarządzać env vars.
- **Logs**: `vercel logs [deployment-url] --follow` — streaming logs, filtrowanie po poziomie. Retencja: 1 godzina na Hobby, 1 dzień na Pro. MCP (public beta): `vercel-mcp` narzędzie `get_deployment_logs`.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Hobby non-commercial restriction wymusza upgrade na Pro | Devil's advocate | M | M | Zdecyduj przed publicznym launchem: personal use tylko dla znajomych = OK; jakikolwiek revenue → Pro ($20/mo) |
| Neon scale-to-zero + function cold start = >2s latency | Unknown unknowns | M | H | Ustaw `min_compute_size=0.25` w Neon (wyklucza scale-to-zero, ok ~$0.10/h) lub akceptuj cold start dla pierwszego użytkownika po idle |
| EU region nie skonfigurowany → ~150ms extra latency | Devil's advocate | H | M | Dodaj `"regions": ["cdg1"]` do `vercel.json` przed pierwszym deploy produkcyjnym |
| Preview URLs publicznie dostępne | Unknown unknowns | H | M | Włącz Vercel Access (free) dla preview deployments przed testami z danymi użytkowników |
| Rollback Hobby = 1 krok | Devil's advocate | L | M | Taguj stabilne commity; `vercel deploy --prebuilt` z konkretnego SHA jako rollback plan B |
| Logs 1h retention uniemożliwia post-incident debug | Devil's advocate | M | L | Dodaj zewnętrzne logowanie (Axiom free tier lub Sentry) jako uzupełnienie Vercel logs |
| Vercel Postgres/KV deprecated | Research finding | — | L | Używaj Neon (Postgres) i Upstash (Redis) przez Marketplace CLI od początku; nie instaluj @vercel/postgres ani @vercel/kv |
| `NEXT_PUBLIC_*` vars wymagają rebuildu | Unknown unknowns | L | L | Traktuj publiczne env vars jako stałe; zmienialne wartości przenoś na API endpoint lub server-side |

## Getting Started

1. **Usuń Cloudflare adapter** — `npm uninstall @opennextjs/cloudflare wrangler` i usuń `open-next.config.ts`, `wrangler.jsonc`, `.open-next/` z `.gitignore`.
2. **Zainstaluj Vercel CLI** — `npm i -g vercel` (lub `npx vercel`).
3. **Połącz projekt z Vercel** — `vercel link` w katalogu projektu. Wybierz lub utwórz projekt na koncie Vercel.
4. **Ustaw region EU** — dodaj `vercel.json` z `{ "regions": ["cdg1"] }` (Paris) lub `"fra1"` (Frankfurt).
5. **Provision bazy danych** — `vercel install neon` → auto-injects `DATABASE_URL`. Wyłącz scale-to-zero w Neon dashboard dla MVP jeśli latencja jest krytyczna.
6. **Pierwszy deploy** — `vercel --prod`. Sprawdź logi: `vercel logs --follow`.
7. **Skonfiguruj Vercel Access** — Vercel Dashboard → Project → Access → Enable for Preview Deployments.
8. **GitHub Actions auto-deploy** — `vercel` GitHub App instaluje się przez Dashboard; każdy push do `main` deployuje automatycznie (spójne z `ci_default_flow: auto-deploy-on-merge` z tech-stack.md).

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup beyond auto-deploy-on-merge
- Production-scale architecture (multi-region, HA, DR)
- Auth provider configuration (NextAuth/Auth.js setup)
