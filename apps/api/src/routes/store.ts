import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@vault/db';
import { hasAccess } from '@vault/entitlements';
import { requireAuth } from '../plugins/auth.js';

type Params = { module: string; collection: string; docId?: string };

/** preHandler: caller must be signed in AND entitled to :module. */
async function requireModuleAccess(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (!(await hasAccess(req.user!.id, req.params.module))) {
    reply.code(403).send({ error: 'No access to this module' });
  }
}

/**
 * The generic per-user document store — the real enforcement point for
 * preview-vs-full. Every route here requires both a signed-in user AND
 * entitlement to the module; there is no read-only/preview mode on this
 * API at all. Preview mode never calls it — modules seed ephemeral,
 * in-memory demo data client-side instead (see @vault/module-sdk's
 * store client). If the client is bypassed, this is what still says no.
 */
export async function registerStoreRoutes(app: FastifyInstance) {
  app.get<{ Params: Params }>(
    '/store/:module/:collection',
    { preHandler: requireModuleAccess },
    async (req) => {
      const { module, collection } = req.params;
      return prisma.storeDocument.findMany({
        where: { userId: req.user!.id, moduleSlug: module, collection },
        orderBy: { updatedAt: 'desc' },
      });
    },
  );

  app.get<{ Params: Required<Params> }>(
    '/store/:module/:collection/:docId',
    { preHandler: requireModuleAccess },
    async (req, reply) => {
      const { module, collection, docId } = req.params;
      const doc = await prisma.storeDocument.findUnique({
        where: { userId_moduleSlug_collection_docId: { userId: req.user!.id, moduleSlug: module, collection, docId } },
      });
      if (!doc) return reply.code(404).send({ error: 'Not found' });
      return doc;
    },
  );

  app.post<{ Params: Params; Body: { docId?: string; data: unknown } }>(
    '/store/:module/:collection',
    { preHandler: requireModuleAccess },
    async (req, reply) => {
      const { module, collection } = req.params;
      const docId = req.body.docId ?? crypto.randomUUID();
      const doc = await prisma.storeDocument.create({
        data: { userId: req.user!.id, moduleSlug: module, collection, docId, data: req.body.data as never },
      });
      return reply.code(201).send(doc);
    },
  );

  app.put<{ Params: Required<Params>; Body: { data: unknown } }>(
    '/store/:module/:collection/:docId',
    { preHandler: requireModuleAccess },
    async (req) => {
      const { module, collection, docId } = req.params;
      return prisma.storeDocument.upsert({
        where: { userId_moduleSlug_collection_docId: { userId: req.user!.id, moduleSlug: module, collection, docId } },
        create: { userId: req.user!.id, moduleSlug: module, collection, docId, data: req.body.data as never },
        update: { data: req.body.data as never },
      });
    },
  );

  app.delete<{ Params: Required<Params> }>(
    '/store/:module/:collection/:docId',
    { preHandler: requireModuleAccess },
    async (req, reply) => {
      const { module, collection, docId } = req.params;
      await prisma.storeDocument
        .delete({
          where: { userId_moduleSlug_collection_docId: { userId: req.user!.id, moduleSlug: module, collection, docId } },
        })
        .catch(() => null); // deleting something already gone is not an error
      return reply.code(204).send();
    },
  );
}
