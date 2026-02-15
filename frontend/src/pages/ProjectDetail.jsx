import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Plus, Map, Trash2, ChevronRight } from 'lucide-react';

function parseItems(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function ItemListDisplay({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <strong style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{label}</strong>
      <div style={{ marginTop: '0.25rem' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem', flex: 1 }}>{item.text}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 120 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${item.completion}%`,
                  height: '100%',
                  background: item.completion === 100 ? 'var(--success)' : 'var(--primary)',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', minWidth: 32, textAlign: 'right' }}>
                {item.completion}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'internal';

  useEffect(() => {
    Promise.all([
      api.getProject(id),
      api.getProjectRoadmaps(id),
    ]).then(([proj, rms]) => {
      setProject(proj);
      setRoadmaps(rms);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleDeleteRoadmap = async (rm) => {
    if (!confirm(`Supprimer la roadmap "${rm.name}" ?`)) return;
    try {
      await api.deleteRoadmap(rm.id);
      setRoadmaps(roadmaps.filter(r => r.id !== rm.id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;
  if (!project) return <div className="alert alert-error">Projet introuvable</div>;

  const objectives = parseItems(project.objectives);
  const kpis = parseItems(project.kpis);

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/app/projects">Projets</Link>
        <ChevronRight size={14} />
        <span>{project.name}</span>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{project.name}</h1>
        <ItemListDisplay label="Objectifs" items={objectives} />
        <ItemListDisplay label="KPIs" items={kpis} />
        {objectives.length === 0 && kpis.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>Aucun objectif ou KPI defini.</p>
        )}
      </div>

      <div className="page-header">
        <h2 style={{ fontSize: '1.2rem' }}>Roadmaps</h2>
        {canEdit && (
          <Link to={`/app/projects/${id}/roadmaps/new`} className="btn btn-primary">
            <Plus size={16} /> Nouvelle roadmap
          </Link>
        )}
      </div>

      {roadmaps.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Map size={48} />
            <p>Aucune roadmap pour ce projet</p>
            {canEdit && (
              <Link to={`/app/projects/${id}/roadmaps/new`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Creer une roadmap
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {roadmaps.map(rm => (
            <div key={rm.id} className="card">
              <div className="card-header">
                <h2><Link to={`/app/projects/${id}/roadmaps/${rm.id}`}>{rm.name}</Link></h2>
                {canEdit && (
                  <button className="btn-icon" onClick={() => handleDeleteRoadmap(rm)} title="Supprimer" style={{ color: 'var(--danger)' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                {rm.weeks_per_sprint} semaines/sprint
              </p>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <Link to={`/app/projects/${id}/roadmaps/${rm.id}`} className="btn btn-sm btn-primary">Voir</Link>
                {canEdit && (
                  <Link to={`/app/projects/${id}/roadmaps/${rm.id}/edit`} className="btn btn-sm btn-secondary">Modifier</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
