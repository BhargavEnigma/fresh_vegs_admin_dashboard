import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { updateProductSchema, PROCUREMENT_UNITS } from "../../validations/products";
import { getAdminProductById, updateProduct, updateProductWithImages } from "../../api/services/products.service";
import { listCategoriesOps } from "../../api/services/categories.service";
import { deleteProductImage, uploadProductImages, reorderProductImages } from "../../api/services/products.service";

import { useToast } from "../../components/toast/toast-context";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { ProductImagePicker } from "../../components/products/product-image-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { assetUrl } from "../../lib/utils";
import { Textarea } from "../../components/ui/textarea";
import { PremiumSelect } from "../../components/ui/premium-select";
import { generateProductDescription } from "../../api/services/ai.service";
import { RiGeminiFill } from "react-icons/ri";
import { ImageSizeInfo } from "../../components/common/image-size-info";
import { ProductFreshnessPolicyCard } from "../../components/products/product-freshness-policy-card";
import {
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    Trash2,
    Eye,
    Save,
    RotateCcw,
    Sparkles,
    Package,
    IndianRupee,
    AlertCircle,
    Layers,
    Image as ImageIcon,
    UploadCloud,
} from "lucide-react";

function paiseToRupees(paise) {
    return Number(paise || 0) / 100;
}

function rupeesToPaise(rupees) {
    const n = Number(rupees || 0);
    return Math.round(n * 100);
}

function normalizeImages(product) {
    const raw =
        product?.images ||
        product?.product_images ||
        product?.productImages ||
        product?.image_urls ||
        product?.imageUrls ||
        [];

    // If backend returns array of strings (urls)
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "string") {
        return raw.map((url, idx) => ({
            id: `${idx}`, // fallback; ideally backend returns image id
            image_url: url,
            sort_order: idx,
        }));
    }

    // If backend returns objects
    if (Array.isArray(raw)) {
        return raw
            .map((img, idx) => ({
                id: img?.id,
                image_url: img?.image_url || img?.url || img?.path,
                sort_order: Number.isFinite(img?.sort_order) ? img.sort_order : idx,
            }))
            .filter((x) => x.id && x.image_url);
    }

    return [];
}

export function ProductEditPage() {
    const { productId } = useParams();
    const toast = useToast();
    const qc = useQueryClient();
    const navigate = useNavigate();

    const [newImages, setNewImages] = useState([]);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, image: null });
    const [reorderDirty, setReorderDirty] = useState(false);

    const prodQ = useQuery({
        queryKey: ["product", productId],
        queryFn: () => getAdminProductById(productId),
        enabled: !!productId,
    });

    const catsQ = useQuery({
        queryKey: ["categories", "ops"],
        queryFn: () => listCategoriesOps({ include_inactive: true }),
    });

    const p = prodQ.data?.data?.product;
    const categories = catsQ.data?.data?.categories || [];

    // Local editable list for reorder UI
    const [existingImages, setExistingImages] = useState([]);

    // Sync existing images when product loads/changes.
    useEffect(() => {
        const imgs = normalizeImages(p);
        imgs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setExistingImages(imgs);
        setReorderDirty(false);
    }, [p?.id, p?.updated_at]);

    const form = useForm({
        resolver: zodResolver(updateProductSchema),
        defaultValues: {
            category_id: "",
            name: "",
            search_keywords: "",
            description: "",
            tag: "",
            unit: "kg",
            base_quantity: 1,
            mrp_paise: 0,
            selling_price_paise: 0,
            is_out_of_stock: false,
            is_active: true,
            procurement_mode: "bulk",
            procurement_unit: "kg",
        },
    });

    useEffect(() => {
        if (!p) return;

        form.reset({
            category_id: p.category_id ?? "",
            name: p.name ?? "",
            search_keywords: p.search_keywords ?? "",
            description: p.description ?? "",
            tag: p.tag ?? "",
            unit: p.unit ?? "kg",
            base_quantity: Number(p.base_quantity ?? 1),
            mrp_paise: paiseToRupees(p.mrp_paise),
            selling_price_paise: paiseToRupees(p.selling_price_paise),
            is_out_of_stock: !!p.is_out_of_stock,
            is_active: !!p.is_active,
            procurement_mode: "bulk",
            procurement_unit: p.procurement_unit ?? "kg",
        });
    }, [
        form,
        p?.id,
        p?.category_id,
        p?.name,
        p?.search_keywords,
        p?.description,
        p?.tag,
        p?.unit,
        p?.base_quantity,
        p?.mrp_paise,
        p?.selling_price_paise,
        p?.is_out_of_stock,
        p?.is_active,
        p?.procurement_mode,
        p?.procurement_unit,
    ]);

    const saveMut = useMutation({
        mutationFn: async (payload) => {
            if (newImages.length) {
                return updateProductWithImages(productId, payload, newImages);
            }
            return updateProduct(productId, payload);
        },
        meta: {
            globalLoaderMessage: "Saving product...",
        },
        onSuccess: () => {
            setNewImages([]);
            qc.invalidateQueries({ queryKey: ["products"] });
            qc.invalidateQueries({ queryKey: ["product", productId] });
            toast.push({ variant: "success", title: "Saved", description: "Product updated." });
            navigate(`/products/${productId}`);
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Update failed", description: msg });
        },
    });

    const uploadImagesMut = useMutation({
        mutationFn: async () => {
            if (!newImages.length) return null;
            return uploadProductImages(productId, newImages);
        },
        meta: {
            globalLoaderMessage: "Uploading product images...",
        },
        onSuccess: () => {
            setNewImages([]);
            qc.invalidateQueries({ queryKey: ["product", productId] });
            toast.push({ variant: "success", title: "Uploaded", description: "Images uploaded." });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Upload failed", description: msg });
        },
    });

    // ✅ Optimistic delete: remove instantly, restore if error
    const deleteImageMut = useMutation({
        mutationFn: async (imageId) => deleteProductImage(imageId),
        meta: {
            globalLoaderMessage: "Deleting product image...",
        },
        onMutate: async (imageId) => {
            setExistingImages((prev) => prev.filter((x) => x.id !== imageId));
            setDeleteDialog({ open: false, image: null });
            return { imageId };
        },
        onSuccess: () => {
            toast.push({ variant: "success", title: "Deleted", description: "Image removed." });
            // optional: keep cache consistent too
            qc.invalidateQueries({ queryKey: ["product", productId] });
        },
        onError: (e, imageId) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Delete failed", description: msg });

            // restore from server truth
            qc.invalidateQueries({ queryKey: ["product", productId] });
        },
    });

    const reorderMut = useMutation({
        mutationFn: async () => {
            // ✅ FIX: payload = { images: [...] } (not { images: { images: [...] } })
            const payload = existingImages.map((img, idx) => ({
                id: img.id,
                sort_order: idx,
            }));
            return reorderProductImages(productId, payload);
        },
        meta: {
            globalLoaderMessage: "Saving image order...",
        },
        onSuccess: () => {
            setReorderDirty(false);
            qc.invalidateQueries({ queryKey: ["product", productId] });
            toast.push({ variant: "success", title: "Reordered", description: "Image order saved." });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Reorder failed", description: msg });
        },
    });

    const generateDescriptionMutation = useMutation({
        mutationFn: (payload) => generateProductDescription(payload),
        meta: {
            globalLoaderMessage: "Generating product description...",
        },
        onSuccess: (resp) => {
            const description = resp?.data?.data?.description;

            if (description) {
                form.setValue("description", description, {
                    shouldDirty: true,
                    shouldValidate: true,
                });

                toast.push({
                    variant: "success",
                    title: "Generated",
                    description: "Product description generated successfully.",
                });
            }
        },
        onError: (e) => {
            const msg =
                e?.response?.data?.error?.message ||
                e?.message ||
                "Failed to generate description";

            toast.push({
                variant: "error",
                title: "AI generation failed",
                description: msg,
            });
        },
    });

    function moveImage(fromIdx, toIdx) {
        setExistingImages((prev) => {
            const next = [...prev];
            const [item] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, item);
            return next;
        });
        setReorderDirty(true);
    }

    const watchedMrp = Number(form.watch("mrp_paise") || 0);
    const watchedSelling = Number(form.watch("selling_price_paise") || 0);
    const discountAmount = watchedMrp > watchedSelling ? watchedMrp - watchedSelling : 0;
    const discountPercent = watchedMrp > 0 && discountAmount > 0 ? Math.round((discountAmount / watchedMrp) * 100) : 0;

    const onValidSubmit = (v) => {
        saveMut.mutate({
            category_id: v.category_id,
            name: v.name,
            search_keywords: v.search_keywords?.trim() || null,
            description: v.description || null,
            tag: v.tag,
            unit: v.unit,
            base_quantity: Number(v.base_quantity),
            mrp_paise: rupeesToPaise(v.mrp_paise),
            selling_price_paise: rupeesToPaise(v.selling_price_paise),
            is_out_of_stock: !!v.is_out_of_stock,
            is_active: v.is_active ?? true,
            procurement_mode: "bulk",
            procurement_unit: v.procurement_unit,
        });
    };

    return (
        <div className="min-w-0 space-y-4 pb-20 sm:pb-8">
            <PageHeader
                title={
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate">{p?.name ? `Edit: ${p.name}` : "Edit Product"}</span>
                        {p?.category?.name && (
                            <span className="inline-flex items-center rounded-lg bg-dailyveg-100 px-2.5 py-0.5 text-xs font-bold text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                {p.category.name}
                            </span>
                        )}
                    </div>
                }
                subtitle={
                    p ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-slate-500">ID: {productId}</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className={`inline-flex items-center gap-1 font-semibold ${p.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${p.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {p.is_active ? "Active" : "Inactive"}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className={`font-semibold ${p.is_out_of_stock ? "text-amber-600" : "text-emerald-600"}`}>
                                {p.is_out_of_stock ? "Out of stock" : "In stock"}
                            </span>
                        </div>
                    ) : `Product #${productId}`
                }
                actions={
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                        <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
                            <Link to={`/products/${productId}`}>
                                <Eye className="h-4 w-4" />
                                <span>View Details</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
                            <Link to="/products">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to List</span>
                            </Link>
                        </Button>
                    </div>
                }
            />

            {prodQ.isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}
            {prodQ.isError ? (
                <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
                    {prodQ.error?.response?.data?.error?.message || prodQ.error?.message || "Failed to load"}
                    <div className="mt-2 text-xs text-slate-500">
                        Note: inactive products cannot be fetched by GET /v1/products/:id (backend limitation).
                    </div>
                </div>
            ) : null}

            <Card className="rounded-2xl border-slate-200/80 shadow-2xs dark:border-slate-800">
                <CardContent className="p-4 sm:p-6">
                    <form
                        className="grid gap-5 md:max-w-full md:grid-cols-2"
                        onSubmit={form.handleSubmit(onValidSubmit)}
                    >
                        {/* Section: Basic Info */}
                        <div className="md:col-span-2 flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                            <div className="grid h-7 w-7 place-items-center rounded-lg bg-dailyveg-50 text-dailyveg-600 dark:bg-dailyveg-950/60 dark:text-dailyveg-400">
                                <Package className="h-4 w-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Basic Information</h3>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs font-semibold">Category</Label>
                            <Controller
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <PremiumSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select category…"
                                        options={[
                                            { value: "", label: "Select category…" },
                                            ...categories.map((c) => ({
                                                value: c.id,
                                                label: c.name,
                                            })),
                                        ]}
                                    />
                                )}
                            />
                            {form.formState.errors.category_id ? (
                                <p className="text-xs text-red-600">{form.formState.errors.category_id.message}</p>
                            ) : null}
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs font-semibold">Product Name</Label>
                            <Input {...form.register("name")} className="rounded-xl h-10" placeholder="e.g. Fresh Red Tomatoes" />
                            {form.formState.errors.name ? (
                                <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
                            ) : null}
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs font-semibold">Search keywords (optional)</Label>
                            <Textarea
                                {...form.register("search_keywords")}
                                placeholder="e.g. Gajar, Guvar, Valor, Limbu"
                                className="rounded-xl resize-y min-h-[70px] text-sm"
                            />
                            <p className="text-[11px] text-slate-500">
                                Add comma-separated Gujarati names written in English characters to improve customer search results.
                            </p>
                            {form.formState.errors.search_keywords ? (
                                <p className="text-xs text-red-600">
                                    {form.formState.errors.search_keywords.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs font-semibold">Tag (optional)</Label>
                            <Input {...form.register("tag")} placeholder="e.g. organic, fresh, premium" className="rounded-xl h-10" />
                            {form.formState.errors.tag ? (
                                <p className="text-xs text-red-600">{form.formState.errors.tag.message}</p>
                            ) : null}
                        </div>

                        {/* Section: Description & AI */}
                        <div className="space-y-2 md:col-span-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Description</Label>
                                <button
                                    type="button"
                                    disabled={generateDescriptionMutation.isPending || isBusy}
                                    onClick={() => {
                                        const name = form.getValues("name")?.trim();

                                        if (!name) {
                                            toast.push({
                                                variant: "error",
                                                title: "Product name required",
                                                description: "Please enter product name first.",
                                            });
                                            return;
                                        }

                                        generateDescriptionMutation.mutate({ name });
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 hover:border-emerald-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-300"
                                >
                                    <RiGeminiFill className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ${generateDescriptionMutation.isPending ? 'animate-spin' : ''}`} />
                                    <span>{generateDescriptionMutation.isPending ? "Generating…" : "Generate with AI"}</span>
                                </button>
                            </div>

                            <Textarea
                                {...form.register("description")}
                                placeholder="Fresh farm tomatoes sourced daily directly from local farmers..."
                                className="rounded-xl resize-y min-h-[90px] text-sm"
                            />

                            {form.formState.errors.description ? (
                                <p className="text-xs text-red-600">
                                    {form.formState.errors.description.message}
                                </p>
                            ) : null}
                        </div>

                        {/* Section: Pricing & Units */}
                        <div className="md:col-span-2 flex items-center gap-2 border-b border-slate-100 pb-2.5 pt-4 dark:border-slate-800">
                            <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                                <IndianRupee className="h-4 w-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pricing & Measurements</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:col-span-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Unit</Label>
                                <Controller
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <PremiumSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select unit"
                                            options={[
                                                { value: "kg", label: "kg" },
                                                { value: "g", label: "g" },
                                                { value: "pc", label: "pc" },
                                            ]}
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Base quantity</Label>
                                <Input type="number" step="0.001" {...form.register("base_quantity", { valueAsNumber: true })} className="rounded-xl h-10" />
                                {form.formState.errors.base_quantity ? (
                                    <p className="text-xs text-red-600">{form.formState.errors.base_quantity.message}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs font-semibold">Procurement unit</Label>
                            <Controller
                                control={form.control}
                                name="procurement_unit"
                                render={({ field }) => (
                                    <PremiumSelect
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        options={PROCUREMENT_UNITS.map((unit) => ({
                                            value: unit,
                                            label: unit === "piece" ? "PC" : unit.toUpperCase(),
                                        }))}
                                    />
                                )}
                            />
                            {form.formState.errors.procurement_unit ? (
                                <p className="text-xs text-red-600">{form.formState.errors.procurement_unit.message}</p>
                            ) : null}
                        </div>

                        <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-300 md:col-span-2">
                            Products are procured in bulk by weight/loose units. Packing into retail packets is done inside the warehouse.
                        </p>

                        <div className="grid grid-cols-2 gap-3 md:col-span-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">MRP (₹)</Label>
                                <Input type="number" step="0.01" {...form.register("mrp_paise", { valueAsNumber: true })} className="rounded-xl h-10" />
                                {form.formState.errors.mrp_paise ? (
                                    <p className="text-xs text-red-600">{form.formState.errors.mrp_paise.message}</p>
                                ) : null}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Selling price (₹)</Label>
                                <Input type="number" step="0.01" {...form.register("selling_price_paise", { valueAsNumber: true })} className="rounded-xl h-10" />
                                {form.formState.errors.selling_price_paise ? (
                                    <p className="text-xs text-red-600">{form.formState.errors.selling_price_paise.message}</p>
                                ) : null}
                            </div>
                        </div>

                        {/* Live Price Calculator & Discount Pill */}
                        {(watchedMrp > 0 || watchedSelling > 0) && (
                            <div className="md:col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                                {watchedSelling > watchedMrp && watchedMrp > 0 ? (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>Warning: Selling price (₹{watchedSelling}) is higher than MRP (₹{watchedMrp}).</span>
                                    </div>
                                ) : discountAmount > 0 ? (
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                                            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                            <span>Customer Savings: ₹{discountAmount.toFixed(2)} ({discountPercent}% OFF)</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Selling at ₹{watchedSelling.toFixed(2)} / MRP ₹{watchedMrp.toFixed(2)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500">
                                        Selling at MRP (No discount applied).
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section: Status & Availability */}
                        <div className="md:col-span-2 flex items-center gap-2 border-b border-slate-100 pb-2.5 pt-4 dark:border-slate-800">
                            <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                <Layers className="h-4 w-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status & Availability</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
                            <label
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                                    form.watch("is_active")
                                        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/80 dark:bg-emerald-950/20"
                                        : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40"
                                }`}
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span className={`h-2 w-2 rounded-full ${form.watch("is_active") ? "bg-emerald-500" : "bg-slate-400"}`} />
                                        Catalog Visibility
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                        {form.watch("is_active") ? "Active • Visible in mobile app" : "Inactive • Hidden from customers"}
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    {...form.register("is_active")}
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                            </label>

                            <label
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                                    form.watch("is_out_of_stock")
                                        ? "border-amber-200 bg-amber-50/60 dark:border-amber-800/80 dark:bg-amber-950/20"
                                        : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40"
                                }`}
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span className={`h-2 w-2 rounded-full ${form.watch("is_out_of_stock") ? "bg-amber-500" : "bg-emerald-500"}`} />
                                        Inventory Availability
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                        {form.watch("is_out_of_stock") ? "Out of stock • Orders blocked" : "In stock • Ready for ordering"}
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    {...form.register("is_out_of_stock")}
                                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                />
                            </label>
                        </div>

                        <div className="md:col-span-2 text-[11px] text-slate-400">
                            Backend requires full payload on update (category_id, name, unit, base_quantity, mrp_paise, selling_price_paise).
                        </div>

                        {/* ------------------ IMAGES ------------------ */}
                        <div className="md:col-span-2 mt-4 border-t border-slate-200 pt-6 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                                        <ImageIcon className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Product Images</h3>
                                </div>
                                <span className="text-xs text-slate-500 font-medium">
                                    {existingImages.length} image{existingImages.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            <div className="mt-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Existing images</div>

                                {!existingImages.length ? (
                                    <div className="mt-2 text-xs text-slate-500">No images found for this product.</div>
                                ) : (
                                    <>
                                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                            {existingImages.map((img, idx) => (
                                                <div
                                                    key={img.id}
                                                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                                                >
                                                    <div className="aspect-square bg-slate-50 dark:bg-slate-900 relative">
                                                        <img
                                                            src={assetUrl(img.image_url)}
                                                            alt={p?.name || "Product"}
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <ImageSizeInfo src={assetUrl(img.image_url)} />
                                                        <div className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                                                            #{idx + 1} {idx === 0 ? "• Cover" : ""}
                                                        </div>
                                                    </div>

                                                    <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                                                        <div className="grid grid-cols-3 gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-1 text-xs"
                                                                disabled={idx === 0 || isBusy}
                                                                onClick={() => moveImage(idx, idx - 1)}
                                                                title="Move Earlier"
                                                            >
                                                                <ArrowUp className="h-3.5 w-3.5" />
                                                                <span className="sr-only sm:not-sr-only sm:ml-1 text-[11px]">Up</span>
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-1 text-xs"
                                                                disabled={idx === existingImages.length - 1 || isBusy}
                                                                onClick={() => moveImage(idx, idx + 1)}
                                                                title="Move Later"
                                                            >
                                                                <ArrowDown className="h-3.5 w-3.5" />
                                                                <span className="sr-only sm:not-sr-only sm:ml-1 text-[11px]">Down</span>
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-8 px-1 text-xs"
                                                                disabled={isBusy}
                                                                onClick={() => setDeleteDialog({ open: true, image: img })}
                                                                title="Delete Image"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                <span className="sr-only sm:not-sr-only sm:ml-1 text-[11px]">Del</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                variant={reorderDirty ? "default" : "outline"}
                                                className={`h-9 rounded-xl text-xs font-semibold ${reorderDirty ? "bg-dailyveg-600 text-white hover:bg-dailyveg-700" : ""}`}
                                                disabled={!reorderDirty || reorderMut.isPending}
                                                onClick={() => reorderMut.mutate()}
                                            >
                                                {reorderMut.isPending ? "Saving order…" : "Save image order"}
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="h-9 rounded-xl text-xs"
                                                disabled={!reorderDirty || isBusy}
                                                onClick={() => {
                                                    const imgs = normalizeImages(p);
                                                    imgs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                                                    setExistingImages(imgs);
                                                    setReorderDirty(false);
                                                }}
                                            >
                                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                                Reset order
                                            </Button>
                                            {reorderDirty && (
                                                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                    • Unsaved order changes
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Add new images</div>
                                <div className="mt-1 text-xs text-slate-500">
                                    Select images and click <b>Upload</b> to add them to this product.
                                </div>

                                <div className="mt-3">
                                    <ProductImagePicker value={newImages} onChange={setNewImages} maxFiles={10} />
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        className="h-9 rounded-xl bg-dailyveg-600 text-xs font-semibold text-white hover:bg-dailyveg-700 disabled:opacity-50"
                                        disabled={!newImages.length || uploadImagesMut.isPending}
                                        onClick={() => uploadImagesMut.mutate()}
                                    >
                                        <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                                        {uploadImagesMut.isPending ? "Uploading…" : `Upload (${newImages.length})`}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 rounded-xl text-xs"
                                        disabled={!newImages.length || isBusy}
                                        onClick={() => setNewImages([])}
                                    >
                                        Clear selection
                                    </Button>

                                    {newImages.length ? (
                                        <div className="text-xs font-medium text-slate-500">{newImages.length} new image(s) ready to upload.</div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {/* ------------------ SAVE / RESET AT VERY BOTTOM ------------------ */}
                        <div className="md:col-span-2 mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 w-full sm:w-auto rounded-xl gap-1.5"
                                disabled={isBusy}
                                onClick={() => {
                                    form.reset();
                                    setNewImages([]);
                                    const imgs = normalizeImages(p);
                                    imgs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                                    setExistingImages(imgs);
                                    setReorderDirty(false);
                                }}
                            >
                                <RotateCcw className="h-4 w-4" />
                                <span>Reset Changes</span>
                            </Button>
                            <Button
                                type="submit"
                                className="h-10 w-full sm:w-auto rounded-xl bg-dailyveg-600 font-bold text-white hover:bg-dailyveg-700 gap-1.5 shadow-sm"
                                disabled={saveMut.isPending}
                            >
                                <Save className="h-4 w-4" />
                                <span>{saveMut.isPending ? "Saving Product…" : "Save Changes"}</span>
                            </Button>
                        </div>
                    </form>

                    {/* Delete confirmation dialog */}
                    <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((s) => ({ ...s, open }))}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Delete image?</DialogTitle>
                            </DialogHeader>

                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                This will permanently remove the image from this product.
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={deleteImageMut.isPending}
                                    onClick={() => setDeleteDialog({ open: false, image: null })}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={deleteImageMut.isPending}
                                    onClick={() => {
                                        const id = deleteDialog.image?.id;
                                        if (!id) return;
                                        deleteImageMut.mutate(id);
                                    }}
                                >
                                    {deleteImageMut.isPending ? "Deleting…" : "Delete"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>

            {/* Freshness & Inventory Policy */}
            {p && (
                <div className="mt-6">
                    <ProductFreshnessPolicyCard productId={productId} product={p} />
                </div>
            )}

            {/* Mobile Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 p-3 backdrop-blur-md shadow-lg dark:border-slate-800 dark:bg-slate-950/95 sm:hidden">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl px-3"
                        asChild
                    >
                        <Link to={`/products/${productId}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        onClick={() => form.handleSubmit(onValidSubmit)()}
                        disabled={saveMut.isPending}
                        className="h-10 flex-1 rounded-xl bg-dailyveg-600 font-bold text-white hover:bg-dailyveg-700 shadow-sm gap-1.5"
                    >
                        <Save className="h-4 w-4" />
                        <span>{saveMut.isPending ? "Saving…" : "Save Product"}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
