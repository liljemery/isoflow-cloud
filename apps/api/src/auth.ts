import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from './prisma.js';
import { JWT_SECRET } from './env.js';

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200)
});

export type AuthTokenPayload = {
  sub: number;
  userUuid: string;
};

export function signToken(userId: number, userUuid: string): string {
  return jwt.sign({ sub: userId, userUuid } satisfies AuthTokenPayload, JWT_SECRET, {
    expiresIn: '7d'
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token');
  }
  const rawSub = (decoded as { sub?: unknown }).sub;
  const userUuid = (decoded as { userUuid?: unknown }).userUuid;
  const sub =
    typeof rawSub === 'number'
      ? rawSub
      : typeof rawSub === 'string'
        ? parseInt(rawSub, 10)
        : NaN;
  if (!Number.isFinite(sub) || typeof userUuid !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub, userUuid };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash }
    });
    const token = signToken(user.id, user.uuid);
    return reply.status(201).send({
      token,
      user: { uuid: user.uuid, email: user.email }
    });
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }
    const token = signToken(user.id, user.uuid);
    return reply.send({
      token,
      user: { uuid: user.uuid, email: user.email }
    });
  });
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    request.auth = { userId: payload.sub, userUuid: payload.userUuid };
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: { userId: number; userUuid: string };
  }
}
