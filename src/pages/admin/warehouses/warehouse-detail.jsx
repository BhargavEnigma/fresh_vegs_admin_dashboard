import { Link, useParams } from "react-router-dom";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useQuery } from "@tanstack/react-query";

import { WarehousesService } from "../../../api/services/warehouses.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { StatusBadge } from "../../../components/common/status-badge";
import { useToast } from "../../../components/toast/toast-context";
import {
    ArrowLeft,
    Pencil,
    Warehouse,
    MapPin,
    Building2,
    Compass,
    Layers,
    Copy,
    Calendar,
    Navigation,
    Globe,
} from "lucide-react";

function InfoItem({ label, value, icon: Icon }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {Icon && <Icon className="h-3 w-3 text-slate-400" />}
                <span>{label}</span>
            </div>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                {value || "—"}
            </p>
        </div>
    );
}

export function WarehouseDetailPage() {
    const { id } = useParams();
    const toast = useToast();

    const query = useQuery({
        queryKey: ["warehouse", id],
        queryFn: () => WarehousesService.getById(id),
        enabled: !!id,
    });

    const w = query.data;
    const serviceAreas = w?.service_areas || [];

    const copyToClipboard = (text, label = "Value") => {
        if (!text) return;
        navigator.clipboard.writeText(String(text));
        toast.push({
            variant: "success",
            title: `${label} copied`,
            description: `${label} copied to clipboard.`,
        });
    };

    return (
        <div className="space-y-4 px-0 sm:space-y-5">
            <PageHeader
                title={
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate">{w?.name || "Warehouse"}</span>
                        {w && (
                            <span className="inline-flex items-center rounded-lg bg-dailyveg-100 px-2.5 py-0.5 text-xs font-bold text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                Fulfillment Center
                            </span>
                        )}
                    </div>
                }
                subtitle={w ? `ID: ${w.id} · ${w.city || "Hub"}, ${w.state || ""}` : `Warehouse #${id}`}
                actions={(
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                        <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
                            <Link to="/admin/warehouses">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back</span>
                            </Link>
                        </Button>
                        <Button asChild className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm bg-dailyveg-600 font-semibold text-white hover:bg-dailyveg-700">
                            <Link to={`/admin/warehouses/${id}/edit`}>
                                <Pencil className="h-4 w-4" />
                                <span>Edit</span>
                            </Link>
                        </Button>
                    </div>
                )}
            />

            {query.isLoading ? (
                <Card className="p-6 rounded-2xl">
                    <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </Card>
            ) : query.isError ? (
                <Card className="p-4 rounded-2xl border-red-200 bg-red-50/50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
                    <p className="text-sm font-medium">Failed to load warehouse details.</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {/* Executive Hero Card */}
                    <Card className="overflow-hidden rounded-2xl border-dailyveg-200/80 bg-gradient-to-br from-dailyveg-50/40 via-white to-slate-50 p-4 sm:p-5 shadow-2xs dark:border-dailyveg-900/60 dark:from-dailyveg-950/20 dark:via-slate-950 dark:to-slate-900">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-900/50 dark:text-dailyveg-300">
                                    <Warehouse className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                        {w?.name}
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Primary Fulfillment Facility
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <StatusBadge value={w?.is_active ? "Active" : "Inactive"} />
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(w?.id, "Warehouse ID")}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1 text-xs font-mono font-semibold text-slate-600 transition hover:text-dailyveg-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                                >
                                    <span className="truncate max-w-[120px] sm:max-w-none">ID: {w?.id}</span>
                                    <Copy className="h-3 w-3 opacity-70" />
                                </button>
                            </div>
                        </div>

                        {/* 4-Tile Quick Specs on Mobile */}
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <MapPin className="h-3 w-3 text-indigo-500" /> City
                                </div>
                                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {w?.city || "—"}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <Building2 className="h-3 w-3 text-emerald-500" /> State
                                </div>
                                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {w?.state || "—"}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <Compass className="h-3 w-3 text-amber-500" /> Pincode
                                </div>
                                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                    {w?.pincode || "—"}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <Layers className="h-3 w-3 text-rose-500" /> Coverage
                                </div>
                                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                    {serviceAreas.length} Area{serviceAreas.length === 1 ? "" : "s"}
                                </div>
                            </div>
                        </div>

                        {/* Physical Address Section */}
                        <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/90 p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <Navigation className="h-3.5 w-3.5 text-dailyveg-600" />
                                <span>Facility Address</span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                                {w?.address_line1 || "No address line 1 provided"}
                            </p>
                            {w?.address_line2 ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {w.address_line2}
                                </p>
                            ) : null}
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                {[w?.city, w?.state, w?.pincode].filter(Boolean).join(", ")}
                            </p>
                        </div>

                        {/* Coordinates & Metadata */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GPS Coordinates</span>
                                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                    {w?.lat != null && w?.lng != null ? `${w.lat}, ${w.lng}` : "Not configured"}
                                </span>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Last Updated</span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                    {formatIndianDateTime(w?.updated_at) || "—"}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Service Areas Card */}
                    <Card className="rounded-2xl border-slate-200/80 p-4 shadow-2xs dark:border-slate-800">
                        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-dailyveg-600" />
                                    Service Areas
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Delivery zones assigned to this warehouse.
                                </p>
                            </div>

                            <div className="rounded-full bg-dailyveg-50 px-2.5 py-1 text-xs font-bold text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                {serviceAreas.length} Area{serviceAreas.length === 1 ? "" : "s"}
                            </div>
                        </div>

                        {serviceAreas.length === 0 ? (
                            <div className="py-8 text-center">
                                <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    No service areas configured for this warehouse.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Service Area Cards (Visible on screens < md) */}
                                <div className="grid gap-2.5 md:hidden">
                                    {serviceAreas.map((area, idx) => (
                                        <div
                                            key={area.id || `${area.area_name}-${idx}`}
                                            className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                        {area.area_name || "Unnamed Area"}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {[area.city, area.pincode].filter(Boolean).join(" · ") || "Location info missing"}
                                                    </div>
                                                </div>
                                                <StatusBadge value={area.is_active ? "Active" : "Inactive"} />
                                            </div>

                                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                                                {area.radius_km != null && (
                                                    <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                                        {area.radius_km} km radius
                                                    </span>
                                                )}
                                                {area.boundary_geojson ? (
                                                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                        Polygon Boundary Set
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                        Radial Boundary
                                                    </span>
                                                )}
                                                {area.lat != null && area.lng != null && (
                                                    <span className="font-mono text-[10px] text-slate-400 ml-auto">
                                                        {area.lat}, {area.lng}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View (Hidden on mobile) */}
                                <div className="hidden md:block overflow-x-auto">
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
                                            {serviceAreas.map((area, idx) => (
                                                <tr
                                                    key={area.id || `${area.area_name}-${idx}`}
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
                            </>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
