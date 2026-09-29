import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { WarehousesService } from "../../../api/services/warehouses.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/toast/toast-context";
import { WarehouseForm } from "./warehouse-form";
import { ArrowLeft } from "lucide-react";

export function WarehouseCreatePage() {
    const toast = useToast();
    const qc = useQueryClient();
    const nav = useNavigate();

    const createMut = useMutation({
        mutationFn: (payload) => WarehousesService.create(payload),
        meta: {
            globalLoaderMessage: "Creating warehouse...",
        },
        onSuccess: (data) => {
            toast.success("Warehouse created");
            qc.invalidateQueries({ queryKey: ["warehouses"] });
            nav(`/admin/warehouses/${data.id}`);
        },
        onError: (e) => toast.error(e?.message || "Failed to create"),
    });

    return (
        <div className="space-y-4 px-0 sm:space-y-5">
            <PageHeader
                title="New Warehouse"
                subtitle="Add a new fulfillment center or hub location."
                actions={(
                    <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
                        <Link to="/admin/warehouses">
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to List</span>
                        </Link>
                    </Button>
                )}
            />
            <Card className="rounded-2xl border-slate-200/80 shadow-2xs dark:border-slate-800 p-4 sm:p-6">
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