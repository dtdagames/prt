import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { ChevronRight, Pencil } from 'lucide-react';

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getMondayOfWeek(year, week) {
  const jan1 = new Date(year, 0, 1);
  const days = (week - 1) * 7;
  const dayOfWeek = jan1.getDay() || 7;
  const monday = new Date(year, 0, 1 + days - (dayOfWeek - 1));
  return monday;
}

function parseDate(str) {
  if (!str) return null;
  // Handle YYYY-MM-DD
  if (str.includes('-')) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Handle DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date(str);
}

function formatDateFR(str) {
  const d = parseDate(str);
  if (!d || isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function computeTimeline(lots, weeksPerSprint) {
  if (!lots || lots.length === 0) return { weeks: [], lotData: [] };

  let minWeek = Infinity, maxWeek = -Infinity;
  let minYear = Infinity, maxYear = -Infinity;

  const lotData = lots.map(lot => {
    const startDate = parseDate(lot.start_date);
    const testDate = parseDate(lot.test_date);
    const activationDate = parseDate(lot.activation_date);

    if (!startDate || isNaN(startDate.getTime())) {
      return { lot, phases: {} };
    }

    const startWeek = getWeekNumber(startDate);
    const startYear = startDate.getFullYear();

    // Dev phase: from start_date for sprint_count * weeks_per_sprint weeks
    const devWeeks = lot.sprint_count * weeksPerSprint;
    const devEnd = new Date(startDate);
    devEnd.setDate(devEnd.getDate() + devWeeks * 7 - 1);

    const phases = {};

    // Mark dev weeks
    for (let w = 0; w < devWeeks; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      const wk = getWeekNumber(d);
      const yr = d.getFullYear();
      const key = `${yr}-${wk}`;
      phases[key] = 'dev';
      if (yr < minYear || (yr === minYear && wk < minWeek)) { minYear = yr; minWeek = wk; }
      if (yr > maxYear || (yr === maxYear && wk > maxWeek)) { maxYear = yr; maxWeek = wk; }
    }

    // Mark test weeks (from test_date to activation_date - 1 day, or just the test_date week)
    if (testDate && !isNaN(testDate.getTime())) {
      const testEnd = activationDate && !isNaN(activationDate.getTime()) ? new Date(activationDate) : new Date(testDate);
      testEnd.setDate(testEnd.getDate() + 6);
      let d = new Date(testDate);
      while (d < testEnd) {
        const wk = getWeekNumber(d);
        const yr = d.getFullYear();
        const key = `${yr}-${wk}`;
        if (!phases[key]) phases[key] = 'test';
        if (yr < minYear || (yr === minYear && wk < minWeek)) { minYear = yr; minWeek = wk; }
        if (yr > maxYear || (yr === maxYear && wk > maxWeek)) { maxYear = yr; maxWeek = wk; }
        d.setDate(d.getDate() + 7);
      }
    }

    // Mark activation weeks
    if (activationDate && !isNaN(activationDate.getTime())) {
      const wk = getWeekNumber(activationDate);
      const yr = activationDate.getFullYear();
      const key = `${yr}-${wk}`;
      phases[key] = 'activation';
      if (yr < minYear || (yr === minYear && wk < minWeek)) { minYear = yr; minWeek = wk; }
      if (yr > maxYear || (yr === maxYear && wk > maxWeek)) { maxYear = yr; maxWeek = wk; }
    }

    return { lot, phases };
  });

  // Build week columns: from minWeek-1 to maxWeek+1
  const weeks = [];
  if (minYear <= maxYear && minWeek <= 53 && maxWeek >= 1) {
    const safeMinWeek = Math.max(1, minWeek - 1);
    const safeMaxWeek = Math.min(53, maxWeek + 2);

    if (minYear === maxYear) {
      for (let w = safeMinWeek; w <= safeMaxWeek; w++) {
        weeks.push({ year: minYear, week: w });
      }
    } else {
      // From minWeek to end of minYear
      for (let w = safeMinWeek; w <= 52; w++) {
        weeks.push({ year: minYear, week: w });
      }
      // Full intermediate years
      for (let y = minYear + 1; y < maxYear; y++) {
        for (let w = 1; w <= 52; w++) {
          weeks.push({ year: y, week: w });
        }
      }
      // From start of maxYear to maxWeek
      for (let w = 1; w <= safeMaxWeek; w++) {
        weeks.push({ year: maxYear, week: w });
      }
    }
  }

  return { weeks, lotData };
}

export default function RoadmapView() {
  const { projectId, id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'internal';

  useEffect(() => {
    Promise.all([
      api.getProject(projectId),
      api.getRoadmap(id),
    ]).then(([proj, rm]) => {
      setProject(proj);
      setRoadmap(rm);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [projectId, id]);

  if (loading) return <div className="loading">Chargement...</div>;
  if (!roadmap) return <div className="alert alert-error">Roadmap introuvable</div>;

  const { weeks, lotData } = computeTimeline(roadmap.lots || [], roadmap.weeks_per_sprint || 2);

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/app/projects">Projets</Link>
        <ChevronRight size={14} />
        <Link to={`/app/projects/${projectId}`}>{project?.name || '...'}</Link>
        <ChevronRight size={14} />
        <span>{roadmap.name}</span>
      </div>

      <div className="page-header">
        <div>
          <h1>{roadmap.name}</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            {roadmap.weeks_per_sprint} semaines par sprint
          </p>
        </div>
        {canEdit && (
          <Link to={`/app/projects/${projectId}/roadmaps/${id}/edit`} className="btn btn-secondary">
            <Pencil size={16} /> Modifier
          </Link>
        )}
      </div>

      {roadmap.lots && roadmap.lots.length > 0 ? (
        <>
          <div className="card">
            <div className="roadmap-container">
              <table className="roadmap-table">
                <thead>
                  <tr>
                    <th className="sticky-col" style={{ left: 0, minWidth: 130 }}>Lot</th>
                    <th className="sticky-col" style={{ left: 130, minWidth: 100 }}>Debut</th>
                    {weeks.map(w => (
                      <th key={`${w.year}-${w.week}`}>S{w.week}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lotData.map(({ lot, phases }, i) => (
                    <tr key={i}>
                      <td className="lot-name" style={{ left: 0 }}>{lot.name}</td>
                      <td className="lot-info" style={{ left: 130 }}>{formatDateFR(lot.start_date)}</td>
                      {weeks.map(w => {
                        const key = `${w.year}-${w.week}`;
                        const phase = phases[key];
                        let className = '';
                        let label = '';
                        if (phase === 'dev') { className = 'cell-dev'; label = 'DEV'; }
                        else if (phase === 'test') { className = 'cell-test'; label = 'TEST'; }
                        else if (phase === 'activation') { className = 'cell-activation'; label = 'ACTIV'; }
                        return <td key={key} className={className}>{label}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="roadmap-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'var(--dev-color)' }}></div>
                <span>Developpement</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'var(--test-color)' }}></div>
                <span>Tests utilisateurs</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'var(--activation-color)' }}></div>
                <span>Activation</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Detail des lots</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nom du lot</th>
                    <th>Date de debut</th>
                    <th>Nombre de sprints</th>
                    <th>Date tests utilisateurs</th>
                    <th>Date activation</th>
                  </tr>
                </thead>
                <tbody>
                  {roadmap.lots.map((lot, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{lot.name}</td>
                      <td>{formatDateFR(lot.start_date)}</td>
                      <td>{lot.sprint_count}</td>
                      <td>{formatDateFR(lot.test_date)}</td>
                      <td>{formatDateFR(lot.activation_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="empty-state">
            <p>Cette roadmap ne contient aucun lot.</p>
            {canEdit && (
              <Link to={`/app/projects/${projectId}/roadmaps/${id}/edit`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Ajouter des lots
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
