import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { WarehousesService } from "../../../api/services/warehouses.service";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { StatusBadge } from "../../../components/common/status-badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useToast } from "../../../components/toast/toast-context";

export function WarehousesListPage() {
    const toast = useToast();
    const qc = useQueryClient();
    const [includeInactive, setIncludeInactive] = useState(false);
    const [toDeactivate, setToDeactivate] = useState(null);

    const query = useQuery({
        queryKey: ["warehouses", { includeInactive }],
        queryFn: () => WarehousesService.list({ includeInactive }),
    });

    const warehouses = query.data || [];

    const deactivateMut = useMutation({
        mutationFn: (id) => WarehousesService.deactivate(id),
        onSuccess: () => {
            toast.success("Warehouse deactivated");
            setToDeactivate(null);
            qc.invalidateQueries({ queryKey: ["warehouses"] });
        },
        onError: (e) => toast.error(e?.message || "Failed to deactivate"),
    });

    const columns = useMemo(
        () => [
            {
                id: "name",
                header: "Name",
                cell: ({ row }) => (
                    <div className="min-w-[180px]">
                        <div className="font-medium">{row.original.name}</div>
                        <div className="text-xs text-slate-500">{row.original.id}</div>
                    </div>
                ),
            },
            { accessorKey: "city", header: "City" },
            { accessorKey: "state", header: "State" },
            { accessorKey: "pincode", header: "Pincode" },
            {
                id: "active",
                header: "Active",
                cell: ({ row }) => (
                    <StatusBadge value={row.original.is_active ? "Active" : "Inactive"} />
                ),
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="secondary" size="sm">
                            <Link to={`/admin/warehouses/${row.original.id}`}>View</Link>
                        </Button>
                        <Button asChild variant="secondary" size="sm">
                            <Link to={`/admin/warehouses/${row.original.id}/edit`}>Edit</Link>
                        </Button>
                        {row.original.is_active ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setToDeactivate(row.original)}
                            >
                                Deactivate
                            </Button>
                        ) : null}
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <div className="space-y-4 px-0 sm:space-y-5">
            <PageHeader
                title="Warehouses"
                subtitle="Create and manage your warehouse locations."
                actions={(
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Button
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => setIncludeInactive((v) => !v)}
                        >
                            {includeInactive ? "Hide Inactive" : "Show Inactive"}
                        </Button>
                        <Button asChild className="w-full sm:w-auto">
                            <Link to="/admin/warehouses/new">New Warehouse</Link>
                        </Button>
                    </div>
                )}
            />

            {/* Mobile / small tablet card layout */}
            <div className="grid gap-3 md:hidden">
                {query.isLoading ? (
                    <Card className="p-4">
                        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </Card>
                ) : warehouses.length ? (
                    warehouses.map((warehouse) => (
                        <Card
                            key={warehouse.id}
                            className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                        >
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                                            {warehouse.name}
                                        </h3>
                                        <p className="mt-1 break-all text-xs text-slate-500">
                                            {warehouse.id}
                                        </p>
                                    </div>

                                    <StatusBadge value={warehouse.is_active ? "Active" : "Inactive"} />
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-900/60">
                                    <div>
                                        <p className="text-xs text-slate-500">City</p>
                                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                            {warehouse.city || "-"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500">State</p>
                                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                            {warehouse.state || "-"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500">Pincode</p>
                                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                            {warehouse.pincode || "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Button asChild variant="secondary" size="sm" className="w-full">
                                        <Link to={`/admin/warehouses/${warehouse.id}`}>View</Link>
                                    </Button>

                                    <Button asChild variant="secondary" size="sm" className="w-full">
                                        <Link to={`/admin/warehouses/${warehouse.id}/edit`}>Edit</Link>
                                    </Button>

                                    {warehouse.is_active ? (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="col-span-2 w-full"
                                            onClick={() => setToDeactivate(warehouse)}
                                        >
                                            Deactivate
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="p-6 text-center">
                        <h3 className="font-semibold text-slate-950 dark:text-slate-50">
                            No warehouses
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Create a warehouse to start fulfilling orders.
                        </p>
                    </Card>
                )}
            </div>

            {/* Desktop / rotated tablet table layout */}
            <Card className="hidden p-4 md:block">
                <div className="w-full overflow-x-auto">
                    <div className="min-w-[760px]">
                        <DataTable
                            columns={columns}
                            data={warehouses}
                            isLoading={query.isLoading}
                            emptyTitle="No warehouses"
                            emptyDescription="Create a warehouse to start fulfilling orders."
                        />
                    </div>
                </div>
            </Card>

            <ConfirmDialog
                open={!!toDeactivate}
                onOpenChange={(v) => (!v ? setToDeactivate(null) : null)}
                title="Deactivate warehouse?"
                description="This will mark the warehouse as inactive. It will not be used for new allocations."
                confirmText="Deactivate"
                confirmVariant="destructive"
                onConfirm={() => deactivateMut.mutate(toDeactivate.id)}
                isConfirming={deactivateMut.isPending}
            />
        </div>
    );
}