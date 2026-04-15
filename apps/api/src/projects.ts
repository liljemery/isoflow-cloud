import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from './prisma.js';
import { authenticate } from './auth.js';
import { validateModelPayload } from './validateModelPayload.js';
import { defaultModelPayload } from './defaultModel.js';
import {
  assembleFullModel,
  persistFullModel,
  type FullModelPayload
} from './projectModelStorage.js';

const createBody = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.unknown().optional()
});

const patchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.unknown().optional()
});

function resolveTitleFromPatch(
  existingTitle: string,
  patchTitle: string | undefined,
  patchModel: unknown | undefined
): string {
  if (patchTitle !== undefined) {
    return patchTitle;
  }
  if (
    patchModel !== undefined &&
    typeof patchModel === 'object' &&
    patchModel !== null &&
    'title' in patchModel
  ) {
    return String((patchModel as { title: string }).title);
  }
  return existingTitle;
}

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

      const fullModel = model as FullModelPayload;

      const title =
        parsed.data.title ??
        (typeof model === 'object' && model !== null && 'title' in model
          ? String((model as { title: string }).title)
          : 'Untitled');

      const { views, ...base } = fullModel;

      const project = await prisma.project.create({
        data: {
          userId: request.auth!.userId,
          title,
          model: base as object,
          projectViews: {
            create: views.map((v, i) => ({
              viewKey: v.id,
              sortOrder: i,
              payload: v as object
            }))
          }
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
        where: { uuid, userId: request.auth!.userId },
        include: {
          projectViews: { orderBy: { sortOrder: 'asc' } }
        }
      });
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      let model: FullModelPayload;
      try {
        model = assembleFullModel(project.model, project.projectViews);
      } catch {
        return reply.status(500).send({ error: 'Corrupt project data' });
      }

      return reply.send({
        project: {
          uuid: project.uuid,
          title: project.title,
          model,
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
        where: { uuid, userId: request.auth!.userId },
        include: {
          projectViews: { orderBy: { sortOrder: 'asc' } }
        }
      });
      if (!existing) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      if (parsed.data.model === undefined) {
        if (parsed.data.title === undefined) {
          return reply.status(400).send({ error: 'Nothing to update' });
        }
        const nextTitle = parsed.data.title;
        const prevBase =
          typeof existing.model === 'object' &&
          existing.model !== null &&
          !Array.isArray(existing.model)
            ? (existing.model as Record<string, unknown>)
            : {};
        const project = await prisma.project.update({
          where: { id: existing.id },
          data: {
            title: nextTitle,
            model: { ...prevBase, title: nextTitle } as object
          },
          include: {
            projectViews: { orderBy: { sortOrder: 'asc' } }
          }
        });
        let model: FullModelPayload;
        try {
          model = assembleFullModel(project.model, project.projectViews);
        } catch {
          return reply.status(500).send({ error: 'Corrupt project data' });
        }
        return reply.send({
          project: {
            uuid: project.uuid,
            title: project.title,
            model,
            updatedAt: project.updatedAt
          }
        });
      }

      const v = validateModelPayload(parsed.data.model);
      if (!v.success) {
        return reply.status(400).send({ error: 'Invalid model', details: v.error.flatten() });
      }

      let fullModel = v.data as FullModelPayload;
      const nextTitle = resolveTitleFromPatch(
        existing.title,
        parsed.data.title,
        parsed.data.model
      );
      fullModel = {
        ...fullModel,
        title: nextTitle
      };

      try {
        await persistFullModel(prisma, existing.id, fullModel, nextTitle);
      } catch {
        return reply.status(500).send({ error: 'Failed to save project' });
      }

      const updated = await prisma.project.findFirst({
        where: { id: existing.id },
        include: {
          projectViews: { orderBy: { sortOrder: 'asc' } }
        }
      });
      if (!updated) {
        return reply.status(500).send({ error: 'Project missing after save' });
      }

      let model: FullModelPayload;
      try {
        model = assembleFullModel(updated.model, updated.projectViews);
      } catch {
        return reply.status(500).send({ error: 'Corrupt project data' });
      }

      return reply.send({
        project: {
          uuid: updated.uuid,
          title: updated.title,
          model,
          updatedAt: updated.updatedAt
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
