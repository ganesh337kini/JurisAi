import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import Spinner from "../components/Spinner.jsx";
import FileTypeIcon from "../components/FileTypeIcon.jsx";

export default function LearningHub() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/documents");
        setDocuments((data.documents || []).filter((d) => d.processingStatus === "completed"));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load documents");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner label="Loading learning hub…" />;

  return (
    <div className="space-y-8">
      <div>
        <div className="font-display text-4xl text-white">Learning Hub</div>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Study your legal documents with AI-generated notes, quizzes, and beginner-friendly explanations.
        </p>
      </div>

      {error ? <p className="text-rose-300">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => (
          <div
            key={doc._id}
            className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5"
          >
            <div className="flex items-start gap-3">
              <FileTypeIcon filetype={doc.filetype} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">{doc.originalname}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {doc.analysisStatus === "completed" ? "Analyzed" : "Not analyzed yet"}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/learning/notes/${doc._id}`}
                className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20"
              >
                Study Notes
              </Link>
              <Link
                to={`/learning/quiz/${doc._id}`}
                className="rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 ring-1 ring-sky-500/30 hover:bg-sky-500/20"
              >
                Quiz
              </Link>
              <Link
                to={`/learning/annotate/${doc._id}`}
                className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 ring-1 ring-violet-500/30 hover:bg-violet-500/20"
              >
                Annotate
              </Link>
              <Link
                to={`/chat/${doc._id}`}
                className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-slate-800 hover:text-emerald-200"
              >
                Learning Chat
              </Link>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-400">
          Upload and process a document first to start learning.
          <div className="mt-4">
            <Link to="/upload" className="text-emerald-300 hover:underline">
              Go to Upload →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
