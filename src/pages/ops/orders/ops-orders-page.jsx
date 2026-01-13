import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { OpsOrdersService } from "../../../api/services/ops-orders.service";
import { opsOrdersFilterSchema, opsOrderUpdateStatusSchema } from "../../../validations/ops-orders";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { StatusBadge } from "../../../components/common/status-badge";
import { useToast } from "../../../components/toast/toast-context";

function money(paise) {
    const n = Number(paise || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "INR" });
}

function Filters({ value, onChange }) {
    const form = useForm({ resolver: zodResolver(opsOrdersFilterSchema), defaultValues: value });

    const submit = (v) => onChange(v);

    return (
        <form onSubmit={form.handleSubmit(submit)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="grid gap-1">
                    <Label>Status</Label>
                    <Input placeholder="placed / locked / packed..." {...form.register("status")} />
                </div>
                <div className="grid gap-1">
                    <Label>Warehouse ID</Label>
                    <Input placeholder="uuid" {...form.register("warehouse_id")} />
                </div>
                <div className="grid gap-1">
                    <Label>Delivery Date</Label>
                    <Input placeholder="YYYY-MM-DD" {...form.register("delivery_date")} />
                </div>
                <div className="grid gap-1">
                    <Label>Search (Order ID prefix)</Label>
                    <Input placeholder="type id prefix" {...form.register("q")} />
                </div>
                <div className="grid gap-1">
                    <Label>Page Size</Label>
                    <Input type="number" min={1} max={100} {...form.register("limit")} />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                        const reset = { page: 1, limit: 20, status: "", warehouse_id: "", delivery_date: "", q: "" };
                        form.reset(reset);
                        onChange(reset);
                    }}
                >
                    Reset
                </Button>
                <Button type="submit">Apply</Button>
            </div>
        </form>
    );
}

function UpdateStatusDialog({ order, open, onOpenChange, onSubmit, isSubmitting }) {
    const form = useForm({
        resolver: zodResolver(opsOrderUpdateStatusSchema),
        defaultValues: { to_status: order?.status || "placed", note: "" },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Order Status</DialogTitle>
                </DialogHeader>

                <div className="text-sm text-slate-600 dark:text-slate-300">
                    <p><span className="font-medium">Order</span>: {order?.order_number || order?.id}</p>
                    <p><span className="font-medium">Current</span>: {order?.status}</p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 grid gap-4">
                    <div className="grid gap-2">
                        <Label>To Status</Label>
                        <Input placeholder="locked" {...form.register("to_status")} />
                        {form.formState.errors.to_status ? (
                            <p className="text-sm text-red-600">{form.formState.errors.to_status.message}</p>
                        ) : null}
                        <p className="text-xs text-slate-500">Allowed transitions are enforced by backend.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Note (optional)</Label>
                        <Input placeholder="Packed by team A" {...form.register("note")} />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Updating..." : "Update"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function OpsOrdersPage() {
    const toast = useToast();
    const qc = useQueryClient();
    const [filters, setFilters] = useState({ page: 1, limit: 20, status: "", warehouse_id: "", delivery_date: "", q: "" });
    const [selected, setSelected] = useState(null);

    const query = useQuery({
        queryKey: ["opsOrders", filters],
        queryFn: () => OpsOrdersService.list(filters),
        keepPreviousData: true,
    });

    const updateMut = useMutation({
        mutationFn: ({ orderId, payload }) => OpsOrdersService.updateStatus(orderId, payload),
        onSuccess: () => {
            toast.success("Order updated");
            setSelected(null);
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
        },
        onError: (e) => toast.error(e?.message || "Failed to update"),
    });

    const rows = query.data?.orders || [];
    const page = query.data?.page || filters.page;
    const total = query.data?.total || 0;
    const limit = query.data?.limit || filters.limit;

    const columns = useMemo(
        () => [
            {
                id: "order",
                header: "Order",
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.order_number}</div>
                        <div className="text-xs text-slate-500">{row.original.id}</div>
                    </div>
                ),
            },
            {
                id: "customer",
                header: "Customer",
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.user?.full_name || "—"}</div>
                        <div className="text-xs text-slate-500">{row.original.user?.phone || "—"}</div>
                    </div>
                ),
            },
            { accessorKey: "delivery_date", header: "Delivery" },
            {
                id: "warehouse",
                header: "Warehouse",
                cell: ({ row }) => row.original.warehouse?.name || "—",
            },
            {
                id: "total",
                header: "Total",
                cell: ({ row }) => <span className="font-medium">{money(row.original.total_paise)}</span>,
            },
            {
                id: "status",
                header: "Status",
                cell: ({ row }) => <StatusBadge value={row.original.status} />,
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex items-center justify-end">
                        <Button variant="secondary" onClick={() => setSelected(row.original)}>Update Status</Button>
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <div className="">
            <PageHeader title="Orders (Ops)" subtitle="Warehouse operations orders list and status updates." />

            <Filters value={filters} onChange={(v) => setFilters({ ...filters, ...v, page: 1 })} />

            <div className="mt-6">
                <Card className="p-4">
                    <DataTable
                        columns={columns}
                        data={rows}
                        isLoading={query.isLoading}
                        emptyTitle="No orders"
                        emptyDescription="Try changing filters (status/date/warehouse)."
                    />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-500">
                            Page {page} · Showing {rows.length} of {total}
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                disabled={page <= 1 || query.isLoading}
                                onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, Number(p.page || 1) - 1) }))}
                            >
                                Prev
                            </Button>
                            <Button
                                variant="secondary"
                                disabled={rows.length < limit || query.isLoading}
                                onClick={() => setFilters((p) => ({ ...p, page: Number(p.page || 1) + 1 }))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <UpdateStatusDialog
                order={selected}
                open={!!selected}
                onOpenChange={(v) => (!v ? setSelected(null) : null)}
                isSubmitting={updateMut.isPending}
                onSubmit={(values) => updateMut.mutate({ orderId: selected.id, payload: values })}
            />
        </div>
    );
}