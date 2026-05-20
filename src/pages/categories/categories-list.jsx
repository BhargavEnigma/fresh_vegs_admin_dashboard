import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCategoriesOps, setCategoryActive } from "../../api/services/categories.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { DataTable } from "../../components/common/data-table";
import { StatusBadge } from "../../components/common/status-badge";
import { ConfirmDialog } from "../../components/common/confirm-dialog";
import { useToast } from "../../components/toast/toast-context";
import { assetUrl } from "../../lib/utils";
import { useAuth } from "../../auth/auth-context";

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

  const columns = React.useMemo(
    () => [
      {
        header: "Image",
        accessorKey: "image_url",
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.image_url ? (
              <img
                src={assetUrl(row.original.image_url)}
                alt={row.original.name}
                className="h-10 w-10 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-900" />
            )}
          </div>
        ),
      },
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      },
      {
        header: "Slug",
        accessorKey: "slug",
        cell: ({ row }) => <div className="text-slate-500">{row.original.slug || "—"}</div>,
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
            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/categories/${c.id}`}>View</Link>
              </Button>

              {isAdmin ? (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/categories/${c.id}/edit`}>Edit</Link>
                  </Button>

                  <Button
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
    <div>
      <PageHeader
        title="Categories"
        subtitle="Ops Categories module mapped to /v1/ops/categories/*"
        actions={
          isAdmin ? (
            <Button asChild>
              <Link to="/categories/new">Create Category</Link>
            </Button>
          ) : null
        }
      />

      {isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
          {error?.response?.data?.error?.message || error?.message || "Failed to load"}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Search category…"
        />
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