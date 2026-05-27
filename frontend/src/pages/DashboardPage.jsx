import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import AnalysisStatusPill from "../components/AnalysisStatusPill.jsx";
import Spinner from "../components/Spinner.jsx";
import StatusPill from "../components/StatusPill.jsx";
import FileTypeIcon from "../components/FileTypeIcon.jsx";

function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = async (q) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/documents", { params: { q: q || undefined } });
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const stats = useMemo(() => {
    const total = documents.length;
    const completed = documents.filter((d) => d.processingStatus === "completed").length;
    const failed = documents.filter((d) => d.processingStatus === "failed").length;
    const processing = documents.filter((d) => d.processingStatus === "processing" || d.processingStatus === "pending")
      .length;
    const chunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
    const analyzed = documents.filter((d) => d.analysisStatus === "completed").length;
    return { total, completed, failed, processing, chunks, analyzed };
  }, [documents]);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this document from your library?")) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="font-display text-4xl text-white">Dashboard</div>
        <div className="mt-2 max-w-2xl text-sm text-slate-400">
          Track ingestion status, AI analysis, and document insights. Open a document to summarize and extract key legal details.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total documents" value={loading ? "…" : stats.total} hint="All uploads in your workspace" />
        <StatCard title="AI analyzed" value={loading ? "…" : stats.analyzed} hint="Documents with Phase 2 insights" />
        <StatCard title="Indexed chunks" value={loading ? "…" : stats.chunks} hint="Stored in ChromaDB (vectors)" />
        <StatCard title="Completed" value={loading ? "…" : stats.completed} hint="Successfully processed" />
        <StatCard title="In progress / issues" value={loading ? "…" : `${stats.processing} / ${stats.failed}`} hint="Pending/processing vs failed" />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/20 p-5 shadow-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Library</div>
            <div className="text-xs text-slate-500">Recently uploaded files appear first.</div>
          </div>
          <div className="w-full sm:w-96">
            <label className="text-xs font-semibold text-slate-300">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename…"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <Spinner label="Loading your documents…" />
          ) : error ? (
            <div className="text-sm text-rose-300">{error}</div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-sm text-slate-400">
              No documents yet. Upload a contract, brief, or scanned filing to get started.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-950/60">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3">Chunks</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Analysis</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {documents.map((d) => (
                    <tr key={d._id} className="bg-slate-900/10 hover:bg-slate-900/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <FileTypeIcon filetype={d.filetype} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">{d.originalname}</div>
                            <div className="truncate text-xs text-slate-500">{d.filename}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{d.filetype}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {d.uploadDate ? new Date(d.uploadDate).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-200">{d.chunkCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={d.processingStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <AnalysisStatusPill status={d.analysisStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/chat/${d._id}`}
                            className="rounded-xl bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-200 ring-1 ring-violet-500/30 hover:bg-violet-500/25"
                          >
                            Chat
                          </Link>
                          <Link
                            to={`/documents/${d._id}`}
                            className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                          >
                            {d.analysisStatus === "completed" ? "Insights" : "Analyze"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => onDelete(d._id)}
                            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-800 hover:bg-slate-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
