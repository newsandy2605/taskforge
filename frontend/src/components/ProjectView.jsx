import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import TaskCard from "./TaskCard";
import TaskForm from "./TaskForm";

const columns = [
  ["todo", "Backlog"],
  ["in_progress", "In progress"],
  ["done", "Done"]
];

export default function ProjectView({ project, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, todo: 0, in_progress: 0, done: 0 });
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [error, setError] = useState("");
  const [draggedTask, setDraggedTask] = useState(null);

  async function loadAll() {
    try {
      const [taskResult, memberResult, statResult] = await Promise.all([
        api.tasks(project.id, { search, priority, assigned_to: assignee || "" }),
        api.members(project.id),
        api.stats(project.id)
      ]);
      setTasks(taskResult);
      setMembers(memberResult);
      setStats(statResult);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadAll(); }, [project.id]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const result = await api.tasks(project.id, { search, priority, assigned_to: assignee || "" });
        setTasks(result);
      } catch (err) {
        setError(err.message);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [project.id, search, priority, assignee]);

  useEffect(() => {
  const token = localStorage.getItem("taskforge_token");
  if (!token) return;

  const wsBase = api.baseUrl.replace(/^http/, "ws");
  const socket = new WebSocket(
    `${wsBase}/ws/projects/${project.id}?token=${encodeURIComponent(token)}`
  );

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    setLiveMessage(data.message || "Project updated");

    try {
      const [result, statResult] = await Promise.all([
        api.tasks(project.id, {
          search,
          priority,
          assigned_to: assignee || ""
        }),
        api.stats(project.id)
      ]);

      setTasks(result);
      setStats(statResult);
    } catch (err) {
      setError(err.message);
    }

    setTimeout(() => setLiveMessage(""), 3500);
  };

  socket.onerror = () => socket.close();

  return () => socket.close();
}, [project.id]);

  async function createTask(body) {
    setError("");
    try {
      const task = await api.createTask(project.id, body);
      setTasks((items) => [...items, task]);
      setShowForm(false);
      setStats((value) => ({ ...value, total: value.total + 1, [task.status]: value[task.status] + 1 }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateTask(taskId, body) {
    setError("");
    try {
      const task = await api.updateTask(taskId, body);
      setTasks((items) => items.map((item) => item.id === task.id ? task : item));
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(taskId) {
    setError("");
    try {
      await api.deleteTask(taskId);
      setTasks((items) => items.filter((item) => item.id !== taskId));
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dropTask(status) {
    if (!draggedTask || draggedTask.status === status) return;
    await updateTask(draggedTask.id, { status });
    setDraggedTask(null);
  }

  const grouped = useMemo(() => columns.reduce((acc, [key]) => {
    acc[key] = tasks.filter((task) => task.status === key).sort((a, b) => a.order_index - b.order_index);
    return acc;
  }, {}), [tasks]);

  return (
    <section className="project-workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">PROJECT</p>
          <h1>{project.name}</h1>
          <p className="muted">{project.description || "No description yet."}</p>
        </div>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ Add task"}</button>
      </header>

      <div className="stats-row">
        <div className="stat-card"><span>Total</span><strong>{stats.total}</strong></div>
        <div className="stat-card"><span>Backlog</span><strong>{stats.todo}</strong></div>
        <div className="stat-card"><span>In progress</span><strong>{stats.in_progress}</strong></div>
        <div className="stat-card"><span>Done</span><strong>{stats.done}</strong></div>
      </div>

      <div className="toolbar">
        <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." /></div>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">All assignees</option>
          {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
        </select>
        <button className="ghost" onClick={loadAll}>Refresh</button>
      </div>

      {liveMessage && <div className="live-banner">● {liveMessage}</div>}
      {error && <div className="error banner">{error}</div>}
      {showForm && <TaskForm currentUser={currentUser} members={members} onSubmit={createTask} />}

      <div className="board">
        {columns.map(([key, label]) => (
          <section
            className="column"
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropTask(key)}
          >
            <div className="column-title"><span>{label}</span><span className="count">{grouped[key].length}</span></div>
            {grouped[key].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                members={members}
                currentUser={currentUser}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onDragStart={() => setDraggedTask(task)}
              />
            ))}
            {!grouped[key].length && <div className="empty-column">Drop tasks here</div>}
          </section>
        ))}
      </div>
    </section>
  );
}
