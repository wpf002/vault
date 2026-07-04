# Launch Checklist — Phase 10

Status as of 2026-07-03. The platform is code-complete; the remaining reds are
account-level credentials only you can create. Companion docs: `OPS.md`
(runbook, go-live checklist), `apps/api/.env.example` (every env var).

## Gates (from the roadmap)

| Gate | Status | Notes |
|---|---|---|
| Catalog built | 🟢 **118/120 modules** built and live-verified (24 browser-tested batches) | The 2 exceptions are the mental-health pair, deferred permanently by the liability decision. |
| Production build | 🟢 Verified | `pnpm build` clean; module pages lazy-load (~114 kB first load JS). |
| Browse → buy → use loop | 🟡 **Blocked on Stripe keys** | Checkout, webhooks, entitlements, refund path are all wired and idempotent; they activate when `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_SUBSCRIPTION` are set. Test with `stripe listen` before launch. |
| AI modules work in prod | 🟢 Verified against the live Anthropic API | Key stays server-side; per-user metering + preview allowance + rate limit all browser-verified. Set a spend cap in the Anthropic console. |
| Waitlist capture on coming-soon modules | 🟢 Verified end to end | Form → API → `WaitlistSignup` row → admin build-next signal. |
| Observability live | 🟢 Built and drill-tested | Operator paging on 5xx / webhook failures / AI outages; rate limiting; CORS lock; runbook in `OPS.md`. Needs a prod `ALERT_WEBHOOK_URL`. |
| Launch-a-module workflow | 🟢 Verified | One click in `/admin` (Go Live), price edits inline. |

## Deploy shape

Two deployables + one database. Any host works; Railway/Vercel is the
lowest-friction pairing:

1. **Postgres** (Railway) → gives you `DATABASE_URL`. Run
   `pnpm --filter @vault/db prisma migrate deploy` then
   `pnpm --filter @vault/db tsx prisma/seed.ts` once.
2. **API** (Railway service, `pnpm --filter @vault/api dev`-equivalent start
   with `tsx src/server.ts`) → set every var in `apps/api/.env.example`.
3. **Web** (Vercel, root `apps/web`) → `NEXT_PUBLIC_API_URL` (the API's public
   URL), `AUTH_SECRET` (same as API), `NEXTAUTH_URL` (the web app's own URL),
   `DATABASE_URL` (NextAuth reads users directly), Google OAuth creds if you
   want that button live.
4. Register the Stripe webhook endpoint (`https://<api>/billing/webhook`) and
   put its signing secret in `STRIPE_WEBHOOK_SECRET`.
5. Point an uptime monitor at `/health`. Send a test alert.

## Soft-launch motion (the roadmap's plan, ready to run)

1. Flip your best 5-10 modules live in `/admin` — start small even though 118
   exist; scarcity keeps the waitlist signal meaningful.
2. Share to a small list. Watch `/admin`: preview→buy conversion on live
   modules, waitlist counts on coming-soon ones.
3. Every week: the coming-soon module with the most signups gets flipped live
   (it's already built — launching is the button).
4. Raise prices before widening distribution if conversion is strong.

## What I'd do first after launch

- Watch `stripe-webhook-failure` alerts like a hawk for the first week — that
  alert is "someone paid and didn't get access."
- Check AI token spend in `/admin` (AI Calls card) against the Anthropic
  console weekly until you trust the preview-allowance economics.
- Run the backup restore drill once while the stakes are still low.
