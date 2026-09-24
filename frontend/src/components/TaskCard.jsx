import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const nextStatus = { todo: "in_progress", in_progress: "done", done: "todo" };

export default function TaskCard({ task, members, currentUser, onUpdate, onDelete, onDragStart }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.comments(task.id).then(setComments).catch(() => {});
  }, [open, task.id]);

  const assignee = useMemo(
    () => members.find((member) => member.user_id === task.assignee_id),
    [members, task.assignee_id]
  );
  const myRole = members.find((member) => member.user_id === currentUser.id)?.role;
  const canDelete = myRole === "owner" || myRole === "admin" || task.created_by === currentUser.id;

  async function addComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const result = await api.addComment(task.id, { body: comment.trim() });
      setComments((items) => [...items, result]);
      setComment("");
    } catch {}
  }

  async function changeStatus() {
    setSaving(true);
    await onUpdate(task.id, { status: nextStatus[task.status] });
    setSaving(false);
  }

  return (
    <article className="task-card" draggable onDragStart={onDragStart}>
      <div className="task-card-top">
        <span className={`priority-pill ${task.priority}`}>{task.priority}</span>
        {canDelete && <button className="icon-button" onClick={() => onDelete(task.id)} title="Delete task">×</button>}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="task-footer">
        <div className="assignee-chip">{assignee ? assignee.name.slice(0, 1).toUpperCase() : "—"}</div>
        <div className="task-meta-right">
          {task.due_date && <span>Due {new Date(task.due_date).toLocaleDateString()}</span>}
          <button className="status-button" onClick={changeStatus} disabled={saving}>{saving ? "..." : task.status.replace("_", " ")}</button>
        </div>
      </div>
      <button className="link-button left" onClick={() => setOpen((v) => !v)}>{open ? "Hide comments" : "View comments"}</button>
      {open && (
        <div className="comments">
          {comments.map((item) => (
            <div className="comment" key={item.id}><div>{item.body}</div><small>{item.author_name} · {new Date(item.created_at).toLocaleString()}</small></div>
          ))}
          {!comments.length && <div className="muted small">No comments yet.</div>}
          <form onSubmit={addComment} className="comment-form"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" /><button className="ghost">Post</button></form>
        </div>
      )}
    </article>
  );
}
