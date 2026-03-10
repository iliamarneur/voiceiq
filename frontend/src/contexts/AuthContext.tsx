import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  authEnabled: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isAdmin: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

const REFRESH_KEY = 'voiceiq_refresh_token';

// Set up axios interceptor for Bearer token
function setupAxiosAuth(token: string | null) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('voiceiq_token'));
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);

  // On mount: check auth status then verify token
  useEffect(() => {
    async function init() {
      try {
        // 1. Check if auth is enabled on the backend
        const statusRes = await axios.get('/api/auth/status');
        const enabled = statusRes.data.auth_enabled === true;
        setAuthEnabled(enabled);

        if (!enabled) {
          // Auth disabled — get default stub user
          const meRes = await axios.get('/api/auth/me');
          setUser(meRes.data);
          setLoading(false);
          return;
        }

        // 2. Auth enabled — try stored token
        const stored = localStorage.getItem('voiceiq_token');
        if (stored) {
          setupAxiosAuth(stored);
          try {
            const meRes = await axios.get('/api/auth/me');
            setUser(meRes.data);
            setToken(stored);
          } catch {
            // Token invalid/expired — try refresh before giving up
            const refreshToken = localStorage.getItem(REFRESH_KEY);
            if (refreshToken) {
              try {
                const refreshRes = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
                const newToken = refreshRes.data.token;
                localStorage.setItem('voiceiq_token', newToken);
                localStorage.setItem(REFRESH_KEY, refreshRes.data.refresh_token);
                setupAxiosAuth(newToken);
                setToken(newToken);
                const meRes = await axios.get('/api/auth/me');
                setUser(meRes.data);
              } catch {
                // Refresh also failed — clear everything
                localStorage.removeItem('voiceiq_token');
                localStorage.removeItem(REFRESH_KEY);
                setupAxiosAuth(null);
                setToken(null);
              }
            } else {
              localStorage.removeItem('voiceiq_token');
              setupAxiosAuth(null);
              setToken(null);
            }
          }
        }
      } catch {
        // API unreachable — assume no auth
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Set up 401 interceptor for automatic token refresh
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem(REFRESH_KEY);
          if (refreshToken) {
            try {
              const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
              const newToken = res.data.token;
              localStorage.setItem('voiceiq_token', newToken);
              localStorage.setItem(REFRESH_KEY, res.data.refresh_token);
              setupAxiosAuth(newToken);
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            } catch {
              // Refresh failed — logout
              localStorage.removeItem('voiceiq_token');
              localStorage.removeItem(REFRESH_KEY);
              setupAxiosAuth(null);
              setUser(null);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token: newToken, refresh_token: newRefresh, user: newUser } = res.data;
    localStorage.setItem('voiceiq_token', newToken);
    if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
    setupAxiosAuth(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await axios.post('/api/auth/register', { email, password, name });
    const { token: newToken, refresh_token: newRefresh, user: newUser } = res.data;
    localStorage.setItem('voiceiq_token', newToken);
    if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
    setupAxiosAuth(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('voiceiq_token');
    localStorage.removeItem(REFRESH_KEY);
    setupAxiosAuth(null);
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, authEnabled, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
