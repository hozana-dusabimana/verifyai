import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, usersAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Start in "loading" only when a token exists (a profile fetch is pending).
  // With no token there's nothing to load, so we avoid a synchronous setState
  // inside the effect (react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState(() => !!localStorage.getItem('access_token'));

  // On mount, if a token exists, load the profile.
  useEffect(() => {
    if (!localStorage.getItem('access_token')) return;
    usersAPI.getProfile()
      .then((res) => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access, refresh, user: userData } = res.data.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await usersAPI.getProfile();
      setUser(res.data.data);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// This file intentionally exports the AuthProvider component plus the useAuth
// hook (the standard context pattern); the hook export is fine for fast refresh.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
