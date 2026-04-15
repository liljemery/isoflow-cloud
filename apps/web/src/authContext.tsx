import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import type { AuthUser } from './api';

const STORAGE_KEY = 'isoflow_auth';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

type AuthContextValue = AuthState & {
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { token: null, user: null };
    }
    const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
    if (typeof parsed.token === 'string' && parsed.user?.uuid && parsed.user?.email) {
      return { token: parsed.token, user: parsed.user };
    }
  } catch {
    /* ignore */
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredAuth().token);
  const [user, setUser] = useState<AuthUser | null>(() => readStoredAuth().user);

  const login = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: nextToken, user: nextUser })
    );
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
