import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { WarehousesService } from "../../../api/services/warehouses.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { useToast } from "../../../components/toast/toast-context";
import { WarehouseForm } from "./warehouse-form";

export function WarehouseCreatePage() {
    const toast = useToast();
    const qc = useQueryClient();
    const nav = useNavigate();

    const createMut = useMutation({
        mutationFn: (payload) => WarehousesService.create(payload),
        onSuccess: (data) => {
            toast.success("Warehouse created");
            qc.invalidateQueries({ queryKey: ["warehouses"] });
            nav(`/admin/warehouses/${data.id}`);
        },
        onError: (e) => toast.error(e?.message || "Failed to create"),
    });

    return (
        <div>
            <PageHeader title="New Warehouse" subtitle="Add a new warehouse location." />
            <Card className="p-4">
                <WarehouseForm
                    mode="create"
                    defaultValues={{
                        name: "",
                        address_line1: "",
                        address_line2: null,
                        city: null,
                        state: null,
                        pincode: null,
                        lat: null,
                        lng: null,
                        is_active: true,
                        service_areas: [
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
                    isSubmitting={createMut.isPending}
                    onCancel={() => nav("/admin/warehouses")}
                    onSubmit={(values) => createMut.mutate(values)}
                />
            </Card>
        </div>
    );
}