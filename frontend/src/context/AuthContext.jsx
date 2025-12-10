import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../api/client';

// 1. Створюємо контекст
const AuthContext = createContext(null);

// 2. Провайдер — обгортає весь додаток
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // При завантаженні додатку — перевіряємо, чи є збережений токен
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI
        .getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          // Токен невалідний або прострочений — видаляємо
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

    // Отримуємо дані юзера
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  const register = async (username, email, password) => {
    await authAPI.register(username, email, password);
    // Після реєстрації — одразу логінимось
    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Хук для зручного використання
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}