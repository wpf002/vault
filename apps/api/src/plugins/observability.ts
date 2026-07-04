import type { FastifyInstance } from 'fastify';

/**
 * Phase 9 — the "know when it breaks" layer.
 *
 * Alerting is vendor-agnostic on purpose: ALERT_WEBHOOK_URL takes any
 * webhook that accepts {"text": "..."} (Slack, Discord w/ /slack suffix,
 * ntfy, a phone-pinging Zap). No URL set → alerts degrade to structured
 * error logs, which Fastify already emits. Sentry can slot in later the
 * same way Stripe keys do — env-driven, no code change required here.
 *
 * Rate limiting here is the coarse public shield (per-IP); the AI route
 * keeps its own tighter per-user limiter. In-memory state is correct for
 * a single API process — a multi-instance deploy moves both to Redis.
 */

const ALERT_COOLDOWN_MS = 5 * 60_000;
const lastAlertAt = new Map<string, number>();

/** Fire-and-forget operator page. Deduped per kind so an error storm sends one page, not hundreds. */
export function alertOps(app: FastifyInstance, kind: string, detail: string) {
  app.log.error({ alert: kind, detail }, `OPS ALERT: ${kind}`);
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const now = Date.now();
  if (now - (lastAlertAt.get(kind) ?? 0) < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(kind, now);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `🚨 [vault] ${kind}: ${detail.slice(0, 500)}` }),
  }).catch((err) => app.log.warn({ err }, 'Alert webhook delivery failed'));
}

// ---- per-IP rate limiting (public shield) ----

const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 120);
const ipWindows = new Map<string, number[]>();

// Unbounded growth guard: sweep stale windows every few minutes so a
// scan of many IPs can't slowly eat memory.
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [ip, hits] of ipWindows) {
    const live = hits.filter((t) => t > cutoff);
    if (live.length === 0) ipWindows.delete(ip);
    else ipWindows.set(ip, live);
  }
}, 5 * 60_000).unref();

function ipLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipWindows.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= RATE_LIMIT_PER_MIN) {
    ipWindows.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipWindows.set(ip, hits);
  return false;
}

export async function observabilityPlugin(app: FastifyInstance) {
  // Coarse per-IP limit on everything except the uptime probe.
  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health') return;
    if (ipLimited(req.ip)) {
      reply.code(429).send({ error: 'Too many requests' });
    }
  });

  // One error handler: structured log, operator page on 5xx, and a
  // sanitized body to the client (no stack traces leave the server).
  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    req.log.error({ err, url: req.url, method: req.method }, 'request errored');
    if (status >= 500) {
      alertOps(app, 'api-5xx', `${req.method} ${req.url} → ${status}: ${err.message}`);
    }
    reply.code(status).send({ error: status >= 500 ? 'Internal error' : err.message });
  });
}
