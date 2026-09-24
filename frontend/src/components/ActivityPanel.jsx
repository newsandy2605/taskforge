import { useEffect, useState } from "react";
import { api } from "../api";

export default function ActivityPanel({ project }) {
  const [items, setItems] = useState([]);
  const [queueing, setQueueing] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try { setItems(await api.activity(project.id)); } catch {}
  }

  useEffect(() => { load(); }, [project.id]);

  async function queueJob(jobType) {
    setQueueing(true);
    setMessage("");
    try {
      await api.queueJob(project.id, { job_type: jobType, project_id: project.id });
      setMessage("Background job queued.");
      setTimeout(load, 700);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setQueueing(false);
    }
  }

  return (
    <aside className="side-panel">
      <div className="panel-heading"><div><p className="eyebrow">AUDIT LOG</p><h2>Recent activity</h2></div></div>
      <div className="job-buttons">
        <button className="ghost" onClick={() => queueJob("rebuild_project_cache")} disabled={queueing}>Queue cache job</button>
        <button className="ghost" onClick={() => queueJob("send_digest")} disabled={queueing}>Queue digest</button>
      </div>
      {message && <div className="small muted job-message">{message}</div>}
      <div className="activity-list">
        {items.map((item) => (
          <div className="activity-item" key={item.id}>
            <div className="activity-dot" />
            <div><strong>{item.message}</strong><span>{new Date(item.created_at).toLocaleString()}</span></div>
          </div>
        ))}
        {!items.length && <div className="muted small">No activity yet.</div>}
      </div>
    </aside>
  );
}
