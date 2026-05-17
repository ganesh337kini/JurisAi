import { useCallback, useMemo, useState } from "react";

/**
 * Drag-and-drop upload surface with click-to-browse fallback.
 */
export default function FileDropzone({ disabled, file, onFile, error }) {
  const [dragOver, setDragOver] = useState(false);

  const accept = useMemo(() => ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.tif,.tiff", []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (disabled) return;
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [disabled, onFile]
  );

  const onBrowse = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      if (f) onFile(f);
      e.target.value = "";
    },
    [onFile]
  );

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={[
        "relative overflow-hidden rounded-2xl border border-dashed p-8 transition",
        dragOver ? "border-emerald-400/60 bg-emerald-500/5" : "border-slate-700 bg-slate-900/30",
        disabled ? "opacity-60" : "hover:border-slate-600",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 ring-1 ring-slate-800">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-emerald-300">
            <path
              d="M12 3v10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M8 7l4-4 4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="mt-4 text-base font-semibold text-white">Drop a legal document here</div>
        <div className="mt-1 text-sm text-slate-400">PDF, DOCX, TXT, or scanned images (PNG/JPG)</div>

        <div className="mt-6">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:bg-emerald-400">
            Browse files
            <input
              className="hidden"
              type="file"
              accept={accept}
              disabled={disabled}
              onChange={onBrowse}
            />
          </label>
        </div>

        {file ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left">
            <div className="text-xs text-slate-400">Selected</div>
            <div className="mt-1 truncate text-sm font-medium text-white">{file.name}</div>
            <div className="mt-1 text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
          </div>
        ) : null}

        {error ? <div className="mt-4 text-sm text-rose-300">{error}</div> : null}
      </div>
    </div>
  );
}
