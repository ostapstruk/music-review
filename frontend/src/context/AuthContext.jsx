import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI
        .getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const token = res.data.access_token;
    localStorage.setItem('access_token', token);

    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  const register = async (username, email, password) => {
    await authAPI.register(username, email, password);
    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}