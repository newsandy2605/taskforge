import { useEffect, useState } from "react";
import { api } from "./api";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("taskforge_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then(setUser)
      .catch(() => localStorage.removeItem("taskforge_token"))
      .finally(() => setLoading(false));
  }, []);

  function handleAuth(result) {
    localStorage.setItem("taskforge_token", result.access_token);
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem("taskforge_token");
    setUser(null);
  }

  if (loading) return <div className="center-page">Loading TaskForge...</div>;
  if (!user) {
    return authMode === "login" ? (
      <Login onAuth={handleAuth} onRegister={() => setAuthMode("register")} />
    ) : (
      <Register onAuth={handleAuth} onLogin={() => setAuthMode("login")} />
    );
  }

  return <Dashboard user={user} onLogout={logout} />;
}
