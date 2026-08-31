import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Search, Plus, Minus, RefreshCw, ShieldCheck, Clock3, PackageCheck, Warehouse, Lock, Layers3, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { DailyOperationsService } from "../../../api/services/daily-operations.service";
import { WarehousesService } from "../../../api/services/warehouses.service";
import { useAuth } from "../../../auth/auth-context";
import { PageHeader } from "../../../components/common/page-header";
import { ProductAvatar } from "../../../components/common/product-avatar";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { useToast } from "../../../components/toast/toast-context";
import { cn } from "../../../lib/utils";

const quantity = (value, unit = "KG") => `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${String(unit).toUpperCase()}`;

const lotStatus = (lot) => {
  const status = lot.freshness_status || lot.status;
  const consumed = Number(lot.consumed_quantity || 0);
  const reserved = Number(lot.reserved_quantity || 0);
  const free = Math.max(0, Number(lot.available_quantity || 0) - reserved);
  if (consumed > 0) return {
    label: free > 0 ? "Partially used for orders" : "Used for orders",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    note: free > 0 ? `${quantity(consumed, lot.unit)} used · ${quantity(free, lot.unit)} remains` : `${quantity(consumed, lot.unit)} used and packed for customer orders`,
    displayQuantity: consumed,
    quantityLabel: "Used quantity",
  };
  if (free <= 0 && reserved > 0) return { label: "Reserved for orders", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300", note: `${quantity(reserved, lot.unit)} is reserved for customer orders`, displayQuantity: reserved, quantityLabel: "Reserved quantity" };
  if (status === "expired") return { label: "Expired", className: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" };
  if (status === "depleted") return { label: "Depleted", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", displayQuantity: Number(lot.depleted_quantity || 0), quantityLabel: "Depleted quantity" };
  if (lot.tomorrow_delivery_status === "not_usable_tomorrow") return { label: "Not usable tomorrow", className: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300" };
  if (["use_first", "expiring_soon", "not_dispatchable"].includes(status)) return { label: "Expire soon", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" };
  if (status === "fresh") return { label: "Fresh", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" };
  return { label: String(status || "Unknown").replaceAll("_", " "), className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
};

function Metric({ icon: Icon, label, value, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };
  return <Card className="rounded-2xl border-slate-200/80 p-4 shadow-sm dark:border-slate-800">
    <div className="flex items-center gap-3"><span className={cn("rounded-xl p-2.5", tones[tone])}><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-xl font-black text-slate-950 dark:text-white">{value}</p></div></div>
  </Card>;
}

function SortableHeader({ column, label, align = "right", sort, onSort }) {
  const active = sort.key === column;
  const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return <th className={cn("px-4 py-4", align === "left" ? "text-left" : "text-right")}>
    <button type="button" onClick={() => onSort(column)} className={cn("inline-flex items-center gap-1.5 font-inherit uppercase hover:text-slate-900 dark:hover:text-white", align === "right" && "justify-end")}>
      {label}<Icon className={cn("h-3.5 w-3.5", active ? "text-emerald-600" : "text-slate-400")} />
    </button>
  </th>;
}

export function InventoryPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [warehouseId, setWarehouseId] = useState(() => localStorage.getItem("daily_ops_warehouse_id") || "");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState({ key: "product", direction: "asc" });
  const [dialog, setDialog] = useState({ open: false, mode: "add", product: null });
  const [lotsDialogProduct, setLotsDialogProduct] = useState(null);
  const [form, setForm] = useState({ quantity: "", reason: "", unitCost: "", usableUntil: "", lotId: "" });

  const warehousesQuery = useQuery({ queryKey: ["admin", "warehouses"], queryFn: () => WarehousesService.list() });
  const warehouses = warehousesQuery.data?.warehouses || warehousesQuery.data || [];
  useEffect(() => {
    if (!warehouses.length) return;
    if (warehouses.some((warehouse) => warehouse.id === warehouseId)) return;
    setWarehouseId(warehouses[0].id);
    localStorage.setItem("daily_ops_warehouse_id", warehouses[0].id);
  }, [warehouseId, warehouses]);

  const handleWarehouseChange = (value) => {
    setWarehouseId(value);
    localStorage.setItem("daily_ops_warehouse_id", value);
    setDialog({ open: false, mode: "add", product: null });
    setForm({ quantity: "", reason: "", unitCost: "", usableUntil: "", lotId: "" });
  };

  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory", warehouseId || "assigned"],
    queryFn: () => DailyOperationsService.getWarehouseInventorySummary(warehouseId),
    enabled: Boolean(warehouseId),
  });
  const products = inventoryQuery.data?.products || [];
  const summary = inventoryQuery.data?.summary || {};

  const lotsQuery = useQuery({
    queryKey: ["inventory-manage-lots", dialog.product?.product_id, warehouseId],
    queryFn: () => DailyOperationsService.listLots(dialog.product.product_id, { warehouseId, status: "available" }),
    enabled: dialog.open && dialog.mode === "remove" && Boolean(dialog.product && warehouseId),
  });
  const removableLots = (lotsQuery.data || []).filter((lot) => Number(lot.available_quantity || 0) - Number(lot.reserved_quantity || 0) > 0);

  const allLotsQuery = useQuery({
    queryKey: ["inventory-all-lots", lotsDialogProduct?.product_id, warehouseId],
    queryFn: () => DailyOperationsService.listLots(lotsDialogProduct.product_id, { warehouseId }),
    enabled: Boolean(lotsDialogProduct && warehouseId),
  });

  useEffect(() => {
    if (dialog.mode === "remove" && removableLots.length && !form.lotId) setForm((old) => ({ ...old, lotId: removableLots[0].id }));
  }, [dialog.mode, removableLots, form.lotId]);

  const refreshInventory = async () => {
    await queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
    await queryClient.invalidateQueries({ queryKey: ["daily-operations", "inventorySummary"] });
  };
  const mutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.quantity);
      if (!amount || amount <= 0) throw new Error("Enter a quantity greater than zero");
      if (form.reason.trim().length < 3) throw new Error("Please enter a short reason");
      if (dialog.mode === "add") {
        return DailyOperationsService.addStock(dialog.product.product_id, {
          warehouse_id: warehouseId,
          quantity: amount,
          unit_cost_paise: form.unitCost ? Math.round(Number(form.unitCost) * 100) : undefined,
          usable_until: form.usableUntil || undefined,
          reason: form.reason,
          auto_replan: true,
        });
      }
      if (!form.lotId) throw new Error("Select a stock batch to remove from");
      return DailyOperationsService.adjustLot(form.lotId, { quantity: -amount, reason: form.reason });
    },
    onSuccess: async () => {
      await refreshInventory();
      await queryClient.invalidateQueries({ queryKey: ["inventory-manage-lots"] });
      toast.success(dialog.mode === "add" ? "Stock Added" : "Stock Removed", "Inventory and Daily Operations stock are now synchronized.");
      setDialog({ open: false, mode: "add", product: null });
    },
    onError: (error) => toast.error("Stock Update Failed", error?.response?.data?.error?.message || error.message),
  });

  const openDialog = (product, mode) => {
    setForm({ quantity: "", reason: "", unitCost: "", usableUntil: "", lotId: "" });
    setDialog({ open: true, mode, product });
  };
  const filtered = useMemo(() => products.filter((product) => {
    if (!String(product.product_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (stockFilter === "in_stock") return Number(product.available_quantity) > 0;
    if (stockFilter === "low") return Number(product.available_quantity) > 0 && Number(product.available_quantity) <= Number(product.reserved_quantity || 0) + 2;
    if (stockFilter === "out") return Number(product.available_quantity) <= 0;
    return true;
  }), [products, search, stockFilter]);
  const sortedProducts = useMemo(() => [...filtered].sort((a, b) => {
    if (sort.key === "freshness") {
      const aDate = a.earliest_expiry ? new Date(a.earliest_expiry).getTime() : null;
      const bDate = b.earliest_expiry ? new Date(b.earliest_expiry).getTime() : null;
      if (aDate == null && bDate == null) return String(a.product_name || "").localeCompare(String(b.product_name || ""));
      if (aDate == null) return 1;
      if (bDate == null) return -1;
      return (aDate - bDate) * (sort.direction === "asc" ? 1 : -1);
    }
    const values = {
      product: [String(a.product_name || ""), String(b.product_name || "")],
      total: [Number(a.total_stock_quantity || 0), Number(b.total_stock_quantity || 0)],
      reserved: [Number(a.reserved_quantity || 0), Number(b.reserved_quantity || 0)],
      available: [Number(a.available_quantity || 0), Number(b.available_quantity || 0)],
      usable: [Number(a.usable_quantity || 0), Number(b.usable_quantity || 0)],
    }[sort.key];
    const comparison = typeof values?.[0] === "string" ? values[0].localeCompare(values[1]) : (values?.[0] || 0) - (values?.[1] || 0);
    return comparison * (sort.direction === "asc" ? 1 : -1);
  }), [filtered, sort]);
  const handleSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));

  return <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-emerald-50/25 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/10">
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Current warehouse stock, reservations and simple quantity control."
        actions={
          <>
            {(isAdmin || warehouses.length > 1) && <div className="w-full sm:w-56"><PremiumSelect value={warehouseId} onChange={handleWarehouseChange} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="Select warehouse" isDisabled={warehousesQuery.isLoading} /></div>}
            <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => refreshInventory()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={PackageCheck} label="Products in stock" value={summary.products_in_stock || 0} />
        <Metric icon={Boxes} label="Active stock batches" value={summary.active_batches || 0} tone="blue" />
        <Metric icon={ShieldCheck} label="Products reserved" value={summary.products_with_reservations || 0} tone="slate" />
        <Metric icon={Clock3} label="Products expiring in 24h" value={summary.products_expiring_soon || 0} tone="amber" />
      </div>

      <Card className="overflow-hidden rounded-3xl border-slate-200/80 shadow-lg shadow-slate-900/5 dark:border-slate-800">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product" className="h-11 rounded-xl pl-10" /></div>
          <div className="w-48"><PremiumSelect value={stockFilter} onChange={setStockFilter} options={[{ value: "all", label: "All products" }, { value: "in_stock", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }]} /></div>
        </div>
        {inventoryQuery.isLoading ? (
          <div className="p-16 text-center text-sm font-semibold text-slate-400">Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-sm font-semibold text-slate-400">No products found.</div>
        ) : (
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[1380px] text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/70">
                <tr>
                  <th className="w-14 px-4 py-4 text-center">#</th>
                  <SortableHeader column="product" label="Product" align="left" sort={sort} onSort={handleSort} />
                  <SortableHeader column="total" label="Total stock" sort={sort} onSort={handleSort} />
                  <SortableHeader column="reserved" label="Reserved" sort={sort} onSort={handleSort} />
                  <SortableHeader column="available" label="Available" sort={sort} onSort={handleSort} />
                  <SortableHeader column="usable" label="Usable" sort={sort} onSort={handleSort} />
                  <th className="px-4 py-4 text-right">Expired / Expire soon</th>
                  <th className="px-4 py-4 text-center">Inventory lots</th>
                  <SortableHeader column="freshness" label="Freshness" align="left" sort={sort} onSort={handleSort} />
                  <th className="px-6 py-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {sortedProducts.map((product, index) => {
                  const unit = (product.tracking_unit || "KG").toUpperCase();
                  const totalStock = Number(product.total_stock_quantity || 0);
                  const reserved = Number(product.reserved_quantity || 0);
                  const available = Number(product.available_quantity || 0);
                  const usable = Number(product.usable_quantity || 0);
                  const expired = Number(product.expired_quantity || 0);
                  const expiringSoon = Number(product.expiring_soon_quantity || 0);

                  return (
                    <tr
                      key={product.product_id}
                      className="group bg-white transition hover:bg-slate-50/80 dark:bg-slate-950 dark:hover:bg-slate-900/60"
                    >
                      <td className="w-14 border-b border-slate-100 px-4 py-4 text-center text-sm font-bold text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
                        {index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-6 py-4 whitespace-nowrap dark:border-slate-800/70">
                        <div className="flex items-center gap-3">
                          <ProductAvatar item={product} size="md" fallbackIcon={Boxes} />
                          <div className="min-w-0 max-w-[240px]">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-slate-950 dark:text-white truncate" title={product.product_name}>
                                {product.product_name}
                              </span>
                              <span className="flex-shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {unit}
                              </span>
                            </div>
                            {product.safety_stock_quantity > 0 ? (
                              <p className="mt-0.5 text-xs font-medium text-slate-400 truncate">
                                Buffer: {product.safety_stock_quantity} {unit}
                              </p>
                            ) : product.active_lot_count > 0 ? (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {product.active_lot_count} active batch{product.active_lot_count === 1 ? "" : "es"}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-slate-400">Canonical tracking</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap font-mono text-sm dark:border-slate-800/70">
                        {totalStock > 0 ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {totalStock.toFixed(2)}{" "}
                            <span className="text-xs font-semibold text-slate-400 uppercase">{unit}</span>
                          </span>
                        ) : (
                          <span className="text-sm font-normal text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        {reserved > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50/80 px-3 py-1.5 font-mono text-sm font-black text-blue-700 shadow-2xs dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                            <Lock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            {reserved.toFixed(2)}{" "}
                            <span className="text-xs font-bold uppercase opacity-80">{unit}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-sm font-normal text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        {available > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 font-mono text-sm font-black text-emerald-700 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                            {available.toFixed(2)}{" "}
                            <span className="text-xs font-bold uppercase opacity-80">{unit}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-sm font-normal text-slate-400 dark:text-slate-600">
                            0.00 <span className="text-xs uppercase">{unit}</span>
                          </span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        {usable > 0 ? <span className="inline-flex items-center rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 font-mono text-sm font-black text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300">{usable.toFixed(2)} <span className="ml-1 text-xs uppercase opacity-80">{unit}</span></span> : <span className="font-mono text-sm text-slate-400 dark:text-slate-600">0.00 <span className="text-xs uppercase">{unit}</span></span>}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        {expired > 0 || expiringSoon > 0 ? (
                          <div className="space-y-1 font-mono text-sm font-black">
                            {expired > 0 && <p className="text-rose-600 dark:text-rose-400">{expired.toFixed(2)} <span className="text-xs uppercase">{unit}</span> expired</p>}
                            {expiringSoon > 0 && <p className="text-amber-600 dark:text-amber-400">{expiringSoon.toFixed(2)} <span className="text-xs uppercase">{unit}</span> soon</p>}
                          </div>
                        ) : (
                          <span className="font-mono text-sm font-normal text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-center whitespace-nowrap dark:border-slate-800/70">
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => setLotsDialogProduct(product)}>
                          <Layers3 className="h-4 w-4" /> View lots
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black dark:bg-slate-800">{product.lot_count ?? product.active_lot_count ?? 0}</span>
                        </Button>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/70">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {product.earliest_expiry
                            ? `Next expiry ${new Date(product.earliest_expiry).toLocaleDateString("en-IN")}`
                            : "No active batch"}
                        </p>
                        {!product.freshness_policy_configured && <p className="mt-1 text-xs font-bold text-rose-500">Freshness policy required</p>}
                      </td>

                      <td className="border-b border-slate-100 px-6 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => openDialog(product, "add")} disabled={!product.freshness_policy_configured}><Plus className="h-4 w-4" /> Add</Button>
                          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => openDialog(product, "remove")} disabled={Number(product.available_quantity) <= 0}><Minus className="h-4 w-4" /> Remove</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>

    <Dialog open={dialog.open} onOpenChange={(open) => !open && setDialog({ open: false, mode: "add", product: null })}><DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle className="flex items-center gap-2">{dialog.mode === "add" ? <Plus className="h-5 w-5 text-emerald-600" /> : <Minus className="h-5 w-5 text-rose-600" />}{dialog.mode === "add" ? "Add Stock" : "Remove Stock"} · {dialog.product?.product_name}</DialogTitle></DialogHeader><div className="space-y-4 py-2">{dialog.mode === "remove" && <div><Label>Stock batch</Label><PremiumSelect value={form.lotId} onChange={(value) => setForm({ ...form, lotId: value })} options={removableLots.map((lot) => ({ value: lot.id, label: `${lot.batch_reference || "Batch"} · ${quantity(Number(lot.available_quantity) - Number(lot.reserved_quantity), lot.unit)} free${lot.usable_until ? ` · expires ${new Date(lot.usable_until).toLocaleDateString("en-IN")}` : ""}` }))} placeholder={lotsQuery.isLoading ? "Loading batches…" : "Select batch"} /></div>}<div><Label>Quantity ({String(dialog.product?.tracking_unit || "KG").toUpperCase()})</Label><Input type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0.000" /></div>{dialog.mode === "add" && <div className="grid grid-cols-2 gap-3"><div><Label>Unit cost (₹, optional)</Label><Input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} /></div><div><Label>Usable until (optional)</Label><Input type="datetime-local" value={form.usableUntil} onChange={(e) => setForm({ ...form, usableUntil: e.target.value })} /></div></div>}<div><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={dialog.mode === "add" ? "e.g. Opening stock correction" : "e.g. Physical stock correction"} /></div>{dialog.mode === "remove" && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">Reserved order stock is protected and cannot be removed.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setDialog({ open: false, mode: "add", product: null })}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className={dialog.mode === "remove" ? "bg-rose-600 hover:bg-rose-700" : ""}>{mutation.isPending ? "Saving…" : dialog.mode === "add" ? "Add Stock" : "Remove Stock"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(lotsDialogProduct)} onOpenChange={(open) => !open && setLotsDialogProduct(null)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden rounded-3xl p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-800"><DialogTitle className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-emerald-600" />{lotsDialogProduct?.product_name} · Inventory Lots</DialogTitle></DialogHeader>
        <div className="max-h-[calc(85vh-80px)] space-y-3 overflow-y-auto p-6">
          {allLotsQuery.isLoading ? <div className="p-10 text-center text-sm font-semibold text-slate-400">Loading inventory lots…</div> : allLotsQuery.isError ? <div className="p-10 text-center text-sm font-semibold text-rose-500">Unable to load inventory lots.</div> : (allLotsQuery.data || []).length === 0 ? <div className="p-10 text-center text-sm font-semibold text-slate-400">No inventory lots recorded for this product.</div> : (allLotsQuery.data || []).map((lot) => {
            const status = lotStatus(lot);
            const free = Math.max(0, Number(lot.available_quantity || 0) - Number(lot.reserved_quantity || 0));
            const depleted = Number(lot.depleted_quantity || 0);
            const isDepleted = (lot.freshness_status || lot.status) === "depleted";
            const hasConsumed = Number(lot.consumed_quantity || 0) > 0;
            const displayQuantity = status.displayQuantity ?? (isDepleted ? depleted : free);
            const quantityLabel = status.quantityLabel || (isDepleted ? "Depleted quantity" : "Free quantity");
            return <div key={lot.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-slate-900 dark:text-white">{lot.batch_reference || `Lot #${String(lot.id).slice(0, 8)}`}</span><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", status.className)}>{status.label}</span></div><p className="mt-2 text-xs text-slate-500">Received {lot.received_at ? new Date(lot.received_at).toLocaleString("en-IN") : "—"} · Usable until {lot.usable_until ? new Date(lot.usable_until).toLocaleString("en-IN") : "—"}</p>{status.note && <p className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">{status.note}</p>}{lot.tomorrow_delivery_status === "not_usable_tomorrow" && !isDepleted && !hasConsumed && <p className="mt-1 text-xs font-bold text-orange-600 dark:text-orange-400">Expires before tomorrow&apos;s delivery freshness cutoff</p>}</div><div className="flex items-start justify-end gap-5 text-right"><div><p className={cn("font-mono text-sm font-black", isDepleted ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white")}>{quantity(displayQuantity, lot.unit)}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{quantityLabel}</p></div>{hasConsumed && free > 0 && <div><p className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">{quantity(free, lot.unit)}</p><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">Available quantity</p></div>}</div></div></div>;
          })}
        </div>
      </DialogContent>
    </Dialog>
  </div>
}
