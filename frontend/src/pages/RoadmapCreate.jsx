import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import Papa from 'papaparse';
import { ChevronRight, Plus, Trash2, Upload } from 'lucide-react';

function parseDate(str) {
  if (!str) return '';
  // Handle DD/MM/YYYY format
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Already YYYY-MM-DD or other
  return str.trim();
}

function formatDateForInput(str) {
  if (!str) return '';
  return parseDate(str);
}

export default function RoadmapCreate() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [project, setProject] = useState(null);
  const [form, setForm] = useState({
    name: '',
    weeks_per_sprint: 2,
  });
  const [lots, setLots] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProject(projectId).then(setProject).catch(() => {});
    if (isEditing) {
      api.getRoadmap(id).then(data => {
        setForm({
          name: data.name,
          weeks_per_sprint: data.weeks_per_sprint,
        });
        setLots(data.lots.map(l => ({
          name: l.name,
          start_date: l.start_date,
          sprint_count: l.sprint_count,
          test_date: l.test_date || '',
          activation_date: l.activation_date || '',
        })));
      }).catch(() => {});
    }
  }, [projectId, id, isEditing]);

  const addLot = () => {
    setLots([...lots, { name: '', start_date: '', sprint_count: 1, test_date: '', activation_date: '' }]);
  };

  const updateLot = (index, field, value) => {
    const updated = [...lots];
    updated[index] = { ...updated[index], [field]: value };
    setLots(updated);
  };

  const removeLot = (index) => {
    setLots(lots.filter((_, i) => i !== index));
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (rows.length < 2) return;

        // Skip header row
        const imported = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[0]) continue;
          imported.push({
            name: row[0].trim(),
            start_date: formatDateForInput(row[1]),
            sprint_count: parseInt(row[2]) || 1,
            test_date: formatDateForInput(row[3]),
            activation_date: formatDateForInput(row[4]),
          });
        }
        setLots(imported);
      }
    });
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        project_id: parseInt(projectId),
        name: form.name,
        weeks_per_sprint: parseInt(form.weeks_per_sprint),
        lots: lots.filter(l => l.name),
      };

      if (isEditing) {
        await api.updateRoadmap(id, data);
        navigate(`/app/projects/${projectId}/roadmaps/${id}`);
      } else {
        const result = await api.createRoadmap(data);
        navigate(`/app/projects/${projectId}/roadmaps/${result.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/app/projects">Projets</Link>
        <ChevronRight size={14} />
        <Link to={`/app/projects/${projectId}`}>{project?.name || '...'}</Link>
        <ChevronRight size={14} />
        <span>{isEditing ? 'Modifier la roadmap' : 'Nouvelle roadmap'}</span>
      </div>

      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        {isEditing ? 'Modifier la roadmap' : 'Nouvelle roadmap'}
      </h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Informations</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Nom de la roadmap</label>
              <input
                className="form-control"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Sprint Planning Q1 2026"
              />
            </div>
            <div className="form-group">
              <label>Semaines par sprint</label>
              <input
                type="number"
                className="form-control"
                value={form.weeks_per_sprint}
                onChange={e => setForm({ ...form, weeks_per_sprint: e.target.value })}
                min="1"
                max="12"
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 style={{ fontSize: '1.1rem' }}>Lots</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Importer CSV
                <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
              </label>
              <button type="button" className="btn btn-sm btn-primary" onClick={addLot}>
                <Plus size={14} /> Ajouter un lot
              </button>
            </div>
          </div>

          {lots.length === 0 ? (
            <div className="empty-state">
              <p>Aucun lot. Ajoutez des lots manuellement ou importez un fichier CSV.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--gray-400)' }}>
                Format CSV attendu : Nom du lot, Date de debut (JJ/MM/AAAA), Nombre de sprints, Date tests, Date activation
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nom du lot</th>
                    <th>Date de debut</th>
                    <th>Nb sprints</th>
                    <th>Date tests</th>
                    <th>Date activation</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="form-control"
                          value={lot.name}
                          onChange={e => updateLot(i, 'name', e.target.value)}
                          placeholder="Lot 1"
                          style={{ minWidth: 120 }}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="form-control"
                          value={lot.start_date}
                          onChange={e => updateLot(i, 'start_date', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={lot.sprint_count}
                          onChange={e => updateLot(i, 'sprint_count', e.target.value)}
                          min="1"
                          style={{ width: 70 }}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="form-control"
                          value={lot.test_date}
                          onChange={e => updateLot(i, 'test_date', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="form-control"
                          value={lot.activation_date}
                          onChange={e => updateLot(i, 'activation_date', e.target.value)}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn-icon" onClick={() => removeLot(i)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : (isEditing ? 'Modifier' : 'Creer la roadmap')}
          </button>
        </div>
      </form>
    </div>
  );
}
