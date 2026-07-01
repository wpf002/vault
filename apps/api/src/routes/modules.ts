import type { FastifyInstance } from 'fastify';
import { prisma } from '@vault/db';
import { hasAccess } from '@vault/entitlements';

export async function registerModuleRoutes(app: FastifyInstance) {
  // Public catalog — everyone sees all 121, live + coming_soon.
  app.get('/modules', async () => {
    return prisma.module.findMany({
      orderBy: { number: 'asc' },
      select: {
        slug: true, number: true, name: true, description: true,
        category: true, status: true, priceCents: true, requiresAi: true,
      },
    });
  });

  // Access check for a given module. Wire real auth to resolve userId later.
  app.get<{ Params: { slug: string } }>('/modules/:slug/access', async (req) => {
    const userId = (req.headers['x-user-id'] as string) ?? '';
    if (!userId) return { access: false };
    return { access: await hasAccess(userId, req.params.slug) };
  });
}
