import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { dealUpsertSchema } from "../../../validations/deals";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import DatePicker from "react-datepicker";
import { PremiumSelect } from "../../../components/ui/premium-select";

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

                <div className="space-y-1 flex flex-col">
                    <Label>Start (optional)</Label>
                    <DatePicker
                        selected={values.starts_at ? new Date(values.starts_at) : null}
                        onChange={(selectedDate) =>
                            form.setValue(
                                "starts_at",
                                selectedDate ? selectedDate.toISOString() : "",
                                {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                }
                            )
                        }
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="dd-MM-yyyy, h:mm a"
                        placeholderText="Select start date & time"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                        isClearable
                    />
                </div>

                <div className="space-y-1 flex flex-col">
                    <Label>End (optional)</Label>
                    <DatePicker
                        selected={values.ends_at ? new Date(values.ends_at) : null}
                        onChange={(selectedDate) =>
                            form.setValue(
                                "ends_at",
                                selectedDate ? selectedDate.toISOString() : "",
                                {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                }
                            )
                        }
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="dd-MM-yyyy, h:mm a"
                        placeholderText="Select start date & time"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                        isClearable
                    />
                </div>

                <div className="space-y-1">
                    <Label>Priority</Label>
                    <Input type="number" {...form.register("priority")} />
                </div>

                <div className="space-y-1">
                    <Label>Active</Label>
                    <PremiumSelect
                        value={String(values.is_active)}
                        onChange={(value) =>
                            form.setValue("is_active", value === "true", {
                                shouldValidate: true,
                                shouldDirty: true,
                            })
                        }
                        options={[
                            { value: "true", label: "Active" },
                            { value: "false", label: "Inactive" },
                        ]}
                        placeholder="Select status"
                    />
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
