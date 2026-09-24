import { useState } from "react";
import { api } from "../api";

export default function Login({ onAuth, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      onAuth(await api.login({ email, password }));
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
        <h1>Welcome back</h1>
        <p className="muted">Plan work, keep everyone aligned, and ship faster.</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" required />
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Your password" required />
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
        <button className="link-button" onClick={onRegister}>Create an account</button>
      </div>
    </div>
  );
}
