import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function MembersPanel({ project, currentUser }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try { setMembers(await api.members(project.id)); } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, [project.id]);

  const myRole = useMemo(
    () => members.find((member) => member.user_id === currentUser.id)?.role,
    [members, currentUser.id]
  );
  const canManage = myRole === "owner" || myRole === "admin";

  async function add(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.addMember(project.id, { email, role });
      setEmail("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(memberId, value) {
    try {
      await api.updateMember(project.id, memberId, { role: value });
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(memberId) {
    try {
      await api.removeMember(project.id, memberId);
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <aside className="side-panel">
      <div className="panel-heading"><div><p className="eyebrow">TEAM</p><h2>Members</h2></div><span className="count">{members.length}</span></div>
      {canManage && (
        <form className="member-form" onSubmit={add}>
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="member-form-row"><select value={role} onChange={(e) => setRole(e.target.value)}><option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select><button className="primary" disabled={loading}>Invite</button></div>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      <div className="member-list">
        {members.map((member) => (
          <div className="member-row" key={member.id}>
            <div className="avatar">{member.name.slice(0, 1).toUpperCase()}</div>
            <div className="member-info"><strong>{member.name}</strong><span>{member.email}</span></div>
            {canManage && member.role !== "owner" ? (
              <div className="member-actions"><select value={member.role} onChange={(e) => changeRole(member.id, e.target.value)}><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select><button className="icon-button" onClick={() => remove(member.id)}>×</button></div>
            ) : <span className="role-label">{member.role}</span>}
          </div>
        ))}
      </div>
    </aside>
  );
}
