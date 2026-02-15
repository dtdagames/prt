# PlanRoad - Plateforme de gestion de roadmaps projets

Application web React permettant de partager des roadmaps (planning) de projets via une interface intuitive.

## Architecture

- **Frontend** : React + Vite + React Router + Lucide Icons + PapaParse (CSV)
- **Backend** : Express.js + SQLite (better-sqlite3) + JWT authentication
- **Base de donnees** : SQLite (fichier local `backend/data.db`)

## Fonctionnalites

### Site vitrine
- Page d'accueil presentant les fonctionnalites de la plateforme

### Application
- **3 types de comptes** : Administrateur, Utilisateur interne, Client externe
- **Gestion des utilisateurs** (admin) : CRUD complet sur les utilisateurs
- **Gestion des projets** (admin/interne) : nom, objectifs, KPIs
- **Gestion des roadmaps** (admin/interne) :
  - Creation avec import CSV ou lien Google Sheets
  - Configuration du nombre de semaines par sprint
  - Visualisation timeline Gantt avec couleurs par phase (dev, tests, activation)
- **Acces client** : consultation des projets et roadmaps partages

## Demarrage

### Installation
```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### Lancement en developpement
```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm start

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

### Compte administrateur par defaut
- Email : `admin@roadmap.app`
- Mot de passe : `admin123`

## Format CSV pour import de roadmap

```
Nom du lot,Date de debut,Nombre de sprints,Date tests,Date activation
Lot 1,05/01/2026,2,02/02/2026,09/02/2026
Lot 2,05/01/2026,3,09/02/2026,16/02/2026
Lot 3,19/01/2026,2,09/02/2026,16/02/2026
```

## Structure du projet

```
prt/
├── frontend/          # Application React (Vite)
│   └── src/
│       ├── api.js             # Client API
│       ├── context/           # AuthContext
│       ├── components/        # AppLayout
│       └── pages/             # Landing, Login, Dashboard, Users, Projects, ProjectDetail, RoadmapCreate, RoadmapView
├── backend/           # API Express
│   ├── server.js              # Point d'entree
│   ├── database.js            # Init SQLite + schema
│   ├── middleware/auth.js     # JWT middleware
│   └── routes/                # auth, users, projects, roadmaps
└── package.json       # Scripts racine
```
