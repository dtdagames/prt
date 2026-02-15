import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { FolderKanban, Users, Map } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [userCount, setUserCount] = useState(null);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
    if (user?.role === 'admin') {
      api.getUsers().then(u => setUserCount(u.length)).catch(() => {});
    }
  }, [user]);

  return (
    <div>
      <div className="page-header">
        <h1>Tableau de bord</h1>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <Link to="/app/projects" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderKanban size={24} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{projects.length}</div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Projets</div>
            </div>
          </div>
        </Link>

        {user?.role === 'admin' && userCount !== null && (
          <Link to="/app/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{userCount}</div>
                <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Utilisateurs</div>
              </div>
            </div>
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Projets recents</h2>
          {(user?.role === 'admin' || user?.role === 'internal') && (
            <Link to="/app/projects" className="btn btn-sm btn-secondary">Voir tout</Link>
          )}
        </div>
        {projects.length === 0 ? (
          <div className="empty-state">
            <Map size={48} />
            <p>Aucun projet pour le moment</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Objectifs</th>
                  <th>Date de creation</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 5).map(p => (
                  <tr key={p.id}>
                    <td><Link to={`/app/projects/${p.id}`}>{p.name}</Link></td>
                    <td style={{ color: 'var(--gray-500)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.objectives || '-'}
                    </td>
                    <td style={{ color: 'var(--gray-500)' }}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
