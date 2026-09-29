import * as React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { formatIndianDateTime } from "../../utils/date-formatter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategoryById, setCategoryActive } from "../../api/services/categories.service";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/common/status-badge";
import { ConfirmDialog } from "../../components/common/confirm-dialog";
import { ImageSizeInfo } from "../../components/common/image-size-info";
import { useToast } from "../../components/toast/toast-context";
import { assetUrl } from "../../lib/utils";
import { useAuth } from "../../auth/auth-context";
import {
  ChevronLeft,
  Pencil,
  Power,
  Package,
  Copy,
  Check,
  ExternalLink,
  Layers3,
  Sparkles,
  Calendar,
  Hash,
  Tag,
  ArrowRight,
  Info,
} from "lucide-react";

export function CategoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [copiedKey, setCopiedKey] = React.useState(null);
  const [confirmToggle, setConfirmToggle] = React.useState({ open: false, nextActive: true });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["category", id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });

  const c = data?.data?.category;

  const toggleMutation = useMutation({
    mutationFn: ({ is_active }) => setCategoryActive(id, is_active),
    meta: {
      globalLoaderMessage: "Updating category status...",
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["category", id] });
      qc.invalidateQueries({ queryKey: ["categories", "ops"] });
      toast.push({
        variant: "success",
        title: variables.is_active ? "Category Activated" : "Category Deactivated",
        description: `Status changed to ${variables.is_active ? "active" : "inactive"}.`,
      });
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed";
      toast.push({
        variant: "error",
        title: "Status update failed",
        description: msg,
      });
    },
  });

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.push({
      variant: "success",
      title: "Copied to clipboard",
      description: text,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6 pb-12">
      {/* Back button & Page Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/categories")}
          className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>All Categories</span>
        </Button>
      </div>

      <PageHeader
        title={c?.name || "Category Detail"}
        subtitle={c?.slug ? `Catalog path: /categories/${c.slug}` : `Category ID: ${id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to={`/products?category_id=${id}`} className="flex items-center justify-center gap-1.5">
                <Package className="h-4 w-4 text-dailyveg-600" />
                <span>View Products</span>
              </Link>
            </Button>

            {isAdmin && c && (
              <>
                <Button asChild className="flex-1 sm:flex-none shadow-sm shadow-dailyveg-500/20">
                  <Link to={`/categories/${c.id}/edit`} className="flex items-center justify-center gap-1.5">
                    <Pencil className="h-4 w-4" />
                    <span>Edit Category</span>
                  </Link>
                </Button>

                <Button
                  variant={c.is_active ? "redoutline" : "outline"}
                  onClick={() => setConfirmToggle({ open: true, nextActive: !c.is_active })}
                  className="flex-1 sm:flex-none"
                >
                  <Power className="mr-1.5 h-4 w-4" />
                  <span>{c.is_active ? "Disable" : "Enable"}</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
            <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          </div>
        </div>
      ) : null}

      {/* Error State */}
      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          <div className="font-bold text-base mb-1">Failed to load category details</div>
          <p>{error?.response?.data?.error?.message || error?.message || "Please check your network and try again."}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 bg-white dark:bg-slate-900">
            Retry
          </Button>
        </div>
      ) : null}

      {/* Main Content */}
      {c && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column: Visual Asset & Quick Summary (1 col on desktop) */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-1">
            {/* Category Image Card */}
            <Card className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-100 bg-gradient-to-r from-dailyveg-50/50 to-white px-4 py-3 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Category Thumbnail
                </span>
                <StatusBadge value={c.is_active ? "active" : "inactive"} />
              </div>

              <div className="p-4 sm:p-5">
                {c.image_url ? (
                  <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-inner">
                    <img
                      src={assetUrl(c.image_url)}
                      alt={c.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <ImageSizeInfo src={assetUrl(c.image_url)} />

                    <a
                      href={assetUrl(c.image_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-md backdrop-blur-xs transition hover:bg-white dark:bg-slate-900/90 dark:text-slate-200"
                      title="Open full size image"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-dailyveg-200 bg-dailyveg-50/50 p-6 text-center dark:border-dailyveg-900/60 dark:bg-dailyveg-950/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-dailyveg-600 shadow-sm dark:bg-slate-900 dark:text-dailyveg-400">
                      <Layers3 className="h-6 w-6" />
                    </div>
                    <span className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No Image Uploaded</span>
                    <span className="mt-1 text-xs text-slate-500">An image makes this category stand out in the customer mobile app.</span>

                    {isAdmin && (
                      <Button asChild size="sm" variant="outline" className="mt-4 rounded-xl text-xs">
                        <Link to={`/categories/${c.id}/edit`}>Upload Image</Link>
                      </Button>
                    )}
                  </div>
                )}

                {/* Quick Rank Badge */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 text-xs">
                  <span className="font-semibold text-slate-500">Catalog Priority Rank</span>
                  <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    Sort Order: #{c.sort_order ?? 0}
                  </span>
                </div>
              </div>
            </Card>

            {/* Direct Inventory Jump Card */}
            <Card className="rounded-2xl sm:rounded-3xl border border-dailyveg-200/80 bg-gradient-to-br from-white via-dailyveg-50/30 to-emerald-50/20 p-4 sm:p-5 shadow-sm dark:border-dailyveg-900/40 dark:from-slate-950 dark:to-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dailyveg-500 text-white shadow-sm">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Category Inventory
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    Browse and manage all product listings assigned to <span className="font-semibold text-slate-900 dark:text-white">"{c.name}"</span>.
                  </p>
                </div>
              </div>

              <Button asChild className="mt-4 w-full rounded-xl bg-dailyveg-500 text-white hover:bg-dailyveg-600 shadow-sm shadow-dailyveg-500/20">
                <Link to={`/products?category_id=${c.id}`} className="flex items-center justify-center gap-2">
                  <span>Browse Products</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          </div>

          {/* Right Column: Detailed Specs & Metadata (2 cols on desktop) */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            {/* Category Specifications */}
            <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Category Information
                  </h3>
                  <p className="text-xs text-slate-500">Core parameters and identifiers</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-dailyveg-600" />
                </div>
              </div>

              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Category Name */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-900 dark:bg-slate-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Tag className="h-3.5 w-3.5 text-dailyveg-600" /> Category Name
                    </div>
                    <div className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </div>
                  </div>

                  {/* Slug */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-900 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Hash className="h-3.5 w-3.5 text-dailyveg-600" /> Slug / URL Path
                      </div>
                      {c.slug && (
                        <button
                          type="button"
                          onClick={() => handleCopy(c.slug, "slug")}
                          className="flex items-center gap-1 text-[11px] font-semibold text-dailyveg-600 hover:text-dailyveg-700 dark:text-dailyveg-400"
                        >
                          {copiedKey === "slug" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {c.slug ? `/${c.slug}` : "—"}
                    </div>
                  </div>

                  {/* Category UUID */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-900 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">Unique Identifier (ID)</div>
                      <button
                        type="button"
                        onClick={() => handleCopy(c.id, "id")}
                        className="flex items-center gap-1 text-[11px] font-semibold text-dailyveg-600 hover:text-dailyveg-700 dark:text-dailyveg-400"
                      >
                        {copiedKey === "id" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-1.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-300 break-all select-all">
                      {c.id}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-900 dark:bg-slate-900/40">
                    <div className="text-xs font-semibold text-slate-500">Catalog Visibility Status</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <StatusBadge value={c.is_active ? "active" : "inactive"} />
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmToggle({ open: true, nextActive: !c.is_active })}
                          className="h-7 px-2 text-xs font-semibold text-dailyveg-600 hover:text-dailyveg-700 dark:text-dailyveg-400"
                        >
                          Change status
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Created At */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-900 dark:bg-slate-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-dailyveg-600" /> Created At
                    </div>
                    <div className="mt-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formatIndianDateTime(c.created_at)}
                    </div>
                  </div>

                  {/* Updated At */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-900 dark:bg-slate-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-dailyveg-600" /> Last Updated
                    </div>
                    <div className="mt-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      {c.updated_at ? formatIndianDateTime(c.updated_at) : "—"}
                    </div>
                  </div>
                </div>

                {/* Information helper note */}
                <div className="rounded-2xl border border-dailyveg-100 bg-dailyveg-50/40 p-4 dark:border-dailyveg-900/50 dark:bg-dailyveg-950/20 flex items-start gap-3">
                  <Info className="h-5 w-5 text-dailyveg-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Customer Catalog Behavior: </span>
                    Categories configured as <span className="font-semibold text-emerald-700 dark:text-emerald-400">Active</span> with lower sort orders appear first in customer search filters and app carousels.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {isAdmin && c && (
        <ConfirmDialog
          open={confirmToggle.open}
          onOpenChange={(open) => setConfirmToggle((prev) => ({ ...prev, open }))}
          title={confirmToggle.nextActive ? `Enable "${c.name}"?` : `Disable "${c.name}"?`}
          description={
            confirmToggle.nextActive
              ? "Enabling will show this category and its products in the customer mobile catalog."
              : "Disabling will hide this category from the customer mobile catalog immediately."
          }
          confirmText={confirmToggle.nextActive ? "Enable Category" : "Disable Category"}
          variant={confirmToggle.nextActive ? "default" : "destructive"}
          onConfirm={() =>
            toggleMutation.mutateAsync({
              is_active: confirmToggle.nextActive,
            })
          }
        />
      )}
    </div>
  );
}