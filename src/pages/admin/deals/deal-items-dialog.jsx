import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminDealsService } from "../../../api/services/admin-deals.service";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Card } from "../../../components/ui/card";
import { useToast } from "../../../components/toast/toast-context";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";

function pricingLabel(t) {
    if (t === "fixed_price") return "Fixed price";
    if (t === "percent_off") return "% off";
    if (t === "amount_off") return "Amount off";
    return t;
}

function computeEffective({ base, item }) {
    const basePrice = Number(base || 0);
    if (item.pricing_type === "fixed_price") {
        return Number(item.deal_price_paise ?? basePrice);
    }
    if (item.pricing_type === "percent_off") {
        const bps = Number(item.discount_bps ?? 0);
        const disc = Math.round((basePrice * bps) / 10000);
        return Math.max(0, basePrice - disc);
    }
    if (item.pricing_type === "amount_off") {
        const disc = Number(item.discount_paise ?? 0);
        return Math.max(0, basePrice - disc);
    }
    return basePrice;
}

export function DealItemsDialog({ open, deal, onOpenChange, onClose }) {
    const qc = useQueryClient();
    const toast = useToast();

    console.log("open : ", open);
    console.log("deal : ", deal);

    const [q, setQ] = React.useState("");
    const [packs, setPacks] = React.useState([]);
    const [items, setItems] = React.useState([]);

    const [confirm, setConfirm] = React.useState({ open: false, item: null });

    const dealId = deal?.id || null;

    console.log("dealId : ", dealId);

    const { data: dealRes, isFetching } = useQuery({
        enabled: Boolean(dealId && open),
        queryKey: ["admin-deal-by-id", dealId],
        queryFn: () => AdminDealsService.getById(dealId),
    });

    console.log("dealRes : ", dealRes);

    React.useEffect(() => {
        if (!open) return;
        const serverItems = dealRes?.data?.items ?? [];
        setItems(serverItems.map((it) => ({ ...it })));
    }, [open, dealId, dealRes]);


    const saveMut = useMutation({
        mutationFn: () => {
            const payload = items.map((it) => ({
                id: it.id,
                product_pack_id: it.product_pack_id,
                pricing_type: it.pricing_type,
                deal_price_paise: it.deal_price_paise ?? null,
                discount_bps: it.discount_bps ?? null,
                discount_paise: it.discount_paise ?? null,
                max_qty_per_order: it.max_qty_per_order ?? null,
                sort_order: it.sort_order ?? 0,
                is_active: it.is_active !== undefined ? Boolean(it.is_active) : true,
            }));
            return AdminDealsService.upsertItems(dealId, payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deal-by-id", dealId] });
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Saved", description: "Deal items updated." });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Save failed", description: msg });
        },
    });

    const removeMut = useMutation({
        mutationFn: ({ itemId }) => AdminDealsService.removeItem(dealId, itemId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deal-by-id", dealId] });
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Deleted", description: "Item removed." });
            setConfirm({ open: false, item: null });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Delete failed", description: msg });
        },
    });

    async function doSearch(nextQ) {
        console.log("CALL SEARCH PRODUCT PACKS : ", nextQ);
        
        const qq = String(nextQ || "").trim();
        if (!qq) {
            setPacks([]);
            return;
        }
        try {
            const res = await AdminDealsService.searchPacks({ q: qq, limit: 20 });
            console.log("RES : ", res);
            setPacks(res?.data?.packs ?? []);
        } catch (e) {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Search failed", description: msg });
        }
    }

    function addPack(pack) {
        const exists = items.some((it) => it.product_pack_id === pack.id);
        if (exists) return;

        const base = Number(pack.selling_price_paise ?? 0);

        setItems((prev) => [
            ...prev,
            {
                product_pack_id: pack.id,
                pricing_type: "fixed_price",
                deal_price_paise: base,
                discount_bps: null,
                discount_paise: null,
                max_qty_per_order: null,
                sort_order: prev.length,
                is_active: true,

                base_price_paise: base,
                pack: {
                    id: pack.id,
                    label: pack.label,
                    base_quantity: pack.base_quantity,
                    base_unit: pack.base_unit,
                },
                product: pack.product,
            },
        ]);
    }

    function updateItem(idx, patch) {
        setItems((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    }

    React.useEffect(() => {
        if (!open) {
            setQ("");
            setPacks([]);
            setItems([]);
            setConfirm({ open: false, item: null });
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Deal Items — {deal?.deal_date || "—"}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="p-4">
                        <div className="text-sm font-medium">Search Packs</div>
                        <div className="mt-2 flex gap-2">
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search by product name / pack label…"
                            />
                            <Button variant="outline" onClick={() => doSearch(q)}>
                                Search
                            </Button>
                        </div>

                        <div className="mt-3 space-y-2">
                            {packs.length === 0 ? (
                                <div className="text-xs text-slate-500">No packs. Search to add items.</div>
                            ) : (
                                packs.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/30"
                                        onClick={() => addPack(p)}
                                    >
                                        <div>
                                            <div className="font-medium">{p.product?.name || "—"}</div>
                                            <div className="text-xs text-slate-500">
                                                {p.label} • {p.selling_price_paise} paise
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500">Add</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Selected Items</div>
                            <div className="text-xs text-slate-500">{items.length} items</div>
                        </div>

                        <div className="mt-3 max-h-[420px] space-y-3 overflow-auto pr-1">
                            {isFetching ? <div className="text-sm text-slate-500">Loading…</div> : null}

                            {items.length === 0 ? (
                                <div className="text-xs text-slate-500">No items yet. Search and add packs.</div>
                            ) : null}

                            {items.map((it, idx) => {
                                const base = Number(it.base_price_paise ?? it.base_price_paise ?? 0);
                                const eff = computeEffective({ base, item: it });
                                const disc = Math.max(0, base - eff);

                                return (
                                    <div key={it.id || it.product_pack_id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-medium">{it.product?.name || "—"}</div>
                                                <div className="text-xs text-slate-500">
                                                    {it.pack?.label || "—"} • Base: {base} • Effective: {eff} • Discount: {disc}
                                                </div>
                                            </div>

                                            {it.id ? (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setConfirm({ open: true, item: it })}
                                                >
                                                    Remove
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setItems((prev) => prev.filter((x) => x.product_pack_id !== it.product_pack_id))
                                                    }
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                            <div>
                                                <div className="mb-1 text-xs text-slate-500">Pricing type</div>
                                                <select
                                                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                                    value={it.pricing_type}
                                                    onChange={(e) => {
                                                        const t = e.target.value;
                                                        // reset fields for clarity
                                                        if (t === "fixed_price") {
                                                            updateItem(idx, { pricing_type: t, deal_price_paise: base, discount_bps: null, discount_paise: null });
                                                        } else if (t === "percent_off") {
                                                            updateItem(idx, { pricing_type: t, deal_price_paise: null, discount_bps: 0, discount_paise: null });
                                                        } else {
                                                            updateItem(idx, { pricing_type: t, deal_price_paise: null, discount_bps: null, discount_paise: 0 });
                                                        }
                                                    }}
                                                >
                                                    <option value="fixed_price">{pricingLabel("fixed_price")}</option>
                                                    <option value="percent_off">{pricingLabel("percent_off")}</option>
                                                    <option value="amount_off">{pricingLabel("amount_off")}</option>
                                                </select>
                                            </div>

                                            <div>
                                                <div className="mb-1 text-xs text-slate-500">Sort order</div>
                                                <Input
                                                    type="number"
                                                    value={it.sort_order ?? 0}
                                                    onChange={(e) => updateItem(idx, { sort_order: Number(e.target.value || 0) })}
                                                />
                                            </div>

                                            {it.pricing_type === "fixed_price" ? (
                                                <div>
                                                    <div className="mb-1 text-xs text-slate-500">Deal price (paise)</div>
                                                    <Input
                                                        type="number"
                                                        value={it.deal_price_paise ?? 0}
                                                        onChange={(e) => updateItem(idx, { deal_price_paise: Number(e.target.value || 0) })}
                                                    />
                                                </div>
                                            ) : null}

                                            {it.pricing_type === "percent_off" ? (
                                                <div>
                                                    <div className="mb-1 text-xs text-slate-500">Discount (bps) — 10000 = 100%</div>
                                                    <Input
                                                        type="number"
                                                        value={it.discount_bps ?? 0}
                                                        onChange={(e) => updateItem(idx, { discount_bps: Number(e.target.value || 0) })}
                                                    />
                                                </div>
                                            ) : null}

                                            {it.pricing_type === "amount_off" ? (
                                                <div>
                                                    <div className="mb-1 text-xs text-slate-500">Discount (paise)</div>
                                                    <Input
                                                        type="number"
                                                        value={it.discount_paise ?? 0}
                                                        onChange={(e) => updateItem(idx, { discount_paise: Number(e.target.value || 0) })}
                                                    />
                                                </div>
                                            ) : null}

                                            <div>
                                                <div className="mb-1 text-xs text-slate-500">Max qty per order (optional)</div>
                                                <Input
                                                    type="number"
                                                    value={it.max_qty_per_order ?? ""}
                                                    onChange={(e) =>
                                                        updateItem(idx, { max_qty_per_order: e.target.value === "" ? null : Number(e.target.value) })
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <div className="mb-1 text-xs text-slate-500">Active</div>
                                                <select
                                                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                                    value={String(it.is_active !== false)}
                                                    onChange={(e) => updateItem(idx, { is_active: e.target.value === "true" })}
                                                >
                                                    <option value="true">Active</option>
                                                    <option value="false">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose} disabled={saveMut.isPending}>
                                Close
                            </Button>
                            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !dealId}>
                                Save Items
                            </Button>
                        </div>
                    </Card>
                </div>

                <ConfirmDialog
                    open={confirm.open}
                    title="Remove item?"
                    description="This will delete the deal item from server."
                    confirmText="Remove"
                    confirmVariant="destructive"
                    onConfirm={() => removeMut.mutate({ itemId: confirm.item.id })}
                    onOpenChange={(open2) => setConfirm((s) => ({ ...s, open: open2 }))}
                    isLoading={removeMut.isPending}
                />
            </DialogContent>
        </Dialog>
    );
}
