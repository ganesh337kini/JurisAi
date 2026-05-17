/**
 * Lightweight file-type icons (bonus UX polish).
 */
export default function FileTypeIcon({ filetype }) {
  const t = (filetype || "").toLowerCase();

  if (t === "pdf") {
    return (
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/25">
        <span className="text-xs font-bold text-rose-200">PDF</span>
      </div>
    );
  }

  if (t === "docx") {
    return (
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/25">
        <span className="text-[10px] font-bold text-indigo-200">DOC</span>
      </div>
    );
  }

  if (t === "txt") {
    return (
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-500/10 ring-1 ring-slate-500/25">
        <span className="text-xs font-bold text-slate-200">TXT</span>
      </div>
    );
  }

  if (t === "image") {
    return (
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/25">
        <span className="text-xs font-bold text-emerald-200">IMG</span>
      </div>
    );
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-500/10 ring-1 ring-slate-500/25">
      <span className="text-xs font-bold text-slate-200">FILE</span>
    </div>
  );
}
