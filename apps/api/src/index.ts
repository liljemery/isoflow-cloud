import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { assertProductionSecrets, BODY_LIMIT, PORT } from './env.js';
import { registerAuthRoutes } from './auth.js';
import { registerProjectRoutes } from './projects.js';
import { prisma } from './prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  assertProductionSecrets();

  const app = Fastify({
    trustProxy: true,
    bodyLimit: BODY_LIMIT,
    logger: true
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  app.get('/health', async () => {
    return { ok: true };
  });

  await app.register(
    async (api) => {
      await registerAuthRoutes(api);
      await registerProjectRoutes(api);
    },
    { prefix: '/api' }
  );

  const webDist = path.join(__dirname, '..', 'web', 'dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: '/',
      decorateReply: true,
      // Avoid default `/*` static route shadowing /health and /api behind Railway's proxy.
      wildcard: false
    });

    app.setNotFoundHandler((request, reply) => {
      const pathname = request.url.split('?')[0] ?? '';
      if (pathname.startsWith('/api') || pathname === '/health') {
        return reply.status(404).send({ error: 'Not found' });
      }
      if (request.method !== 'GET') {
        return reply.status(404).send({ error: 'Not found' });
      }
      const html = readFileSync(path.join(webDist, 'index.html'), 'utf-8');
      return reply.type('text/html').send(html);
    });
  }

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info({ port: PORT, host: '0.0.0.0' }, 'server listening');

  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
