const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

function initDatabase() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'internal', 'client')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      objectives TEXT,
      kpis TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roadmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      google_sheet_url TEXT,
      weeks_per_sprint INTEGER DEFAULT 2,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roadmap_id INTEGER NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      sprint_count INTEGER NOT NULL,
      test_date TEXT,
      activation_date TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS project_clients (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    );
  `);

  // Seed admin user if none exists
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
      'admin@roadmap.app',
      hash,
      'Administrateur',
      'admin'
    );
    console.log('Admin user created: admin@roadmap.app / admin123');
  }

  // Seed example data if database is empty
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  if (projectCount === 0) {
    const seedData = db.transaction(() => {
      const hash = bcrypt.hashSync('password123', 10);

      // Create internal user
      const internalUser = db.prepare(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
      ).run('marie.dupont@example.com', hash, 'Marie Dupont', 'internal');
      const internalUserId = internalUser.lastInsertRowid;

      // Create client user
      const clientUser = db.prepare(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
      ).run('jean.martin@acme.fr', hash, 'Jean Martin', 'client');
      const clientUserId = clientUser.lastInsertRowid;

      // Create project
      const project = db.prepare(
        'INSERT INTO projects (name, objectives, kpis, created_by) VALUES (?, ?, ?, ?)'
      ).run(
        'Refonte Portail ACME',
        'Moderniser le portail client ACME avec une nouvelle interface utilisateur, un espace self-service et une API partenaires.',
        'Taux adoption > 80% a 3 mois\nTemps moyen de traitement reduit de 40%\nNPS client > 50',
        internalUserId
      );
      const projectId = project.lastInsertRowid;

      // Assign client to project
      db.prepare('INSERT INTO project_clients (project_id, user_id) VALUES (?, ?)').run(projectId, clientUserId);

      // Roadmap 1 - MVP (3 lots, sprints de 2 semaines)
      const roadmap1 = db.prepare(
        'INSERT INTO roadmaps (project_id, name, weeks_per_sprint, created_by) VALUES (?, ?, ?, ?)'
      ).run(projectId, 'MVP - Portail Client', 2, internalUserId);
      const roadmap1Id = roadmap1.lastInsertRowid;

      const insertLot = db.prepare(
        'INSERT INTO lots (roadmap_id, name, start_date, sprint_count, test_date, activation_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );

      insertLot.run(roadmap1Id, 'Authentification & Profil', '2026-03-02', 3, '2026-04-13', '2026-04-27', 0);
      insertLot.run(roadmap1Id, 'Tableau de bord', '2026-04-13', 4, '2026-06-08', '2026-06-22', 1);
      insertLot.run(roadmap1Id, 'Gestion des demandes', '2026-06-08', 3, '2026-07-20', '2026-08-03', 2);

      // Roadmap 2 - Phase 2 (2 lots, sprints de 3 semaines)
      const roadmap2 = db.prepare(
        'INSERT INTO roadmaps (project_id, name, weeks_per_sprint, created_by) VALUES (?, ?, ?, ?)'
      ).run(projectId, 'Phase 2 - API & Partenaires', 3, internalUserId);
      const roadmap2Id = roadmap2.lastInsertRowid;

      insertLot.run(roadmap2Id, 'API Partenaires', '2026-09-01', 3, '2026-11-10', '2026-11-24', 0);
      insertLot.run(roadmap2Id, 'Portail partenaires', '2026-10-13', 2, '2026-12-01', '2026-12-15', 1);

      console.log('Example data seeded:');
      console.log('  - User: marie.dupont@example.com / password123 (internal)');
      console.log('  - Client: jean.martin@acme.fr / password123 (client)');
      console.log('  - Project: Refonte Portail ACME');
      console.log('  - Roadmap 1: MVP - Portail Client (3 lots)');
      console.log('  - Roadmap 2: Phase 2 - API & Partenaires (2 lots)');
    });

    seedData();
  }

  return db;
}

module.exports = { initDatabase };
