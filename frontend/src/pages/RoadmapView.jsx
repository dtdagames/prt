import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { ChevronRight, Pencil } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_NAMES = ['T1', 'T2', 'T3', 'T4'];

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function parseDate(str) {
  if (!str) return null;
  if (str.includes('-')) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
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

// Returns the dominant phase for a set of week keys
function dominantPhase(weekKeys, phases) {
  const counts = { dev: 0, test: 0, activation: 0 };
  for (const key of weekKeys) {
    const p = phases[key];
    if (p) counts[p]++;
  }
  // Priority: activation > test > dev (if any present)
  if (counts.activation > 0) return 'activation';
  if (counts.test > 0) return 'test';
  if (counts.dev > 0) return 'dev';
  return null;
}

// Build week-level phases for all lots
function computeWeekPhases(lots, weeksPerSprint) {
  if (!lots || lots.length === 0) return { allWeeks: [], lotPhases: [] };

  let minWeek = Infinity, maxWeek = -Infinity;
  let minYear = Infinity, maxYear = -Infinity;

  const lotPhases = lots.map(lot => {
    const startDate = parseDate(lot.start_date);
    const testDate = parseDate(lot.test_date);
    const activationDate = parseDate(lot.activation_date);

    if (!startDate || isNaN(startDate.getTime())) {
      return { lot, phases: {} };
    }

    const devWeeks = lot.sprint_count * weeksPerSprint;
    const phases = {};

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

  const allWeeks = [];
  if (minYear <= maxYear && minWeek <= 53 && maxWeek >= 1) {
    const safeMinWeek = Math.max(1, minWeek - 1);
    const safeMaxWeek = Math.min(53, maxWeek + 2);

    if (minYear === maxYear) {
      for (let w = safeMinWeek; w <= safeMaxWeek; w++) {
        allWeeks.push({ year: minYear, week: w });
      }
    } else {
      for (let w = safeMinWeek; w <= 52; w++) {
        allWeeks.push({ year: minYear, week: w });
      }
      for (let y = minYear + 1; y < maxYear; y++) {
        for (let w = 1; w <= 52; w++) {
          allWeeks.push({ year: y, week: w });
        }
      }
      for (let w = 1; w <= safeMaxWeek; w++) {
        allWeeks.push({ year: maxYear, week: w });
      }
    }
  }

  return { allWeeks, lotPhases };
}

// Group weeks into months: { year, month (0-based), weekKeys[] }
function groupByMonth(allWeeks) {
  const map = new Map();
  for (const w of allWeeks) {
    // Approximate: week 1 = Jan, etc. Use Jan 1 + (week-1)*7 to get month
    const approxDate = new Date(w.year, 0, 1 + (w.week - 1) * 7);
    const m = approxDate.getMonth();
    const yr = approxDate.getFullYear();
    const key = `${yr}-${m}`;
    if (!map.has(key)) map.set(key, { year: yr, month: m, weekKeys: [] });
    map.get(key).weekKeys.push(`${w.year}-${w.week}`);
  }
  return Array.from(map.values());
}

// Group weeks into quarters
function groupByQuarter(allWeeks) {
  const map = new Map();
  for (const w of allWeeks) {
    const approxDate = new Date(w.year, 0, 1 + (w.week - 1) * 7);
    const q = Math.floor(approxDate.getMonth() / 3);
    const yr = approxDate.getFullYear();
    const key = `${yr}-${q}`;
    if (!map.has(key)) map.set(key, { year: yr, quarter: q, weekKeys: [] });
    map.get(key).weekKeys.push(`${w.year}-${w.week}`);
  }
  return Array.from(map.values());
}

function phaseClass(phase) {
  if (phase === 'dev') return 'cell-dev';
  if (phase === 'test') return 'cell-test';
  if (phase === 'activation') return 'cell-activation';
  return '';
}

function phaseLabel(phase) {
  if (phase === 'dev') return 'DEV';
  if (phase === 'test') return 'TEST';
  if (phase === 'activation') return 'ACTIV';
  return '';
}

export default function RoadmapView() {
  const { projectId, id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('weeks'); // 'weeks' | 'months' | 'quarters'

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

  const { allWeeks, lotPhases } = computeWeekPhases(roadmap.lots || [], roadmap.weeks_per_sprint || 2);
  const months = groupByMonth(allWeeks);
  const quarters = groupByQuarter(allWeeks);

  const renderTimeline = () => {
    if (viewMode === 'weeks') {
      return (
        <table className="roadmap-table">
          <thead>
            <tr>
              <th className="sticky-col" style={{ left: 0, minWidth: 130 }}>Lot</th>
              <th className="sticky-col" style={{ left: 130, minWidth: 100 }}>Debut</th>
              {allWeeks.map(w => (
                <th key={`${w.year}-${w.week}`}>S{w.week}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lotPhases.map(({ lot, phases }, i) => (
              <tr key={i}>
                <td className="lot-name" style={{ left: 0 }}>{lot.name}</td>
                <td className="lot-info" style={{ left: 130 }}>{formatDateFR(lot.start_date)}</td>
                {allWeeks.map(w => {
                  const key = `${w.year}-${w.week}`;
                  const phase = phases[key];
                  return <td key={key} className={phaseClass(phase)}>{phaseLabel(phase)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (viewMode === 'months') {
      return (
        <table className="roadmap-table">
          <thead>
            <tr>
              <th className="sticky-col" style={{ left: 0, minWidth: 130 }}>Lot</th>
              <th className="sticky-col" style={{ left: 130, minWidth: 100 }}>Debut</th>
              {months.map(m => (
                <th key={`${m.year}-${m.month}`} style={{ minWidth: 60 }}>
                  {MONTH_NAMES[m.month]}{months.some(o => o.month === m.month && o.year !== m.year) ? ` ${m.year}` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lotPhases.map(({ lot, phases }, i) => (
              <tr key={i}>
                <td className="lot-name" style={{ left: 0 }}>{lot.name}</td>
                <td className="lot-info" style={{ left: 130 }}>{formatDateFR(lot.start_date)}</td>
                {months.map(m => {
                  const phase = dominantPhase(m.weekKeys, phases);
                  return <td key={`${m.year}-${m.month}`} className={phaseClass(phase)}>{phaseLabel(phase)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // quarters
    return (
      <table className="roadmap-table">
        <thead>
          <tr>
            <th className="sticky-col" style={{ left: 0, minWidth: 130 }}>Lot</th>
            <th className="sticky-col" style={{ left: 130, minWidth: 100 }}>Debut</th>
            {quarters.map(q => (
              <th key={`${q.year}-${q.quarter}`} style={{ minWidth: 70 }}>
                {QUARTER_NAMES[q.quarter]} {q.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lotPhases.map(({ lot, phases }, i) => (
            <tr key={i}>
              <td className="lot-name" style={{ left: 0 }}>{lot.name}</td>
              <td className="lot-info" style={{ left: 130 }}>{formatDateFR(lot.start_date)}</td>
              {quarters.map(q => {
                const phase = dominantPhase(q.weekKeys, phases);
                return <td key={`${q.year}-${q.quarter}`} className={phaseClass(phase)}>{phaseLabel(phase)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
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
              <div className="view-toggle">
                <button
                  className={`btn btn-sm ${viewMode === 'weeks' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('weeks')}
                >
                  Semaines
                </button>
                <button
                  className={`btn btn-sm ${viewMode === 'months' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('months')}
                >
                  Mois
                </button>
                <button
                  className={`btn btn-sm ${viewMode === 'quarters' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('quarters')}
                >
                  Trimestres
                </button>
              </div>
            </div>

            <div className="roadmap-container">
              {renderTimeline()}
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
