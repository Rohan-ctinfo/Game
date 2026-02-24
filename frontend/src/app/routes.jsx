import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from '../pages/Auth/AuthPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import GamePage from '../pages/Game/GamePage';
import ProtectedLayout from '../layouts/ProtectedLayout';
import PublicOnlyLayout from '../layouts/PublicOnlyLayout';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyLayout />}>
          <Route path="/auth" element={<AuthPage />} />
        </Route>

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/game/:roomId" element={<GamePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
