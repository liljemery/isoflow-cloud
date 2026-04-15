import { z } from 'zod';
import { constrainedStrings } from './common';
import { modelItemsSchema } from './modelItems';
import { viewsSchema } from './views';
import { iconsSchema } from './icons';
import { colorsSchema } from './colors';

/**
 * Structural Zod schema for persisted/API payloads.
 * Omits graph-consistency checks from modelSchema.superRefine (validateModel).
 */
export const modelPayloadSchema = z.object({
  version: z.string().max(10).optional(),
  title: constrainedStrings.title,
  description: constrainedStrings.description.optional(),
  items: modelItemsSchema,
  views: viewsSchema,
  icons: iconsSchema,
  colors: colorsSchema
});

/** Persisted `projects.model` JSON: shared diagram data only (views live in `project_views`). */
export const modelBasePayloadSchema = z.object({
  version: z.string().max(10).optional(),
  title: constrainedStrings.title,
  description: constrainedStrings.description.optional(),
  items: modelItemsSchema,
  icons: iconsSchema,
  colors: colorsSchema
});
