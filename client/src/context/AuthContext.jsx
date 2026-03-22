import { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { saveWallpaper, applyWallpaperToDOM } from '../utils/wallpaperStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axiosInstance.get('/api/auth/me');
        setUser(res.data);
        if (res.data?.settings?.chatWallpaper) {
          try {
            const parsed = JSON.parse(res.data.settings.chatWallpaper);
            applyWallpaperToDOM(parsed);
            saveWallpaper(parsed);
          } catch (e) { console.error('Parse wallpaper error:', e); }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await axiosInstance.post('/api/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    if (userData?.settings?.chatWallpaper) {
      try {
        const parsed = JSON.parse(userData.settings.chatWallpaper);
        applyWallpaperToDOM(parsed);
        saveWallpaper(parsed);
      } catch (e) { console.error('Parse wallpaper error:', e); }
    }
    return userData;
  };

  const register = async (username, email, password) => {
    const res = await axiosInstance.post('/api/auth/register', {
      username,
      email,
      password,
    });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (updates) => {
    try {
      const res = await axiosInstance.patch('/api/users/profile', updates);
      setUser(prev => {
        const updated = { ...prev, ...res.data };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
      return res.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
