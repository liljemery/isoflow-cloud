import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Toolbar,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import Isoflow from 'src/Isoflow';
import { MAIN_MENU_OPTIONS } from 'src/config';
import type { Model, View } from 'src/types/model';
import type { InitialData } from 'src/types/isoflowProps';
import { apiGetProject, apiPatchProject } from '../api';
import { useAuth } from '../authContext';
import {
  buildSlimPayloadForApi,
  mergeModelWithLibraryIcons
} from '../isoflowLibraryIcons';
import { mergeImportedJsonIntoActiveView } from '../importJsonIntoActiveView';

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 1600;

export function EditorPage() {
  const { uuid, viewId } = useParams<{ uuid: string; viewId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const allowSaveAfterRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastModelRef = useRef<Model | null>(null);
  const pendingModelRef = useRef<Model | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const lastPersistedJsonRef = useRef<string | null>(null);
  /** Server-side view list from last load/save — merged with client so one view edit cannot drop siblings. */
  const serverViewsRef = useRef<View[] | null>(null);

  const [barTitle, setBarTitle] = useState('');

  useEffect(() => {
    if (!uuid || !viewId || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const project = await apiGetProject(token, uuid);
        if (cancelled) return;
        const merged = mergeModelWithLibraryIcons(project.model as Model);
        const hasView = merged.views.some((v) => v.id === viewId);
        if (!hasView) {
          setLoadError('This view does not exist in the project.');
          setInitialData(null);
          return;
        }
        const title =
          project.title?.trim() ||
          merged.title?.trim() ||
          'Untitled';
        const data = { ...merged, title, view: viewId };
        serverViewsRef.current = merged.views;
        setInitialData({ ...data, fitToView: true });
        setBarTitle(title);
        lastPersistedJsonRef.current = JSON.stringify(
          buildSlimPayloadForApi(data, serverViewsRef.current)
        );
        allowSaveAfterRef.current = Date.now() + 1200;
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uuid, viewId, token]);

  const flushSave = useCallback(async () => {
    if (!uuid || !token) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    try {
      do {
        saveQueuedRef.current = false;
        const model = pendingModelRef.current ?? lastModelRef.current;
        if (!model) break;

        setSaveState('saving');
        setSaveError(null);
        try {
          const payload = buildSlimPayloadForApi(model, serverViewsRef.current);
          await apiPatchProject(token, uuid, payload);
          serverViewsRef.current = payload.views;
          lastPersistedJsonRef.current = JSON.stringify(payload);
          setSaveState('saved');
        } catch (err) {
          setSaveState('error');
          setSaveError(err instanceof Error ? err.message : 'Save failed');
          break;
        }
      } while (saveQueuedRef.current);
    } finally {
      saveInFlightRef.current = false;
    }
  }, [token, uuid]);

  const scheduleSave = useCallback(
    (model: Model) => {
      if (!uuid || !token) return;
      if (Date.now() < allowSaveAfterRef.current) {
        return;
      }

      const payloadJson = JSON.stringify(
        buildSlimPayloadForApi(model, serverViewsRef.current)
      );
      if (
        lastPersistedJsonRef.current !== null &&
        payloadJson === lastPersistedJsonRef.current
      ) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setSaveState('saved');
        return;
      }

      lastModelRef.current = model;
      pendingModelRef.current = model;
      if (saveInFlightRef.current) {
        saveQueuedRef.current = true;
      }
      setSaveState('pending');
      setSaveError(null);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void flushSave();
      }, DEBOUNCE_MS);
    },
    [flushSave, token, uuid]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const onModelUpdated = useCallback(
    (model: Model) => {
      setBarTitle(model.title || 'Untitled');
      scheduleSave(model);
    },
    [scheduleSave]
  );

  const saveLabel = (() => {
    switch (saveState) {
      case 'pending':
        return 'Unsaved changes…';
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved';
      case 'error':
        return saveError ?? 'Error';
      default:
        return ' ';
    }
  })();

  if (!uuid || !viewId) {
    return <Typography>Missing project or view</Typography>;
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !initialData) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{loadError ?? 'No data'}</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/project/${uuid}`)}>
          Back to views
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <IconButton
            edge="start"
            onClick={() => navigate(`/project/${uuid}`)}
            aria-label="Back"
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ ml: 1, flex: 1 }} variant="subtitle1" noWrap>
            {barTitle || initialData.title}
          </Typography>
          <Typography
            variant="body2"
            color={
              saveState === 'error'
                ? 'error'
                : saveState === 'saved'
                  ? 'success'
                  : 'text.secondary'
            }
            sx={{ mr: 2 }}
          >
            {saveLabel}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => void flushSave()}>
            Save now
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Isoflow
          key={`${uuid}-${viewId}`}
          initialData={initialData}
          mainMenuOptions={MAIN_MENU_OPTIONS}
          mergeImportedJson={mergeImportedJsonIntoActiveView}
          onModelUpdated={onModelUpdated}
        />
      </Box>
    </Box>
  );
}
