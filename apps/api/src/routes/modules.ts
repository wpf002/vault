import type { FastifyInstance } from 'fastify';
import { prisma } from '@vault/db';
import { hasAccess } from '@vault/entitlements';

export async function registerModuleRoutes(app: FastifyInstance) {
  // Public catalog — everyone sees all 120, live + coming_soon.
  app.get('/modules', async () => {
    return prisma.module.findMany({
      orderBy: { number: 'asc' },
      select: {
        slug: true, number: true, name: true, description: true, icon: true,
        category: true, status: true, priceCents: true, requiresAi: true,
      },
    });
  });

  // Module detail — public, same visibility as the catalog list.
  app.get<{ Params: { slug: string } }>('/modules/:slug', async (req, reply) => {
    const module = await prisma.module.findUnique({
      where: { slug: req.params.slug },
      select: {
        slug: true, number: true, name: true, description: true, icon: true,
        category: true, status: true, priceCents: true, requiresAi: true,
      },
    });
    if (!module) return reply.code(404).send({ error: 'Not found' });
    return module;
  });

  // Access check for a given module. Anonymous callers always get access: false.
  app.get<{ Params: { slug: string } }>('/modules/:slug/access', async (req) => {
    if (!req.user) return { access: false };
    return { access: await hasAccess(req.user.id, req.params.slug) };
  });
}
