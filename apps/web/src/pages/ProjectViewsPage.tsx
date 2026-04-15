import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useParams } from 'react-router-dom';
import { VIEW_DEFAULTS } from 'src/config';
import type { Model, View } from 'src/types/model';
import { generateId } from 'src/utils';
import { apiGetProject, apiPatchProject } from '../api';
import { useAuth } from '../authContext';
import { mergeModelWithLibraryIcons, slimModelForPersist } from '../isoflowLibraryIcons';

export function ProjectViewsPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();

  const [projectTitle, setProjectTitle] = useState('');
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !uuid) return;
    setError(null);
    setLoading(true);
    try {
      const project = await apiGetProject(token, uuid);
      const merged = mergeModelWithLibraryIcons(project.model as Model);
      const title =
        project.title?.trim() || merged.title?.trim() || 'Untitled';
      setProjectTitle(title);
      setModel({ ...merged, title });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [token, uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = (viewId: string) => {
    navigate(`/project/${uuid}/view/${viewId}`);
  };

  const onCreateView = async () => {
    if (!token || !uuid || !model) return;
    const name = newViewName.trim();
    if (!name) {
      setError('Enter a view name');
      return;
    }
    setCreateBusy(true);
    setError(null);
    try {
      const viewId = generateId();
      const newView: View = {
        ...VIEW_DEFAULTS,
        id: viewId,
        name
      };
      const next: Model = {
        ...model,
        title: projectTitle,
        views: [...model.views, newView]
      };
      await apiPatchProject(token, uuid, slimModelForPersist(next));
      setCreateOpen(false);
      setNewViewName('');
      setModel(next);
      openEditor(viewId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create view');
    } finally {
      setCreateBusy(false);
    }
  };

  const onDeleteView = async (viewId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!token || !uuid || !model) return;
    if (model.views.length <= 1) {
      setError('A project needs at least one view.');
      return;
    }
    if (!window.confirm('Delete this view? This cannot be undone.')) return;
    setError(null);
    try {
      const next: Model = {
        ...model,
        title: projectTitle,
        views: model.views.filter((v) => v.id !== viewId)
      };
      await apiPatchProject(token, uuid, slimModelForPersist(next));
      setModel(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (!uuid) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Missing project id</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => navigate('/')}
            aria-label="Back to projects"
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{projectTitle || 'Project'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <IconButton onClick={logout} aria-label="Log out" size="small">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Views in this project. Open one to edit the canvas or create a new view.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setNewViewName('');
            setCreateOpen(true);
          }}
        >
          New view
        </Button>
      </Box>

      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <Typography>Loading…</Typography>
      ) : model && model.views.length > 0 ? (
        <List dense>
          {model.views.map((v) => (
            <ListItem
              key={v.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="Delete view"
                  onClick={(e) => onDeleteView(v.id, e)}
                  disabled={model.views.length <= 1}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              }
              disablePadding
            >
              <ListItemButton onClick={() => openEditor(v.id)}>
                <ListItemText
                  primary={v.name}
                  secondary={
                    v.lastUpdated
                      ? `Updated ${new Date(v.lastUpdated).toLocaleString()}`
                      : undefined
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      ) : !error ? (
        <Typography color="text.secondary">No views yet.</Typography>
      ) : null}

      <Dialog
        open={createOpen}
        onClose={() => !createBusy && setCreateOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>New view</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="View name"
            fullWidth
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onCreateView();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void onCreateView()}
            disabled={createBusy}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
