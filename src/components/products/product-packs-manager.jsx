import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { StatusBadge } from "../common/status-badge";
import { ConfirmDialog } from "../common/confirm-dialog";
import { useToast } from "../toast/toast-context";
import {
  listProductPacksAdmin,
  createProductPack,
  updateProductPack,
  setProductPackActive,
  deleteProductPack,
} from "../../api/services/products.service";

function paiseToRupees(paise) {
  return Number(paise || 0) / 100;
}
function rupeesToPaise(rupees) {
  const n = Number(rupees || 0);
  return Math.round(n * 100);
}

export function ProductPacksManager({ productId }) {
  const toast = useToast();
  const qc = useQueryClient();

  const [dialog, setDialog] = React.useState({ open: false, mode: "create", pack: null });
  const [confirmDelete, setConfirmDelete] = React.useState({ open: false, pack: null });

  const packsQ = useQuery({
    queryKey: ["adminPacks", productId],
    queryFn: () => listProductPacksAdmin(productId, { include_inactive: true }),
    enabled: !!productId,
  });

  const packs = packsQ.data?.data?.packs || [];

  const createM = useMutation({
    mutationFn: (payload) => createProductPack(productId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPacks", productId] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.push({ variant: "success", title: "Created", description: "Pack created." });
      setDialog({ open: false, mode: "create", pack: null });
    },
    onError: (e) => {
      toast.push({ variant: "error", title: "Failed", description: e?.response?.data?.error?.message || e?.message || "Failed" });
    },
  });

  const updateM = useMutation({
    mutationFn: ({ packId, payload }) => updateProductPack(packId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPacks", productId] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.push({ variant: "success", title: "Updated", description: "Pack updated." });
      setDialog({ open: false, mode: "create", pack: null });
    },
    onError: (e) => {
      toast.push({ variant: "error", title: "Failed", description: e?.response?.data?.error?.message || e?.message || "Failed" });
    },
  });

  const activeM = useMutation({
    mutationFn: ({ packId, is_active }) => setProductPackActive(packId, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPacks", productId] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.push({ variant: "success", title: "Updated", description: "Pack active flag updated." });
    },
    onError: (e) => {
      toast.push({ variant: "error", title: "Failed", description: e?.response?.data?.error?.message || e?.message || "Failed" });
    },
  });

  const deleteM = useMutation({
    mutationFn: (packId) => deleteProductPack(packId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPacks", productId] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.push({ variant: "success", title: "Deleted", description: "Pack deleted." });
      setConfirmDelete({ open: false, pack: null });
    },
    onError: (e) => {
      toast.push({ variant: "error", title: "Failed", description: e?.response?.data?.error?.message || e?.message || "Failed" });
    },
  });

  function openCreate() {
    setDialog({ open: true, mode: "create", pack: null });
  }

  function openEdit(pack) {
    setDialog({ open: true, mode: "edit", pack });
  }

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Product Packs</div>
            <div className="text-xs text-slate-500">Create / edit / activate / delete packs (admin).</div>
          </div>
          <Button onClick={openCreate}>Add pack</Button>
        </div>

        {packsQ.isLoading ? <div className="mt-3 text-sm text-slate-500">Loading…</div> : null}

        {packsQ.isError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
            {packsQ.error?.response?.data?.error?.message || packsQ.error?.message || "Failed to load packs"}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {packs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-800">No packs</div>
          ) : (
            packs.map((pk) => (
              <div key={pk.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{pk.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {pk.base_quantity} {pk.base_unit} • MRP ₹{paiseToRupees(pk.mrp_paise).toFixed(2)} • Sell ₹
                      {paiseToRupees(pk.selling_price_paise).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge value={pk.is_active ? "active" : "inactive"} />
                    <Button variant="outline" onClick={() => openEdit(pk)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => activeM.mutate({ packId: pk.id, is_active: !pk.is_active })}
                      disabled={activeM.isPending}
                    >
                      {pk.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="destructive" onClick={() => setConfirmDelete({ open: true, pack: pk })}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <PackDialog
          open={dialog.open}
          mode={dialog.mode}
          pack={dialog.pack}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
          onSubmit={(payload) => {
            if (dialog.mode === "edit") {
              updateM.mutate({ packId: dialog.pack.id, payload });
            } else {
              createM.mutate(payload);
            }
          }}
          pending={createM.isPending || updateM.isPending}
        />

        <ConfirmDialog
          open={confirmDelete.open}
          onOpenChange={(open) => setConfirmDelete((c) => ({ ...c, open }))}
          title="Delete pack?"
          description="DELETE /v1/admin/product/packs/:packId"
          confirmText="Delete"
          variant="destructive"
          onConfirm={() => deleteM.mutateAsync(confirmDelete.pack?.id)}
        />
      </CardContent>
    </Card>
  );
}

function PackDialog({ open, onOpenChange, mode, pack, onSubmit, pending }) {
  const [form, setForm] = React.useState({
    label: "",
    base_quantity: 1,
    base_unit: "kg",
    mrp_paise: 0,
    selling_price_paise: 0,
    sort_order: 0,
    is_active: true,
  });

  React.useEffect(() => {
    if (mode === "edit" && pack) {
      setForm({
        label: pack.label || "",
        base_quantity: Number(pack.base_quantity || 1),
        base_unit: pack.base_unit || "kg",
        mrp_paise: paiseToRupees(pack.mrp_paise),
        selling_price_paise: paiseToRupees(pack.selling_price_paise),
        sort_order: Number(pack.sort_order || 0),
        is_active: pack.is_active ?? true,
      });
    } else {
      setForm({
        label: "",
        base_quantity: 1,
        base_unit: "kg",
        mrp_paise: 0,
        selling_price_paise: 0,
        sort_order: 0,
        is_active: true,
      });
    }
  }, [mode, pack]);

  function submit(e) {
    e.preventDefault();
    onSubmit({
      label: form.label,
      base_quantity: Number(form.base_quantity),
      base_unit: form.base_unit,
      mrp_paise: rupeesToPaise(form.mrp_paise),
      selling_price_paise: rupeesToPaise(form.selling_price_paise),
      sort_order: Number(form.sort_order || 0),
      is_active: !!form.is_active,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Pack" : "Create Pack"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <div className="space-y-1">
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))} placeholder="250g / 1kg / 1pc" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Base qty</Label>
              <Input type="number" step="0.001" value={form.base_quantity} onChange={(e) => setForm((s) => ({ ...s, base_quantity: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={form.base_unit} onChange={(e) => setForm((s) => ({ ...s, base_unit: e.target.value }))} placeholder="g / kg / pc" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>MRP (₹)</Label>
              <Input type="number" step="0.01" value={form.mrp_paise} onChange={(e) => setForm((s) => ({ ...s, mrp_paise: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Selling (₹)</Label>
              <Input type="number" step="0.01" value={form.selling_price_paise} onChange={(e) => setForm((s) => ({ ...s, selling_price_paise: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm((s) => ({ ...s, sort_order: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} />
              <span className="text-sm">Active</span>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
