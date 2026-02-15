const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
const db = initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API Routes
const createAuthRoutes = require('./routes/auth');
const createUserRoutes = require('./routes/users');
const createProjectRoutes = require('./routes/projects');
const createRoadmapRoutes = require('./routes/roadmaps');

app.use('/api/auth', createAuthRoutes(db));
app.use('/api/users', createUserRoutes(db));
app.use('/api/projects', createProjectRoutes(db));
app.use('/api/roadmaps', createRoadmapRoutes(db));

// Serve frontend in production
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
