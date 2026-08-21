import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PremiumSelect } from "../ui/premium-select";
import { Badge } from "../ui/badge";
import { useToast } from "../toast/toast-context";
import { setProductFreshnessPolicy } from "../../api/services/products.service";
import { Sparkles, ShieldCheck, Clock, AlertTriangle, Boxes, CheckCircle2 } from "lucide-react";

const TRACKING_UNITS = [
  { value: "KG", label: "Kilograms (KG)" },
  { value: "L", label: "Liters (L)" },
  { value: "PC", label: "Pieces (PC)" },
];

export function ProductFreshnessPolicyCard({ productId, product, isReadOnly = false }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const existingPolicy = product?.freshness_policy;

  // Infer default canonical tracking unit from product unit
  const inferTrackingUnit = () => {
    const raw = String(product?.procurement_unit || product?.unit || "kg").toLowerCase();
    if (["l", "liter", "liters", "ml"].includes(raw)) return "L";
    if (["pc", "piece", "pieces", "unit", "units"].includes(raw)) return "PC";
    return "KG";
  };

  const [trackingUnit, setTrackingUnit] = useState(existingPolicy?.tracking_unit || inferTrackingUnit());
  const [shelfLifeHours, setShelfLifeHours] = useState(existingPolicy?.shelf_life_hours ?? 48);
  const [warningHours, setWarningHours] = useState(existingPolicy?.warning_before_expiry_hours ?? 12);
  const [minDispatchHours, setMinDispatchHours] = useState(existingPolicy?.minimum_dispatch_freshness_hours ?? 4);
  const [safetyStock, setSafetyStock] = useState(existingPolicy?.safety_stock_quantity ?? 0);
  const [isActive, setIsActive] = useState(existingPolicy?.is_active ?? true);

  useEffect(() => {
    if (existingPolicy) {
      setTrackingUnit(existingPolicy.tracking_unit || inferTrackingUnit());
      setShelfLifeHours(existingPolicy.shelf_life_hours ?? 48);
      setWarningHours(existingPolicy.warning_before_expiry_hours ?? 12);
      setMinDispatchHours(existingPolicy.minimum_dispatch_freshness_hours ?? 4);
      setSafetyStock(existingPolicy.safety_stock_quantity ?? 0);
      setIsActive(existingPolicy.is_active ?? true);
    } else {
      setTrackingUnit(inferTrackingUnit());
    }
  }, [existingPolicy, product]);

  const saveMutation = useMutation({
    mutationFn: (payload) => setProductFreshnessPolicy(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Freshness Policy Saved", "Inventory tracking and FEFO rules updated successfully.");
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error?.message || err.message;
      toast.error("Save Policy Failed", msg);
    },
  });

  const handleSave = (e) => {
    e?.preventDefault?.();
    if (!shelfLifeHours || Number(shelfLifeHours) <= 0) {
      toast.error("Invalid Shelf Life", "Shelf life must be greater than 0 hours.");
      return;
    }

    saveMutation.mutate({
      tracking_unit: trackingUnit,
      shelf_life_hours: Number(shelfLifeHours),
      warning_before_expiry_hours: Number(warningHours) || 0,
      minimum_dispatch_freshness_hours: Number(minDispatchHours) || 0,
      safety_stock_quantity: parseFloat(safetyStock) || 0,
      is_active: isActive,
    });
  };

  return (
    <Card className="rounded-2xl border-slate-200/80 shadow-sm dark:border-slate-800">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Freshness & Inventory Policy
                {existingPolicy ? (
                  <Badge variant="success" className="text-[10px]">Configured</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">Action Required</Badge>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative physical lot tracking and FEFO rules for warehouse fulfillment
              </p>
            </div>
          </div>
        </div>

        {isReadOnly ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 uppercase text-[10px] block">Tracking Unit</span>
              <strong className="text-slate-900 dark:text-white text-sm">{trackingUnit}</strong>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 uppercase text-[10px] block">Shelf Life</span>
              <strong className="text-slate-900 dark:text-white text-sm">{shelfLifeHours} hours ({Math.round(shelfLifeHours / 24)} days)</strong>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 uppercase text-[10px] block">Warning Before Expiry</span>
              <strong className="text-slate-900 dark:text-white text-sm">{warningHours} hours</strong>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 uppercase text-[10px] block">Min Dispatch Freshness</span>
              <strong className="text-slate-900 dark:text-white text-sm">{minDispatchHours} hours</strong>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 uppercase text-[10px] block">Safety Stock Buffer</span>
              <strong className="text-slate-900 dark:text-white text-sm">{safetyStock} {trackingUnit}</strong>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 uppercase text-[10px] block">Policy Status</span>
              <strong className="text-slate-900 dark:text-white text-sm">{isActive ? "Active" : "Disabled"}</strong>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-bold">Canonical Tracking Unit</Label>
                <div className="mt-1">
                  <PremiumSelect
                    value={trackingUnit}
                    onChange={setTrackingUnit}
                    options={TRACKING_UNITS}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Must match physical dimension (KG for weight, L for volume, PC for units).
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold">Shelf Life (Hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={shelfLifeHours}
                  onChange={(e) => setShelfLifeHours(e.target.value)}
                  placeholder="e.g. 48 (2 days)"
                  className="mt-1 rounded-xl"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Total duration from vendor receipt until expiration ({shelfLifeHours ? `${(shelfLifeHours / 24).toFixed(1)} days` : ""}).
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold">Warning Before Expiry (Hours)</Label>
                <Input
                  type="number"
                  min="0"
                  value={warningHours}
                  onChange={(e) => setWarningHours(e.target.value)}
                  placeholder="e.g. 12"
                  className="mt-1 rounded-xl"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Flags lot as &apos;Expiring Soon&apos; when remaining hours drop below this threshold.
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold">Minimum Dispatch Freshness (Hours)</Label>
                <Input
                  type="number"
                  min="0"
                  value={minDispatchHours}
                  onChange={(e) => setMinDispatchHours(e.target.value)}
                  placeholder="e.g. 4"
                  className="mt-1 rounded-xl"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Stock cannot be reserved for delivery if remaining life is below this buffer.
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold">Safety Stock Buffer ({trackingUnit})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={safetyStock}
                  onChange={(e) => setSafetyStock(e.target.value)}
                  placeholder="e.g. 2.0"
                  className="mt-1 rounded-xl"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Always retained in warehouse as emergency buffer before marking excess stock.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Enable Freshness Policy
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {saveMutation.isPending ? "Saving Policy..." : "Save Freshness Policy"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
