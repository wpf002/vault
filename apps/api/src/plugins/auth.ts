import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';

export type SessionUser = { id: string; email: string };

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? '');

async function resolveUser(req: FastifyRequest): Promise<SessionUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Decorates every request with `req.user` (null if absent/invalid).
 * This alone does NOT gate anything — routes call `requireAuth` explicitly.
 *
 * Call this directly on the root app instance — NOT via `app.register()`.
 * Fastify's register() creates an encapsulated child context, so a hook
 * added inside it would never reach sibling routes registered on the
 * parent afterward.
 */
export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = await resolveUser(req);
  });
}

/** preHandler for routes that must reject unauthenticated callers. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}
