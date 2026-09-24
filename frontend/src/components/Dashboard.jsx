import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import ActivityPanel from "./ActivityPanel";
import MembersPanel from "./MembersPanel";
import ProjectView from "./ProjectView";

export default function Dashboard({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [sidePanel, setSidePanel] = useState("");

  async function loadProjects() {
    try {
      const result = await api.projects();
      setProjects(result);
      if (!selectedId && result.length) setSelectedId(result[0].id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProjects(); }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId),
    [projects, selectedId]
  );

  async function createProject(e) {
    e.preventDefault();
    setError("");
    try {
      const project = await api.createProject({ name: newName, description: newDescription });
      setProjects((items) => [project, ...items]);
      setSelectedId(project.id);
      setNewName("");
      setNewDescription("");
      setShowCreate(false);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="center-page">Loading workspace...</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row"><div className="brand-mark small">TF</div><div className="brand">TaskForge</div></div>
        <div className="user-box">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>

        <div className="sidebar-title">Projects</div>
        <div className="project-list">
          {projects.map((project) => (
            <button
              key={project.id}
              className={`project-item ${project.id === selectedId ? "active" : ""}`}
              onClick={() => { setSelectedId(project.id); setSidePanel(""); }}
            >
              <span className="project-dot" />{project.name}
            </button>
          ))}
          {!projects.length && <div className="sidebar-empty">No projects yet</div>}
        </div>

        <button className="new-project ghost" onClick={() => setShowCreate((v) => !v)}>{showCreate ? "Close" : "+ New project"}</button>

        <div className="sidebar-bottom">
          <button className={`sidebar-action ${sidePanel === "members" ? "active" : ""}`} onClick={() => setSidePanel(sidePanel === "members" ? "" : "members")}>👥 Members</button>
          <button className={`sidebar-action ${sidePanel === "activity" ? "active" : ""}`} onClick={() => setSidePanel(sidePanel === "activity" ? "" : "activity")}>🕘 Activity</button>
          <button className="sidebar-action" onClick={onLogout}>↪ Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        {showCreate && (
          <form className="create-project-card" onSubmit={createProject}>
            <div>
              <p className="eyebrow">NEW PROJECT</p>
              <h2>Create a project</h2>
              <p className="muted small">Keep the scope small enough to finish, but real enough to demo.</p>
            </div>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" required />
            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Short description" rows="3" />
            <button className="primary" type="submit">Create project</button>
          </form>
        )}

        {error && <div className="error banner">{error}</div>}

        {!selectedProject ? (
          <div className="empty-state panel"><div><div className="hero-icon">TF</div><h1>Start your first project</h1><p className="muted">Create a workspace and start turning ideas into tasks.</p><button className="primary" onClick={() => setShowCreate(true)}>Create project</button></div></div>
        ) : (
          <div className="workspace-grid">
            <ProjectView project={selectedProject} currentUser={user} />
            {sidePanel === "members" && <MembersPanel project={selectedProject} currentUser={user} />}
            {sidePanel === "activity" && <ActivityPanel project={selectedProject} />}
          </div>
        )}
      </main>
    </div>
  );
}
