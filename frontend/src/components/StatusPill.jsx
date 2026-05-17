export default function StatusPill({ status }) {
  const map = {
    pending: "bg-amber-500/10 text-amber-200 ring-amber-500/20",
    processing: "bg-sky-500/10 text-sky-200 ring-sky-500/20 animate-pulse",
    completed: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20",
    failed: "bg-rose-500/10 text-rose-200 ring-rose-500/20",
  };

  const cls = map[status] || "bg-slate-500/10 text-slate-200 ring-slate-500/20";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {status}
    </span>
  );
}
