import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, FolderKanban, LogOut, Map } from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/app" className="logo">
          <Map size={24} />
          PlanRoad
        </Link>
        <nav>
          <Link to="/app" className={isActive('/app') && location.pathname === '/app' ? 'active' : ''}>
            Tableau de bord
          </Link>
          <Link to="/app/projects" className={isActive('/app/projects') ? 'active' : ''}>
            Projets
          </Link>
          {user?.role === 'admin' && (
            <Link to="/app/users" className={isActive('/app/users') ? 'active' : ''}>
              Utilisateurs
            </Link>
          )}
          <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>
            {user?.name} <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </span>
          <button className="btn-icon" onClick={handleLogout} title="Déconnexion">
            <LogOut size={18} />
          </button>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
