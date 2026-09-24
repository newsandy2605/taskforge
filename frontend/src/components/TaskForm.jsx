import { useState } from "react";

export default function TaskForm({ currentUser, members, onSubmit }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState(String(currentUser.id));

  function submit(e) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      assignee_id: assigneeId ? Number(assigneeId) : null
    });
    setTitle("");
    setDescription("");
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <div className="form-grid">
        <div><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" required /></div>
        <div><label>Assignee</label><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></div>
      </div>
      <label>Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context, links, or acceptance notes." rows="3" />
      <div className="form-grid three">
        <div><label>Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
        <div><label>Due date</label><input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <div className="form-end"><button className="primary">Create task</button></div>
      </div>
    </form>
  );
}
