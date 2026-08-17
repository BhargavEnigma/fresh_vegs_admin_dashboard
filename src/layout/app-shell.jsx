import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import {
  Menu,
  Moon,
  Sun,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  KeyRound,
} from "lucide-react";
import * as React from "react";
import Image from "../assets/logo-light-trans.png";
import ImageDark from "../assets/logo-dark-trans.png";

function useDarkMode() {
  const [dark, setDark] = React.useState(() =>
    document.documentElement.classList.contains("dark")
  );

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
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openNavGroups, setOpenNavGroups] = React.useState({});

  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    try {
      const value = localStorage.getItem("freshveg_sidebar_open");
      return value === null ? true : value === "true";
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    try {
      localStorage.setItem("freshveg_sidebar_open", String(sidebarOpen));
    } catch { }
  }, [sidebarOpen]);

  const items = NAV_ITEMS
    .map((item) => {
      if (!item.children) return item;

      const children = item.children.filter((child) =>
        child.roles.some((role) => roles.includes(role))
      );

      return {
        ...item,
        children,
      };
    })
    .filter(
      (item) =>
        item.roles.some((role) => roles.includes(role)) &&
        (!item.children || item.children.length)
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <button
          className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-900"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <img src={dark ? ImageDark : Image} alt="FreshVeg" className="h-9" />

        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex min-h-screen w-full min-w-0 overflow-x-clip">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/5 backdrop-blur-xl transition-[width,transform] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-black/40",
            sidebarOpen ? "w-72 p-4" : "w-24 p-3",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Toggle sidebar"
            className={cn(
              "absolute -right-4 top-8 z-[60] hidden h-8 w-8 rounded-full border-slate-200 bg-white shadow-md hover:bg-dailyveg-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-dailyveg-950 lg:inline-flex"
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div
            className={cn(
              "flex items-center",
              sidebarOpen ? "justify-between gap-3" : "flex-col gap-3"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center",
                sidebarOpen ? "gap-3" : "justify-center"
              )}
            >
              {/* <div
                  className={cn(
                      "flex shrink-0 items-center justify-center rounded-3xl bg-dailyveg-50 ring-1 ring-dailyveg-200 dark:bg-dailyveg-950/70 dark:ring-dailyveg-800",
                      sidebarOpen ? "h-16 w-16" : "h-16 w-16"
                  )}
              > */}
              {/* <img
                src={dark ? ImageDark : Image}
                alt="FreshVeg"
                className={sidebarOpen ? "h-11 max-w-14 object-contain" : "h-11 w-11 object-contain"}
                className={"h-11 w-41 object-contain"}
              /> */}
              {/* </div> */}

              {!sidebarOpen ? (
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-3xl bg-dailyveg-50 ring-1 ring-dailyveg-200 dark:bg-dailyveg-950/70 dark:ring-dailyveg-800",
                    sidebarOpen ? "h-16 w-16" : "h-16 w-16"
                  )}
                >
                  <img
                    src={dark ? ImageDark : Image}
                    alt="FreshVeg"
                    className={sidebarOpen ? "h-11 max-w-14 object-contain" : "h-11 w-11 object-contain"}
                  // className={"h-11 w-41 object-contain"}
                  />
                </div>
              ) :
                <img
                  src={dark ? ImageDark : Image}
                  alt="FreshVeg"
                  className={"h-11 w-40 object-contain"}
                // className={"h-11 w-41 object-contain"}
                />
              }
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
              className={cn(
                "rounded-2xl",
                sidebarOpen ? "h-10 w-10" : "h-11 w-11 bg-slate-100 dark:bg-slate-900"
              )}
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>

          <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 thin-scrollbar">
            {items.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;

              const isParentActive = hasChildren
                ? item.children.some((child) => location.pathname.startsWith(child.to))
                : false;

              const isGroupOpen = Boolean(openNavGroups[item.key]) || isParentActive;

              if (hasChildren) {
                return (
                  <div key={item.key} className="">
                    <button
                      type="button"
                      title={!sidebarOpen ? item.label : undefined}
                      onClick={() =>
                        setOpenNavGroups((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={cn(
                        "group flex w-full items-center rounded-2xl text-sm font-medium transition-all duration-200",
                        sidebarOpen
                          ? "gap-3 px-3 py-2.5"
                          : "h-14 justify-center px-0",
                        isParentActive
                          ? "bg-dailyveg-500 text-white shadow-brand hover:bg-dailyveg-600 dark:bg-dailyveg-700 dark:hover:bg-dailyveg-600"
                          : "text-slate-700 hover:bg-dailyveg-50 hover:text-dailyveg-800 dark:text-slate-200 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300"
                      )}
                    >
                      <item.icon className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-6 w-6")} />

                      {sidebarOpen ? (
                        <>
                          <span className="flex-1 truncate text-left">{item.label}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform",
                              isGroupOpen && "rotate-180"
                            )}
                          />
                        </>
                      ) : null}
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        isGroupOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                        sidebarOpen
                          ? "ml-5 space-y-1 border-l border-dailyveg-300 py-1 pl-3 pr-1 dark:border-dailyveg-800"
                          : "py-1 mt-1 space-y-1"
                      )}
                    >
                      {item.children.map((child) => (
                        <NavLink
                          key={child.key}
                          to={child.to}
                          end
                          title={!sidebarOpen ? child.label : undefined}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center rounded-xl text-sm font-medium transition-colors",
                              sidebarOpen
                                ? "gap-3 px-3 py-2"
                                : "mx-auto h-11 w-11 justify-center",
                              isActive
                                ? "bg-dailyveg-50 text-dailyveg-800 ring-1 ring-dailyveg-200 dark:bg-dailyveg-950/70 dark:text-dailyveg-300 dark:ring-dailyveg-800"
                                : "text-slate-600 hover:bg-dailyveg-50 hover:text-dailyveg-800 dark:text-slate-300 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300"
                            )
                          }
                        >
                          <child.icon className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
                          {sidebarOpen ? <span className="truncate">{child.label}</span> : null}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.to === "/"}
                  title={!sidebarOpen ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center rounded-2xl text-sm font-medium transition-all duration-200",
                      sidebarOpen
                        ? "gap-3 px-3 py-2.5"
                        : "h-14 justify-center px-0",
                      isActive
                        ? "bg-dailyveg-500 text-white shadow-brand hover:bg-dailyveg-600 dark:bg-dailyveg-700 dark:hover:bg-dailyveg-600"
                        : "text-slate-700 hover:bg-dailyveg-50 hover:text-dailyveg-800 dark:text-slate-200 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300"
                    )
                  }
                >
                  <item.icon className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-6 w-6")} />
                  {sidebarOpen ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-4 shrink-0 border-t border-slate-200/80 pt-4 dark:border-slate-800">
            {sidebarOpen ? (
              <div className="rounded-3xl border border-dailyveg-200/80 bg-gradient-to-br from-dailyveg-50 to-white p-3 shadow-sm dark:border-dailyveg-900/80 dark:from-dailyveg-950/50 dark:to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-dailyveg-500 text-white shadow-brand">
                    <User className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {user?.full_name || user?.phone || "User"}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {roles.join(", ") || "No role"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div
                  title={user?.full_name || user?.phone || "User"}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dailyveg-500 text-white shadow-brand"
                >
                  <User className="h-6 w-6" />
                </div>
              </div>
            )}

            <div className="mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full rounded-2xl",
                      sidebarOpen ? "justify-between" : "h-12 justify-center px-0"
                    )}
                  >
                    {sidebarOpen ? (
                      <>
                        Account
                        <span className="text-xs text-slate-500">•••</span>
                      </>
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuItem onSelect={() => navigate("/account/security")}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggle}>
                    {dark ? (
                      <>
                        <Sun className="mr-2 h-4 w-4" />
                        Switch to Light
                      </>
                    ) : (
                      <>
                        <Moon className="mr-2 h-4 w-4" />
                        Switch to Dark
                      </>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        <main
          className={cn(
            "w-0 min-w-0 max-w-full flex-1 overflow-x-clip p-4 transition-[margin,width] duration-300 lg:p-8",
            sidebarOpen
              ? "lg:ms-72"
              : "lg:ms-24"
          )}
        >
          <div className="w-full min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </div>
  );
}
