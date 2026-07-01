import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerModuleRoutes } from './routes/modules.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true }));
await registerModuleRoutes(app);

const port = Number(process.env.API_PORT ?? 4000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
