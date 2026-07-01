import Fastify from 'fastify';
import cors from '@fastify/cors';
import rawBody from 'fastify-raw-body';
import { authPlugin, requireAuth } from './plugins/auth.js';
import { registerModuleRoutes } from './routes/modules.js';
import { registerBillingRoutes } from './routes/billing.js';
import { registerWaitlistRoutes } from './routes/waitlist.js';
import { registerLibraryRoutes } from './routes/library.js';
import { registerAccountRoutes } from './routes/account.js';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET must be set — it is the shared secret used to verify session tokens issued by the web app.');
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
// global: false — only routes that opt in via `config: { rawBody: true }`
// (the Stripe webhook) get the raw body Stripe's signature check needs.
await app.register(rawBody, { global: false });
await authPlugin(app);

app.get('/health', async () => ({ ok: true }));
// Proves the API can resolve "who is this?" from the bearer token on every request.
app.get('/me', { preHandler: requireAuth }, async (req) => req.user);
await registerModuleRoutes(app);
await registerBillingRoutes(app);
await registerWaitlistRoutes(app);
await registerLibraryRoutes(app);
await registerAccountRoutes(app);

const port = Number(process.env.API_PORT ?? 4000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
