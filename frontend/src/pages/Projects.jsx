import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Plus, FolderKanban, Pencil, Trash2, CirclePlus, X } from 'lucide-react';

function parseItems(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function serializeItems(items) {
  return JSON.stringify(items);
}

function ItemListEditor({ label, items, onChange, placeholder }) {
  const addItem = () => {
    onChange([...items, { text: '', completion: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="form-group">
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {label}
        <button type="button" className="btn-icon" onClick={addItem} title="Ajouter" style={{ color: 'var(--primary)' }}>
          <CirclePlus size={16} />
        </button>
      </label>
      {items.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', padding: '0.5rem 0' }}>
          Aucun element. Cliquez sur + pour ajouter.
        </p>
      )}
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input
            className="form-control"
            value={item.text}
            onChange={e => updateItem(i, 'text', e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 90 }}>
            <input
              type="number"
              className="form-control"
              value={item.completion}
              onChange={e => updateItem(i, 'completion', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              min="0"
              max="100"
              style={{ width: 60, textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>%</span>
          </div>
          <button type="button" className="btn-icon" onClick={() => removeItem(i)} style={{ color: 'var(--danger)' }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 100 }}>
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

function ProjectCardSummary({ items, max }) {
  if (!items || items.length === 0) return null;
  const shown = items.slice(0, max || 2);
  const avg = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.completion, 0) / items.length) : 0;
  return (
    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
      {shown.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
          <span style={{ fontSize: '0.75rem', color: item.completion === 100 ? 'var(--success)' : 'var(--gray-400)' }}>{item.completion}%</span>
        </div>
      ))}
      {items.length > (max || 2) && (
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>+{items.length - (max || 2)} autre(s)</span>
      )}
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', objectives: [], kpis: [] });
  const [error, setError] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'internal';

  const loadProjects = () => api.getProjects().then(setProjects).catch(() => {});

  useEffect(() => { loadProjects(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', objectives: [], kpis: [] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setForm({
      name: project.name,
      objectives: parseItems(project.objectives),
      kpis: parseItems(project.kpis),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        name: form.name,
        objectives: serializeItems(form.objectives.filter(i => i.text)),
        kpis: serializeItems(form.kpis.filter(i => i.text)),
      };
      if (editing) {
        await api.updateProject(editing.id, data);
      } else {
        await api.createProject(data);
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
          {projects.map(p => {
            const objectives = parseItems(p.objectives);
            const kpis = parseItems(p.kpis);
            return (
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
                {objectives.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-400)', marginBottom: '0.2rem' }}>Objectifs</div>
                    <ProjectCardSummary items={objectives} max={2} />
                  </div>
                )}
                {kpis.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-400)', marginBottom: '0.2rem' }}>KPIs</div>
                    <ProjectCardSummary items={kpis} max={2} />
                  </div>
                )}
                <div style={{ marginTop: '1rem' }}>
                  <Link to={`/app/projects/${p.id}`} className="btn btn-sm btn-secondary">Voir les roadmaps</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>{editing ? 'Modifier le projet' : 'Nouveau projet'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom du projet</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <ItemListEditor
                label="Objectifs"
                items={form.objectives}
                onChange={objectives => setForm({ ...form, objectives })}
                placeholder="Decrire l'objectif..."
              />
              <ItemListEditor
                label="KPIs"
                items={form.kpis}
                onChange={kpis => setForm({ ...form, kpis })}
                placeholder="Decrire le KPI..."
              />
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
