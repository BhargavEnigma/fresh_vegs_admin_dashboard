import { Controller, useFieldArray, useForm } from "react-hook-form";
import { WarehouseServiceAreaMap } from "./warehouse-service-area-map";
import { zodResolver } from "@hookform/resolvers/zod";

import { warehouseCreateSchema, warehouseUpdateSchema } from "../../../validations/warehouses";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";


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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6">
            <div className="grid gap-2">
                <Label>Name</Label>
                <Input placeholder="Main Warehouse" {...form.register("name")} />
                {errorFor("name") ? <p className="text-sm text-red-600">{errorFor("name")}</p> : null}
            </div>

            <div className="grid gap-2">
                <Label>Address Line 1</Label>
                <Input placeholder="Street / Area" {...form.register("address_line1")} />
                {errorFor("address_line1") ? (
                    <p className="text-sm text-red-600">{errorFor("address_line1")}</p>
                ) : null}
            </div>

            <div className="grid gap-2">
                <Label>Address Line 2</Label>
                <Input placeholder="Landmark (optional)" {...form.register("address_line2")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>City</Label>
                    <Input placeholder="Ahmedabad" {...form.register("city")} />
                </div>

                <div className="grid gap-2">
                    <Label>State</Label>
                    <Input placeholder="Gujarat" {...form.register("state")} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label>Pincode</Label>
                    <Input placeholder="380001" {...form.register("pincode")} />
                </div>

                <div className="grid gap-2">
                    <Label>Latitude</Label>
                    <Input placeholder="23.0225" {...form.register("lat")} />
                    {errorFor("lat") ? <p className="text-sm text-red-600">{errorFor("lat")}</p> : null}
                </div>

                <div className="grid gap-2">
                    <Label>Longitude</Label>
                    <Input placeholder="72.5714" {...form.register("lng")} />
                    {errorFor("lng") ? <p className="text-sm text-red-600">{errorFor("lng")}</p> : null}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold">Service Areas</h3>
                        <p className="text-sm text-slate-500">
                            Add areas where this warehouse can deliver.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
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
                        Add Area
                    </Button>
                </div>

                <div className="grid gap-4">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Area Name</Label>
                                    <Input
                                        placeholder="Nikol"
                                        {...form.register(`service_areas.${index}.area_name`)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>City</Label>
                                    <Input
                                        placeholder="Ahmedabad"
                                        {...form.register(`service_areas.${index}.city`)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Pincode</Label>
                                    <Input
                                        placeholder="382350"
                                        {...form.register(`service_areas.${index}.pincode`)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Latitude</Label>
                                    <Input
                                        placeholder="23.0587"
                                        {...form.register(`service_areas.${index}.lat`)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Longitude</Label>
                                    <Input
                                        placeholder="72.6718"
                                        {...form.register(`service_areas.${index}.lng`)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Radius KM</Label>
                                    <Input
                                        placeholder="3"
                                        {...form.register(`service_areas.${index}.radius_km`)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Delivery Boundary</Label>

                                <p className="text-xs text-slate-500">
                                    Draw polygon border for this service area.
                                </p>

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

                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
            </div>
        </form>
    );
}