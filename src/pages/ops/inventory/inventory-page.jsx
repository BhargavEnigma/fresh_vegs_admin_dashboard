import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Search, Plus, Minus, RefreshCw, ShieldCheck, Clock3, PackageCheck, Warehouse } from "lucide-react";
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

export function InventoryPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [warehouseId, setWarehouseId] = useState(() => localStorage.getItem("daily_ops_warehouse_id") || "");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [dialog, setDialog] = useState({ open: false, mode: "add", product: null });
  const [form, setForm] = useState({ quantity: "", reason: "", unitCost: "", usableUntil: "", lotId: "" });

  const warehousesQuery = useQuery({ queryKey: ["admin", "warehouses"], queryFn: () => WarehousesService.list(), enabled: isAdmin });
  const warehouses = warehousesQuery.data?.warehouses || warehousesQuery.data || [];
  useEffect(() => {
    if (isAdmin && !warehouseId && warehouses[0]?.id) setWarehouseId(warehouses[0].id);
  }, [isAdmin, warehouseId, warehouses]);

  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory", warehouseId || "assigned"],
    queryFn: () => DailyOperationsService.getWarehouseInventorySummary(warehouseId || undefined),
    enabled: !isAdmin || Boolean(warehouseId),
  });
  const products = inventoryQuery.data?.products || [];
  const summary = inventoryQuery.data?.summary || {};

  const lotsQuery = useQuery({
    queryKey: ["inventory-manage-lots", dialog.product?.product_id, warehouseId],
    queryFn: () => DailyOperationsService.listLots(dialog.product.product_id, { warehouseId: warehouseId || undefined, status: "available" }),
    enabled: dialog.open && dialog.mode === "remove" && Boolean(dialog.product),
  });
  const removableLots = (lotsQuery.data || []).filter((lot) => Number(lot.available_quantity || 0) - Number(lot.reserved_quantity || 0) > 0);

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
          warehouse_id: warehouseId || undefined,
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

  return <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-emerald-50/25 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/10">
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Current warehouse stock, reservations and simple quantity control."
        actions={
          <>
            {isAdmin && <div className="w-full sm:w-56"><PremiumSelect value={warehouseId} onChange={(value) => { setWarehouseId(value); localStorage.setItem("daily_ops_warehouse_id", value); }} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="Select warehouse" /></div>}
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
        {inventoryQuery.isLoading ? <div className="p-16 text-center text-sm font-semibold text-slate-400">Loading inventory…</div> : filtered.length === 0 ? <div className="p-16 text-center text-sm font-semibold text-slate-400">No products found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50/90 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900/70"><tr><th className="px-6 py-4 text-left">Product</th><th className="px-4 py-4 text-right">Total stock</th><th className="px-4 py-4 text-right">Reserved</th><th className="px-4 py-4 text-right">Available</th><th className="px-4 py-4 text-left">Freshness</th><th className="px-6 py-4 text-right">Manage</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-900">{filtered.map((product) => <tr key={product.product_id} className="bg-white transition hover:bg-emerald-50/30 dark:bg-slate-950 dark:hover:bg-emerald-950/10"><td className="px-6 py-4"><div className="flex items-center gap-3"><ProductAvatar item={product} size="md" /><div><p className="font-extrabold text-slate-950 dark:text-white">{product.product_name}</p><p className="mt-1 text-xs text-slate-400">{product.active_lot_count} active batch{product.active_lot_count === 1 ? "" : "es"}</p></div></div></td><td className="px-4 py-4 text-right font-bold">{quantity(product.total_stock_quantity, product.tracking_unit)}</td><td className="px-4 py-4 text-right font-bold text-slate-500">{quantity(product.reserved_quantity, product.tracking_unit)}</td><td className="px-4 py-4 text-right"><span className={cn("rounded-lg px-2.5 py-1.5 font-black", Number(product.available_quantity) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{quantity(product.available_quantity, product.tracking_unit)}</span></td><td className="px-4 py-4"><p className={cn("font-bold", Number(product.expiring_soon_quantity) > 0 ? "text-amber-600" : "text-slate-600 dark:text-slate-300")}>{Number(product.expiring_soon_quantity) > 0 ? `${quantity(product.expiring_soon_quantity, product.tracking_unit)} expiring soon` : product.earliest_expiry ? `Next expiry ${new Date(product.earliest_expiry).toLocaleDateString("en-IN")}` : "No active batch"}</p>{!product.freshness_policy_configured && <p className="mt-1 text-[10px] font-bold text-rose-500">Freshness policy required</p>}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><Button size="sm" className="gap-1.5 rounded-xl" onClick={() => openDialog(product, "add")} disabled={!product.freshness_policy_configured}><Plus className="h-4 w-4" /> Add</Button><Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => openDialog(product, "remove")} disabled={Number(product.available_quantity) <= 0}><Minus className="h-4 w-4" /> Remove</Button></div></td></tr>)}</tbody></table></div>}
      </Card>
    </div>

    <Dialog open={dialog.open} onOpenChange={(open) => !open && setDialog({ open: false, mode: "add", product: null })}><DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle className="flex items-center gap-2">{dialog.mode === "add" ? <Plus className="h-5 w-5 text-emerald-600" /> : <Minus className="h-5 w-5 text-rose-600" />}{dialog.mode === "add" ? "Add Stock" : "Remove Stock"} · {dialog.product?.product_name}</DialogTitle></DialogHeader><div className="space-y-4 py-2">{dialog.mode === "remove" && <div><Label>Stock batch</Label><PremiumSelect value={form.lotId} onChange={(value) => setForm({ ...form, lotId: value })} options={removableLots.map((lot) => ({ value: lot.id, label: `${lot.batch_reference || "Batch"} · ${quantity(Number(lot.available_quantity) - Number(lot.reserved_quantity), lot.unit)} free${lot.usable_until ? ` · expires ${new Date(lot.usable_until).toLocaleDateString("en-IN")}` : ""}` }))} placeholder={lotsQuery.isLoading ? "Loading batches…" : "Select batch"} /></div>}<div><Label>Quantity ({String(dialog.product?.tracking_unit || "KG").toUpperCase()})</Label><Input type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0.000" /></div>{dialog.mode === "add" && <div className="grid grid-cols-2 gap-3"><div><Label>Unit cost (₹, optional)</Label><Input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} /></div><div><Label>Usable until (optional)</Label><Input type="datetime-local" value={form.usableUntil} onChange={(e) => setForm({ ...form, usableUntil: e.target.value })} /></div></div>}<div><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={dialog.mode === "add" ? "e.g. Opening stock correction" : "e.g. Physical stock correction"} /></div>{dialog.mode === "remove" && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">Reserved order stock is protected and cannot be removed.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setDialog({ open: false, mode: "add", product: null })}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className={dialog.mode === "remove" ? "bg-rose-600 hover:bg-rose-700" : ""}>{mutation.isPending ? "Saving…" : dialog.mode === "add" ? "Add Stock" : "Remove Stock"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
