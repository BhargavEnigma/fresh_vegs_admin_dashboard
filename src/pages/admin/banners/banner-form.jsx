import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";

import { bannerUpsertSchema } from "../../../validations/banners";
import { AdminBannersService } from "../../../api/services/admin-banners.service";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { PremiumSelect } from "../../../components/ui/premium-select";
import DatePicker from "react-datepicker";

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

export function BannerForm({
    mode,
    defaultValues,
    isSubmitting,
    onCancel,
    onSubmit,
}) {
    const [imageFile, setImageFile] = React.useState(null);
    const [preview, setPreview] = React.useState(null);
    const fileRef = React.useRef(null);

    const form = useForm({
        resolver: zodResolver(bannerUpsertSchema),
        defaultValues: {
            title: defaultValues?.title ?? null,
            subtitle: defaultValues?.subtitle ?? null,
            placement: defaultValues?.placement ?? "home",
            action_type: defaultValues?.action_type ?? "none",
            action_value: defaultValues?.action_value ?? null,
            sort_order: defaultValues?.sort_order ?? 0,
            start_at: toDatetimeLocal(defaultValues?.start_at),
            end_at: toDatetimeLocal(defaultValues?.end_at),
            is_active: defaultValues?.is_active ?? true,
            image_url: defaultValues?.image_url ?? "",
        },
    });

    React.useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const errorFor = (name) => form.formState.errors?.[name]?.message;

    function onPickImage(e) {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(file ? URL.createObjectURL(file) : null);
        e.target.value = "";
    }

    function clearImage() {
        setImageFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
    }

    function toBoolean(value) {
        if (value === "0" || value === "false" || value === false || value === 0) {
            return false;
        }
        if (value === "1" || value === "true" || value === true || value === 1) {
            return true;
        }
        return Boolean(value);
    }

    const actionType = form.watch("action_type");

    // Clear action_value if action_type changes to avoid storing wrong IDs
    React.useEffect(() => {
        form.setValue("action_value", null, { shouldValidate: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actionType]);

    // Load products when action_type = product
    const productsQuery = useQuery({
        queryKey: ["admin", "banner-action-options", "products"],
        queryFn: () => AdminBannersService.listActionProducts(),
        enabled: actionType === "product",
        staleTime: 60 * 1000,
    });

    // Load categories when action_type = category
    const categoriesQuery = useQuery({
        queryKey: ["admin", "banner-action-options", "categories"],
        queryFn: () => AdminBannersService.listActionCategories(),
        enabled: actionType === "category",
        staleTime: 60 * 1000,
    });

    const isOptionsLoading = (actionType === "product" && productsQuery.isLoading)
        || (actionType === "category" && categoriesQuery.isLoading);

    const optionsError = (actionType === "product" ? productsQuery.error : categoriesQuery.error);

    const options = React.useMemo(() => {
        if (actionType === "product") return productsQuery.data?.data?.data?.items || [];
        if (actionType === "category") return categoriesQuery.data?.data?.data?.items || [];
        return [];
    }, [actionType, productsQuery.data, categoriesQuery.data]);

    const shouldShowDropdown = actionType === "product" || actionType === "category";
    const shouldShowTextInput = actionType === "external_url" || actionType === "collection";
    const shouldDisableActionValue = actionType === "none";

    console.log("options : ", productsQuery.data?.data?.items);

    return (
        <form
            onSubmit={form.handleSubmit((values) => {
                const sortOrder = Number(values.sort_order);
                const finalSortOrder = isNaN(sortOrder) ? 0 : sortOrder;

                const payload = {
                    ...values,
                    sort_order: finalSortOrder || 0,
                    is_active: toBoolean(values.is_active),
                    start_at: values.start_at ? new Date(values.start_at).toISOString() : null,
                    end_at: values.end_at ? new Date(values.end_at).toISOString() : null,
                    title: values.title === "" ? null : values.title,
                    subtitle: values.subtitle === "" ? null : values.subtitle,
                    action_value: values.action_value === "" ? null : values.action_value,
                };

                onSubmit?.({ payload, imageFile });
            })}
            className="space-y-5"
        >
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input placeholder="Fresh Offer" {...form.register("title")} />
                    {errorFor("title") ? <p className="text-sm text-red-600">{errorFor("title")}</p> : null}
                </div>

                <div className="grid gap-2">
                    <Label>Subtitle</Label>
                    <Textarea
                        placeholder="Get 10% OFF"
                        className="min-h-[90px] resize-none"
                        {...form.register("subtitle")}
                    />
                    {errorFor("subtitle") ? <p className="text-sm text-red-600">{errorFor("subtitle")}</p> : null}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <div className="flex justify-between">
                        <Label>Placement</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Example: home</p>
                    </div>
                    <Input placeholder="home" {...form.register("placement")} />
                    {errorFor("placement") ? <p className="text-sm text-red-600">{errorFor("placement")}</p> : null}
                </div>

                <div className="grid gap-2">
                    <Label>Sort Order</Label>
                    <Input
                        type="number"
                        placeholder="0"
                        {...form.register("sort_order", {
                            valueAsNumber: true,
                            setValueAs: (value) => {
                                if (value === "" || value === null || value === undefined) return 0;
                                const num = Number(value);
                                return isNaN(num) ? 0 : num;
                            },
                        })}
                        onChange={(e) => {
                            const numValue = e.target.value === "" ? 0 : Number(e.target.value);
                            form.setValue("sort_order", isNaN(numValue) ? 0 : numValue);
                        }}
                    />
                    {errorFor("sort_order") ? <p className="text-sm text-red-600">{errorFor("sort_order")}</p> : null}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Action Type</Label>
                    <PremiumSelect
                        value={form.watch("action_type")}
                        onChange={(value) =>
                            form.setValue("action_type", value || "", {
                                shouldValidate: true,
                                shouldDirty: true,
                            })
                        }
                        options={[
                            { value: "none", label: "None" },
                            { value: "product", label: "Product" },
                            { value: "category", label: "Category" },
                            { value: "collection", label: "Collection" },
                            { value: "external_url", label: "External URL" },
                            { value: "screen", label: "Screen" },
                        ]}
                        placeholder="Select action type"
                    />
                </div>

                <div className="grid gap-2">
                    <div className="flex justify-between">
                        <Label>Action Value</Label>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Select an Action Type first.</span>
                    </div>
                    {shouldDisableActionValue ? (
                        <>
                            <Input placeholder="—" disabled />
                        </>
                    ) : null}

                    {shouldShowDropdown ? (
                        <>
                            <PremiumSelect
                                value={form.watch("action_value") || ""}
                                onChange={(value) =>
                                    form.setValue("action_value", value || "", {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                    })
                                }
                                options={[
                                    {
                                        value: "",
                                        label: isOptionsLoading ? "Loading..." : "Select...",
                                    },
                                    ...options.map((item) => ({
                                        value: item.id,
                                        label: item.name,
                                    })),
                                ]}
                                placeholder={isOptionsLoading ? "Loading..." : "Select action value"}
                                isDisabled={isOptionsLoading || isSubmitting}
                            />

                            {optionsError ? (
                                <p className="text-xs text-red-600">
                                    Failed to load options. {optionsError?.message || ""}
                                </p>
                            ) : null}

                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                This will store the <span className="font-medium">ID</span> in action_value.
                            </p>

                            {errorFor("action_value") ? (
                                <p className="text-sm text-red-600">{errorFor("action_value")}</p>
                            ) : null}
                        </>
                    ) : null}

                    {shouldShowTextInput ? (
                        <>
                            <Input
                                placeholder={actionType === "external_url" ? "https://..." : "collection key"}
                                {...form.register("action_value")}
                            />
                            {errorFor("action_value") ? <p className="text-sm text-red-600">{errorFor("action_value")}</p> : null}
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {actionType === "external_url"
                                    ? "Example: https://…"
                                    : "Example: seasonal_offers / top_picks"}
                            </p>
                        </>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Start At (optional)</Label>
                    <DatePicker
                        selected={form.watch("start_at") ? new Date(form.watch("start_at")) : null}
                        onChange={(selectedDate) =>
                            form.setValue("start_at", selectedDate ? selectedDate.toISOString() : "", {
                                shouldValidate: true,
                                shouldDirty: true,
                            })
                        }
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="yyyy-MM-dd HH:mm"
                        placeholderText="Select start date & time"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dailyveg-900 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                        isClearable
                    />
                </div>

                <div className="grid gap-2">
                    <Label>End At (optional)</Label>
                    <DatePicker
                        selected={form.watch("end_at") ? new Date(form.watch("end_at")) : null}
                        onChange={(selectedDate) =>
                            form.setValue("end_at", selectedDate ? selectedDate.toISOString() : "", {
                                shouldValidate: true,
                                shouldDirty: true,
                            })
                        }
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="yyyy-MM-dd HH:mm"
                        placeholderText="Select end date & time"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dailyveg-900 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                        isClearable
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Status</Label>
                <PremiumSelect
                    value={String(form.watch("is_active"))}
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

            <div className="grid gap-3">
                <Label>Banner Image</Label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                            {imageFile ? "Change image" : "Pick image"}
                        </Button>

                        <Button type="button" variant="secondary" onClick={clearImage} disabled={!imageFile && !preview}>
                            Clear
                        </Button>

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={onPickImage}
                            className="hidden"
                        />
                    </div>

                    {preview || defaultValues?.image_url ? (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                            <div className="aspect-[16/6] max-h-[220px]">
                                <img
                                    src={preview || defaultValues.image_url}
                                    alt="banner"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            No image selected.
                        </div>
                    )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Recommended: wide banner, for example 16:5.
                </p>
            </div>

            <div className="grid gap-2">
                <Label>Image URL (optional)</Label>
                <Input placeholder="https://..." {...form.register("image_url")} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    If you don’t upload a file, backend requires <span className="font-medium">image_url</span>.
                </p>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : mode === "create" ? "Create" : "Save"}
                </Button>
            </div>
        </form>
    );
}