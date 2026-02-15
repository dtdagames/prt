const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireRole } = require('../middleware/auth');

function createUserRoutes(db) {
  const router = express.Router();

  router.use(authenticateToken);
  router.use(requireRole('admin'));

  router.get('/', (req, res) => {
    const users = db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  });

  router.post('/', (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    if (!['admin', 'internal', 'client'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
      email, hash, name, role
    );

    res.status(201).json({ id: result.lastInsertRowid, email, name, role });
  });

  router.put('/:id', (req, res) => {
    const { email, name, role, password } = req.body;
    const { id } = req.params;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name), role = COALESCE(?, role), password = ? WHERE id = ?')
        .run(email, name, role, hash, id);
    } else {
      db.prepare('UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name), role = COALESCE(?, role) WHERE id = ?')
        .run(email, name, role, id);
    }

    const updated = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(id);
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  return router;
}

module.exports = createUserRoutes;
