import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { WarehousesService } from "../../../api/services/warehouses.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/toast/toast-context";
import { WarehouseForm } from "./warehouse-form";
import { ArrowLeft, Eye } from "lucide-react";

export function WarehouseEditPage() {
    const { id } = useParams();
    const toast = useToast();
    const qc = useQueryClient();
    const nav = useNavigate();

    const query = useQuery({
        queryKey: ["warehouse", id],
        queryFn: () => WarehousesService.getById(id),
        enabled: !!id,
    });

    const w = query.data;

    const updateMut = useMutation({
        mutationFn: (payload) => WarehousesService.update(id, payload),
        meta: {
            globalLoaderMessage: "Saving warehouse...",
        },
        onSuccess: () => {
            toast.success("Warehouse updated");
            qc.invalidateQueries({ queryKey: ["warehouse", id] });
            qc.invalidateQueries({ queryKey: ["warehouses"] });
            nav(`/admin/warehouses/${id}`);
        },
        onError: (e) => toast.error(e?.message || "Failed to update"),
    });

    return (
        <div className="space-y-4 px-0 sm:space-y-5">
            <PageHeader
                title={
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate">{w?.name ? `Edit: ${w.name}` : "Edit Warehouse"}</span>
                        {w && (
                            <span className="inline-flex items-center rounded-lg bg-dailyveg-100 px-2.5 py-0.5 text-xs font-bold text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                Fulfillment Center
                            </span>
                        )}
                    </div>
                }
                subtitle={w ? `ID: ${id} · ${w.city || "Facility"}` : `Warehouse #${id}`}
                actions={(
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                        <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
                            <Link to={`/admin/warehouses/${id}`}>
                                <Eye className="h-4 w-4" />
                                <span>View Details</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
                            <Link to="/admin/warehouses">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to List</span>
                            </Link>
                        </Button>
                    </div>
                )}
            />
            <Card className="rounded-2xl border-slate-200/80 shadow-2xs dark:border-slate-800 p-4 sm:p-6">
                {query.isLoading ? (
                    <p className="text-sm text-slate-500">Loading...</p>
                ) : query.isError ? (
                    <p className="text-sm text-red-600">Failed to load warehouse.</p>
                ) : (
                    <WarehouseForm
                        mode="edit"
                        defaultValues={{
                            name: query.data?.name ?? "",
                            address_line1: query.data?.address_line1 ?? "",
                            address_line2: query.data?.address_line2 ?? null,
                            city: query.data?.city ?? null,
                            state: query.data?.state ?? null,
                            pincode: query.data?.pincode ?? null,
                            lat: query.data?.lat ?? null,
                            lng: query.data?.lng ?? null,
                            is_active: query.data?.is_active ?? true,
                            service_areas:
                                query.data?.service_areas?.length > 0
                                    ? query.data.service_areas.map((area) => ({
                                        area_name: area.area_name ?? "",
                                        city: area.city ?? "",
                                        pincode: area.pincode ?? "",
                                        lat: area.lat ?? null,
                                        lng: area.lng ?? null,
                                        radius_km: area.radius_km ?? null,
                                        boundary_geojson: area.boundary_geojson ?? null,
                                        is_active: area.is_active ?? true,
                                    }))
                                    : [
                                        {
                                            area_name: "",
                                            city: "",
                                            pincode: "",
                                            lat: null,
                                            lng: null,
                                            radius_km: null,
                                            boundary_geojson: null,
                                            is_active: true,
                                        },
                                    ],
                        }}
                        isSubmitting={updateMut.isPending}
                        onCancel={() => nav(`/admin/warehouses/${id}`)}
                        onSubmit={(values) => updateMut.mutate(values)}
                    />
                )}
            </Card>
        </div>
    );
}