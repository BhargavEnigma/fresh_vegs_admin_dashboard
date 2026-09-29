import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { VendorService } from "../../../api/services/vendor.service";
import { listAdminProducts } from "../../../api/services/products.service";
import { vendorProductSchema } from "../../../validations/vendors";
import {
  formatQuantityWithUnit,
  formatVendorPriceUpdatedAt,
  formatVendorMoney,
  vendorUnitCostPaise,
} from "../../../utils/vendor-assignment";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { PremiumSelect } from "../../../components/ui/premium-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { useToast } from "../../../components/toast/toast-context";

const defaults = {
  product_id: "",
  product_pack_id: null,
  is_available: true,
  minimum_quantity: "",
  maximum_quantity: "",
  lead_time_hours: "",
  status: "active",
};

function errorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback
  );
}

function FieldError({ error }) {
  return error ? <p className="mt-1 text-xs text-red-600">{error.message}</p> : null;
}

function normalizeProducts(response) {
  return response?.data?.products ?? response?.products ?? [];
}

function productIdOf(entry) {
  return entry.product_id || entry.product?.id;
}

function packIdOf(entry) {
  return entry.product_pack_id ?? entry.product_pack?.id ?? entry.pack?.id ?? null;
}

function procurementUnitOf(value) {
  const raw = String(value?.procurement_unit || value?.product?.procurement_unit || "unit").toLowerCase().trim();
  return ["piece", "pieces", "pcs", "pc"].includes(raw) ? "pc" : raw;
}

function ProductFormDialog({ vendor, entry, catalogue, open, onOpenChange }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(entry);
  const productsQuery = useQuery({
    queryKey: ["admin", "vendorProductChoices"],
    queryFn: () => listAdminProducts({ page: 1, limit: 500, include_inactive: false }),
    staleTime: 5 * 60 * 1000,
  });
  const products = normalizeProducts(productsQuery.data);
  const form = useForm({
    resolver: zodResolver(vendorProductSchema),
    values: entry
      ? {
          product_id: productIdOf(entry) || "",
          product_pack_id: packIdOf(entry),
          is_available: entry.is_available !== false,
          minimum_quantity: entry.minimum_quantity ?? "",
          maximum_quantity: entry.maximum_quantity ?? "",
          lead_time_hours: entry.lead_time_hours ?? "",
          status: entry.status || "active",
        }
      : defaults,
  });
  const selectedProductId = form.watch("product_id");
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const procurementUnit = (() => {
    const raw = String(selectedProduct?.procurement_unit || selectedProduct?.unit || "unit").toLowerCase().trim();
    if (raw === "g" || raw === "gram" || raw === "grams") return "kg";
    if (raw === "ml" || raw === "milliliter" || raw === "milliliters") return "l";
    if (["piece", "pieces", "pcs", "pc"].includes(raw)) return "pc";
    return raw;
  })();

  const mutation = useMutation({
    mutationFn: (values) => {
      const duplicate = catalogue.some(
        (candidate) =>
          candidate.id !== entry?.id &&
          productIdOf(candidate) === values.product_id
      );
      if (duplicate) throw new Error("This product is already configured for the vendor");
      const payload = {
        product_id: values.product_id,
        product_pack_id: null,
        is_available: values.is_available,
        minimum_quantity: values.minimum_quantity === null ? null : String(values.minimum_quantity),
        maximum_quantity: values.maximum_quantity === null ? null : String(values.maximum_quantity),
        lead_time_hours: values.lead_time_hours,
        status: values.status,
      };
      return isEdit
        ? VendorService.updateProduct(vendor.id, entry.id, payload)
        : VendorService.createProduct(vendor.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendorProducts", vendor.id] });
      toast.success(isEdit ? "Vendor product updated" : "Vendor product added");
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Failed to save vendor product")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90dvh] overflow-y-auto thin-scrollbar rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg sm:text-xl font-bold">
            {isEdit ? "Edit Vendor Product" : "Add Product to Catalogue"}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Product *</Label>
              <PremiumSelect
                value={selectedProductId}
                onChange={(value) => {
                  form.setValue("product_id", value, { shouldValidate: true });
                  form.setValue("product_pack_id", null);
                }}
                options={products.map((product) => ({ value: product.id, label: product.name }))}
                placeholder={productsQuery.isLoading ? "Loading products…" : "Select product"}
                isDisabled={isEdit || productsQuery.isLoading}
              />
              <FieldError error={form.formState.errors.product_id} />
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <Badge variant="success">Bulk Procurement</Badge>
                <span className="font-semibold text-xs text-emerald-900 dark:text-emerald-200">{procurementUnit ? procurementUnit.toUpperCase() : "Unit required"}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                This product is procured in bulk by weight/loose units. Packing into retail packets is done inside the warehouse.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold">
                Vendor price per {procurementUnit ? procurementUnit.toUpperCase() : "unit"} (read only)
              </Label>
              <div className="mt-1 flex min-h-10 items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                <span className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
                  {isEdit && vendorUnitCostPaise(entry) > 0
                    ? `${formatVendorMoney(vendorUnitCostPaise(entry))} / ${procurementUnit.toUpperCase()}`
                    : `₹0.00 / ${procurementUnit.toUpperCase()}`}
                </span>
                <Badge variant={isEdit && vendorUnitCostPaise(entry) > 0 ? "success" : "warning"} className="text-[11px]">
                  {isEdit && vendorUnitCostPaise(entry) > 0 ? "Set by vendor" : "Not set by vendor"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Only the vendor can set or update this price from the OPS mobile app. Admin cannot edit it here.
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Last updated: {formatVendorPriceUpdatedAt(entry?.price_updated_at)}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vendor-min-quantity" className="text-xs font-semibold">Minimum quantity ({procurementUnit.toUpperCase()}) — optional</Label>
              <Input id="vendor-min-quantity" className="h-11 rounded-xl" type="number" min="0" step={procurementUnit === "pc" ? "1" : "0.001"} placeholder="Not set" {...form.register("minimum_quantity")} />
              <FieldError error={form.formState.errors.minimum_quantity} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vendor-max-quantity" className="text-xs font-semibold">Maximum quantity ({procurementUnit.toUpperCase()}) — optional</Label>
              <Input id="vendor-max-quantity" className="h-11 rounded-xl" type="number" min={procurementUnit === "pc" ? "1" : "0.001"} step={procurementUnit === "pc" ? "1" : "0.001"} placeholder="Not set (unlimited)" {...form.register("maximum_quantity")} />
              <FieldError error={form.formState.errors.maximum_quantity} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vendor-lead-time" className="text-xs font-semibold">Lead time (hours) — optional</Label>
              <Input id="vendor-lead-time" className="h-11 rounded-xl" type="number" min="0" step="1" placeholder="Not set" {...form.register("lead_time_hours")} />
              <FieldError error={form.formState.errors.lead_time_hours} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <PremiumSelect
                value={form.watch("status")}
                onChange={(value) => form.setValue("status", value, { shouldValidate: true })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            <label className="sm:col-span-2 flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm font-medium cursor-pointer hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <input type="checkbox" className="h-4 w-4 rounded accent-dailyveg-600" {...form.register("is_available")} />
              <span>Available for active procurement orders</span>
            </label>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 pt-3 sm:flex sm:justify-end">
            <Button type="button" variant="outline" className="h-10 sm:h-9 rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="h-10 sm:h-9 rounded-xl" disabled={mutation.isPending || productsQuery.isError}>
              {mutation.isPending ? "Saving…" : "Save product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VendorProductsDialog({ vendor, open, onOpenChange }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const productsQuery = useQuery({
    queryKey: ["admin", "vendorProducts", vendor.id],
    queryFn: () => VendorService.getProducts(vendor.id),
    refetchInterval: open ? 10000 : false,
    refetchOnWindowFocus: true,
  });
  const catalogue = productsQuery.data || [];
  const deleteMutation = useMutation({
    mutationFn: (entry) => VendorService.removeProduct(vendor.id, entry.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendorProducts", vendor.id] });
      toast.success("Vendor product removed");
    },
    onError: (error) => toast.error(errorMessage(error, "Failed to remove vendor product")),
  });

  const rows = useMemo(
    () =>
      catalogue.map((entry) => ({
        ...entry,
        productName: entry.product?.name || entry.product_name || "Unknown product",
        packName: entry.procurement_mode === "bulk"
          ? "Product-level bulk supply"
          : (
              entry.product_pack?.pack_label ||
              entry.product_pack?.label ||
              entry.pack?.pack_label ||
              entry.pack_label ||
              "Product-level pack fallback"
            ),
      })),
    [catalogue]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[90dvh] overflow-y-auto thin-scrollbar rounded-2xl p-4 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg sm:text-xl font-bold">{vendor.company_name} Product Catalogue</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs sm:text-sm text-slate-500">
              Retail packs define customer sizes. Bulk vendors supply in the configured procurement unit. Prices are updated by vendors in the OPS app.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 flex-1 sm:flex-initial" onClick={() => productsQuery.refetch()} disabled={productsQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${productsQuery.isFetching ? "animate-spin" : ""}`} /> Retry
              </Button>
              <Button size="sm" className="h-9 gap-1.5 flex-1 sm:flex-initial" onClick={() => setEditing({ mode: "create" })}>
                <Plus className="h-4 w-4" /> Add product
              </Button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border thin-scrollbar dark:border-slate-800">
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Procurement type</th>
                  <th className="px-3 py-3">Supply format / pack</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Availability</th>
                  <th className="px-3 py-3">Vendor price / unit</th>
                  <th className="px-3 py-3">Price last updated</th>
                  <th className="px-3 py-3">Minimum</th>
                  <th className="px-3 py-3">Maximum</th>
                  <th className="px-3 py-3">Lead time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {productsQuery.isLoading ? (
                  <tr><td colSpan="12" className="p-8 text-center text-slate-500">Loading catalogue…</td></tr>
                ) : productsQuery.isError ? (
                  <tr><td colSpan="12" className="p-8 text-center text-red-600">Could not load this catalogue. Use Retry to try again.</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="12" className="p-8 text-center text-slate-500">No products configured for this vendor.</td></tr>
                ) : rows.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-3 font-semibold">{entry.productName}</td>
                    <td className="px-3 py-3"><Badge variant={entry.procurement_mode === "bulk" ? "success" : "outline"}>{entry.procurement_mode === "bulk" ? "Bulk" : "Pack"}</Badge></td>
                    <td className="px-3 py-3">{entry.packName}</td>
                    <td className="px-3 py-3 font-medium">{procurementUnitOf(entry).toUpperCase()}</td>
                    <td className="px-3 py-3">
                      <Badge variant={entry.is_available ? "success" : "outline"}>{entry.is_available ? "Available" : "Unavailable"}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      {vendorUnitCostPaise(entry) > 0
                        ? `${formatVendorMoney(vendorUnitCostPaise(entry))} / ${procurementUnitOf(entry).toUpperCase()}`
                        : <Badge variant="warning">Not set by vendor</Badge>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatVendorPriceUpdatedAt(entry.price_updated_at)}
                    </td>
                    <td className="px-3 py-3">{formatQuantityWithUnit(entry.minimum_quantity, procurementUnitOf(entry), "Not set")}</td>
                    <td className="px-3 py-3">{formatQuantityWithUnit(entry.maximum_quantity, procurementUnitOf(entry), "Not set (unlimited)")}</td>
                    <td className="px-3 py-3">{entry.lead_time_hours === null || entry.lead_time_hours === undefined ? "Not set" : `${entry.lead_time_hours}h`}</td>
                    <td className="px-3 py-3"><Badge variant={entry.status === "active" ? "success" : "outline"}>{entry.status || "inactive"}</Badge></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label={`Edit ${entry.productName}`} onClick={() => setEditing({ mode: "edit", entry })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" aria-label={`Remove ${entry.productName}`} onClick={() => setDeleting(entry)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Product Cards */}
          <div className="space-y-3 md:hidden">
            {productsQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-dailyveg-500" />
                Loading catalogue…
              </div>
            ) : productsQuery.isError ? (
              <div className="p-8 text-center text-sm text-red-600">
                Could not load this catalogue. Use Retry to try again.
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
                No products configured for this vendor. Tap "Add product" above to link one.
              </div>
            ) : (
              rows.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950 space-y-3"
                >
                  {/* Product Title & Type */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {entry.productName}
                      </h4>
                      <div className="mt-0.5 text-xs text-slate-500 font-medium truncate">
                        {entry.packName} · <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{procurementUnitOf(entry)}</span>
                      </div>
                    </div>
                    <Badge variant={entry.procurement_mode === "bulk" ? "success" : "outline"} className="shrink-0 text-[10px]">
                      {entry.procurement_mode === "bulk" ? "Bulk Supply" : "Retail Pack"}
                    </Badge>
                  </div>

                  {/* Vendor Price Banner */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Vendor Price</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {vendorUnitCostPaise(entry) > 0
                          ? `${formatVendorMoney(vendorUnitCostPaise(entry))} / ${procurementUnitOf(entry).toUpperCase()}`
                          : "₹0.00 (Not set)"}
                      </span>
                    </div>
                    <Badge variant={vendorUnitCostPaise(entry) > 0 ? "success" : "warning"} className="text-[10px]">
                      {vendorUnitCostPaise(entry) > 0 ? "Set by vendor" : "Price not set"}
                    </Badge>
                  </div>

                  {/* Quantity & Lead Time grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50/70 p-2 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Min Qty</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatQuantityWithUnit(entry.minimum_quantity, procurementUnitOf(entry), "None")}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50/70 p-2 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Max Qty</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatQuantityWithUnit(entry.maximum_quantity, procurementUnitOf(entry), "Unlimited")}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50/70 p-2 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Lead Time</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {entry.lead_time_hours === null || entry.lead_time_hours === undefined ? "—" : `${entry.lead_time_hours}h`}
                      </span>
                    </div>
                  </div>

                  {/* Status & Availability + Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={entry.is_available ? "success" : "outline"} className="text-[10px]">
                        {entry.is_available ? "Available" : "Unavailable"}
                      </Badge>
                      <Badge variant={entry.status === "active" ? "success" : "outline"} className="text-[10px] capitalize">
                        {entry.status || "inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs gap-1"
                        onClick={() => setEditing({ mode: "edit", entry })}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400"
                        onClick={() => setDeleting(entry)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 dark:border-slate-900 mt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto h-10 sm:h-9" onClick={() => onOpenChange(false)}>
              Close Catalogue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editing && (
        <ProductFormDialog
          vendor={vendor}
          entry={editing.mode === "edit"
            ? catalogue.find((candidate) => candidate.id === editing.entry.id) || editing.entry
            : null}
          catalogue={catalogue}
          open
          onOpenChange={(nextOpen) => !nextOpen && setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(nextOpen) => !nextOpen && setDeleting(null)}
        title="Remove vendor product?"
        description="This product mapping will no longer be available for automatic or manual assignment."
        confirmText="Remove"
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(deleting);
          } finally {
            setDeleting(null);
          }
        }}
      />
    </>
  );
}
