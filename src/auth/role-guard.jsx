import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

export function RequireAuth() {
  const { isAuthenticated, booting, accessDenied } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (accessDenied) return <Navigate to="/access-denied" replace />;

    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}

export function RequireRole({ allowed = [] }) {
  const { roles } = useAuth();
  const ok = allowed.length === 0 || roles.some((r) => allowed.includes(r));

  if (!ok) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
