import { useState } from "react";
import { api } from "../api";

export default function Register({ onAuth, onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      onAuth(await api.register({ name, email, password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-mark">TF</div>
        <div className="brand">TaskForge</div>
        <h1>Create your workspace</h1>
        <p className="muted">Start with your own project, then invite collaborators.</p>
        <form onSubmit={submit}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" required />
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} placeholder="At least 8 characters" required />
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
        </form>
        <button className="link-button" onClick={onLogin}>Already have an account?</button>
      </div>
    </div>
  );
}
