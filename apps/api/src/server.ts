import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin, requireAuth } from './plugins/auth.js';
import { registerModuleRoutes } from './routes/modules.js';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET must be set — it is the shared secret used to verify session tokens issued by the web app.');
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await authPlugin(app);

app.get('/health', async () => ({ ok: true }));
// Proves the API can resolve "who is this?" from the bearer token on every request.
app.get('/me', { preHandler: requireAuth }, async (req) => req.user);
await registerModuleRoutes(app);

const port = Number(process.env.API_PORT ?? 4000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
