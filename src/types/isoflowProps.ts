import type { EditorModeEnum, MainMenuOptions } from './common';
import type { Model } from './model';
import type { RendererProps } from './rendererProps';

export type InitialData = Model & {
  fitToView?: boolean;
  view?: string;
};

/** Transform raw JSON before load — used by hosts to merge into one view and keep project title. */
export type MergeImportedJsonFn = (
  imported: unknown,
  ctx: { currentModel: Model; activeViewId: string }
) => InitialData;

export interface IsoflowProps {
  initialData?: InitialData;
  mainMenuOptions?: MainMenuOptions;
  onModelUpdated?: (Model: Model) => void;
  /** When set, JSON import merges into the active view and can preserve project-level fields. */
  mergeImportedJson?: MergeImportedJsonFn;
  width?: number | string;
  height?: number | string;
  enableDebugTools?: boolean;
  editorMode?: keyof typeof EditorModeEnum;
  renderer?: RendererProps;
}
