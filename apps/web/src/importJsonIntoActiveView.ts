import { modelSchema } from 'src/schemas/model';
import type { InitialData } from 'src/types/isoflowProps';
import type { Model, View } from 'src/types/model';

function mergeRecordsById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  for (const x of base) {
    byId.set(x.id, x);
  }
  for (const x of incoming) {
    byId.set(x.id, x);
  }
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of base) {
    if (!seen.has(x.id)) {
      seen.add(x.id);
      const v = byId.get(x.id);
      if (v) out.push(v);
    }
  }
  for (const x of incoming) {
    if (!seen.has(x.id)) {
      seen.add(x.id);
      const v = byId.get(x.id);
      if (v) out.push(v);
    }
  }
  return out;
}

/**
 * Import JSON into the active canvas only: keeps project `title` / `description` / `version`,
 * merges `items` / `icons` / `colors` by id, replaces one view's canvas from the file's first view.
 */
export function mergeImportedJsonIntoActiveView(
  imported: unknown,
  ctx: { currentModel: Model; activeViewId: string }
): InitialData {
  const parsed = modelSchema.safeParse(imported);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid model';
    window.alert(`There is an error in your model: ${msg}`);
    throw new Error('Model validation failed');
  }
  const imp = parsed.data;
  if (!imp.views?.length) {
    window.alert('Imported file has no views.');
    throw new Error('No views in import');
  }
  const sourceView = imp.views[0];
  const target = ctx.currentModel.views.find((v) => v.id === ctx.activeViewId);
  if (!target) {
    window.alert('Current view not found in model.');
    throw new Error('View not found');
  }
  const mergedView = {
    ...target,
    ...sourceView,
    id: ctx.activeViewId,
    name: target.name
  } as View;

  const views = ctx.currentModel.views.map((v) =>
    v.id === ctx.activeViewId ? mergedView : v
  );

  return {
    ...ctx.currentModel,
    title: ctx.currentModel.title,
    description: ctx.currentModel.description,
    version: ctx.currentModel.version,
    items: mergeRecordsById(ctx.currentModel.items, imp.items),
    icons: mergeRecordsById(ctx.currentModel.icons, imp.icons),
    colors: mergeRecordsById(ctx.currentModel.colors, imp.colors),
    views,
    view: ctx.activeViewId,
    fitToView: true
  };
}
