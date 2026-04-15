import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './authContext';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { EditorPage } from './pages/EditorPage';
import { ProjectViewsPage } from './pages/ProjectViewsPage';

const theme = createTheme();

function EditorLegacyRedirect() {
  const { uuid } = useParams<{ uuid: string }>();
  return <Navigate to={`/project/${uuid}`} replace />;
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:uuid"
            element={
              <ProtectedRoute>
                <ProjectViewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:uuid/view/:viewId"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:uuid"
            element={
              <ProtectedRoute>
                <EditorLegacyRedirect />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
