import { useMemo, useState } from "react";
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
  Search,
  Store,
  Phone,
  Mail,
  User,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
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
  DialogDescription,
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
  return error ? <p className="mt-1 text-xs text-red-600 font-medium">{error.message}</p> : null;
}

function getInitials(name) {
  const parts = String(name || "Vendor").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "V";
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
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90dvh] overflow-y-auto thin-scrollbar rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-left">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
            <Store className="h-5 w-5" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold">
            {isEdit ? "Edit Vendor Profile" : "Register New Vendor"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-500">
            {isEdit ? "Update vendor business identity, warehouse link, and contact details." : "Add a supplier profile with registered phone and procurement details."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="vendor-company" className="text-xs font-semibold">Company name *</Label>
              <Input id="vendor-company" className="h-11 rounded-xl" placeholder="e.g. Patel Agro Farms" {...form.register("company_name")} />
              <FieldError error={form.formState.errors.company_name} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="vendor-name" className="text-xs font-semibold">Contact person</Label>
              <Input id="vendor-name" className="h-11 rounded-xl" placeholder="e.g. Rajesh Patel" {...form.register("full_name")} />
              <FieldError error={form.formState.errors.full_name} />
            </div>

            {!isEdit && (
              <div className="grid gap-1.5">
                <Label htmlFor="vendor-phone" className="text-xs font-semibold">Phone number *</Label>
                <Input id="vendor-phone" className="h-11 rounded-xl" inputMode="tel" placeholder="+919876543210" {...form.register("phone")} />
                <FieldError error={form.formState.errors.phone} />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="vendor-email" className="text-xs font-semibold">Email address</Label>
              <Input id="vendor-email" className="h-11 rounded-xl" type="email" placeholder="vendor@example.com" {...form.register("email")} />
              <FieldError error={form.formState.errors.email} />
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

            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Assigned Warehouse</Label>
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
            <p className="text-xs text-slate-500 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
              Phone numbers are permanently locked to maintain authentication integrity.
            </p>
          )}

          <DialogFooter className="grid grid-cols-2 gap-2 pt-3 sm:flex sm:justify-end">
            <Button type="button" variant="outline" className="h-10 sm:h-9 rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-10 sm:h-9 rounded-xl" disabled={mutation.isPending}>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const vendorStats = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.status === "active").length;
    const inactive = vendors.filter((v) => v.status !== "active").length;
    return { total, active, inactive };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const company = (v.company_name || "").toLowerCase();
      const contact = (v.user?.full_name || "").toLowerCase();
      const phone = (v.user?.phone || "").toLowerCase();
      const email = (v.user?.email || "").toLowerCase();
      const wh = (v.warehouse?.name || "").toLowerCase();
      return (
        company.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        wh.includes(q)
      );
    });
  }, [vendors, searchQuery, statusFilter]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Vendors"
        subtitle="Manage procurement suppliers and their contact details."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <VendorWorkflowGuide />
            </div>
            <Button className="flex-1 sm:flex-initial gap-1.5 h-10" onClick={() => setFormState({ mode: "create" })}>
              <Plus className="h-4 w-4" /> <span>Add vendor</span>
            </Button>
          </div>
        }
      />

      {/* Mobile Executive KPI Strip */}
      {!vendorsQuery.isLoading && vendors.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:hidden">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
              <Store className="h-3.5 w-3.5 text-dailyveg-600" />
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {vendorStats.total}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
              {vendorStats.active}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Inactive</span>
              <XCircle className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-lg font-black text-slate-600 dark:text-slate-400">
              {vendorStats.inactive}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Guide Block */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800/80 dark:bg-slate-950 overflow-hidden">
        <button
          type="button"
          onClick={toggleGuide}
          className="flex w-full items-center justify-between p-3.5 sm:p-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="h-4 w-4 shrink-0 text-dailyveg-600 dark:text-dailyveg-400" />
            <span className="truncate">How Vendor Procurement Works (Easy Step-by-Step Guide)</span>
          </div>
          {showGuide ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
        </button>

        {showGuide && (
          <div className="border-t border-slate-100 p-4 sm:p-5 dark:border-slate-900 text-sm space-y-5">
            <div className="grid gap-5 md:grid-cols-3 text-left">
              {/* Column 1: Step-by-Step Flow */}
              <div className="space-y-2.5 rounded-xl bg-slate-50/70 p-3.5 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
                <h4 className="font-extrabold text-dailyveg-700 dark:text-dailyveg-400 flex items-center gap-1.5 text-xs sm:text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dailyveg-100 text-dailyveg-700 text-xs font-bold dark:bg-dailyveg-950 dark:text-dailyveg-400">1</span>
                  Simple Step-by-Step Flow
                </h4>
                <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-decimal pl-4 leading-relaxed">
                  <li><strong>Register Supplier:</strong> Add vendor profile with a locked phone number.</li>
                  <li><strong>Map Catalog:</strong> Click "Products" to link supplied vegetables/fruits.</li>
                  <li><strong>Assign Quantity:</strong> Daily vegetable needs calculated. Assign manually or use "Auto Assign".</li>
                  <li><strong>Vendor Confirms:</strong> Vendor reviews assigned quantity & locked catalog price.</li>
                  <li><strong>Price Is Automatic:</strong> Assignment uses vendor’s saved per-KG or per-PC price.</li>
                  <li><strong>Vendor Dispatches:</strong> Vendor confirms order and ships to warehouse.</li>
                  <li><strong>Check-In & Pay:</strong> Warehouse manager enters received count to update inventory and payouts.</li>
                </ol>
              </div>

              {/* Column 2: Vendor Profile Fields */}
              <div className="space-y-2.5 rounded-xl bg-slate-50/70 p-3.5 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
                <h4 className="font-extrabold text-dailyveg-700 dark:text-dailyveg-400 flex items-center gap-1.5 text-xs sm:text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dailyveg-100 text-dailyveg-700 text-xs font-bold dark:bg-dailyveg-950 dark:text-dailyveg-400">2</span>
                  Vendor Profile Fields
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 leading-relaxed">
                  <li><strong>Company Name:</strong> Official supplier business name.</li>
                  <li><strong>Contact Person:</strong> Point of contact manager.</li>
                  <li><strong>Phone:</strong> Primary login number. <em>Cannot be changed after registration.</em></li>
                  <li><strong>Email:</strong> Optional email for dispatch invoices.</li>
                  <li><strong>Status:</strong> "Active" to enable assignments, "Inactive" to pause.</li>
                </ul>
              </div>

              {/* Column 3: Product Mapping Fields */}
              <div className="space-y-2.5 rounded-xl bg-slate-50/70 p-3.5 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
                <h4 className="font-extrabold text-dailyveg-700 dark:text-dailyveg-400 flex items-center gap-1.5 text-xs sm:text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dailyveg-100 text-dailyveg-700 text-xs font-bold dark:bg-dailyveg-950 dark:text-dailyveg-400">3</span>
                  Product Catalog Fields
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 leading-relaxed">
                  <li><strong>Vendor Price:</strong> Set or updated by vendor via OPS mobile app.</li>
                  <li><strong>Minimum Quantity:</strong> Optional smallest daily batch.</li>
                  <li><strong>Maximum Quantity:</strong> Optional max daily supply cap.</li>
                  <li><strong>Lead Time (Hours):</strong> Optional preparation time window.</li>
                  <li><strong>Available:</strong> Toggle to include in active procurement.</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="font-medium">
                <strong>Important:</strong> A vendor price greater than ₹0 must be set before assignment. That price is locked into the assignment and used for final accepted-quantity payout.
              </p>
            </div>
          </div>
        )}
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950">
        {/* Card Header & Filter Bar */}
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-dailyveg-50/80 via-white to-white px-4 py-4 dark:border-slate-800/80 dark:from-dailyveg-950/60 dark:via-slate-950 dark:to-slate-950 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-dailyveg-700 dark:text-dailyveg-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-dailyveg-100 dark:bg-dailyveg-900/70">
                  <Store className="h-4 w-4" />
                </span>
                Vendor Directory
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage registered suppliers, warehouse assignments, and product catalogs.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendors…"
                  className="h-9.5 pl-9 pr-14 text-xs rounded-xl"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 sm:w-32">
                  <PremiumSelect
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v || "all")}
                    options={[
                      { value: "all", label: "All Status" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9.5 gap-1.5 text-xs shrink-0"
                  onClick={() => vendorsQuery.refetch()}
                  disabled={vendorsQuery.isFetching}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${vendorsQuery.isFetching ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{vendorsQuery.isFetching ? "Refreshing…" : "Refresh"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Directory Count Strip */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-900 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Showing {filteredVendors.length} of {vendors.length} vendors</span>
          </div>
          {(searchQuery || statusFilter !== "all") ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="text-xs font-semibold text-dailyveg-600 hover:text-dailyveg-700 dark:text-dailyveg-400"
            >
              Reset filters
            </button>
          ) : null}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Vendor &amp; Company</th>
                <th className="px-4 py-3.5 font-semibold">Contact Person</th>
                <th className="px-4 py-3.5 font-semibold">Warehouse</th>
                <th className="px-4 py-3.5 font-semibold">Phone</th>
                <th className="px-4 py-3.5 font-semibold">Email</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {vendorsQuery.isLoading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-dailyveg-500" />
                    Loading vendors…
                  </td>
                </tr>
              ) : vendorsQuery.isError ? (
                <tr><td colSpan="7" className="p-10 text-center text-red-600">Could not load vendors.</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500">
                    No vendors found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-dailyveg-50/40 dark:hover:bg-dailyveg-950/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dailyveg-200/80 bg-gradient-to-br from-dailyveg-100 to-dailyveg-50 text-xs font-bold text-dailyveg-800 dark:border-dailyveg-800 dark:from-dailyveg-900 dark:to-dailyveg-950 dark:text-dailyveg-200">
                          {getInitials(vendor.company_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {vendor.company_name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                            ID · {vendor.id?.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {vendor.user?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-dailyveg-700 dark:text-dailyveg-400">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{vendor.warehouse?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {vendor.user?.phone ? (
                        <a href={`tel:${vendor.user.phone}`} className="hover:underline">
                          {vendor.user.phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 truncate max-w-[180px]" title={vendor.user?.email || ""}>
                      {vendor.user?.email || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={vendor.status === "active" ? "success" : "outline"} className="capitalize">
                        {vendor.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setCatalogueVendor(vendor)}>
                          <PackageSearch className="h-3.5 w-3.5" /> Products
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setFormState({ mode: "edit", vendor })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => setDeleting(vendor)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Executive Cards View */}
        <div className="space-y-3 p-3.5 bg-slate-50/60 dark:bg-slate-900/40 md:hidden">
          {vendorsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-dailyveg-500" />
              Loading vendors…
            </div>
          ) : vendorsQuery.isError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Could not load vendors.
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No vendors found matching your filters.
            </div>
          ) : (
            filteredVendors.map((vendor) => (
              <article
                key={vendor.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-dailyveg-200/70 bg-gradient-to-br from-dailyveg-100 to-dailyveg-50 text-sm font-bold text-dailyveg-800 dark:border-dailyveg-800/70 dark:from-dailyveg-900 dark:to-dailyveg-950 dark:text-dailyveg-200">
                      {getInitials(vendor.company_name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {vendor.company_name}
                      </h3>
                      <p className="truncate text-xs text-slate-500 font-medium">
                        {vendor.user?.full_name || "No contact person"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={vendor.status === "active" ? "success" : "outline"} className="shrink-0 text-[11px] capitalize">
                    {vendor.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Details Strip */}
                <div className="space-y-1.5 rounded-xl bg-slate-50/80 p-2.5 text-xs dark:bg-slate-900/50">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-dailyveg-700 dark:text-dailyveg-300 truncate">
                      {vendor.warehouse?.name || "No assigned warehouse"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {vendor.user?.phone ? (
                      <a href={`tel:${vendor.user.phone}`} className="hover:underline text-slate-800 dark:text-slate-100">
                        {vendor.user.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                  {vendor.user?.email ? (
                    <div className="flex items-center gap-2 text-slate-500 truncate" title={vendor.user.email}>
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{vendor.user.email}</span>
                    </div>
                  ) : null}
                </div>

                {/* 3-Button Touch Toolbar */}
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-900">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-2.5 px-2 text-xs gap-1.5 font-semibold border-dailyveg-200 bg-dailyveg-50/70 text-dailyveg-700 hover:bg-dailyveg-100 dark:border-dailyveg-800 dark:bg-dailyveg-950/70 dark:text-dailyveg-300 rounded-xl"
                    onClick={() => setCatalogueVendor(vendor)}
                  >
                    <PackageSearch className="h-3.5 w-3.5 shrink-0" /> Products
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-2.5 px-2 text-xs gap-1.5 font-semibold bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/70 dark:text-slate-200 rounded-xl"
                    onClick={() => setFormState({ mode: "edit", vendor })}
                  >
                    <Pencil className="h-3.5 w-3.5 shrink-0" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-2.5 px-2 text-xs gap-1.5 font-semibold border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/50 rounded-xl"
                    onClick={() => setDeleting(vendor)}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete
                  </Button>
                </div>
              </article>
            ))
          )}
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
