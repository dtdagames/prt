import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Plus, FolderKanban, Pencil, Trash2 } from 'lucide-react';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', objectives: '', kpis: '' });
  const [error, setError] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'internal';

  const loadProjects = () => api.getProjects().then(setProjects).catch(() => {});

  useEffect(() => { loadProjects(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', objectives: '', kpis: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setForm({ name: project.name, objectives: project.objectives || '', kpis: project.kpis || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.updateProject(editing.id, form);
      } else {
        await api.createProject(form);
      }
      setShowModal(false);
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (project) => {
    if (!confirm(`Supprimer le projet "${project.name}" et toutes ses roadmaps ?`)) return;
    try {
      await api.deleteProject(project.id);
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Projets</h1>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nouveau projet
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderKanban size={48} />
            <p>Aucun projet pour le moment</p>
            {canEdit && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: '1rem' }}>Creer un projet</button>}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map(p => (
            <div key={p.id} className="card">
              <div className="card-header">
                <h2><Link to={`/app/projects/${p.id}`}>{p.name}</Link></h2>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn-icon" onClick={() => openEdit(p)} title="Modifier">
                      <Pencil size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(p)} title="Supprimer" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              {p.objectives && <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>{p.objectives}</p>}
              {p.kpis && <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>KPIs: {p.kpis}</p>}
              <div style={{ marginTop: '1rem' }}>
                <Link to={`/app/projects/${p.id}`} className="btn btn-sm btn-secondary">Voir les roadmaps</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Modifier le projet' : 'Nouveau projet'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom du projet</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Objectifs</label>
                <textarea className="form-control" value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} placeholder="Objectifs du projet..." />
              </div>
              <div className="form-group">
                <label>KPIs a suivre</label>
                <textarea className="form-control" value={form.kpis} onChange={e => setForm({ ...form, kpis: e.target.value })} placeholder="KPIs a suivre..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Modifier' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
