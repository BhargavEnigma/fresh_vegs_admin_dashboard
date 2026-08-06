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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vendor product" : "Add vendor product"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Product</Label>
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
                <span className="font-semibold">{procurementUnit ? procurementUnit.toUpperCase() : "Unit required"}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                This product is procured in bulk by weight/loose units. Packing into retail packets is done inside the warehouse.
              </p>
            </div>
            <div>
              <Label>
                Vendor price per {procurementUnit ? procurementUnit.toUpperCase() : "unit"} (read only)
              </Label>
              <div className="mt-1 flex min-h-10 items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  {isEdit && vendorUnitCostPaise(entry) > 0
                    ? `${formatVendorMoney(vendorUnitCostPaise(entry))} / ${procurementUnit.toUpperCase()}`
                    : `₹0.00 / ${procurementUnit.toUpperCase()}`}
                </span>
                <Badge variant={isEdit && vendorUnitCostPaise(entry) > 0 ? "success" : "warning"}>
                  {isEdit && vendorUnitCostPaise(entry) > 0 ? "Set by vendor" : "Not set by vendor"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Only the vendor can set or update this price from the OPS mobile app. Admin cannot edit it here.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                Last updated: {formatVendorPriceUpdatedAt(entry?.price_updated_at)}
              </p>
            </div>
            <div>
              <Label htmlFor="vendor-min-quantity">Minimum quantity ({procurementUnit.toUpperCase()}) — optional</Label>
              <Input id="vendor-min-quantity" type="number" min="0" step="0.001" placeholder="Not set" {...form.register("minimum_quantity")} />
              <FieldError error={form.formState.errors.minimum_quantity} />
            </div>
            <div>
              <Label htmlFor="vendor-max-quantity">Maximum quantity ({procurementUnit.toUpperCase()}) — optional</Label>
              <Input id="vendor-max-quantity" type="number" min="0.001" step="0.001" placeholder="Not set (unlimited)" {...form.register("maximum_quantity")} />
              <FieldError error={form.formState.errors.maximum_quantity} />
            </div>
            <div>
              <Label htmlFor="vendor-lead-time">Lead time (hours) — optional</Label>
              <Input id="vendor-lead-time" type="number" min="0" step="1" placeholder="Not set" {...form.register("lead_time_hours")} />
              <FieldError error={form.formState.errors.lead_time_hours} />
            </div>
            <div>
              <Label>Status</Label>
              <PremiumSelect
                value={form.watch("status")}
                onChange={(value) => form.setValue("status", value, { shouldValidate: true })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            <label className="flex min-h-10 items-center gap-3 self-end rounded-xl border px-3 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-dailyveg-600" {...form.register("is_available")} />
              Available for procurement
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || productsQuery.isError}>
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
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{vendor.company_name} product catalogue</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              Retail packs define customer-facing sizes. Bulk vendors supply the underlying product in its configured procurement unit.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => productsQuery.refetch()} disabled={productsQuery.isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${productsQuery.isFetching ? "animate-spin" : ""}`} /> Retry
              </Button>
              <Button size="sm" onClick={() => setEditing({ mode: "create" })}>
                <Plus className="mr-2 h-4 w-4" /> Add product
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border thin-scrollbar dark:border-slate-800">
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
