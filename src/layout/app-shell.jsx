import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "../lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Menu, Moon, Sun } from "lucide-react";
import * as React from "react";

function useDarkMode() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains("dark"));

  React.useEffect(() => {
    const stored = localStorage.getItem("freshveg_admin_theme");
    if (stored === "dark") document.documentElement.classList.add("dark");
    if (stored === "light") document.documentElement.classList.remove("dark");
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = React.useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("freshveg_admin_theme", next ? "dark" : "light");
    setDark(next);
  }, []);

  return { dark, toggle };
}

export function AppShell() {
  const { user, roles, logout } = useAuth();
  const { dark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const items = NAV_ITEMS.filter((x) => x.roles.some((r) => roles.includes(r)));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <button
          className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-900"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-sm font-semibold">FreshVeg Admin</div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex w-full">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:static lg:translate-x-0 h-[100vh]",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "transition-transform"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-base font-bold">FreshVeg Admin</div>
              <div className="text-xs text-slate-500">Operations console</div>
            </div>

            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="hidden lg:inline-flex">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="mt-6 space-y-1">
            {items.map((it) => (
              <NavLink
                key={it.key}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
                    isActive && "bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50"
                  )
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <div className="font-semibold">{user?.full_name || user?.phone || "User"}</div>
            <div className="mt-1">Roles: {roles.join(", ") || "—"}</div>
          </div>

          <div className="mt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Account
                  <span className="text-xs text-slate-500">⋯</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuItem onClick={toggle}>{dark ? "Switch to Light" : "Switch to Dark"}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main */}
        <main className="w-full flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}
    </div>
  );
}
