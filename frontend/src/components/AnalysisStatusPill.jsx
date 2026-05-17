const STYLES = {
  none: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
  pending: "bg-amber-500/10 text-amber-200 ring-amber-500/20",
  processing: "bg-sky-500/10 text-sky-200 ring-sky-500/20",
  completed: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-200 ring-rose-500/20",
};

export default function AnalysisStatusPill({ status }) {
  const key = status || "none";
  const label = key === "none" ? "Not analyzed" : key;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${STYLES[key] || STYLES.none}`}
    >
      {label}
    </span>
  );
}
