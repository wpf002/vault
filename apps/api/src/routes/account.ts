import type { FastifyInstance } from 'fastify';
import { prisma } from '@vault/db';
import { requireAuth } from '../plugins/auth.js';

export async function registerAccountRoutes(app: FastifyInstance) {
  app.get('/account', { preHandler: requireAuth }, async (req) => {
    const [subscription, purchases] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId: req.user!.id } }),
      prisma.purchase.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        select: {
          amountCents: true,
          createdAt: true,
          module: { select: { slug: true, name: true } },
        },
      }),
    ]);

    return {
      email: req.user!.email,
      subscription: subscription
        ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd }
        : null,
      purchases,
    };
  });
}
