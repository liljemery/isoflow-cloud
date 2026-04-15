import type { Prisma, PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import {
  modelBasePayloadSchema,
  modelPayloadSchema
} from '../../../src/schemas/modelPayload.js';

export type FullModelPayload = z.infer<typeof modelPayloadSchema>;

export function assembleFullModel(
  modelJson: Prisma.JsonValue,
  rows: { viewKey: string; sortOrder: number; payload: Prisma.JsonValue }[]
): FullModelPayload {
  const baseParsed = modelBasePayloadSchema.safeParse(modelJson);
  if (!baseParsed.success) {
    throw new Error('Stored project model failed validation');
  }
  const ordered = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const views = ordered.map((r) => r.payload) as FullModelPayload['views'];
  const full = { ...baseParsed.data, views };
  const assembled = modelPayloadSchema.safeParse(full);
  if (!assembled.success) {
    throw new Error('Assembled model failed validation');
  }
  return assembled.data;
}

export async function persistFullModel(
  prisma: PrismaClient,
  projectId: number,
  fullModel: FullModelPayload,
  title: string
): Promise<void> {
  const { views, ...rest } = fullModel;
  const base = modelBasePayloadSchema.parse(rest);

  await prisma.$transaction(async (tx) => {
    if (views.length === 0) {
      await tx.projectView.deleteMany({ where: { projectId } });
    } else {
      const keep = views.map((v) => v.id);
      await tx.projectView.deleteMany({
        where: {
          projectId,
          viewKey: { notIn: keep }
        }
      });
    }

    for (let i = 0; i < views.length; i++) {
      const v = views[i];
      await tx.projectView.upsert({
        where: {
          projectId_viewKey: {
            projectId,
            viewKey: v.id
          }
        },
        create: {
          projectId,
          viewKey: v.id,
          sortOrder: i,
          payload: v as object
        },
        update: {
          sortOrder: i,
          payload: v as object
        }
      });
    }

    await tx.project.update({
      where: { id: projectId },
      data: {
        title,
        model: base as object
      }
    });
  });
}
