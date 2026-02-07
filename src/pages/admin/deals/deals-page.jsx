import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminDealsService } from "../../../api/services/admin-deals.service";
import { PageHeader } from "../../../components/common/page-header";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { DataTable } from "../../../components/common/data-table";
import { StatusBadge } from "../../../components/common/status-badge";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { useToast } from "../../../components/toast/toast-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

import { DealForm } from "./deal-form";
import { DealItemsDialog } from "./deal-items-dialog";

function formatDateOnly(value) {
    if (!value) return "—";
    return String(value);
}

function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
}

export function AdminDealsPage() {
    const qc = useQueryClient();
    const toast = useToast();

    const [filters, setFilters] = React.useState({
        from: "",
        to: "",
        active: "",
    });

    const [createOpen, setCreateOpen] = React.useState(false);
    const [edit, setEdit] = React.useState({ open: false, deal: null });
    const [itemsDlg, setItemsDlg] = React.useState({ open: false, deal: null });

    const [confirm, setConfirm] = React.useState({ open: false, deal: null });

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin-deals", filters],
        queryFn: () =>
            AdminDealsService.list({
                from: filters.from || undefined,
                to: filters.to || undefined,
                active: filters.active === "" ? undefined : filters.active,
            }),
    });

    const rows = data?.data?.deals || [];

    const createMut = useMutation({
        mutationFn: (payload) => AdminDealsService.create(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Created", description: "Deal created." });
            setCreateOpen(false);
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Create failed", description: msg });
        },
    });

    const updateMut = useMutation({
        mutationFn: ({ dealId, payload }) => AdminDealsService.update(dealId, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Saved", description: "Deal updated." });
            setEdit({ open: false, deal: null });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Update failed", description: msg });
        },
    });

    const deleteMut = useMutation({
        mutationFn: ({ dealId }) => AdminDealsService.remove(dealId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Deleted", description: "Deal deleted." });
            setConfirm({ open: false, deal: null });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Delete failed", description: msg });
        },
    });

    const columns = React.useMemo(
        () => [
            {
                header: "Date",
                accessorKey: "deal_date",
                cell: ({ row }) => <span className="text-sm font-medium">{formatDateOnly(row.original.deal_date)}</span>,
            },
            {
                header: "Name",
                id: "name",
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.name || "Deals of the Day"}</div>
                        <div className="text-xs text-slate-500">{row.original.description || "—"}</div>
                    </div>
                ),
            },
            {
                header: "Window",
                id: "window",
                cell: ({ row }) => (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                        <div>Start: {formatDateTime(row.original.starts_at)}</div>
                        <div>End: {formatDateTime(row.original.ends_at)}</div>
                    </div>
                ),
            },
            {
                header: "Priority",
                accessorKey: "priority",
                cell: ({ row }) => <span className="text-sm">{row.original.priority ?? 0}</span>,
            },
            {
                header: "Active",
                accessorKey: "is_active",
                cell: ({ row }) => <StatusBadge value={row.original.is_active ? "active" : "inactive"} />,
            },
            {
                header: "",
                id: "actions",
                cell: ({ row }) => {
                    const d = row.original;
                    
                    return (
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setItemsDlg({ open: true, deal: d })}>
                                Items
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEdit({ open: true, deal: d })}>
                                Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setConfirm({ open: true, deal: d })}>
                                Delete
                            </Button>
                        </div>
                    );
                },
            },
        ],
        []
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Deals"
                subtitle="Manage Deals of the Day (pack-based pricing rules)."
                actions={
                    <Button onClick={() => setCreateOpen(true)} disabled={createMut.isPending}>
                        + Create Deal
                    </Button>
                }
            />

            <Card className="p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                        <div className="mb-1 text-xs text-slate-500">From (YYYY-MM-DD)</div>
                        <Input
                            type="date"
                            value={filters.from ?? ""}
                            onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))}
                            placeholder="2026-01-28"
                        />
                    </div>
                    <div>
                        <div className="mb-1 text-xs text-slate-500">To (YYYY-MM-DD)</div>
                        <Input
                            type="date"
                            value={filters.to ?? ""}
                            onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))}
                            placeholder="2026-01-31"
                        />
                    </div>
                    <div>
                        <div className="mb-1 text-xs text-slate-500">Active</div>
                        <select
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                            value={filters.active}
                            onChange={(e) => setFilters((s) => ({ ...s, active: e.target.value }))}
                        >
                            <option value="">All</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                </div>

                {isError ? (
                    <div className="mt-4 text-sm text-red-600">Failed to load: {error?.message || "Error"}</div>
                ) : null}
            </Card>

            <DataTable
                columns={columns}
                data={rows}
                searchPlaceholder="Search deals…"
                initialPageSize={10}
                toolbarRight={
                    <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["admin-deals"] })}>
                        Refresh
                    </Button>
                }
            />

            {/* Create */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Deal</DialogTitle>
                    </DialogHeader>
                    <DealForm
                        mode="create"
                        isSubmitting={createMut.isPending}
                        defaultValues={{
                            name: "Deals of the Day",
                            description: "",
                            deal_date: "",
                            starts_at: "",
                            ends_at: "",
                            is_active: true,
                            priority: 0,
                        }}
                        onSubmit={(values) => createMut.mutate(values)}
                        onCancel={() => setCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit */}
            <Dialog open={edit.open} onOpenChange={(open) => setEdit((s) => ({ ...s, open }))}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Deal</DialogTitle>
                    </DialogHeader>
                    <DealForm
                        mode="edit"
                        isSubmitting={updateMut.isPending}
                        defaultValues={{
                            name: edit.deal?.name || "Deals of the Day",
                            description: edit.deal?.description || "",
                            deal_date: edit.deal?.deal_date || "",
                            starts_at: edit.deal?.starts_at || "",
                            ends_at: edit.deal?.ends_at || "",
                            is_active: Boolean(edit.deal?.is_active),
                            priority: edit.deal?.priority ?? 0,
                        }}
                        onSubmit={(values) => updateMut.mutate({ dealId: edit.deal.id, payload: values })}
                        onCancel={() => setEdit({ open: false, deal: null })}
                    />
                </DialogContent>
            </Dialog>

            {/* Items */}
            <DealItemsDialog
                open={itemsDlg.open}
                deal={itemsDlg.deal}
                onOpenChange={(open) => {
                    if (!open) setItemsDlg({ open: false, deal: null });
                    else setItemsDlg((s) => ({ ...s, open: true }));
                }}
                onClose={() => setItemsDlg({ open: false, deal: null })}
            />

            {/* Delete confirm */}
            <ConfirmDialog
                open={confirm.open}
                title="Delete deal?"
                description={`This will delete the deal for ${confirm.deal?.deal_date || "—"} and all its items.`}
                confirmText="Delete"
                confirmVariant="destructive"
                onConfirm={() => deleteMut.mutate({ dealId: confirm.deal.id })}
                onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}
                isLoading={deleteMut.isPending}
            />
        </div>
    );
}
