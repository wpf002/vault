# vault

120 mini-apps under one roof. One account, one checkout, one entitlement system.
Browse and preview anything for free; buy an app (or subscribe to all of them) to use it.

> **Name is a placeholder.** `vault` / `@vault/*` is temporary. Rename before pointing
> a domain at it — after that it's a versioning headache.

## What this is (and isn't)

**Is:** a single platform where each of the 121 apps is a *module* — a row in the DB and
a folder in `modules/`. The shell handles auth, billing, and access. Apps mount into it.

**Isn't:** 121 separate deployments. The original per-app Express+SQLite design was a link
farm; this is a vault. One API, one Postgres, one CDN.

## Monetization

Two SKUs, one access check.

| SKU | What it does |
|-----|--------------|
| **All-access subscription** (hero) | Unlocks every `live` module. New apps included as they ship. |
| **One-time app unlock** (secondary) | Permanent unlock of a single module. Priced high vs. the sub on purpose. |

Access = **active subscription OR a one-time unlock for that module.** That's the entire
model, implemented once in `@vault/entitlements`. No bundles in v1 — the sub *is* the bundle.

## Access model

Anyone can open a module and try a live demo. Save / persist / export hits the buy wall.
Free to look, pay to keep.

## Stack

- **Monorepo:** pnpm + turbo
- **Web / shell:** Next.js
- **API:** Fastify
- **DB:** Postgres via Prisma
- **Billing:** Stripe
- **Host:** Railway

## Layout

```
apps/
  web/          Next.js storefront + app shell
  api/          Fastify: catalog, auth, billing, entitlement checks
packages/
  db/           Prisma schema + client + the 121-module seed
  entitlements/ the single "does this user own this?" function
  module-sdk/   defineModule() — what each mini-app exports to mount in the shell
  config/       shared tsconfig
modules/        the 120 mini-apps, one folder each (empty until built)
```

## Getting started

```bash
bash bootstrap.sh
cd vault
pnpm install
cp .env.example .env          # fill in DATABASE_URL, Stripe keys, AUTH_SECRET
pnpm db:generate
pnpm db:migrate
pnpm db:seed                  # seeds all 120 as coming_soon
pnpm dev                      # web :3000, api :4000
```

## The build order (do NOT build 121 to launch)

1. **Platform shell** — auth, Stripe billing, entitlements, catalog, buy wall. *(this repo)*
2. **Scaffolding pipeline** — a generator so modules 6–121 are assembly-line, not artisanal.
3. **3–5 flagship modules** — prove the buy-and-use loop end to end.
4. **List all 120 day one** as `coming_soon`; flip to `live` as built.
5. **Build toward demand** — watch what people click, build that next.

## The AI-labeled modules

~15 of the 121 are "AI-powered" but the base stack has no LLM. Those rows carry
`requiresAi = true`. They stay `coming_soon` until the server-side AI proxy route exists
(`ANTHROPIC_API_KEY`, server-only, rate-limited, usage-metered). Don't ship them as fakes.

## Adding a module (once the pipeline exists)

1. `modules/<slug>/` — build the app, default-export `defineModule({ slug, name, Component })`.
2. Ensure the matching row exists in `modules.catalog.ts` (slug must match).
3. Flip its `status` to `live`.
4. Set `priceCents` / `stripePriceId` if individually sellable.

## Conventions

- Money is **integer cents**, always. No floats touch currency.
- One entitlement check, one place: `@vault/entitlements`. Apps never check access themselves.
- The shell wraps every module with the buy wall. Modules assume access when they render.
