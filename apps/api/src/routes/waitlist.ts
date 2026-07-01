import type { FastifyInstance } from 'fastify';
import { prisma } from '@vault/db';

export async function registerWaitlistRoutes(app: FastifyInstance) {
  // Public — no login required to signal demand for a coming_soon module.
  app.post<{ Body: { email?: string; slug?: string } }>('/waitlist', async (req, reply) => {
    const { email, slug } = req.body ?? {};
    if (!email || !slug) return reply.code(400).send({ error: 'email and slug are required' });

    const module = await prisma.module.findUnique({ where: { slug } });
    if (!module) return reply.code(404).send({ error: 'Module not found' });

    await prisma.waitlistSignup.upsert({
      where: { email_moduleId: { email, moduleId: module.id } },
      create: { email, moduleId: module.id },
      update: {},
    });
    return { ok: true };
  });
}
