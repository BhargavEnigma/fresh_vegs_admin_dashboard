import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "../lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Menu, Moon, Sun, ChevronDown } from "lucide-react";
import * as React from "react";
import Image from "../assets/logo-light-trans.png";
import ImageDark from "../assets/logo-dark-trans.png";

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
  const [openNavGroups, setOpenNavGroups] = React.useState({});
  const location = useLocation();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const items = NAV_ITEMS
    .map((x) => {
      if (!x.children) return x;

      const children = x.children.filter((child) =>
        child.roles.some((r) => roles.includes(r))
      );

      return {
        ...x,
        children,
      };
    })
    .filter((x) => x.roles.some((r) => roles.includes(r)) && (!x.children || x.children.length));

  return (
    // <div className="min-h-screen bg-dailyveg-50/70 dark:bg-dailyveg-950">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-dailyveg-200/70 bg-white/95 px-4 py-3 backdrop-blur dark:border-dailyveg-900/70 dark:bg-slate-950/95 lg:hidden">
        <button
          className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-900"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-sm font-semibold w-[140px]">
          {dark ? <img src={ImageDark} alt="FreshVeg" className="h-50" /> : <img src={Image} alt="FreshVeg" className="h-50" />}
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex w-full">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 flex-col border-r border-dailyveg-200/70 bg-white/95 p-4 shadow-xl shadow-dailyveg-900/5 backdrop-blur dark:border-dailyveg-900/70 dark:bg-slate-950/95 dark:shadow-black/30 lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "transition-transform"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-base font-bold w-40">
                {dark ? <img src={ImageDark} alt="FreshVeg" className="h-50" /> : <img src={Image} alt="FreshVeg" className="h-50" />}
              </div>
              {/* <div className="text-xs text-slate-500">Operations console</div> */}
            </div>

            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="hidden lg:inline-flex">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto thin-scrollbar pr-1">
            {items.map((it) => {
              const hasChildren = Array.isArray(it.children) && it.children.length > 0;
              const isParentActive = hasChildren
                ? it.children.some((child) => location.pathname.startsWith(child.to))
                : false;

              const isGroupOpen = Boolean(openNavGroups[it.key]) || isParentActive;

              if (hasChildren) {
                return (
                  <div key={it.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenNavGroups((prev) => ({
                          ...prev,
                          [it.key]: !prev[it.key],
                        }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                        "text-slate-700 hover:bg-dailyveg-50 hover:text-dailyveg-800",
                        "dark:text-slate-200 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300",
                        isParentActive &&
                        "bg-dailyveg-500 text-white shadow-brand hover:bg-dailyveg-600 hover:text-white dark:bg-dailyveg-700 dark:text-white dark:hover:bg-dailyveg-600 dark:hover:text-white"
                      )}
                    >
                      <it.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{it.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          isGroupOpen && "rotate-180"
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "ml-5 space-y-1 overflow-hidden border-l pl-3 pe-1 transition-all",
                        isGroupOpen
                          ? "max-h-96 py-1 border-dailyveg-300 opacity-100 dark:border-dailyveg-800"
                          : "max-h-0 border-transparent opacity-0"
                      )}
                    >
                      {it.children.map((child) => (
                        <NavLink
                          key={child.key}
                          to={child.to}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                              "text-slate-600 hover:bg-dailyveg-50 hover:text-dailyveg-800",
                              "dark:text-slate-300 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300",
                              isActive &&
                              "bg-dailyveg-50 text-dailyveg-800 ring-1 ring-dailyveg-200 dark:bg-dailyveg-950/70 dark:text-dailyveg-300 dark:ring-dailyveg-800"
                            )
                          }
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={it.key}
                  to={it.to}
                  end={it.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-dailyveg-50 hover:text-dailyveg-800 dark:text-slate-200 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300",
                      isActive &&
                      "bg-dailyveg-500 text-white shadow-brand hover:bg-dailyveg-600 dark:bg-dailyveg-700 dark:text-white dark:hover:bg-dailyveg-600 hover:text-white dark:hover:text-white"
                    )
                  }
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-3 shrink-0 border-t border-dailyveg-200/70 pt-3 dark:border-dailyveg-900/70">
            <div className="rounded-2xl border border-dailyveg-200/70 bg-dailyveg-50/70 p-3 text-xs text-slate-700 dark:border-dailyveg-900/70 dark:bg-dailyveg-950/50 dark:text-slate-300">
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
                  <DropdownMenuItem onClick={toggle}>
                    {dark ? "Switch to Light" : "Switch to Dark"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 w-full flex-1 p-4 lg:ms-72 lg:w-[calc(100%-18rem)] lg:p-8">
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
