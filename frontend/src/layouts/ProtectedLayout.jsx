import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Navbar from '../components/common/Navbar';

export default function ProtectedLayout() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/auth" replace />;

  return (
    <div>
      <Navbar />
      <main className="page-wrap">
        <Outlet />
      </main>
    </div>
  );
}
