import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import RoadmapView from './pages/RoadmapView';
import RoadmapCreate from './pages/RoadmapCreate';
import AppLayout from './components/AppLayout';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="users" element={
          <ProtectedRoute roles={['admin']}>
            <Users />
          </ProtectedRoute>
        } />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="projects/:projectId/roadmaps/new" element={
          <ProtectedRoute roles={['admin', 'internal']}>
            <RoadmapCreate />
          </ProtectedRoute>
        } />
        <Route path="projects/:projectId/roadmaps/:id/edit" element={
          <ProtectedRoute roles={['admin', 'internal']}>
            <RoadmapCreate />
          </ProtectedRoute>
        } />
        <Route path="projects/:projectId/roadmaps/:id" element={<RoadmapView />} />
      </Route>
    </Routes>
  );
}
