const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

async function uploadFile(path, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Users
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getProjectClients: (id) => request(`/projects/${id}/clients`),
  addProjectClient: (id, userId) => request(`/projects/${id}/clients`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  removeProjectClient: (id, userId) => request(`/projects/${id}/clients/${userId}`, { method: 'DELETE' }),

  // Roadmaps
  getProjectRoadmaps: (projectId) => request(`/roadmaps/project/${projectId}`),
  getRoadmap: (id) => request(`/roadmaps/${id}`),
  createRoadmap: (data) => request('/roadmaps', { method: 'POST', body: JSON.stringify(data) }),
  updateRoadmap: (id, data) => request(`/roadmaps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoadmap: (id) => request(`/roadmaps/${id}`, { method: 'DELETE' }),
  importCSV: (file) => uploadFile('/roadmaps/import-csv', file),
};
