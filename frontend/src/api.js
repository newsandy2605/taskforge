const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("taskforge_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

export const api = {
  register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/api/auth/me"),
  projects: () => request("/api/projects"),
  project: (projectId) => request(`/api/projects/${projectId}`),
  createProject: (body) => request("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  tasks: (projectId, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) query.set(key, value);
    });
    return request(`/api/projects/${projectId}/tasks${query.toString() ? `?${query}` : ""}`);
  },
  createTask: (projectId, body) => request(`/api/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
  updateTask: (taskId, body) => request(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTask: (taskId) => request(`/api/tasks/${taskId}`, { method: "DELETE" }),
  members: (projectId) => request(`/api/projects/${projectId}/members`),
  addMember: (projectId, body) => request(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify(body) }),
  updateMember: (projectId, memberId, body) => request(`/api/projects/${projectId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeMember: (projectId, memberId) => request(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" }),
  activity: (projectId) => request(`/api/projects/${projectId}/activity`),
  stats: (projectId) => request(`/api/projects/${projectId}/stats`),
  queueJob: (projectId, body) => request(`/api/projects/${projectId}/jobs`, { method: "POST", body: JSON.stringify(body) }),
  comments: (taskId) => request(`/api/tasks/${taskId}/comments`),
  addComment: (taskId, body) => request(`/api/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify(body) }),
  baseUrl: API_URL
};
