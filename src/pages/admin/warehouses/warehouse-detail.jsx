import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { WarehousesService } from "../../../api/services/warehouses.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { StatusBadge } from "../../../components/common/status-badge";

export function WarehouseDetailPage() {
    const { id } = useParams();

    const query = useQuery({
        queryKey: ["warehouse", id],
        queryFn: () => WarehousesService.getById(id),
        enabled: !!id,
    });

    const w = query.data;

    return (
        <div className="p-4 sm:p-6">
            <PageHeader
                title={w?.name || "Warehouse"}
                subtitle="Warehouse details"
                actions={(
                    <div className="flex items-center gap-2">
                        <Button asChild variant="secondary">
                            <Link to="/admin/warehouses">Back</Link>
                        </Button>
                        <Button asChild>
                            <Link to={`/admin/warehouses/${id}/edit`}>Edit</Link>
                        </Button>
                    </div>
                )}
            />

            <Card className="p-4">
                {query.isLoading ? (
                    <p className="text-sm text-slate-500">Loading...</p>
                ) : query.isError ? (
                    <p className="text-sm text-red-600">Failed to load warehouse.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-xs text-slate-500">Status</p>
                            <div className="mt-1"><StatusBadge value={w?.is_active ? "Active" : "Inactive"} /></div>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Pincode</p>
                            <p className="mt-1 font-medium">{w?.pincode || "—"}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Address</p>
                            <p className="mt-1 font-medium">{w?.address_line1 || "—"}</p>
                            {w?.address_line2 ? <p className="text-sm text-slate-600">{w.address_line2}</p> : null}
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">City / State</p>
                            <p className="mt-1 font-medium">{[w?.city, w?.state].filter(Boolean).join(", ") || "—"}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Coordinates</p>
                            <p className="mt-1 font-medium">
                                {w?.lat != null && w?.lng != null ? `${w.lat}, ${w.lng}` : "—"}
                            </p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
