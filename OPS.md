# Operations Runbook

Phase 9 deliverable: how to run, watch, and recover this thing in production.
Config reference lives in `apps/api/.env.example` — this file is the *why and
what to do at 2am*.

## Alerting

Set `ALERT_WEBHOOK_URL` to any webhook accepting `{"text": "..."}` (Slack
incoming webhook, Discord webhook with `/slack` appended, ntfy topic). The API
pages it — deduped to one page per alert kind per 5 minutes — on:

| Alert kind | Meaning | First move |
|---|---|---|
| `stripe-webhook-failure` | **Someone likely paid and didn't get access.** Stripe will retry the delivery; the alert includes the event type + id. | Check the Stripe dashboard → Events for the failing event; fix, let the retry land, then confirm the Purchase/Subscription row exists. |
| `api-5xx` | An unhandled server error reached a user. | `railway logs` (or wherever the API runs) — the structured log line has the url/method/stack. |
| `ai-provider-failure` | Anthropic calls are failing — every AI module is dark. | Check https://status.anthropic.com, then the key's spend limit in the Anthropic console. Modules degrade to their "AI is offline" state, nothing breaks. |

No `ALERT_WEBHOOK_URL` → alerts still land in the structured logs (grep for
`OPS ALERT`).

## Uptime

Point any uptime monitor (UptimeRobot, Better Stack) at `GET /health` on the
API and `GET /` on the web app. `/health` is exempt from rate limiting.

## Rate limits

- All API routes: `RATE_LIMIT_PER_MIN` per IP (default 120), 429 beyond it.
- AI routes additionally: `AI_RATE_LIMIT_PER_MIN` per **user** (default 20).
- Both are in-memory — correct for a single API instance. Scaling to
  multiple instances means moving both windows to Redis first.

## Security posture (audited 2026-07-03)

- **AuthN:** HS256 JWT minted by the web app (NextAuth), verified by the API
  with the shared `AUTH_SECRET`. Rotate by setting a new secret on both apps
  and accepting that live sessions re-login.
- **AuthZ / IDOR:** every `/store/:module/*` and `/ai/:module/*` query keys on
  `req.user.id` from the verified token — client-supplied ids are never
  trusted. Entitlement is checked server-side per request via
  `@vault/entitlements`; the client `mode` prop is UX only.
- **Webhooks:** Stripe signature verification against the raw body; handler
  failures return 500 so Stripe retries (and page the operator).
- **Secrets:** only ever server-side (`apps/api/.env`, gitignored). The web
  bundle sees nothing but `NEXT_PUBLIC_API_URL`.
- **CORS:** set `CORS_ORIGIN=https://yourdomain.com` in production. Unset is
  permissive and acceptable only in dev.
- **Admin:** `/admin/*` requires a signed-in user whose email is in
  `ADMIN_EMAILS`. Change the set by redeploying config, no DB involved.

## Backups & restore

Postgres on Railway (or any managed host) has automated snapshots — but a
backup you've never restored is a hope, not a backup. Quarterly drill:

```bash
# dump prod
pg_dump "$PROD_DATABASE_URL" -Fc -f vault-backup.dump
# restore into a throwaway and prove the app boots against it
docker run -d --name vault-restore -e POSTGRES_PASSWORD=x -p 5599:5432 postgres:16-alpine
pg_restore -d "postgresql://postgres:x@localhost:5599/postgres" vault-backup.dump
DATABASE_URL="postgresql://postgres:x@localhost:5599/postgres" pnpm --filter @vault/api dev
curl localhost:4000/health && curl localhost:4000/modules/unit-converter
```

The catalog itself (`packages/db/prisma/modules.catalog.ts`) is code — a fresh
`prisma migrate deploy && pnpm tsx prisma/seed.ts` rebuilds modules from
nothing. What only the database knows: users, purchases, subscriptions, store
documents, AI usage, waitlist signups.

## Going live checklist (feeds Phase 10)

1. `DATABASE_URL`, `AUTH_SECRET` set; migrations deployed; catalog seeded.
2. Stripe: keys + `STRIPE_PRICE_SUBSCRIPTION` set, webhook endpoint registered,
   one test purchase end-to-end with the Stripe CLI (`stripe listen`).
3. `ANTHROPIC_API_KEY` set; one real completion through `/ai/*`; spend limit
   configured in the Anthropic console.
4. `ADMIN_EMAILS`, `CORS_ORIGIN`, `ALERT_WEBHOOK_URL` set.
5. Uptime monitor on `/health`; send a test alert (stop the DB briefly in
   staging and watch the page arrive).
6. Restore drill performed at least once.
