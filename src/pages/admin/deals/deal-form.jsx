import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { dealUpsertSchema } from "../../../validations/deals";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

function toDatetimeLocal(value) {
    if (!value) return "";
    try {
        const d = typeof value === "string" ? new Date(value) : value;
        if (Number.isNaN(d.getTime())) return "";
        const pad = (n) => String(n).padStart(2, "0");
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch {
        return "";
    }
}

export function DealForm({ mode, defaultValues, isSubmitting, onSubmit, onCancel }) {
    const form = useForm({
        resolver: zodResolver(dealUpsertSchema),
        defaultValues: defaultValues || {},
    });

    const values = form.watch();

    return (
        <form
            className="space-y-4"
            onSubmit={form.handleSubmit((v) => {
                const payload = {
                    ...v,
                    description: v.description === "" ? null : v.description,
                    starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null,
                    ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
                };
                onSubmit?.(payload);
            })}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                    <Label>Name</Label>
                    <Input {...form.register("name")} placeholder="Deals of the Day" />
                    {form.formState.errors.name ? <div className="text-xs text-red-600">{form.formState.errors.name.message}</div> : null}
                </div>

                <div className="space-y-1">
                    <Label>Deal date (IST)</Label>
                    <Input {...form.register("deal_date")} placeholder="YYYY-MM-DD" />
                    {form.formState.errors.deal_date ? <div className="text-xs text-red-600">{form.formState.errors.deal_date.message}</div> : null}
                </div>

                <div className="space-y-1">
                    <Label>Start (optional)</Label>
                    <Input
                        type="datetime-local"
                        value={toDatetimeLocal(values.starts_at)}
                        onChange={(e) => form.setValue("starts_at", e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <Label>End (optional)</Label>
                    <Input
                        type="datetime-local"
                        value={toDatetimeLocal(values.ends_at)}
                        onChange={(e) => form.setValue("ends_at", e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <Label>Priority</Label>
                    <Input type="number" {...form.register("priority")} />
                </div>

                <div className="space-y-1">
                    <Label>Active</Label>
                    <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                        value={String(values.is_active)}
                        onChange={(e) => form.setValue("is_active", e.target.value === "true")}
                    >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <Label>Description</Label>
                <Textarea {...form.register("description")} placeholder="Optional description" />
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {mode === "edit" ? "Save" : "Create"}
                </Button>
            </div>
        </form>
    );
}
