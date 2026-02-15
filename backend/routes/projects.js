const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');

function createProjectRoutes(db) {
  const router = express.Router();

  router.use(authenticateToken);

  router.get('/', (req, res) => {
    let projects;
    if (req.user.role === 'client') {
      projects = db.prepare(`
        SELECT p.* FROM projects p
        JOIN project_clients pc ON pc.project_id = p.id
        WHERE pc.user_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user.id);
    } else {
      projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    }
    res.json(projects);
  });

  router.get('/:id', (req, res) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    if (req.user.role === 'client') {
      const access = db.prepare('SELECT 1 FROM project_clients WHERE project_id = ? AND user_id = ?')
        .get(project.id, req.user.id);
      if (!access) return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json(project);
  });

  router.post('/', requireRole('admin', 'internal'), (req, res) => {
    const { name, objectives, kpis } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du projet est requis' });

    const result = db.prepare('INSERT INTO projects (name, objectives, kpis, created_by) VALUES (?, ?, ?, ?)')
      .run(name, objectives || '', kpis || '', req.user.id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(project);
  });

  router.put('/:id', requireRole('admin', 'internal'), (req, res) => {
    const { name, objectives, kpis } = req.body;
    const { id } = req.params;

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    db.prepare('UPDATE projects SET name = COALESCE(?, name), objectives = COALESCE(?, objectives), kpis = COALESCE(?, kpis) WHERE id = ?')
      .run(name, objectives, kpis, id);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(updated);
  });

  router.delete('/:id', requireRole('admin', 'internal'), (req, res) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Manage client access
  router.post('/:id/clients', requireRole('admin', 'internal'), (req, res) => {
    const { user_id } = req.body;
    try {
      db.prepare('INSERT OR IGNORE INTO project_clients (project_id, user_id) VALUES (?, ?)').run(req.params.id, user_id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/:id/clients/:userId', requireRole('admin', 'internal'), (req, res) => {
    db.prepare('DELETE FROM project_clients WHERE project_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
    res.json({ success: true });
  });

  router.get('/:id/clients', requireRole('admin', 'internal'), (req, res) => {
    const clients = db.prepare(`
      SELECT u.id, u.email, u.name FROM users u
      JOIN project_clients pc ON pc.user_id = u.id
      WHERE pc.project_id = ?
    `).all(req.params.id);
    res.json(clients);
  });

  return router;
}

module.exports = createProjectRoutes;
