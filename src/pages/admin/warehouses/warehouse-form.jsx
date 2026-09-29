import { Controller, useFieldArray, useForm } from "react-hook-form";
import { WarehouseServiceAreaMap } from "./warehouse-service-area-map";
import { zodResolver } from "@hookform/resolvers/zod";

import { warehouseCreateSchema, warehouseUpdateSchema } from "../../../validations/warehouses";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
    Warehouse,
    MapPin,
    Globe,
    Plus,
    Trash2,
    Save,
    RotateCcw,
    Layers,
    Compass,
    Navigation,
} from "lucide-react";

export function WarehouseForm({ mode, defaultValues, onSubmit, onCancel, isSubmitting }) {
    const schema = mode === "create" ? warehouseCreateSchema : warehouseUpdateSchema;

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "service_areas",
    });

    const errorFor = (name) => form.formState.errors?.[name]?.message;

    const handleSubmit = (values) => {
        const payload = {
            ...values,
            lat: values.lat === "" ? null : values.lat,
            lng: values.lng === "" ? null : values.lng,
            is_active: values.is_active ?? true,
            service_areas: (values.service_areas || [])
                .filter((area) => area.area_name || area.city || area.pincode || area.boundary_geojson)
                .map((area) => ({
                    ...area,
                    lat: area.lat === "" ? null : area.lat,
                    lng: area.lng === "" ? null : area.lng,
                    radius_km: area.radius_km === "" ? null : area.radius_km,
                    boundary_geojson: area.boundary_geojson ?? null,
                    is_active: area.is_active ?? true,
                })),
        };

        onSubmit(payload);
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6 pb-20 sm:pb-0">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-dailyveg-50 text-dailyveg-600 dark:bg-dailyveg-950/60 dark:text-dailyveg-400">
                        <Warehouse className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Facility Details</h3>
                </div>

                <div className="grid gap-2">
                    <Label className="text-xs font-semibold">Warehouse Name</Label>
                    <Input placeholder="e.g. Central Naroda Hub" {...form.register("name")} className="rounded-xl h-10" />
                    {errorFor("name") ? <p className="text-xs text-red-600">{errorFor("name")}</p> : null}
                </div>

                {/* Status Toggle Card */}
                <label
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                        form.watch("is_active")
                            ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
                            : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40"
                    }`}
                >
                    <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${form.watch("is_active") ? "bg-emerald-500" : "bg-slate-400"}`} />
                            Operating Status
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                            {form.watch("is_active") ? "Active • Warehouse receives orders and dispatches" : "Inactive • Decommissioned from fulfillment"}
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        {...form.register("is_active")}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                </label>
            </div>

            {/* Section 2: Physical Address & Coordinates */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <MapPin className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Location & Coordinates</h3>
                </div>

                <div className="grid gap-2">
                    <Label className="text-xs font-semibold">Address Line 1</Label>
                    <Input placeholder="Plot / Street / Industrial Area" {...form.register("address_line1")} className="rounded-xl h-10" />
                    {errorFor("address_line1") ? (
                        <p className="text-xs text-red-600">{errorFor("address_line1")}</p>
                    ) : null}
                </div>

                <div className="grid gap-2">
                    <Label className="text-xs font-semibold">Address Line 2 (optional)</Label>
                    <Input placeholder="Landmark or Unit number" {...form.register("address_line2")} className="rounded-xl h-10" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold">City</Label>
                        <Input placeholder="Ahmedabad" {...form.register("city")} className="rounded-xl h-10" />
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold">State</Label>
                        <Input placeholder="Gujarat" {...form.register("state")} className="rounded-xl h-10" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold">Pincode</Label>
                        <Input placeholder="380001" {...form.register("pincode")} className="rounded-xl h-10" />
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold">Latitude</Label>
                        <Input placeholder="23.0225" {...form.register("lat")} className="rounded-xl h-10" />
                        {errorFor("lat") ? <p className="text-xs text-red-600">{errorFor("lat")}</p> : null}
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold">Longitude</Label>
                        <Input placeholder="72.5714" {...form.register("lng")} className="rounded-xl h-10" />
                        {errorFor("lng") ? <p className="text-xs text-red-600">{errorFor("lng")}</p> : null}
                    </div>
                </div>
            </div>

            {/* Section 3: Service Delivery Areas */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                            <Globe className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delivery Service Areas</h3>
                            <p className="text-[11px] text-slate-500">
                                Specific zones and postal boundaries served by this facility.
                            </p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-xs gap-1.5 shrink-0"
                        onClick={() =>
                            append({
                                area_name: "",
                                city: form.getValues("city") || "",
                                pincode: "",
                                lat: null,
                                lng: null,
                                radius_km: null,
                                boundary_geojson: null,
                                is_active: true,
                            })
                        }
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Area</span>
                    </Button>
                </div>

                <div className="grid gap-4">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60 space-y-3.5"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                                    <span className="grid h-5 w-5 place-items-center rounded-md bg-dailyveg-100 text-[10px] font-black text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                        {index + 1}
                                    </span>
                                    <span>{form.watch(`service_areas.${index}.area_name`) || `Service Zone #${index + 1}`}</span>
                                </span>

                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1 rounded-lg"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Remove</span>
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-semibold">Area Name</Label>
                                    <Input
                                        placeholder="e.g. Nikol"
                                        {...form.register(`service_areas.${index}.area_name`)}
                                        className="rounded-xl h-10"
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-semibold">City</Label>
                                    <Input
                                        placeholder="Ahmedabad"
                                        {...form.register(`service_areas.${index}.city`)}
                                        className="rounded-xl h-10"
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-semibold">Pincode</Label>
                                    <Input
                                        placeholder="382350"
                                        {...form.register(`service_areas.${index}.pincode`)}
                                        className="rounded-xl h-10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-semibold">Latitude</Label>
                                    <Input
                                        placeholder="23.0587"
                                        {...form.register(`service_areas.${index}.lat`)}
                                        className="rounded-xl h-10"
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-semibold">Longitude</Label>
                                    <Input
                                        placeholder="72.6718"
                                        {...form.register(`service_areas.${index}.lng`)}
                                        className="rounded-xl h-10"
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-semibold">Radius KM</Label>
                                    <Input
                                        placeholder="3"
                                        {...form.register(`service_areas.${index}.radius_km`)}
                                        className="rounded-xl h-10"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">Delivery Boundary Map</Label>
                                    <span className="text-[10px] text-slate-400">
                                        Use polygon tool to trace boundary
                                    </span>
                                </div>

                                <Controller
                                    control={form.control}
                                    name={`service_areas.${index}.boundary_geojson`}
                                    render={({ field }) => (
                                        <WarehouseServiceAreaMap
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5 border-dashed"
                        onClick={() =>
                            append({
                                area_name: "",
                                city: form.getValues("city") || "",
                                pincode: "",
                                lat: null,
                                lng: null,
                                radius_km: null,
                                boundary_geojson: null,
                                is_active: true,
                            })
                        }
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Another Service Area</span>
                    </Button>
                </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="h-10 w-full sm:w-auto rounded-xl"
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 w-full sm:w-auto rounded-xl bg-dailyveg-600 font-bold text-white hover:bg-dailyveg-700 shadow-sm gap-1.5"
                >
                    <Save className="h-4 w-4" />
                    <span>{isSubmitting ? "Saving Warehouse…" : "Save Warehouse"}</span>
                </Button>
            </div>

            {/* Mobile Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 p-3 backdrop-blur-md shadow-lg dark:border-slate-800 dark:bg-slate-950/95 sm:hidden">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl px-4"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => form.handleSubmit(handleSubmit)()}
                        disabled={isSubmitting}
                        className="h-10 flex-1 rounded-xl bg-dailyveg-600 font-bold text-white hover:bg-dailyveg-700 shadow-sm gap-1.5"
                    >
                        <Save className="h-4 w-4" />
                        <span>{isSubmitting ? "Saving…" : "Save Warehouse"}</span>
                    </Button>
                </div>
            </div>
        </form>
    );
}