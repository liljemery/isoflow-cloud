import React, { useEffect, useRef } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { theme } from 'src/styles/theme';
import { IsoflowProps } from 'src/types';
import { setWindowCursor, modelFromModelStore } from 'src/utils';
import { useModelStore, ModelProvider } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { GlobalStyles } from 'src/styles/GlobalStyles';
import { Renderer } from 'src/components/Renderer/Renderer';
import { UiOverlay } from 'src/components/UiOverlay/UiOverlay';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { INITIAL_DATA, MAIN_MENU_OPTIONS } from 'src/config';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { IsoflowHostProvider } from 'src/context/IsoflowHostContext';

const App = ({
  initialData,
  mainMenuOptions = MAIN_MENU_OPTIONS,
  width = '100%',
  height = '100%',
  onModelUpdated,
  enableDebugTools = false,
  editorMode = 'EDITABLE',
  renderer
}: IsoflowProps) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const initialDataManager = useInitialDataManager();
  const model = useModelStore((state) => {
    return modelFromModelStore(state);
  });
  const notifyParentRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Avoid notifying on every parent re-render: `model` is a new object reference with the same data. */
  const lastNotifiedModelJsonRef = useRef<string | null>(null);

  const { load } = initialDataManager;

  useEffect(() => {
    lastNotifiedModelJsonRef.current = null;
    load({ ...INITIAL_DATA, ...initialData });
  }, [initialData, load]);

  useEffect(() => {
    uiStateActions.setEditorMode(editorMode);
    uiStateActions.setMainMenuOptions(mainMenuOptions);
  }, [editorMode, uiStateActions, mainMenuOptions]);

  useEffect(() => {
    return () => {
      setWindowCursor('default');
    };
  }, []);

  useEffect(() => {
    if (!initialDataManager.isReady || !onModelUpdated) return;

    const json = JSON.stringify(model);
    if (json === lastNotifiedModelJsonRef.current) {
      return;
    }

    if (notifyParentRef.current) {
      clearTimeout(notifyParentRef.current);
    }
    notifyParentRef.current = setTimeout(() => {
      notifyParentRef.current = null;
      lastNotifiedModelJsonRef.current = JSON.stringify(model);
      onModelUpdated(model);
    }, 400);

    return () => {
      if (notifyParentRef.current) {
        clearTimeout(notifyParentRef.current);
        notifyParentRef.current = null;
      }
    };
  }, [model, initialDataManager.isReady, onModelUpdated]);

  useEffect(() => {
    uiStateActions.setEnableDebugTools(enableDebugTools);
  }, [enableDebugTools, uiStateActions]);

  if (!initialDataManager.isReady) return null;

  return (
    <>
      <GlobalStyles />
      <Box
        sx={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        <Renderer {...renderer} />
        <UiOverlay />
      </Box>
    </>
  );
};

export const Isoflow = (props: IsoflowProps) => {
  const { mergeImportedJson, ...appProps } = props;
  return (
    <ThemeProvider theme={theme}>
      <ModelProvider>
        <SceneProvider>
          <UiStateProvider>
            <IsoflowHostProvider mergeImportedJson={mergeImportedJson}>
              <App {...appProps} />
            </IsoflowHostProvider>
          </UiStateProvider>
        </SceneProvider>
      </ModelProvider>
    </ThemeProvider>
  );
};

const useIsoflow = () => {
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });

  const ModelActions = useModelStore((state) => {
    return state.actions;
  });

  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  return {
    Model: ModelActions,
    uiState: uiStateActions,
    rendererEl
  };
};

export { useIsoflow };
export * from 'src/standaloneExports';
export default Isoflow;
