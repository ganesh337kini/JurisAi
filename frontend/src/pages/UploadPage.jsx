import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import FileDropzone from "../components/FileDropzone.jsx";
import FileTypeIcon from "../components/FileTypeIcon.jsx";

function inferClientFiletype(file) {
  const name = (file?.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".txt")) return "txt";
  if (/(\.png|\.jpe?g|\.webp|\.tiff?)$/.test(name)) return "image";
  return "other";
}

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | uploading | processing | done
  const [previewUrl, setPreviewUrl] = useState(null);

  const clientType = useMemo(() => inferClientFiletype(file), [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    // Image preview + optional PDF preview (embedded viewer).
    const type = file.type || "";
    if (type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl({ kind: "image", url });
      return () => URL.revokeObjectURL(url);
    }

    if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl({ kind: "pdf", url });
      return () => URL.revokeObjectURL(url);
    }

    setPreviewUrl(null);
    return undefined;
  }, [file]);

  const onUpload = async () => {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    setBusy(true);
    setError("");
    setUploadPct(0);
    setPhase("uploading");

    const form = new FormData();
    form.append("file", file);

    try {
      // Do not set Content-Type here — Axios must add the multipart boundary automatically.
      const { data } = await api.post("/documents/upload", form, {
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded * 100) / evt.total);
          setUploadPct(Math.min(99, pct));

          // After the multipart body is fully sent, the server may still be calling the AI service.
          if (evt.loaded >= evt.total) {
            setPhase("processing");
            setUploadPct(99);
          }
        },
      });

      setUploadPct(100);

      const doc = data.document;
      if (doc?.processingStatus === "failed") {
        setPhase("idle");
        setUploadPct(0);
        setError(data.warning || data.aiError || "AI processing failed");
      } else {
        setPhase("done");
        setFile(null);
      }
    } catch (err) {
      setPhase("idle");
      setUploadPct(0);
      setError(err.response?.data?.message || err.response?.data?.error || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-display text-4xl text-white">Upload</div>
          <div className="mt-2 max-w-2xl text-sm text-slate-400">
            Securely upload filings and contracts. The backend stores the file on disk, then the AI service extracts text,
            chunks it, embeds it, and writes vectors to ChromaDB.
          </div>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 ring-1 ring-slate-800 hover:bg-slate-800"
        >
          View dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FileDropzone disabled={busy} file={file} onFile={setFile} error={error} />

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/20 p-6 shadow-glow">
            <div className="text-sm font-semibold text-white">Preview</div>
            <div className="mt-2 text-xs text-slate-500">Images and PDFs get a quick preview where supported.</div>

            <div className="mt-5">
              {!file ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-sm text-slate-400">
                  Select a file to see a preview here.
                </div>
              ) : previewUrl?.kind === "image" ? (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <img src={previewUrl.url} alt="Selected document preview" className="max-h-[420px] w-full object-contain" />
                </div>
              ) : previewUrl?.kind === "pdf" ? (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <iframe title="PDF preview" src={previewUrl.url} className="h-[420px] w-full" />
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                  <FileTypeIcon filetype={clientType} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{file.name}</div>
                    <div className="text-xs text-slate-500">Preview not available for this type.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/20 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Upload progress</div>
                <div className="text-xs text-slate-500">
                  {phase === "idle" && "Ready when you are."}
                  {phase === "uploading" && "Uploading file to the API…"}
                  {phase === "processing" && "Extracting, chunking, embedding, and writing vectors…"}
                  {phase === "done" && "Completed successfully."}
                </div>
              </div>
              <div className="text-sm font-semibold text-emerald-200">{uploadPct}%</div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-800">
              <div
                className={[
                  "h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all",
                  busy && phase !== "idle" ? "animate-pulse" : "",
                ].join(" ")}
                style={{ width: `${uploadPct}%` }}
              />
            </div>

            <button
              type="button"
              disabled={busy || !file}
              onClick={onUpload}
              className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? "Working…" : "Upload & process"}
            </button>

            {phase === "done" ? (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-100">
                Success. Your document is saved and indexed. Open the dashboard to review status and chunk counts.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
