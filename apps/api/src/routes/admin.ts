import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@vault/db';
import { requireAuth } from '../plugins/auth.js';

/**
 * Phase 8 — admin & catalog control. Everything the roadmap wants operable
 * without SQL: flip module status, edit catalog copy/pricing, read the
 * waitlist-demand signal, and see the basic business metrics.
 *
 * Authz: ADMIN_EMAILS (comma-separated env). No row in the database, no
 * separate role system — the admin set is deploy-time config, which is the
 * right size for a one-operator store. Every route requires a signed-in
 * user whose email is in that list.
 */

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (!adminEmails().has(req.user!.email.toLowerCase())) {
    reply.code(403).send({ error: 'Admin access required' });
  }
}

const MODULE_STATUSES = ['coming_soon', 'live', 'retired'] as const;
type ModuleStatus = (typeof MODULE_STATUSES)[number];

export async function registerAdminRoutes(app: FastifyInstance) {
  // The dashboard numbers: revenue, conversion signal, top modules, AI cost visibility.
  app.get('/admin/overview', { preHandler: requireAdmin }, async () => {
    const [users, purchases, revenueAgg, activeSubs, aiAgg, waitlistTop, topModules] = await Promise.all([
      prisma.user.count(),
      prisma.purchase.count(),
      prisma.purchase.aggregate({ _sum: { amountCents: true } }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.aiUsage.aggregate({ _sum: { inputTokens: true, outputTokens: true }, _count: true }),
      prisma.waitlistSignup.groupBy({
        by: ['moduleId'],
        _count: true,
        orderBy: { _count: { moduleId: 'desc' } },
        take: 5,
      }),
      prisma.purchase.groupBy({
        by: ['moduleId'],
        _count: true,
        orderBy: { _count: { moduleId: 'desc' } },
        take: 5,
      }),
    ]);

    // resolve the grouped module ids to names in one query
    const ids = [...new Set([...waitlistTop.map((w) => w.moduleId), ...topModules.map((t) => t.moduleId)])];
    const mods = await prisma.module.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true } });
    const nameOf = new Map(mods.map((m) => [m.id, m]));

    return {
      users,
      purchases,
      revenueCents: revenueAgg._sum.amountCents ?? 0,
      activeSubscriptions: activeSubs,
      ai: { calls: aiAgg._count, inputTokens: aiAgg._sum.inputTokens ?? 0, outputTokens: aiAgg._sum.outputTokens ?? 0 },
      topWaitlist: waitlistTop.map((w) => ({ module: nameOf.get(w.moduleId) ?? null, signups: w._count })),
      topPurchased: topModules.map((t) => ({ module: nameOf.get(t.moduleId) ?? null, purchases: t._count })),
    };
  });

  // The full catalog with the per-module demand/sales counts the roadmap calls the build-next signal.
  app.get('/admin/modules', { preHandler: requireAdmin }, async () => {
    const [modules, waitlistCounts, purchaseCounts] = await Promise.all([
      prisma.module.findMany({ orderBy: { number: 'asc' } }),
      prisma.waitlistSignup.groupBy({ by: ['moduleId'], _count: true }),
      prisma.purchase.groupBy({ by: ['moduleId'], _count: true }),
    ]);
    const waitlistOf = new Map(waitlistCounts.map((w) => [w.moduleId, w._count]));
    const purchasesOf = new Map(purchaseCounts.map((p) => [p.moduleId, p._count]));
    return modules.map((m) => ({
      ...m,
      waitlistCount: waitlistOf.get(m.id) ?? 0,
      purchaseCount: purchasesOf.get(m.id) ?? 0,
    }));
  });

  // The button-click launch: status flips, copy edits, price changes.
  app.patch<{ Params: { slug: string }; Body: { status?: string; priceCents?: number; name?: string; description?: string; icon?: string } }>(
    '/admin/modules/:slug',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { status, priceCents, name, description, icon } = req.body ?? {};
      const data: Record<string, unknown> = {};

      if (status !== undefined) {
        if (!MODULE_STATUSES.includes(status as ModuleStatus)) {
          return reply.code(400).send({ error: `status must be one of ${MODULE_STATUSES.join(', ')}` });
        }
        data.status = status;
      }
      if (priceCents !== undefined) {
        if (!Number.isInteger(priceCents) || priceCents < 0) {
          return reply.code(400).send({ error: 'priceCents must be a non-negative integer (money is integer cents)' });
        }
        data.priceCents = priceCents;
      }
      if (name !== undefined) data.name = String(name).slice(0, 200);
      if (description !== undefined) data.description = String(description).slice(0, 1000);
      if (icon !== undefined) data.icon = String(icon).slice(0, 8);

      if (Object.keys(data).length === 0) return reply.code(400).send({ error: 'Nothing to update' });

      const updated = await prisma.module
        .update({ where: { slug: req.params.slug }, data })
        .catch(() => null);
      if (!updated) return reply.code(404).send({ error: 'Module not found' });
      return updated;
    },
  );

  // Refunds are Stripe-side (deliberately unwired until keys exist) — the
  // route documents the path so the UI can exist now and light up later.
  app.post<{ Params: { purchaseId: string } }>('/admin/purchases/:purchaseId/refund', { preHandler: requireAdmin }, async (req, reply) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return reply.code(503).send({ error: 'Refunds need Stripe configured (STRIPE_SECRET_KEY) — see apps/api/.env.example' });
    }
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.purchaseId } });
    if (!purchase?.stripePaymentId) return reply.code(404).send({ error: 'Purchase or its Stripe payment not found' });
    // When keys exist: stripe.refunds.create({ payment_intent: purchase.stripePaymentId })
    // then delete the Purchase row (the webhook's charge.refunded handler also does this —
    // idempotent either way, webhooks stay the source of truth).
    return reply.code(501).send({ error: 'Refund flow activates with Stripe keys' });
  });
}
