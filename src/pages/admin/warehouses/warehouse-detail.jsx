import { Link, useParams } from "react-router-dom";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useQuery } from "@tanstack/react-query";

import { WarehousesService } from "../../../api/services/warehouses.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { StatusBadge } from "../../../components/common/status-badge";

function InfoItem({ label, value }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 font-medium">{value || "—"}</p>
        </div>
    );
}

export function WarehouseDetailPage() {
    const { id } = useParams();

    const query = useQuery({
        queryKey: ["warehouse", id],
        queryFn: () => WarehousesService.getById(id),
        enabled: !!id,
    });

    const w = query.data;
    const serviceAreas = w?.service_areas || [];

    return (
        <div>
            <PageHeader
                title={w?.name || "Warehouse"}
                subtitle={w?.id}
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

            {query.isLoading ? (
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Loading...</p>
                </Card>
            ) : query.isError ? (
                <Card className="p-4">
                    <p className="text-sm text-red-600">Failed to load warehouse.</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    <Card className="p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">Warehouse Details</h2>
                                <p className="text-sm text-slate-500">Basic warehouse information.</p>
                            </div>

                            <StatusBadge value={w?.is_active ? "Active" : "Inactive"} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <InfoItem label="Name" value={w?.name} />
                            <InfoItem label="Pincode" value={w?.pincode} />
                            <InfoItem label="City" value={w?.city} />
                            <InfoItem label="State" value={w?.state} />
                            <InfoItem label="Latitude" value={w?.lat} />
                            <InfoItem label="Longitude" value={w?.lng} />
                            <InfoItem label="Created At" value={formatIndianDateTime(w?.created_at)} />
                            <InfoItem label="Updated At" value={formatIndianDateTime(w?.updated_at)} />

                            <div className="sm:col-span-2 lg:col-span-3">
                                <p className="text-xs text-slate-500">Address</p>
                                <p className="mt-1 font-medium">{w?.address_line1 || "—"}</p>
                                {w?.address_line2 ? (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {w.address_line2}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">Service Areas</h2>
                                <p className="text-sm text-slate-500">
                                    Areas where this warehouse can provide delivery service.
                                </p>
                            </div>

                            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {serviceAreas.length} Areas
                            </div>
                        </div>

                        {serviceAreas.length === 0 ? (
                            <p className="text-sm text-slate-500">No service areas added.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="premium-table min-w-[760px] text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                                            <th className="px-3 py-3">Area</th>
                                            <th className="px-3 py-3">City</th>
                                            <th className="px-3 py-3">Pincode</th>
                                            <th className="px-3 py-3">Coordinates</th>
                                            <th className="px-3 py-3">Radius</th>
                                            <th className="px-3 py-3">Boundary</th>
                                            <th className="px-3 py-3">Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {serviceAreas.map((area) => (
                                            <tr
                                                key={area.id || `${area.area_name}-${area.pincode}`}
                                                className="border-b border-slate-100 dark:border-slate-800"
                                            >
                                                <td className="px-3 py-3 font-medium">
                                                    {area.area_name || "—"}
                                                </td>
                                                <td className="px-3 py-3">{area.city || "—"}</td>
                                                <td className="px-3 py-3">{area.pincode || "—"}</td>
                                                <td className="px-3 py-3">
                                                    {area.lat != null && area.lng != null
                                                        ? `${area.lat}, ${area.lng}`
                                                        : "—"}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {area.radius_km != null ? `${area.radius_km} km` : "—"}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {area.boundary_geojson ? "Polygon Set" : "—"}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <StatusBadge value={area.is_active ? "Active" : "Inactive"} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
