import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      login(data);
      navigate("/feed");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-5">
      <h1 className="font-display font-700 text-2xl text-ink mb-1">Welcome back</h1>
      <p className="font-body text-sm text-inkfaint mb-6">Log in with your college email.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@nsut.ac.in"
            className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink"
          />
        </div>
        {error && <p className="text-stamp text-sm font-body">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-ink text-paper py-2 rounded-sm font-body font-medium hover:bg-tealDark transition-colors disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="font-body text-sm text-inkfaint mt-6">
        New here? <Link to="/register" className="text-teal hover:text-tealDark underline underline-offset-2">Create an account</Link>
      </p>
    </div>
  );
}
