export default function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <div
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
