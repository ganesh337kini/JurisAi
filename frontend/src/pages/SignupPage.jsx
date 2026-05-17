import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { formatApiError } from "../api/errors.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignupPage() {
  const { register, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(formatApiError(err, "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-14">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/30 p-8 shadow-glow backdrop-blur">
        <div className="font-display text-3xl text-white">Create your workspace</div>
        <div className="mt-2 text-sm text-slate-400">Start uploading documents for extraction and retrieval.</div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs font-semibold text-slate-300">Full name</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <div className="mt-1 text-xs text-slate-500">Minimum 6 characters.</div>
          </div>

          {error ? <div className="text-sm text-rose-300">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="font-semibold text-emerald-300 hover:text-emerald-200" to="/login">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
