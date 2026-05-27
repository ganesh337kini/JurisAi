import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import ChatBox from "../components/ChatBox.jsx";
import ClauseCard from "../components/ClauseCard.jsx";
import FileTypeIcon from "../components/FileTypeIcon.jsx";
import Spinner from "../components/Spinner.jsx";

export default function ChatPage() {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [highlightedChunk, setHighlightedChunk] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/chat/${documentId}`);
      setDocument(data.document);
      setMessages(data.chat?.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSend = async (query) => {
    setSending(true);
    setError("");
    try {
      const { data } = await api.post("/chat", { documentId, query });
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.aiError || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const onClearChat = async () => {
    if (!window.confirm("Clear all messages for this document?")) return;
    try {
      await api.delete(`/chat/${documentId}`);
      setMessages([]);
    } catch (err) {
      alert(err.response?.data?.message || "Could not clear chat");
    }
  };

  const exportChat = () => {
    const lines = [
      `JurisAI Chat — ${document?.originalname || "Document"}`,
      "",
      ...messages.map((m) => {
        const who = m.role === "user" ? "You" : "JurisAI";
        return `[${who}] ${m.content}`;
      }),
    ];
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${document?.originalname || documentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chatReady =
    document?.processingStatus === "completed" && (document?.chunkCount || 0) > 0;

  if (loading) {
    return <Spinner label="Loading chat…" />;
  }

  if (error && !document) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard" className="text-sm text-emerald-300 hover:underline">
          ← Dashboard
        </Link>
        <p className="text-rose-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/dashboard" className="text-sm text-emerald-300 hover:underline">
            ← Dashboard
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <FileTypeIcon filetype={document?.filetype} />
            <div>
              <h1 className="font-display text-3xl text-white">{document?.originalname}</h1>
              <p className="text-sm text-slate-400">Legal document chat (RAG)</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/documents/${documentId}`}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-800 hover:bg-slate-900"
          >
            View analysis
          </Link>
          <button
            type="button"
            onClick={exportChat}
            disabled={messages.length === 0}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-800 hover:bg-slate-900 disabled:opacity-50"
          >
            Export chat
          </button>
          <button
            type="button"
            onClick={onClearChat}
            disabled={messages.length === 0}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-800 hover:bg-slate-900 disabled:opacity-50"
          >
            Clear history
          </button>
        </div>
      </div>

      {!chatReady ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          This document must finish processing and have indexed chunks before you can chat.
          {document?.processingStatus !== "completed" ? " Processing is still in progress." : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* LEFT — document context */}
        <div className="space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/25 p-5 ring-1 ring-emerald-500/20">
            <h2 className="text-sm font-semibold text-white">📊 Summary</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {document?.shortSummary ||
                document?.summary ||
                "Run analysis from the document page to see an AI summary here."}
            </p>
          </section>

          {document?.entities && Object.values(document.entities).some(Boolean) ? (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/25 p-5 ring-1 ring-sky-500/20">
              <h2 className="text-sm font-semibold text-white">📌 Key details</h2>
              <dl className="mt-3 grid gap-2 text-sm">
                {[
                  ["Owner", document.entities.owner],
                  ["Tenant", document.entities.tenant],
                  ["Rent", document.entities.rent ? (/^[^\d]/.test(String(document.entities.rent).trim()) ? document.entities.rent : `₹${document.entities.rent}`) : ""],
                  ["Deposit", document.entities.deposit ? (/^[^\d]/.test(String(document.entities.deposit).trim()) ? document.entities.deposit : `₹${document.entities.deposit}`) : ""],
                  ["Duration", document.entities.duration],
                ].map(([label, val]) =>
                  val ? (
                    <div key={label} className="flex justify-between gap-4 border-b border-slate-800/80 py-2">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="text-right font-medium text-white">{val}</dd>
                    </div>
                  ) : null
                )}
              </dl>
            </section>
          ) : null}

          {document?.clauses?.length > 0 ? (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/25 p-5 ring-1 ring-amber-500/20">
              <h2 className="text-sm font-semibold text-white">📑 Clauses</h2>
              <div className="mt-3 space-y-2">
                {document.clauses.map((c, i) => (
                  <div
                    key={`${c.title}-${i}`}
                    className={
                      highlightedChunk != null && i === 0
                        ? "ring-2 ring-emerald-500/50 rounded-2xl"
                        : ""
                    }
                  >
                    <ClauseCard clause={c} />
                  </div>
                ))}
              </div>
              {highlightedChunk != null ? (
                <p className="mt-2 text-xs text-emerald-300">
                  Highlighting source chunk #{highlightedChunk + 1} — see matching clause above when available.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* RIGHT — chat */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ChatBox
            messages={messages}
            onSend={onSend}
            loading={sending}
            disabled={!chatReady}
            onHighlightChunk={setHighlightedChunk}
          />
        </div>
      </div>
    </div>
  );
}
