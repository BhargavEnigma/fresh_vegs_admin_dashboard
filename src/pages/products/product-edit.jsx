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

    const isBusy = saveMut.isPending || uploadImagesMut.isPending || deleteImageMut.isPending || reorderMut.isPending;

    return (
        <div>
            <PageHeader
                title="Edit Product"
                subtitle={`PUT /v1/admin/product/${productId}`}
                actions={
                    <Button asChild variant="outline">
                        <Link to={`/products/${productId}`}>Back</Link>
                    </Button>
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

            <Card>
                <CardContent className="pt-6">
                    <form
                        className="grid gap-4 md:max-w-full md:grid-cols-2"
                        onSubmit={form.handleSubmit((v) => {

                            console.log("submitted values:", v);
                            console.log("watched tag:", form.watch("tag"));

                            saveMut.mutate({
                                category_id: v.category_id,
                                name: v.name,
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
                            })
                        })}
                    >
                        <div className="space-y-2 md:col-span-2">
                            <Label>Category</Label>
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

                        <div className="space-y-2 md:col-span-2">
                            <Label>Name</Label>
                            <Input {...form.register("name")} />
                            {form.formState.errors.name ? (
                                <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
                            ) : null}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Description</Label>

                            <Textarea
                                {...form.register("description")}
                                placeholder="Fresh farm tomatoes"
                            />

                            <div className="flex items-center justify-end">
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
                                    className="flex items-center text-xs font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-400 dark:hover:text-emerald-300"
                                >
                                    <span><RiGeminiFill className="text-lg me-1"/></span> {generateDescriptionMutation.isPending ? "Generating…" : "Generate with AI"}
                                </button>
                            </div>

                            {form.formState.errors.description ? (
                                <p className="text-xs text-red-600">
                                    {form.formState.errors.description.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Tag (optional)</Label>
                            <Input {...form.register("tag")} placeholder="e.g. organic, fresh, premium" />
                            {form.formState.errors.tag ? (
                                <p className="text-xs text-red-600">{form.formState.errors.tag.message}</p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label>Unit</Label>
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

                        <div className="space-y-2">
                            <Label>Base quantity</Label>
                            <Input type="number" step="0.001" {...form.register("base_quantity", { valueAsNumber: true })} />
                            {form.formState.errors.base_quantity ? (
                                <p className="text-xs text-red-600">{form.formState.errors.base_quantity.message}</p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label>Procurement unit</Label>
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

                        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300 md:col-span-2">
                            Products are procured in bulk by weight/loose units. Packing into retail packets is done inside the warehouse.
                        </p>

                        <div className="space-y-2">
                            <Label>MRP (₹)</Label>
                            <Input type="number" step="0.01" {...form.register("mrp_paise", { valueAsNumber: true })} />
                            {form.formState.errors.mrp_paise ? (
                                <p className="text-xs text-red-600">{form.formState.errors.mrp_paise.message}</p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label>Selling price (₹)</Label>
                            <Input type="number" step="0.01" {...form.register("selling_price_paise", { valueAsNumber: true })} />
                            {form.formState.errors.selling_price_paise ? (
                                <p className="text-xs text-red-600">{form.formState.errors.selling_price_paise.message}</p>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-4 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" {...form.register("is_out_of_stock")} />
                                Out of stock
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" {...form.register("is_active")} />
                                Active
                            </label>
                        </div>

                        <div className="md:col-span-2 text-xs text-slate-500">
                            Backend requires full payload on update (category_id, name, unit, base_quantity, mrp_paise,
                            selling_price_paise).
                        </div>

                        {/* ------------------ IMAGES ------------------ */}
                        <div className="md:col-span-2 mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
                            <div className="text-base font-semibold">Product Images</div>

                            <div className="mt-4">
                                <div className="text-sm font-semibold">Existing images</div>

                                {!existingImages.length ? (
                                    <div className="mt-2 text-xs text-slate-500">No images found for this product.</div>
                                ) : (
                                    <>
                                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                            {existingImages.map((img, idx) => (
                                                <div
                                                    key={img.id}
                                                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                                                >
                                                    <div className="aspect-square bg-slate-50 dark:bg-slate-900 relative">
                                                        <img
                                                            src={assetUrl(img.image_url)}
                                                            alt={p?.name || "Product"}
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <ImageSizeInfo src={assetUrl(img.image_url)} />
                                                    </div>

                                                    <div className="p-2 space-y-2">
                                                        <div className="flex gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="w-full"
                                                                disabled={idx === 0 || isBusy}
                                                                onClick={() => moveImage(idx, idx - 1)}
                                                            >
                                                                Up
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="w-full"
                                                                disabled={idx === existingImages.length - 1 || isBusy}
                                                                onClick={() => moveImage(idx, idx + 1)}
                                                            >
                                                                Down
                                                            </Button>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            className="w-full"
                                                            disabled={isBusy}
                                                            onClick={() => setDeleteDialog({ open: true, image: img })}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={!reorderDirty || reorderMut.isPending}
                                                onClick={() => reorderMut.mutate()}
                                            >
                                                {reorderMut.isPending ? "Saving order…" : "Save image order"}
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                disabled={!reorderDirty || isBusy}
                                                onClick={() => {
                                                    const imgs = normalizeImages(p);
                                                    imgs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                                                    setExistingImages(imgs);
                                                    setReorderDirty(false);
                                                }}
                                            >
                                                Reset order
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-8">
                                <div className="text-sm font-semibold">Add new images</div>
                                <div className="mt-2 text-xs text-slate-500">
                                    Select images and click <b>Upload</b>.
                                </div>

                                <div className="mt-3">
                                    <ProductImagePicker value={newImages} onChange={setNewImages} maxFiles={10} />
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        disabled={!newImages.length || uploadImagesMut.isPending}
                                        onClick={() => uploadImagesMut.mutate()}
                                    >
                                        {uploadImagesMut.isPending ? "Uploading…" : "Upload"}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!newImages.length || isBusy}
                                        onClick={() => setNewImages([])}
                                    >
                                        Clear selection
                                    </Button>

                                    {newImages.length ? (
                                        <div className="text-xs text-slate-500">{newImages.length} new image(s) selected.</div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {/* ------------------ SAVE / RESET AT VERY BOTTOM ------------------ */}
                        <div className="md:col-span-2 mt-8 flex gap-2 justify-end">
                            <Button type="submit" disabled={saveMut.isPending}>
                                {saveMut.isPending ? "Saving…" : "Save"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
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
                                Reset
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
        </div>
    );
}
