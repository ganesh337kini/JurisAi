import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import Spinner from "../components/Spinner.jsx";

function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function LearningDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/learning/dashboard");
        setDashboard(data.dashboard);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner label="Loading learning dashboard…" />;

  const d = dashboard || {};

  return (
    <div className="space-y-8">
      <div>
        <div className="font-display text-4xl text-white">Learning Dashboard</div>
        <p className="mt-2 text-sm text-slate-400">Track your progress across documents, notes, and quizzes.</p>
      </div>

      {error ? <p className="text-rose-300">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Documents studied" value={d.documentsStudied ?? 0} />
        <StatCard title="Notes generated" value={d.notesGenerated ?? 0} />
        <StatCard title="Quizzes taken" value={d.quizzesTaken ?? 0} />
        <StatCard title="Average score" value={`${d.averageQuizScore ?? 0}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/learning/hub" className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 hover:border-emerald-500/30">
          <div className="text-white">Learning Hub</div>
          <div className="mt-1 text-sm text-slate-400">Notes, quizzes, and annotations</div>
        </Link>
        <Link to="/learning/forum" className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 hover:border-emerald-500/30">
          <div className="text-white">Discussion Forum</div>
          <div className="mt-1 text-sm text-slate-400">Ask questions and share insights</div>
        </Link>
        <Link to="/dashboard" className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 hover:border-emerald-500/30">
          <div className="text-white">Document Library</div>
          <div className="mt-1 text-sm text-slate-400">Upload and analyze documents</div>
        </Link>
      </div>

      {(d.recentAttempts || []).length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="text-sm font-semibold text-white">Recent quiz attempts</div>
          <div className="mt-4 space-y-2">
            {d.recentAttempts.map((a) => (
              <div key={a._id} className="flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-sm">
                <span className="text-slate-300">{a.documentId?.originalname || "Document"}</span>
                <span className="text-emerald-300">{a.score}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
