import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from './prisma.js';
import { authenticate } from './auth.js';
import { validateModelPayload } from './validateModelPayload.js';
import { defaultModelPayload } from './defaultModel.js';

const createBody = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.unknown().optional()
});

const patchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.unknown().optional()
});

export async function registerProjectRoutes(app: FastifyInstance) {
  app.get(
    '/projects',
    { preHandler: authenticate },
    async (request, reply) => {
      const q = typeof request.query === 'object' && request.query && 'q' in request.query
        ? String((request.query as { q?: string }).q ?? '').trim()
        : '';

      const userId = request.auth!.userId;

      const projects = await prisma.project.findMany({
        where: {
          userId,
          ...(q
            ? {
                title: {
                  contains: q,
                  mode: 'insensitive' as const
                }
              }
            : {})
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          uuid: true,
          title: true,
          updatedAt: true,
          createdAt: true
        }
      });

      return reply.send({ projects });
    }
  );

  app.post(
    '/projects',
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = createBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }

      let model: unknown = defaultModelPayload;
      if (parsed.data.model !== undefined) {
        const v = validateModelPayload(parsed.data.model);
        if (!v.success) {
          return reply.status(400).send({ error: 'Invalid model', details: v.error.flatten() });
        }
        model = v.data;
      }

      const title =
        parsed.data.title ??
        (typeof model === 'object' && model !== null && 'title' in model
          ? String((model as { title: string }).title)
          : 'Untitled');

      const project = await prisma.project.create({
        data: {
          userId: request.auth!.userId,
          title,
          model: model as object
        }
      });

      return reply.status(201).send({
        project: {
          uuid: project.uuid,
          title: project.title,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      });
    }
  );

  app.get(
    '/projects/:uuid',
    { preHandler: authenticate },
    async (request, reply) => {
      const uuid = (request.params as { uuid: string }).uuid;
      const project = await prisma.project.findFirst({
        where: { uuid, userId: request.auth!.userId }
      });
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      return reply.send({
        project: {
          uuid: project.uuid,
          title: project.title,
          model: project.model,
          updatedAt: project.updatedAt,
          createdAt: project.createdAt
        }
      });
    }
  );

  app.patch(
    '/projects/:uuid',
    { preHandler: authenticate },
    async (request, reply) => {
      const uuid = (request.params as { uuid: string }).uuid;
      const parsed = patchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }

      const existing = await prisma.project.findFirst({
        where: { uuid, userId: request.auth!.userId }
      });
      if (!existing) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      let nextModel = existing.model;
      if (parsed.data.model !== undefined) {
        const v = validateModelPayload(parsed.data.model);
        if (!v.success) {
          return reply.status(400).send({ error: 'Invalid model', details: v.error.flatten() });
        }
        nextModel = v.data as object;
      }

      const nextTitle =
        parsed.data.title ??
        (parsed.data.model !== undefined &&
        typeof parsed.data.model === 'object' &&
        parsed.data.model !== null &&
        'title' in parsed.data.model
          ? String((parsed.data.model as { title: string }).title)
          : existing.title);

      const modelToStore =
        typeof nextModel === 'object' &&
        nextModel !== null &&
        !Array.isArray(nextModel)
          ? { ...(nextModel as object), title: nextTitle }
          : nextModel;

      const project = await prisma.project.update({
        where: { id: existing.id },
        data: {
          title: nextTitle,
          model: modelToStore as object
        }
      });

      return reply.send({
        project: {
          uuid: project.uuid,
          title: project.title,
          model: project.model,
          updatedAt: project.updatedAt
        }
      });
    }
  );

  app.delete(
    '/projects/:uuid',
    { preHandler: authenticate },
    async (request, reply) => {
      const uuid = (request.params as { uuid: string }).uuid;
      const existing = await prisma.project.findFirst({
        where: { uuid, userId: request.auth!.userId }
      });
      if (!existing) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      await prisma.project.delete({ where: { id: existing.id } });
      return reply.status(204).send();
    }
  );
}
