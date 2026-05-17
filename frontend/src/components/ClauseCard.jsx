import { useState } from "react";

const IMPORTANCE_COLORS = {
  High: "border-rose-500/40 bg-rose-500/5",
  Medium: "border-amber-500/40 bg-amber-500/5",
  Low: "border-emerald-500/40 bg-emerald-500/5",
};

const IMPORTANCE_BADGE = {
  High: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  Medium: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  Low: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
};

export default function ClauseCard({ clause, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const importance = clause.importance || "Medium";
  const border = IMPORTANCE_COLORS[importance] || IMPORTANCE_COLORS.Medium;
  const badge = IMPORTANCE_BADGE[importance] || IMPORTANCE_BADGE.Medium;

  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{clause.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${badge}`}>
              {importance}
            </span>
          </div>
          {!open ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">{clause.text}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{clause.text}</p>
      ) : null}
    </div>
  );
}
