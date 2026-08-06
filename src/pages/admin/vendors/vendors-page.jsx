import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
} from "lucide-react";

import { VendorService } from "../../../api/services/vendor.service";
import { WarehousesService } from "../../../api/services/warehouses.service";
import { vendorCreateSchema, vendorEditSchema } from "../../../validations/vendors";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
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
import { VendorProductsDialog } from "./vendor-products-dialog";

import { VendorWorkflowGuide } from "../../../components/common/vendor-workflow-guide";

const defaults = {
  phone: "",
  full_name: "",
  email: "",
  company_name: "",
  status: "active",
  warehouse_id: "",
};

function FieldError({ error }) {
  return error ? <p className="mt-1 text-xs text-red-600">{error.message}</p> : null;
}

function VendorFormDialog({ vendor, open, onOpenChange }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(vendor);

  const warehousesQuery = useQuery({
    queryKey: ["admin", "warehouses"],
    queryFn: () => WarehousesService.list(),
    enabled: open,
  });
  const warehouses = warehousesQuery.data || [];

  const form = useForm({
    resolver: zodResolver(isEdit ? vendorEditSchema : vendorCreateSchema),
    values: vendor
      ? {
          full_name: vendor.user?.full_name || "",
          email: vendor.user?.email || "",
          company_name: vendor.company_name || "",
          status: vendor.status || "active",
          warehouse_id: vendor.warehouse?.id || vendor.warehouse_id || "",
        }
      : defaults,
  });

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = { 
        ...values, 
        email: values.email || null,
        warehouse_id: values.warehouse_id || null,
      };
      return isEdit
        ? VendorService.update(vendor.id, payload)
        : VendorService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      toast.success(isEdit ? "Vendor updated" : "Vendor added");
      form.reset(defaults);
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.message || error?.message || `Failed to ${isEdit ? "update" : "add"} vendor`
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vendor" : "Add vendor"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="vendor-company">Company name</Label>
              <Input id="vendor-company" {...form.register("company_name")} />
              <FieldError error={form.formState.errors.company_name} />
            </div>
            <div>
              <Label htmlFor="vendor-name">Contact person</Label>
              <Input id="vendor-name" {...form.register("full_name")} />
              <FieldError error={form.formState.errors.full_name} />
            </div>
            {!isEdit && (
              <div>
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input id="vendor-phone" inputMode="tel" placeholder="+919876543210" {...form.register("phone")} />
                <FieldError error={form.formState.errors.phone} />
              </div>
            )}
            <div>
              <Label htmlFor="vendor-email">Email</Label>
              <Input id="vendor-email" type="email" {...form.register("email")} />
              <FieldError error={form.formState.errors.email} />
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
            <div>
              <Label>Assigned Warehouse</Label>
              <PremiumSelect
                value={form.watch("warehouse_id") || ""}
                onChange={(value) => form.setValue("warehouse_id", value, { shouldValidate: true })}
                options={[
                  { value: "", label: "Select Warehouse (Optional)" },
                  ...warehouses.map((wh) => ({ value: wh.id, label: wh.name })),
                ]}
                disabled={warehousesQuery.isLoading}
              />
              <FieldError error={form.formState.errors.warehouse_id} />
            </div>
          </div>
          {isEdit && (
            <p className="text-xs text-slate-500">Phone numbers are locked and cannot be changed.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VendorsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [catalogueVendor, setCatalogueVendor] = useState(null);
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem("fv_show_vendor_guide") !== "false";
  });

  const toggleGuide = () => {
    const next = !showGuide;
    setShowGuide(next);
    localStorage.setItem("fv_show_vendor_guide", String(next));
  };

  const vendorsQuery = useQuery({
    queryKey: ["admin", "vendors"],
    queryFn: VendorService.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (vendor) => VendorService.remove(vendor.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      toast.success("Vendor deleted");
    },
    onError: (error) => {
      if (error?.response?.status === 409) {
        toast.warning("Cannot delete vendor with active assignments in progress");
      } else {
        toast.error(error?.response?.data?.message || error?.message || "Failed to delete vendor");
      }
    },
  });

  const vendors = vendorsQuery.data || [];

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Manage procurement suppliers and their contact details."
        actions={
          <div className="flex gap-2">
            <VendorWorkflowGuide />
            <Button onClick={() => setFormState({ mode: "create" })}>
              <Plus className="mr-2 h-4 w-4" /> Add vendor
            </Button>
          </div>
        }
      />

      {/* Interactive Guide Block */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <button
          type="button"
          onClick={toggleGuide}
          className="flex w-full items-center justify-between p-4 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-dailyveg-600 dark:text-dailyveg-400" />
            <span>How Vendor Procurement Works (Easy Step-by-Step Guide)</span>
          </div>
          {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showGuide && (
          <div className="border-t border-slate-100 p-5 dark:border-slate-800 text-sm space-y-6">
            <div className="grid gap-6 md:grid-cols-3 text-left">
              {/* Column 1: Step-by-Step Flow */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-dailyveg-700 dark:text-dailyveg-400 flex items-center gap-1.5 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dailyveg-100 text-dailyveg-700 text-xs font-bold dark:bg-dailyveg-950 dark:text-dailyveg-400">1</span>
                  Simple Step-by-Step Flow
                </h4>
                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-decimal pl-4">
                  <li><strong>Register Supplier:</strong> Add the vendor company profile with a locked phone number.</li>
                  <li><strong>Map Catalog:</strong> Click "Products" on the vendor row to link what vegetables/fruits they supply.</li>
                  <li><strong>Assign Quantity:</strong> Daily vegetable needs are calculated. Assign them manually or click "Auto Assign".</li>
                  <li><strong>Vendor Confirms:</strong> Vendor reviews the assigned quantity and the locked catalog price, then confirms how much they will supply.</li>
                  <li><strong>Price Is Automatic:</strong> Assignment uses the vendor’s saved per-KG or per-PC price. Admin does not approve or overwrite it.</li>
                  <li><strong>Vendor Dispatches:</strong> Vendor confirms the order and ships it to the warehouse.</li>
                  <li><strong>Check-In & Pay:</strong> Warehouse manager counts stock, enters received/rejected amount, and completes check-in to update inventory and calculate vendor payouts.</li>
                </ol>
              </div>

              {/* Column 2: Vendor Profile Fields */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-dailyveg-700 dark:text-dailyveg-400 flex items-center gap-1.5 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dailyveg-100 text-dailyveg-700 text-xs font-bold dark:bg-dailyveg-950 dark:text-dailyveg-400">2</span>
                  Vendor Profile Fields
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
                  <li><strong>Company Name:</strong> The official business name of the supplier.</li>
                  <li><strong>Contact Person:</strong> The name of the manager/person you coordinate with.</li>
                  <li><strong>Phone:</strong> Primary number used for communications. Used by the vendor to log in. <em>Cannot be changed after registration.</em></li>
                  <li><strong>Email:</strong> Optional email to receive notifications or bills.</li>
                  <li><strong>Status:</strong> Set "Active" to let this vendor work, or "Inactive" to pause all assignments for them.</li>
                </ul>
              </div>

              {/* Column 3: Product Mapping Fields */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-dailyveg-700 dark:text-dailyveg-400 flex items-center gap-1.5 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dailyveg-100 text-dailyveg-700 text-xs font-bold dark:bg-dailyveg-950 dark:text-dailyveg-400">3</span>
                  Product Catalog Fields
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
                  <li><strong>Vendor Price:</strong> Starts at ₹0 when Admin maps the product. Only the vendor can set or update this price from the OPS mobile app.</li>
                  <li><strong>Minimum Quantity:</strong> Optional. The smallest amount this vendor is willing to supply in a single day.</li>
                  <li><strong>Maximum Quantity:</strong> Optional. The limit on how much this vendor can supply per day.</li>
                  <li><strong>Lead Time (Hours):</strong> Optional. How early an assignment should reach the vendor.</li>
                  <li><strong>Available for Procurement:</strong> Turn this checkbox ON to include this product in their active catalog.</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-medium">
                <strong>Important:</strong> A vendor price greater than ₹0 must be set before assignment. That price is locked into the assignment and used for the final accepted-quantity payout.
              </p>
            </div>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="h-5 w-5 text-dailyveg-600" /> Vendor directory
          </div>
          <Button variant="ghost" size="sm" onClick={() => vendorsQuery.refetch()} disabled={vendorsQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${vendorsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {vendorsQuery.isLoading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading vendors…</td></tr>
              ) : vendorsQuery.isError ? (
                <tr><td colSpan="7" className="p-8 text-center text-red-600">Could not load vendors.</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">No vendors added yet.</td></tr>
              ) : vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
                  <td className="px-4 py-3 font-semibold">{vendor.company_name}</td>
                  <td className="px-4 py-3">{vendor.user?.full_name || "—"}</td>
                  <td className="px-4 py-3 font-medium text-dailyveg-700 dark:text-dailyveg-400">{vendor.warehouse?.name || "—"}</td>
                  <td className="px-4 py-3">{vendor.user?.phone || "—"}</td>
                  <td className="px-4 py-3">{vendor.user?.email || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={vendor.status === "active" ? "success" : "outline"}>
                      {vendor.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setCatalogueVendor(vendor)}>
                        <PackageSearch className="mr-1.5 h-4 w-4" /> Products
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setFormState({ mode: "edit", vendor })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleting(vendor)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {formState && (
        <VendorFormDialog
          vendor={formState.mode === "edit" ? formState.vendor : null}
          open
          onOpenChange={(open) => !open && setFormState(null)}
        />
      )}
      {catalogueVendor && (
        <VendorProductsDialog
          vendor={catalogueVendor}
          open
          onOpenChange={(open) => !open && setCatalogueVendor(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete vendor?"
        description={`This will permanently delete ${deleting?.company_name || "this vendor"}.`}
        confirmText="Delete"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}
