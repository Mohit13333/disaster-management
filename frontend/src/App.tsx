import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { RealtimeToast } from './components/RealtimeToast';
import { PageLoading } from './components/Loading';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DisasterListPage } from './pages/DisasterListPage';
import { DisasterDetailPage } from './pages/DisasterDetailPage';
import { DisasterFormPage } from './pages/DisasterFormPage';
import { MapPage } from './pages/MapPage';
import { useSocket } from './hooks/useSocket';

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const { lastEvent } = useSocket();

  if (isLoading) return <PageLoading />;

  return (
    <>
      {user && <Navbar />}
      <RealtimeToast event={lastEvent} />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={user ? <DashboardPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/disasters"
          element={user ? <DisasterListPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/disasters/create"
          element={user ? <DisasterFormPage mode="create" /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/disasters/:id"
          element={user ? <DisasterDetailPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/disasters/:id/edit"
          element={user ? <DisasterFormPage mode="edit" /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/map"
          element={user ? <MapPage /> : <Navigate to="/login" replace />}
        />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
