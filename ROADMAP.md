# AppVault — Complete Build Roadmap

A store of 120 mini-apps under one roof. One account, one checkout, one entitlement
system. Browse and preview free; buy an app (or subscribe to all) to use it.

> **Name is a placeholder.** `vault` / `@vault/*` throughout. Rename before a domain
> points at anything.

---

## The one thing that governs everything

**This is not a 120-app project. It's a platform project with 120 pieces of content.**

Treat those as two separate builds:

1. **The platform** — auth, billing, entitlements, storefront, module runtime, the
   pipeline that makes apps cheap to add. You build this once. Phases 1–5, 8, 9.
2. **The content** — the 120 apps. Data in the catalog day one; built on demand, not
   in list order. Phases 6, 7, and forever after.

**Prime directive: do not build 120 apps to launch.** You launch with the platform and
3–5 real apps. The other 115 are listed as `coming_soon`. You build toward what people
actually click. Anything else is grinding a list instead of running a business.

---

## Architecture, locked

These are decided. Don't relitigate them mid-build.

- **Topology:** one platform, apps as modules. Not 120 deploys. One Fastify API, one
  Postgres, one CDN. The per-app Express+SQLite design from the original prompt is a
  link farm and is discarded.
- **Monetization:** all-access subscription (hero SKU) + one-time per-app unlock
  (secondary, priced high vs. the sub so the sub wins). No bundles in v1 — the sub is
  the bundle.
- **Access rule:** one function. Access = active subscription **OR** a one-time unlock
  for that module. Lives in `@vault/entitlements`. Nothing else decides access.
- **Access UX:** anyone can open a module and use a live demo. Save / persist / export
  hits the buy wall. Free to look, pay to keep.
- **Module runtime:** each app is a folder in `modules/<slug>` that default-exports a
  `defineModule({ slug, name, Component })` manifest. The web shell lazy-imports it
  (Next.js code-splits per module, so the bundle never balloons), wraps it in the buy
  wall, and routes to it. The module never checks access itself.
- **Module data:** default to a **generic per-user document store** — one table keyed
  by `(userId, moduleSlug, collection, docId)` holding JSON. This is what makes the
  pipeline possible: a new app gets storage for free, no migration. Flagship apps that
  need real relational queries get an **escape hatch**: their own Prisma models,
  namespaced by slug prefix. Rule of thumb — generic store unless the app needs
  server-side querying/joins across records.
- **Money is integer cents.** Always. No float touches currency. (Same invariant as
  Crossbar and Brindle.)

---

## Phase 0 — Foundation ✅ (scaffolded)

**Delivered in the project folder.** Monorepo (pnpm + turbo), Prisma schema with the
`Module` / `Purchase` / `Subscription` model, `@vault/entitlements` access check,
`@vault/module-sdk` with `defineModule()`, Fastify API skeleton (health + catalog +
access-check routes), Next.js shell skeleton, and the full 120-module catalog seeded as
`coming_soon`.

**Definition of done:** `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`
brings up web on :3000 and api on :4000, and the catalog endpoint returns 120 modules.

---

## Phase 1 — Auth & accounts

**Goal:** a real user identity that both Next.js and Fastify trust.

**Build:**
- Email/password + at least one OAuth (Google) sign-in.
- Session as a signed JWT (shared `AUTH_SECRET`) so the Fastify API can verify the same
  token the web app issues. This is why the API currently reads `x-user-id` — that
  placeholder gets replaced by real token verification.
- A Fastify `authPlugin` that resolves `req.user` from the bearer token and rejects
  unauthenticated calls to protected routes.
- User row created on first sign-in; wire it to the existing `User` model.

**Decision:** roll-your-own vs. hosted. Recommendation: **Auth.js (NextAuth) in the web
app + shared-secret JWT verification in Fastify.** Keeps you in control (your security
background wants that), no per-seat SaaS cost, and it's the least friction for a
shared-secret setup. Only reach for Clerk/WorkOS if you want to skip building account
recovery, MFA, etc. — but that's a monthly cost forever.

**Definition of done:** a user signs up, gets a session, and the API can answer "who is
this?" on every request. The `/modules/:slug/access` route reads the real user, not a
header.

**Effort:** 3–5 focused days.

---

## Phase 2 — Billing & entitlements (Stripe)

**Goal:** money in, entitlements written, access flips on. This is the correctness-
critical phase — get it wrong and people pay and can't use what they bought, or use what
they didn't.

**Build:**
- Stripe products: one recurring price (the subscription), and one-time prices per
  sellable module (store `stripePriceId` on the `Module` row — already in the schema).
- Checkout: Stripe Checkout Sessions for both flows. Never handle card data yourself.
- **Webhooks are the source of truth.** Client success redirects mean nothing. On
  `checkout.session.completed` (one-time) write a `Purchase`; on
  `customer.subscription.created/updated/deleted` upsert the `Subscription` row and its
  `status` + `currentPeriodEnd`. Verify the webhook signature (`STRIPE_WEBHOOK_SECRET`).
- Idempotency: webhooks retry. Writes must be idempotent — the `@@unique([userId,
  moduleId])` on `Purchase` and `@unique` on `stripeSubscriptionId` already enforce it;
  make the handlers upsert, not insert.
- Customer portal for sub management (cancel, update card) — Stripe hosts it, you just
  link to it.

**Decisions:**
- Sub price point (doesn't block the build — placeholder, set before launch).
- One-time price relative to sub: make it obviously worse value. E.g. sub $12/mo unlocks
  everything; a single app $9 one-time. The one-time exists to convert the
  recurring-averse, not to compete with the sub.
- Refund policy → whether a refund revokes the `Purchase`. Recommendation: yes, handle
  `charge.refunded` by deleting the purchase.

**Definition of done:** test-mode purchase of a single app writes a `Purchase` and
`hasAccess` returns true; test-mode subscribe flips `accessibleModules` to all-live;
cancel flips it back at period end. Verified against the Stripe CLI webhook simulator.

**Effort:** 5–8 focused days. Webhooks and idempotency are where the time goes.

---

## Phase 3 — The shell & storefront

**Goal:** the "roof." The part users see: catalog, app pages, library, account.

**Build:**
- **Catalog page:** all 120, filterable by category, with `live` vs `coming_soon`
  states. Coming-soon shows a waitlist capture (email → a `WaitlistSignup` table you'll
  add — cheap demand signal, tells you what to build next).
- **Module detail page:** description, screenshots, price, and either a "Launch demo"
  (live) or "Notify me" (coming soon) button.
- **Buy wall UI:** the modal/interstitial that appears when an un-entitled user hits a
  gated action. One component, reused everywhere.
- **User library:** "your apps" — everything the user can access, one click to launch.
- **Account page:** subscription status, purchase history, link to Stripe portal.
- Design system: pick the palette/type once at the shell level. Per-module theming can
  come later; don't gold-plate this before the loop works.

**Definition of done:** a signed-in user can browse, see what they own, hit a buy wall on
something they don't, complete checkout, and land back in the app with access.

**Effort:** 5–8 focused days.

---

## Phase 4 — Module runtime & the buy wall enforcement

**Goal:** the mechanism that mounts an app and enforces preview-vs-full. This is the
architectural keystone — every one of the 120 apps depends on it working right.

**Build:**
- **Module registry (web):** a map from slug → `dynamic(() => import('modules/<slug>'))`.
  The shell renders the module's `Component` inside a gating wrapper.
- **Mode prop:** the wrapper passes `mode: 'preview' | 'full'` based on `hasAccess`.
  Preview = the app runs with seed data but write/export actions are intercepted and
  throw the buy wall.
- **Generic document store API (Fastify):** `GET/POST/PUT/DELETE /store/:module/:collection`.
  Server-side, every write checks `hasAccess(user, module)` first — preview mode can read
  seed data but cannot persist. This is the real enforcement; the client mode prop is
  just UX. **Never trust the client for gating.**
- **Seed-data convention:** each module ships a `seedPreview()` that populates realistic
  demo data so previews look alive, not empty.

**Decision:** how strict is preview? Recommendation: preview is fully interactive but
**ephemeral** — changes live in memory, nothing persists, export/download is walled.
Gives the "try it" feel without giving the product away.

**Definition of done:** an un-entitled user opens a live module, uses it fully in the
session, tries to save, and hits the wall. An entitled user saves and it persists via the
store API. Server rejects writes from un-entitled users even if the client is bypassed.

**Effort:** 4–6 focused days.

---

## Phase 5 — The scaffolding pipeline (the force multiplier)

**Goal:** make apps 6→120 assembly-line, not artisanal. Without this, 120 apps is
120 from-scratch builds. With it, each new app starts 60% done.

**Build:**
- **A generator:** `pnpm gen:module` (a plop/hygen script or a small node CLI) that takes
  slug/name/category and stamps out `modules/<slug>/` with: the `defineModule` manifest,
  a component skeleton already wired to the store API and the buy-wall pattern, a
  `seedPreview()` stub, and a matching catalog check.
- **Shared module primitives:** a small internal UI kit modules reuse — gated-action
  button, empty state, loading state, the standard list/detail/form scaffolding. So each
  app is "fill in the domain logic," not "rebuild CRUD."
- **A module contract/checklist:** every module must have seed data, handle empty/loading
  states, put `data-testid` on interactive elements, and gate all persistence. Codify it
  so quality doesn't drift across 120 apps.

**Definition of done:** running the generator produces a new module that appears in the
catalog, launches in preview, and correctly walls persistence — before you write a single
line of that app's actual feature code.

**Effort:** 5–7 focused days. Highest-leverage phase in the whole roadmap. Every day here
saves days on every subsequent app.

---

## Phase 6 — Flagship modules (prove the loop)

**Goal:** 3–5 fully-built apps that prove buy-and-use end to end and give the storefront
something real to sell on day one.

**Pick flagships that are:**
- **Fast to build** (validate the pipeline without drowning in one app's complexity).
- **Immediately useful standalone** (someone would pay for just this).
- **Non-AI** (no dependency on Phase 7).

**Recommended starting five** (all simple, all real utility, all pipeline-friendly):
1. `unit-converter` (#119) — trivial, proves the pipeline with near-zero domain logic.
2. `quick-note-taker` (#12) — the canonical CRUD + tags app; exercises the store API.
3. `minimalist-timer` (#13) — pure client, tests a no-persistence module.
4. `habit-tracker` (#48) — recurring data + streaks; slightly richer store usage.
5. `flashcard-spaced-repetition` (#75) — real algorithm (SR), proves the pipeline
   handles apps with actual logic, and it's a category people pay for.

**Definition of done:** all five are `live`, fully functional, buyable, and usable after
purchase. A stranger can land on the storefront, buy one, and use it without you touching
anything.

**Effort:** 2–4 days each once the pipeline exists → 10–20 days for five.

---

## Phase 7 — AI proxy (unlock the AI-labeled apps)

**Goal:** a platform capability that lets the 21 AI-flagged modules work without shipping
fakes or leaking keys.

**Build:**
- **Server-side AI route (Fastify):** `POST /ai/complete`. Server holds
  `ANTHROPIC_API_KEY` — never the client. Modules with `requiresAi: true` call this.
- **Rate limiting + metering per user:** so free preview can't rack up your API bill, and
  so you can cap/upsell heavy usage. Meter usage into a table.
- **Preview allowance:** un-entitled users get N free AI calls in preview, then the wall.
- **Guardrails:** the sensitive AI apps (`ai-mental-health-companion`, `mental-health-
  journal`) need real care — crisis-handling language, disclaimers, and a decision about
  whether you want to ship mental-health AI at all given liability. Recommendation: defer
  those two indefinitely; they're a different risk class than a recipe generator.

**Definition of done:** one AI module (e.g. `smart-content-generator`) works end to end
through the proxy, metered, walled in preview, with the key never leaving the server.

**Effort:** 3–4 days for the proxy; then AI modules build on the Phase 5 pipeline like any
other.

---

## Phase 8 — Admin & catalog control

**Goal:** you operate the vault without editing the database by hand.

**Build:**
- Flip module `status` (coming_soon ↔ live ↔ retired) from an admin UI.
- Edit catalog copy, pricing, screenshots.
- View purchases/subs, issue refunds, see waitlist counts per module (this is your
  build-next signal).
- Basic metrics: revenue, conversion (preview→buy), top modules.

**Definition of done:** launching a newly-built module is a button click, not a deploy or
a SQL statement.

**Effort:** 3–5 days.

---

## Phase 9 — Observability, ops, hardening

**Goal:** know when it breaks, survive when it's attacked.

**Build:**
- Error tracking (Sentry) across web + api.
- Structured logging on the API (Fastify's logger is already on).
- Uptime + webhook-failure alerting (a failed Stripe webhook = someone paid and didn't
  get access — page yourself for that).
- Rate limiting on public + AI endpoints.
- Security pass: your wheelhouse — authz on every store/AI route, no IDOR on
  `/store/:module/...`, webhook signature verification, secrets only server-side, CORS
  locked to your domain in prod.
- Backups on Postgres (Railway handles this; verify the restore actually works).

**Definition of done:** a broken webhook or a 500 pages you before a customer emails you.

**Effort:** 3–5 days.

---

## Phase 10 — Launch & GTM gates

**Goal:** ship, but behind validation gates (your usual pattern).

**Gates before public launch:**
- Platform loop works: browse → buy → use, for both SKUs, in production Stripe.
- 3–5 flagships live and genuinely good.
- Waitlist capture working on all coming-soon modules.
- Observability live.

**Launch motion:**
- Soft launch to a small list; watch the preview→buy funnel and which coming-soon apps
  get the most waitlist signups.
- The waitlist data *is* your roadmap for what to build in Phase 6+.

**Definition of done:** real strangers paying real money and using the apps, with you
watching which apps they want next.

**Effort:** 3–5 days of launch work; then it's a business, not a project.

---

## Post-launch — build toward demand

The catalog is data; all 120 are listed. From here you **build the app with the most
waitlist signups next**, run it through the pipeline, flip it live, repeat. You never
"build 120 apps." You build the ones people are asking for, and the long tail stays
`coming_soon` as a demand-sensing surface that costs nothing to keep listed.

---

## Invariants (locked — same discipline as your other projects)

- Money is integer cents. No exceptions.
- One access check, one place (`@vault/entitlements`). Modules never gate themselves.
- Webhooks are the billing source of truth. Client redirects are cosmetic.
- The server enforces preview-vs-full. The client mode prop is UX only.
- Every module ships seed data, empty/loading states, and `data-testid` on interactives.
- New apps default to the generic store; relational models are an opt-in escape hatch.

## Risk register

| Risk | Mitigation |
|------|------------|
| Billing writes wrong entitlement | Webhooks as source of truth + idempotent upserts + Stripe CLI testing (Phase 2) |
| Bundle bloat from 120 apps in one web app | Per-module dynamic import / code-splitting (Phase 4) |
| Building 120 apps burns you out before revenue | Launch with 5; build to demand (Prime directive) |
| AI apps leak keys or rack up cost | Server-side proxy + per-user metering + preview cap (Phase 7) |
| Mental-health AI liability | Defer `ai-mental-health-companion` + `mental-health-journal` |
| Preview gives the product away | Ephemeral preview; server-walled persistence (Phase 4) |
| IDOR on shared store | Authz on every `/store/:module` call; never trust client module/user (Phase 9) |
| Doc says 121, catalog has 120 | Reconcile the missing/duplicated entry before marketing "121" |

## Build order at a glance

```
0  Foundation .............. done (in the folder)
1  Auth ................... 3–5d
2  Billing + entitlements . 5–8d   ← correctness-critical
3  Shell + storefront ..... 5–8d
4  Module runtime + wall .. 4–6d   ← architectural keystone
5  Scaffolding pipeline ... 5–7d   ← highest leverage
6  Flagship apps (×5) ..... 10–20d
7  AI proxy ............... 3–4d   (+ AI apps via the pipeline)
8  Admin .................. 3–5d
9  Observability/ops ...... 3–5d
10 Launch ................. 3–5d
```

Critical path to a sellable product: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 10.** Phases 7, 8, 9
can slot in around it, but don't launch without 9.
