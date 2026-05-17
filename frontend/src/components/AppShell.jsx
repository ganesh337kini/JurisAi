import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  [
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
    isActive
      ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30"
      : "text-slate-300 hover:bg-slate-900 hover:text-white",
  ].join(" ");

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-full bg-slate-950">
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/60 p-6 backdrop-blur lg:flex">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-2xl tracking-tight text-white">JurisAI</div>
              <div className="mt-1 text-xs text-slate-400">Document intelligence</div>
            </div>
            <div className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-500/20">
              Phase 2
            </div>
          </div>

          <nav className="mt-10 flex-1 space-y-2">
            <NavLink to="/dashboard" className={linkClass}>
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              Dashboard
            </NavLink>
            <NavLink to="/upload" className={linkClass}>
              <span className="h-2 w-2 rounded-full bg-sky-400/80" />
              Upload
            </NavLink>
          </nav>

          <div className="mt-auto pt-10">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs text-slate-400">Signed in as</div>
              <div className="mt-1 truncate text-sm font-medium text-white">{user?.name}</div>
              <div className="truncate text-xs text-slate-400">{user?.email}</div>
              <button
                type="button"
                onClick={logout}
                className="mt-4 w-full rounded-xl bg-slate-950 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-900"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/70 px-4 py-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-xl text-white">JurisAI</div>
                <div className="text-xs text-slate-400">Signed in as {user?.email}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-800"
              >
                Log out
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive
                    ? "flex-1 rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-200 ring-1 ring-emerald-500/30"
                    : "flex-1 rounded-xl bg-slate-900 px-3 py-2 text-center text-sm text-slate-200 ring-1 ring-slate-800"
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  isActive
                    ? "flex-1 rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-200 ring-1 ring-emerald-500/30"
                    : "flex-1 rounded-xl bg-slate-900 px-3 py-2 text-center text-sm text-slate-200 ring-1 ring-slate-800"
                }
              >
                Upload
              </NavLink>
            </div>
          </header>

          <main className="p-4 sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
