import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.register(form);
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
      <h1 className="font-display font-700 text-2xl text-ink mb-1">Create your account</h1>
      <p className="font-body text-sm text-inkfaint mb-6">Use your college email — it's how we keep the board to campus only.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">Full name</label>
          <input required value={form.name} onChange={update("name")}
            className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink" />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">College email</label>
          <input type="email" required value={form.email} onChange={update("email")}
            placeholder="you@nsut.ac.in"
            className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink" />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">Password</label>
          <input type="password" required minLength={6} value={form.password} onChange={update("password")}
            className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink" />
        </div>
        {error && <p className="text-stamp text-sm font-body">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-ink text-paper py-2 rounded-sm font-body font-medium hover:bg-tealDark transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="font-body text-sm text-inkfaint mt-6">
        Already have an account? <Link to="/login" className="text-teal hover:text-tealDark underline underline-offset-2">Log in</Link>
      </p>
    </div>
  );
}
