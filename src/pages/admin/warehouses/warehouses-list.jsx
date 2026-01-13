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
            { accessorKey: "name", header: "Name" },
            { accessorKey: "city", header: "City" },
            { accessorKey: "state", header: "State" },
            { accessorKey: "pincode", header: "Pincode" },
            {
                id: "active",
                header: "Active",
                cell: ({ row }) => <StatusBadge value={row.original.is_active ? "Active" : "Inactive"} />,
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="secondary">
                            <Link to={`/admin/warehouses/${row.original.id}`}>View</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link to={`/admin/warehouses/${row.original.id}/edit`}>Edit</Link>
                        </Button>
                        {row.original.is_active ? (
                            <Button variant="destructive" onClick={() => setToDeactivate(row.original)}>
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
        <div className="">
            <PageHeader
                title="Warehouses"
                subtitle="Create and manage your warehouse locations."
                actions={(
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => setIncludeInactive((v) => !v)}>
                            {includeInactive ? "Hide Inactive" : "Show Inactive"}
                        </Button>
                        <Button asChild>
                            <Link to="/admin/warehouses/new">New Warehouse</Link>
                        </Button>
                    </div>
                )}
            />

            <Card className="p-4">
                <DataTable
                    columns={columns}
                    data={query.data || []}
                    isLoading={query.isLoading}
                    emptyTitle="No warehouses"
                    emptyDescription="Create a warehouse to start fulfilling orders."
                />
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
