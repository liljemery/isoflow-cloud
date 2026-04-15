import { flattenCollections } from '@isoflow/isopacks/dist/utils';
import awsIsopack from '@isoflow/isopacks/dist/aws';
import azureIsopack from '@isoflow/isopacks/dist/azure';
import gcpIsopack from '@isoflow/isopacks/dist/gcp';
import isoflowIsopack from '@isoflow/isopacks/dist/isoflow';
import kubernetesIsopack from '@isoflow/isopacks/dist/kubernetes';
import type { Icon, Model, View } from 'src/types/model';

const packs = [
  isoflowIsopack,
  awsIsopack,
  azureIsopack,
  gcpIsopack,
  kubernetesIsopack
];

/** Full icon library for the editor when the saved model has no icons (e.g. API default). */
export const ISOFLOW_LIBRARY_ICONS: Icon[] = flattenCollections(packs);

/** Merge saved icons on top of the default library so the picker always has the full set. */
export function mergeModelWithLibraryIcons<T extends { icons: Icon[] }>(model: T): T {
  const byId = new Map<string, Icon>();
  for (const icon of ISOFLOW_LIBRARY_ICONS) {
    byId.set(icon.id, icon);
  }
  for (const icon of model.icons) {
    byId.set(icon.id, icon);
  }
  return { ...model, icons: [...byId.values()] };
}

/** Persist only icons referenced by model items — avoids multi‑MB PATCH bodies and overlapping slow saves. */
export function slimModelForPersist(model: Model): Model {
  const ref = new Set<string>();
  for (const item of model.items) {
    if (item.icon) ref.add(item.icon);
  }
  const slimIcons = model.icons.filter((icon) => ref.has(icon.id));
  return { ...model, icons: slimIcons };
}

/**
 * Overlay client views onto the server list by id. Keeps views missing from the client
 * (so autosave cannot wipe sibling views if the editor only holds the active one).
 * Appends client-only views (e.g. race with another tab) at the end.
 */
export function mergeViewsForPersist(serverViews: View[], clientViews: View[]): View[] {
  const clientById = new Map(clientViews.map((v) => [v.id, v]));
  const merged = serverViews.map((sv) => clientById.get(sv.id) ?? sv);
  const serverIds = new Set(serverViews.map((v) => v.id));
  for (const v of clientViews) {
    if (!serverIds.has(v.id)) merged.push(v);
  }
  return merged;
}

/** Slim model for PATCH, merging client `views` with last-known server list so sibling views are not dropped. */
export function buildSlimPayloadForApi(
  model: Model,
  serverViewsBaseline: View[] | null
): Model {
  const slim = slimModelForPersist(model);
  const views = mergeViewsForPersist(serverViewsBaseline ?? slim.views, slim.views);
  return { ...slim, views };
}
