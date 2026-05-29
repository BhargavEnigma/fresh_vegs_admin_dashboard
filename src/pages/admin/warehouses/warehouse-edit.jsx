import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { WarehousesService } from "../../../api/services/warehouses.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { useToast } from "../../../components/toast/toast-context";
import { WarehouseForm } from "./warehouse-form";

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

    const updateMut = useMutation({
        mutationFn: (payload) => WarehousesService.update(id, payload),
        onSuccess: () => {
            toast.success("Warehouse updated");
            qc.invalidateQueries({ queryKey: ["warehouse", id] });
            qc.invalidateQueries({ queryKey: ["warehouses"] });
            nav(`/admin/warehouses/${id}`);
        },
        onError: (e) => toast.error(e?.message || "Failed to update"),
    });

    return (
        <div>
            <PageHeader title="Edit Warehouse" subtitle={id} />
            <Card className="p-4">
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