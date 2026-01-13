import { useForm } from "react-hook-form";
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

    const errorFor = (name) => form.formState.errors?.[name]?.message;

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
                <Label>Name</Label>
                <Input placeholder="Main Warehouse" {...form.register("name")} />
                {errorFor("name") ? <p className="text-sm text-red-600">{errorFor("name")}</p> : null}
            </div>

            <div className="grid gap-2">
                <Label>Address Line 1</Label>
                <Input placeholder="Street / Area" {...form.register("address_line1")} />
                {errorFor("address_line1") ? <p className="text-sm text-red-600">{errorFor("address_line1")}</p> : null}
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
