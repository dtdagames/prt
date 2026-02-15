const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({ dest: path.join(__dirname, '../uploads/') });

function createRoadmapRoutes(db) {
  const router = express.Router();

  router.use(authenticateToken);

  // Get roadmaps for a project
  router.get('/project/:projectId', (req, res) => {
    const { projectId } = req.params;

    if (req.user.role === 'client') {
      const access = db.prepare('SELECT 1 FROM project_clients WHERE project_id = ? AND user_id = ?')
        .get(projectId, req.user.id);
      if (!access) return res.status(403).json({ error: 'Accès refusé' });
    }

    const roadmaps = db.prepare('SELECT * FROM roadmaps WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
    res.json(roadmaps);
  });

  // Get a single roadmap with lots
  router.get('/:id', (req, res) => {
    const roadmap = db.prepare('SELECT * FROM roadmaps WHERE id = ?').get(req.params.id);
    if (!roadmap) return res.status(404).json({ error: 'Roadmap introuvable' });

    if (req.user.role === 'client') {
      const access = db.prepare('SELECT 1 FROM project_clients WHERE project_id = ? AND user_id = ?')
        .get(roadmap.project_id, req.user.id);
      if (!access) return res.status(403).json({ error: 'Accès refusé' });
    }

    const lots = db.prepare('SELECT * FROM lots WHERE roadmap_id = ? ORDER BY sort_order, id').all(roadmap.id);
    res.json({ ...roadmap, lots });
  });

  // Create a roadmap
  router.post('/', requireRole('admin', 'internal'), (req, res) => {
    const { project_id, name, google_sheet_url, weeks_per_sprint, lots } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({ error: 'project_id et name sont requis' });
    }

    const result = db.prepare(
      'INSERT INTO roadmaps (project_id, name, google_sheet_url, weeks_per_sprint, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(project_id, name, google_sheet_url || null, weeks_per_sprint || 2, req.user.id);

    const roadmapId = result.lastInsertRowid;

    if (lots && Array.isArray(lots)) {
      const insertLot = db.prepare(
        'INSERT INTO lots (roadmap_id, name, start_date, sprint_count, test_date, activation_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const insertMany = db.transaction((items) => {
        items.forEach((lot, index) => {
          insertLot.run(roadmapId, lot.name, lot.start_date, lot.sprint_count || 1, lot.test_date || null, lot.activation_date || null, index);
        });
      });
      insertMany(lots);
    }

    const roadmap = db.prepare('SELECT * FROM roadmaps WHERE id = ?').get(roadmapId);
    const savedLots = db.prepare('SELECT * FROM lots WHERE roadmap_id = ? ORDER BY sort_order').all(roadmapId);
    res.status(201).json({ ...roadmap, lots: savedLots });
  });

  // Update a roadmap
  router.put('/:id', requireRole('admin', 'internal'), (req, res) => {
    const { name, google_sheet_url, weeks_per_sprint, lots } = req.body;
    const { id } = req.params;

    const roadmap = db.prepare('SELECT id FROM roadmaps WHERE id = ?').get(id);
    if (!roadmap) return res.status(404).json({ error: 'Roadmap introuvable' });

    db.prepare('UPDATE roadmaps SET name = COALESCE(?, name), google_sheet_url = COALESCE(?, google_sheet_url), weeks_per_sprint = COALESCE(?, weeks_per_sprint) WHERE id = ?')
      .run(name, google_sheet_url, weeks_per_sprint, id);

    if (lots && Array.isArray(lots)) {
      db.prepare('DELETE FROM lots WHERE roadmap_id = ?').run(id);
      const insertLot = db.prepare(
        'INSERT INTO lots (roadmap_id, name, start_date, sprint_count, test_date, activation_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const insertMany = db.transaction((items) => {
        items.forEach((lot, index) => {
          insertLot.run(id, lot.name, lot.start_date, lot.sprint_count || 1, lot.test_date || null, lot.activation_date || null, index);
        });
      });
      insertMany(lots);
    }

    const updated = db.prepare('SELECT * FROM roadmaps WHERE id = ?').get(id);
    const savedLots = db.prepare('SELECT * FROM lots WHERE roadmap_id = ? ORDER BY sort_order').all(id);
    res.json({ ...updated, lots: savedLots });
  });

  // Import CSV
  router.post('/import-csv', requireRole('admin', 'internal'), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fichier CSV requis' });

    try {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      fs.unlinkSync(req.file.path);

      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return res.status(400).json({ error: 'Fichier CSV vide ou invalide' });

      // Detect separator
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());

      const lots = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep).map(c => c.trim());
        if (cols.length < 2) continue;

        lots.push({
          name: cols[0],
          start_date: cols[1] || '',
          sprint_count: parseInt(cols[2]) || 1,
          test_date: cols[3] || '',
          activation_date: cols[4] || '',
        });
      }

      res.json({ lots });
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors du parsing du CSV: ' + err.message });
    }
  });

  // Delete a roadmap
  router.delete('/:id', requireRole('admin', 'internal'), (req, res) => {
    db.prepare('DELETE FROM roadmaps WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  return router;
}

module.exports = createRoadmapRoutes;
