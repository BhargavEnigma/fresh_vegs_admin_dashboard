import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCategoriesOps, setCategoryActive } from "../../api/services/categories.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { StatusBadge } from "../../components/common/status-badge";
import { ConfirmDialog } from "../../components/common/confirm-dialog";
import { useToast } from "../../components/toast/toast-context";
import { assetUrl, cn } from "../../lib/utils";
import { useAuth } from "../../auth/auth-context";
import {
  CircleCheckBig,
  CircleDashed,
  Sparkles,
  Layers3,
  Search,
  X,
  Plus,
  LayoutGrid,
  Table2,
  Eye,
  Pencil,
  Power,
  Package,
  ArrowUpDown,
  ArrowRight,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";

const VIEW_MODES = {
  grid: "grid",
  table: "table",
};
const CATEGORIES_VIEW_MODE_KEY = "freshveg_admin_categories_view_mode";

function getSavedViewMode() {
  if (typeof window === "undefined") return VIEW_MODES.grid;
  try {
    const saved = window.localStorage.getItem(CATEGORIES_VIEW_MODE_KEY);
    return saved && Object.values(VIEW_MODES).includes(saved) ? saved : VIEW_MODES.grid;
  } catch {
    return VIEW_MODES.grid;
  }
}

export function CategoriesListPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [confirm, setConfirm] = React.useState({ open: false, id: null, categoryName: "", nextActive: true });
  const [viewMode, setViewMode] = React.useState(getSavedViewMode);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all"); // 'all' | 'active' | 'inactive'
  const [sortBy, setSortBy] = React.useState("sort_order_asc"); // 'sort_order_asc' | 'sort_order_desc' | 'name_asc' | 'name_desc'

  const updateViewMode = (mode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(CATEGORIES_VIEW_MODE_KEY, mode);
    } catch { }
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["categories", "ops"],
    queryFn: () => listCategoriesOps({ include_inactive: true }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, is_active }) => setCategoryActive(id, is_active),
    meta: {
      globalLoaderMessage: "Updating category status...",
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["categories", "ops"] });
      toast.push({
        variant: "success",
        title: variables.is_active ? "Category Activated" : "Category Deactivated",
        description: `Status successfully set to ${variables.is_active ? "active" : "inactive"}.`,
      });
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed";
      toast.push({
        variant: "error",
        title: "Update failed",
        description: msg,
      });
    },
  });

  const rawRows = data?.data?.categories || [];
  const totalCategories = rawRows.length;
  const activeCategories = rawRows.filter((item) => item.is_active).length;
  const inactiveCategories = totalCategories - activeCategories;

  // Filter and sort categories
  const filteredCategories = React.useMemo(() => {
    return rawRows
      .filter((category) => {
        // Status filter
        if (statusFilter === "active" && !category.is_active) return false;
        if (statusFilter === "inactive" && category.is_active) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = category.name?.toLowerCase().includes(q);
          const slugMatch = category.slug?.toLowerCase().includes(q);
          const idMatch = String(category.id).toLowerCase().includes(q);
          return nameMatch || slugMatch || idMatch;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "sort_order_asc") {
          return (a.sort_order ?? 999999) - (b.sort_order ?? 999999);
        }
        if (sortBy === "sort_order_desc") {
          return (b.sort_order ?? 999999) - (a.sort_order ?? 999999);
        }
        if (sortBy === "name_asc") {
          return (a.name || "").localeCompare(b.name || "");
        }
        if (sortBy === "name_desc") {
          return (b.name || "").localeCompare(a.name || "");
        }
        return 0;
      });
  }, [rawRows, statusFilter, searchQuery, sortBy]);

  const handleToggleConfirm = (c) => {
    setConfirm({
      open: true,
      id: c.id,
      categoryName: c.name,
      nextActive: !c.is_active,
    });
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Category Management"
        subtitle="Organize, order, and control catalog categories across the customer app"
        actions={
          isAdmin ? (
            <Button asChild className="w-full sm:w-auto shadow-sm shadow-dailyveg-500/20">
              <Link to="/categories/new" className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Create Category</span>
              </Link>
            </Button>
          ) : null
        }
      />

      {/* Premium Hero & Metric Cards */}
      <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-dailyveg-200/80 bg-gradient-to-br from-white via-dailyveg-50/40 to-emerald-50/20 p-4 sm:p-6 shadow-sm dark:border-dailyveg-900/50 dark:from-slate-950 dark:via-dailyveg-950/30 dark:to-slate-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-dailyveg-200 bg-white/90 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-dailyveg-700 shadow-2xs dark:border-dailyveg-800 dark:bg-slate-900 dark:text-dailyveg-300">
              <Sparkles className="h-3 w-3 text-dailyveg-500 animate-pulse" /> Catalog Overview
            </div>
            <h2 className="mt-2 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Catalog Category Overview
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Tap any metric card below to quickly filter your category collection.
            </p>
          </div>

          {isAdmin ? (
            <div className="hidden sm:block shrink-0">
              <Button asChild size="sm" variant="outline" className="rounded-xl border-dailyveg-300 bg-white/80 hover:bg-dailyveg-50 dark:border-dailyveg-800 dark:bg-slate-900">
                <Link to="/categories/new" className="flex items-center gap-1.5 text-dailyveg-700 dark:text-dailyveg-300 font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  New Category
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        {/* Quick Filter Metric Cards */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "group flex flex-col justify-between rounded-xl sm:rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-dailyveg-500/40",
              statusFilter === "all"
                ? "border-dailyveg-500 bg-white shadow-md ring-1 ring-dailyveg-500 dark:border-dailyveg-400 dark:bg-slate-900"
                : "border-slate-200/80 bg-white/75 hover:border-dailyveg-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Total</span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                <Layers3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {totalCategories}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "group flex flex-col justify-between rounded-xl sm:rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
              statusFilter === "active"
                ? "border-emerald-500 bg-white shadow-md ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-slate-900"
                : "border-slate-200/80 bg-white/75 hover:border-emerald-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                <CircleCheckBig className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {activeCategories}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "group flex flex-col justify-between rounded-xl sm:rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40",
              statusFilter === "inactive"
                ? "border-amber-500 bg-white shadow-md ring-1 ring-amber-500 dark:border-amber-400 dark:bg-slate-900"
                : "border-slate-200/80 bg-white/75 hover:border-amber-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400">Inactive</span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                <CircleDashed className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400">
              {inactiveCategories}
            </div>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Status Filter Tabs, Sort & View Switcher */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search category name, slug, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-dailyveg-500 shadow-2xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* Action Row: Sort Selector & View Toggle */}
          <div className="flex items-center gap-2">
            {/* Sort Selector */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 w-full sm:w-auto text-xs font-semibold rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 pl-3 pr-8 py-2 text-slate-700 dark:text-slate-200 focus:border-dailyveg-500 shadow-2xs"
              >
                <option value="sort_order_asc">Sort: Priority (Low to High)</option>
                <option value="sort_order_desc">Sort: Priority (High to Low)</option>
                <option value="name_asc">Sort: Name (A to Z)</option>
                <option value="name_desc">Sort: Name (Z to A)</option>
              </select>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-950 shrink-0">
              <button
                type="button"
                onClick={() => updateViewMode(VIEW_MODES.grid)}
                title="Grid / Card view"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  viewMode === VIEW_MODES.grid
                    ? "bg-dailyveg-500 text-white shadow-2xs dark:bg-dailyveg-600"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => updateViewMode(VIEW_MODES.table)}
                title="Table view"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  viewMode === VIEW_MODES.table
                    ? "bg-dailyveg-500 text-white shadow-2xs dark:bg-dailyveg-600"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                )}
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Status Chips (Mobile-scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all",
              statusFilter === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900"
            )}
          >
            All Categories ({totalCategories})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all",
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "border border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/60 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            )}
          >
            Active ({activeCategories})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all",
              statusFilter === "inactive"
                ? "bg-amber-600 text-white shadow-2xs"
                : "border border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-100/60 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
            )}
          >
            Inactive ({inactiveCategories})
          </button>

          {searchQuery && (
            <span className="shrink-0 text-xs font-medium text-slate-500 pl-2">
              Found {filteredCategories.length} matching "{searchQuery}"
            </span>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
              <div className="mt-4 h-9 rounded-lg bg-slate-100 dark:bg-slate-900" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          <div className="font-semibold text-base mb-1">Unable to load categories</div>
          <p>{error?.response?.data?.error?.message || error?.message || "Please check your network and try again."}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-3 bg-white dark:bg-slate-900">
            Retry Loading
          </Button>
        </div>
      ) : null}

      {/* Main Content Area */}
      {!isLoading && !isError && (
        <>
          {filteredCategories.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 sm:p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-dailyveg-50 text-dailyveg-600 dark:bg-dailyveg-950/60 dark:text-dailyveg-400">
                <Layers3 className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                No categories found
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? `No categories match your search "${searchQuery}". Try a different keyword or reset filters.`
                  : "No categories in this filter tab. Create your first category to get started."}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {searchQuery || statusFilter !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : null}

                {isAdmin && (
                  <Button asChild size="sm">
                    <Link to="/categories/new">
                      <Plus className="mr-1.5 h-4 w-4" /> Create Category
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* GRID / CARD VIEW (Optimized for Mobile & Touch Screen) */}
              {viewMode === VIEW_MODES.grid ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {filteredCategories.map((category) => (
                    <CategoryMobileCard
                      key={category.id}
                      category={category}
                      isAdmin={isAdmin}
                      onToggleActive={handleToggleConfirm}
                    />
                  ))}
                </div>
              ) : (
                /* TABLE VIEW (Enhanced for Tablet & Desktop) */
                <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Catalog Categories ({filteredCategories.length})
                    </span>
                    <span className="text-xs text-slate-400">
                      Click image or name to view details
                    </span>
                  </div>

                  <div className="overflow-x-auto thin-scrollbar">
                    <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-900 dark:bg-slate-900/60 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3.5">Category</th>
                          <th className="px-4 py-3.5">Slug</th>
                          <th className="px-4 py-3.5 text-center">Sort Order</th>
                          <th className="px-4 py-3.5 text-center">Status</th>
                          <th className="px-4 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {filteredCategories.map((c) => (
                          <tr
                            key={c.id}
                            className="group transition-colors hover:bg-dailyveg-50/40 dark:hover:bg-dailyveg-950/20"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {c.image_url ? (
                                  <img
                                    src={assetUrl(c.image_url)}
                                    alt={c.name}
                                    className="h-11 w-11 shrink-0 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-2xs transition-transform group-hover:scale-105"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-dailyveg-50 text-dailyveg-700 border border-dailyveg-200 dark:bg-dailyveg-950/50 dark:text-dailyveg-300 dark:border-dailyveg-900">
                                    <Layers3 className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <Link
                                    to={`/categories/${c.id}`}
                                    className="font-bold text-slate-900 hover:text-dailyveg-600 dark:text-slate-100 dark:hover:text-dailyveg-400 transition-colors"
                                  >
                                    {c.name}
                                  </Link>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <Link
                                      to={`/products?category_id=${c.id}`}
                                      className="inline-flex items-center gap-1 text-dailyveg-600 hover:underline dark:text-dailyveg-400 font-medium"
                                    >
                                      <Package className="h-3 w-3" /> Browse Products
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                              {c.slug ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-900">
                                  /{c.slug}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                #{c.sort_order ?? 0}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <StatusBadge value={c.is_active ? "active" : "inactive"} />
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                                  <Link to={`/categories/${c.id}`}>View</Link>
                                </Button>

                                {isAdmin && (
                                  <>
                                    <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                                      <Link to={`/categories/${c.id}/edit`}>Edit</Link>
                                    </Button>

                                    <Button
                                      variant={c.is_active ? "redoutline" : "outline"}
                                      size="sm"
                                      className="h-8 rounded-lg text-xs"
                                      onClick={() => handleToggleConfirm(c)}
                                    >
                                      {c.is_active ? "Disable" : "Enable"}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      {isAdmin && (
        <ConfirmDialog
          open={confirm.open}
          onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
          title={confirm.nextActive ? `Enable "${confirm.categoryName}"?` : `Disable "${confirm.categoryName}"?`}
          description={
            confirm.nextActive
              ? "Enabling this category will make it visible in the customer app catalog and allow items under it to be displayed."
              : "Disabling this category will hide it from the customer app catalog. Existing products will remain preserved."
          }
          confirmText={confirm.nextActive ? "Enable Category" : "Disable Category"}
          variant={confirm.nextActive ? "default" : "destructive"}
          onConfirm={() =>
            mutation.mutateAsync({
              id: confirm.id,
              is_active: confirm.nextActive,
            })
          }
        />
      )}
    </div>
  );
}

/**
 * Premium Mobile & Grid Category Card
 * Designed specifically for tactile smartphone screens with high-contrast actions
 */
function CategoryMobileCard({ category, isAdmin, onToggleActive }) {
  const isActive = Boolean(category.is_active);

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950",
        isActive
          ? "border-slate-200/90 hover:border-dailyveg-300 dark:border-slate-800 dark:hover:border-dailyveg-800"
          : "border-slate-200/60 bg-slate-50/40 opacity-80 hover:opacity-100 dark:border-slate-800/60 dark:bg-slate-950/40"
      )}
    >
      {/* Top Banner & Image Preview */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-dailyveg-50/60 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-dailyveg-950/30 dark:to-slate-900">
        {category.image_url ? (
          <img
            src={assetUrl(category.image_url)}
            alt={category.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-dailyveg-700/70 dark:text-dailyveg-400/70">
            <Layers3 className="h-8 w-8" />
            <span className="text-[11px] font-semibold tracking-wider uppercase">FreshVeg Category</span>
          </div>
        )}

        {/* Gradient Overlay for Top Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges: Status & Order Priority */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
          <StatusBadge
            value={isActive ? "active" : "inactive"}
            className="shadow-sm backdrop-blur-md bg-white/90 dark:bg-slate-900/90"
          />

          <span className="rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold text-white shadow-sm ring-1 ring-white/20">
            Rank #{category.sort_order ?? 0}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="min-w-0">
          <Link
            to={`/categories/${category.id}`}
            className="line-clamp-1 text-base font-extrabold text-slate-900 group-hover:text-dailyveg-600 dark:text-white dark:group-hover:text-dailyveg-400 transition-colors"
          >
            {category.name}
          </Link>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] rounded bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 truncate max-w-[160px]">
              /{category.slug || category.id}
            </span>
          </div>
        </div>

        {/* Quick Product Link Pill */}
        <Link
          to={`/products?category_id=${category.id}`}
          className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-dailyveg-50 hover:text-dailyveg-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-dailyveg-950/60 dark:hover:text-dailyveg-300 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-dailyveg-600" /> Browse Products
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Action Button Toolbar */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-900 grid grid-cols-3 gap-1.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 dark:bg-slate-950"
          >
            <Link to={`/categories/${category.id}`} className="flex items-center justify-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </Link>
          </Button>

          {isAdmin ? (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 dark:bg-slate-950"
              >
                <Link to={`/categories/${category.id}/edit`} className="flex items-center justify-center gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Link>
              </Button>

              <Button
                variant={isActive ? "redoutline" : "outline"}
                size="sm"
                onClick={() => onToggleActive(category)}
                className="h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                title={isActive ? "Disable category" : "Enable category"}
              >
                <Power className="h-3.5 w-3.5" />
                <span>{isActive ? "Disable" : "Enable"}</span>
              </Button>
            </>
          ) : (
            <div className="col-span-2" />
          )}
        </div>
      </div>
    </div>
  );
}