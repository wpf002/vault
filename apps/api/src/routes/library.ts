import type { FastifyInstance } from 'fastify';
import { prisma } from '@vault/db';
import { accessibleModules } from '@vault/entitlements';
import { requireAuth } from '../plugins/auth.js';

export async function registerLibraryRoutes(app: FastifyInstance) {
  // "Your apps" — everything the signed-in user can launch right now.
  app.get('/library', { preHandler: requireAuth }, async (req) => {
    const slugs = await accessibleModules(req.user!.id);
    if (slugs.size === 0) return [];
    return prisma.module.findMany({
      where: { slug: { in: Array.from(slugs) } },
      orderBy: { number: 'asc' },
      select: { slug: true, number: true, name: true, description: true, category: true },
    });
  });
}
