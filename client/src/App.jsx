import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { loadWallpaper, applyWallpaperToDOM } from './utils/wallpaperStorage';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner large" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner large" />
      </div>
    );
  }

  return user ? <Navigate to="/" /> : children;
}

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <ChatPage />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    const saved = loadWallpaper();
    if (saved && saved.id !== 'default') {
      setTimeout(() => {
        applyWallpaperToDOM(saved);
      }, 200);
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
