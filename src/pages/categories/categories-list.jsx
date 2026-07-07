import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCategoriesOps, setCategoryActive } from "../../api/services/categories.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DataTable } from "../../components/common/data-table";
import { StatusBadge } from "../../components/common/status-badge";
import { ConfirmDialog } from "../../components/common/confirm-dialog";
import { useToast } from "../../components/toast/toast-context";
import { assetUrl } from "../../lib/utils";
import { useAuth } from "../../auth/auth-context";
import { CircleCheckBig, CircleDashed, Sparkles, Layers3 } from "lucide-react";

export function CategoriesListPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [confirm, setConfirm] = React.useState({ open: false, id: null, nextActive: true });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["categories", "ops"],
    queryFn: () => listCategoriesOps({ include_inactive: true }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, is_active }) => setCategoryActive(id, is_active),
    meta: {
      globalLoaderMessage: "Updating category status...",
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", "ops"] });
      toast.push({
        variant: "success",
        title: "Updated",
        description: "Category status updated.",
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

  const rows = data?.data?.categories || [];
  const totalCategories = rows.length;
  const activeCategories = rows.filter((item) => item.is_active).length;
  const inactiveCategories = totalCategories - activeCategories;

  const columns = React.useMemo(
    () => [
      {
        header: "Image",
        accessorKey: "image_url",
        cell: ({ row }) => (
          <div className="flex min-w-[44px] items-center">
            {row.original.image_url ? (
              <img
                src={assetUrl(row.original.image_url)}
                alt={row.original.name}
                className="h-10 w-10 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-900" />
            )}
          </div>
        ),
      },
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="max-w-[180px] truncate font-medium sm:max-w-none">
            {row.original.name}
          </div>
        ),
      },
      {
        header: "Slug",
        accessorKey: "slug",
        cell: ({ row }) => (
          <div className="max-w-[160px] truncate text-slate-500 sm:max-w-none">
            {row.original.slug || "—"}
          </div>
        ),
      },
      {
        header: "Sort",
        accessorKey: "sort_order",
        cell: ({ row }) => row.original.sort_order ?? "—",
      },
      {
        header: "Active",
        accessorKey: "is_active",
        cell: ({ row }) => (
          <StatusBadge value={row.original.is_active ? "active" : "inactive"} />
        ),
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => {
          const c = row.original;

          return (
            <div className="flex min-w-[220px] flex-wrap justify-end gap-2 sm:min-w-0">
              <Button className="min-w-[70px]" asChild variant="outline" size="sm">
                <Link to={`/categories/${c.id}`}>View</Link>
              </Button>

              {isAdmin ? (
                <>
                  <Button className="min-w-[70px]" asChild variant="outline" size="sm">
                    <Link to={`/categories/${c.id}/edit`}>Edit</Link>
                  </Button>

                  <Button
                    className="min-w-[78px]"
                    variant={c.is_active ? "outline" : "default"}
                    size="sm"
                    onClick={() =>
                      setConfirm({
                        open: true,
                        id: c.id,
                        nextActive: !c.is_active,
                      })
                    }
                  >
                    {c.is_active ? "Disable" : "Enable"}
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [isAdmin]
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Ops Categories module mapped to /v1/ops/categories/*"
        actions={
          isAdmin ? (
            <Button className="w-full sm:w-auto" asChild>
              <Link to="/categories/new">Create Category</Link>
            </Button>
          ) : null
        }
      />

      <Card className="overflow-hidden border border-dailyveg-200/70 bg-gradient-to-br from-white via-dailyveg-50/50 to-white shadow-[0_16px_45px_-24px_rgba(15,23,42,0.24)] dark:border-dailyveg-900/50 dark:from-slate-950 dark:via-dailyveg-950/30 dark:to-slate-950">
        <div className="border-b border-dailyveg-100/80 bg-gradient-to-r from-dailyveg-50/70 to-white p-4 sm:p-5 dark:border-dailyveg-900/50 dark:from-dailyveg-950/40 dark:to-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-dailyveg-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-dailyveg-700 dark:border-dailyveg-800 dark:bg-slate-900/70 dark:text-dailyveg-300">
                <Sparkles size={14} /> Catalog overview
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                Keep your category catalog polished and easy to manage
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Monitor visibility, ordering, and status from a cleaner workspace that feels more premium and structured.
              </p>
            </div>

            {isAdmin ? (
              <Button className="w-full sm:w-auto" asChild>
                <Link to="/categories/new">Create Category</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Layers3 size={16} className="text-dailyveg-600" /> Total categories
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalCategories}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <CircleCheckBig size={16} className="text-emerald-600" /> Active
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{activeCategories}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <CircleDashed size={16} className="text-amber-600" /> Inactive
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{inactiveCategories}</div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          Loading…
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error?.response?.data?.error?.message || error?.message || "Failed to load"}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_45px_-24px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-3 sm:p-4 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Category catalog</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Manage each category with a cleaner, more premium view.</div>
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {rows.length} categories available
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto thin-scrollbar p-3">
            <DataTable
              columns={columns}
              data={rows}
              searchPlaceholder="Search category…"
            />
          </div>
        </div>
      ) : null}

      {isAdmin ? (
        <ConfirmDialog
          open={confirm.open}
          onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
          title={confirm.nextActive ? "Enable category?" : "Disable category?"}
          description="This uses PATCH /v1/ops/categories/:id/toggle-active"
          confirmText={confirm.nextActive ? "Enable" : "Disable"}
          variant={confirm.nextActive ? "default" : "destructive"}
          onConfirm={() =>
            mutation.mutateAsync({
              id: confirm.id,
              is_active: confirm.nextActive,
            })
          }
        />
      ) : null}
    </div>
  );
}