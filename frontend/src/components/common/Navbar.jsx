import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useGameStore } from '../../store/game.store';

export default function Navbar() {
  const nav = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetGame = useGameStore((s) => s.reset);

  const logout = () => {
    resetGame();
    clearAuth();
    nav('/auth', { replace: true });
  };

  return (
    <header className="navbar">
      <div className="brand">Realtime Arena</div>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
      </nav>
      <button className="logout-btn" onClick={logout}>Logout</button>
    </header>
  );
}
