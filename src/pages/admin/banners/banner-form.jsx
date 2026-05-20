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
                // Ensure sort_order is always a number
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

                // Debug: Log the payload to verify sort_order type
                console.log('Payload being sent:', payload);
                console.log('sort_order type:', typeof payload.sort_order, 'value:', payload.sort_order);

                onSubmit?.({ payload, imageFile });
            })}
            className="grid gap-3 sm:gap-4"
        >
            <div className="grid gap-2">
                <Label>Title</Label>
                <Input placeholder="Fresh Offer" {...form.register("title")} />
                {errorFor("title") ? <p className="text-sm text-red-600">{errorFor("title")}</p> : null}
            </div>

            <div className="grid gap-2">
                <Label>Subtitle</Label>
                <Textarea placeholder="Get 10% OFF" {...form.register("subtitle")} />
                {errorFor("subtitle") ? <p className="text-sm text-red-600">{errorFor("subtitle")}</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
                <div className="grid gap-2">
                    <Label>Placement</Label>
                    <Input placeholder="home" {...form.register("placement")} />
                    {errorFor("placement") ? <p className="text-sm text-red-600">{errorFor("placement")}</p> : null}
                    <p className="text-xs text-slate-500">Example: home</p>
                </div>

                <div className="grid gap-2">
                    <Label>Sort Order</Label>
                    <Input
                        type="number"
                        placeholder="0"
                        {...form.register("sort_order", {
                            valueAsNumber: true,
                            setValueAs: (value) => {
                                // Handle various input cases
                                if (value === "" || value === null || value === undefined) return 0;
                                const num = Number(value);
                                return isNaN(num) ? 0 : num;
                            }
                        })}
                        onChange={(e) => {
                            // Ensure the value is always a number
                            const numValue = e.target.value === "" ? 0 : Number(e.target.value);
                            form.setValue("sort_order", isNaN(numValue) ? 0 : numValue);
                        }}
                    />
                    {errorFor("sort_order") ? <p className="text-sm text-red-600">{errorFor("sort_order")}</p> : null}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Action Type</Label>
                    <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                        {...form.register("action_type")}
                    >
                        <option value="none">None</option>
                        <option value="product">Product</option>
                        <option value="category">Category</option>
                        <option value="collection">Collection</option>
                        <option value="external_url">External URL</option>
                    </select>
                </div>

                <div className="grid gap-2">
                    <Label>Action Value</Label>

                    {shouldDisableActionValue ? (
                        <>
                            <Input placeholder="—" disabled />
                            <p className="text-xs text-slate-500">Select an Action Type first.</p>
                        </>
                    ) : null}

                    {shouldShowDropdown ? (
                        <>
                            <select
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                                {...form.register("action_value")}
                                disabled={isOptionsLoading || isSubmitting}
                            >
                                <option value="">
                                    {isOptionsLoading ? "Loading..." : "Select..."}
                                </option>
                                {options.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>

                            {optionsError ? (
                                <p className="text-xs text-red-600">
                                    Failed to load options. {optionsError?.message || ""}
                                </p>
                            ) : null}

                            <p className="text-xs text-slate-500">
                                This will store the <span className="font-medium">ID</span> in action_value.
                            </p>

                            {errorFor("action_value") ? (
                                <p className="text-sm text-red-600">{errorFor("action_value")}</p>
                            ) : null}
                        </>
                    ) : null}

                    {shouldShowTextInput ? (
                        <>
                            <Input placeholder={actionType === "external_url" ? "https://..." : "collection key"} {...form.register("action_value")} />
                            {errorFor("action_value") ? <p className="text-sm text-red-600">{errorFor("action_value")}</p> : null}
                            <p className="text-xs text-slate-500">
                                {actionType === "external_url"
                                    ? "Example: https://…"
                                    : "Example: seasonal_offers / top_picks"}
                            </p>
                        </>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Start At (optional)</Label>
                    <Input type="datetime-local" {...form.register("start_at")} />
                </div>
                <div className="grid gap-2">
                    <Label>End At (optional)</Label>
                    <Input type="datetime-local" {...form.register("end_at")} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Active</Label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        {...form.register("is_active", {
                            setValueAs: (value) => value === true || value === "true" || value === "on",
                        })}
                        defaultChecked={form.getValues("is_active")}
                    />
                    Enabled
                </label>
            </div>

            <div className="grid gap-2">
                <Label>Banner Image</Label>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
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

                    {preview ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="aspect-[16/6] max-h-[220px] bg-slate-50 dark:bg-slate-900">
                                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                            </div>
                        </div>
                    ) : defaultValues?.image_url ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="aspect-[16/6] max-h-[220px] bg-slate-50 dark:bg-slate-900">
                                <img src={defaultValues.image_url} alt="banner" className="h-full w-full object-cover" />
                            </div>
                        </div>
                    ) : (
                        <p className="mt-3 text-xs text-slate-500">No image selected.</p>
                    )}
                </div>

                <p className="text-xs text-slate-500">
                    Recommended: wide banner (e.g. 16:5). You can either upload an image OR provide a direct image URL.
                </p>

                <div className="grid gap-2">
                    <Label>Image URL (optional)</Label>
                    <Input placeholder="https://..." {...form.register("image_url")} />
                    <p className="text-xs text-slate-500">
                        If you don’t upload a file, backend requires <span className="font-medium">image_url</span>.
                    </p>
                </div>
            </div>

            <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
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