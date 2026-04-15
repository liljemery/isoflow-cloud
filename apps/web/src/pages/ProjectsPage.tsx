import { useCallback, useEffect, useMemo, useState } from 'react';
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import {
  apiCreateProject,
  apiDeleteProject,
  apiListProjects,
  type ProjectSummary
} from '../api';
import { useAuth } from '../authContext';

export function ProjectsPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const list = await apiListProjects(token);
      setProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, filter]);

  const onCreate = async () => {
    if (!token) return;
    setError(null);
    setCreateBusy(true);
    try {
      const t = newTitle.trim();
      const uuid = await apiCreateProject(token, t === '' ? undefined : t);
      setNewTitle('');
      setCreateOpen(false);
      navigate(`/project/${uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setCreateBusy(false);
    }
  };

  const onDelete = async (uuid: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!window.confirm('Delete this project?')) return;
    try {
      await apiDeleteProject(token, uuid);
      setProjects((prev) => prev.filter((p) => p.uuid !== uuid));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

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
        <Typography variant="h5">Projects</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <IconButton onClick={logout} aria-label="Log out" size="small">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          placeholder="Filter by title"
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setNewTitle('');
            setCreateOpen(true);
          }}
        >
          New project
        </Button>
      </Box>

      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <Typography>Loading…</Typography>
      ) : (
        <List dense>
          {filtered.map((p) => (
            <ListItem
              key={p.uuid}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="Delete"
                  onClick={(e) => onDelete(p.uuid, e)}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              }
              disablePadding
            >
              <ListItemButton onClick={() => navigate(`/project/${p.uuid}`)}>
                <ListItemText
                  primary={p.title}
                  secondary={`Updated ${new Date(p.updatedAt).toLocaleString()}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {!loading && filtered.length === 0 ? (
        <Typography color="text.secondary">
          No projects match your search.
        </Typography>
      ) : null}

      <Dialog
        open={createOpen}
        onClose={() => !createBusy && setCreateOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>New project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project name"
            fullWidth
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Optional — defaults to Untitled"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onCreate();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void onCreate()}
            disabled={createBusy}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
