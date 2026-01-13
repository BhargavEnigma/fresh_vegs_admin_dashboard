import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

export function RequireAuth() {
  const { isAuthed, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireRole({ allowed = [] }) {
  const { roles } = useAuth();
  const ok = allowed.length === 0 || roles.some((r) => allowed.includes(r));

  if (!ok) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-lg font-semibold">Access denied</div>
          <div className="mt-2 text-sm text-slate-500">
            Your account doesn’t have permission to view this module.
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
