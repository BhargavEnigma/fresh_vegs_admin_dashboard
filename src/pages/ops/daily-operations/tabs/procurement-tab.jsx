import React, { useState, useMemo } from "react";
import { PremiumWorkspaceHelper } from "../../../../components/common/premium-workspace-helper";
import {
  Search,
  Printer,
  Check,
  CheckCircle2,
  AlertTriangle,
  Save,
  Filter,
  Package,
  Edit2,
  Trash2,
  Plus,
  ShoppingCart,
  Cpu,
} from "lucide-react";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { StatusBadge } from "../../../../components/common/status-badge";
import { useToast } from "../../../../components/toast/toast-context";
import { formatPaiseToRupees, parseDecimal } from "../../../../utils/daily-operations-helpers";
import { formatQuantity } from "../../../../lib/utils";
import { ProcurementPrintSheet, MandiBuyerPrintSheet } from "../print/procurement-print";
import { PremiumSelect } from "../../../../components/ui/premium-select";
import { normalizeAutomationCapabilities } from "../../../../utils/daily-operations-normalizers";

export function ProcurementTab({
  procurementData,
  isLoading,
  operation,
  isClosed,
  onUpdateItem,
  onBulkUpdate,
  isUpdating,
  capabilitiesRaw,
}) {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activePrintSheet, setActivePrintSheet] = useState("manager");

  const capabilities = useMemo(() => {
    return normalizeAutomationCapabilities(capabilitiesRaw || operation?.automation_capabilities);
  }, [capabilitiesRaw, operation]);

  // Expanded item rows track
  const [expandedItemIds, setExpandedItemIds] = useState({});

  // Edit item modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Bulk edit draft values map: itemId -> item payload
  const [bulkDrafts, setBulkDrafts] = useState({});

  const items = useMemo(() => procurementData?.items || [], [procurementData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const pName = (item.product_name || item.product?.name || "").toLowerCase();
      const pPack = (item.pack_label || item.pack?.pack_label || "").toLowerCase();
      const vendor = (item.vendor_name || "").toLowerCase();
      const matchSearch =
        !searchTerm ||
        pName.includes(searchTerm.toLowerCase()) ||
        pPack.includes(searchTerm.toLowerCase()) ||
        vendor.includes(searchTerm.toLowerCase());

      // Filter modes:
      // "all", "needs_confirmation", "shortage", "late_delta", "completed", "exceptions"
      if (activeFilter === "needs_confirmation") {
        const isPending = item.procurement_status === "pending" || item.procurement_status === "partial" || !item.procurement_status;
        return matchSearch && isPending;
      }
      if (activeFilter === "shortage") {
        const hasShortage = Number(item.shortage_quantity || 0) > 0;
        return matchSearch && hasShortage;
      }
      if (activeFilter === "late_delta") {
        const hasDelta = Number(item.late_order_delta || 0) > 0;
        return matchSearch && hasDelta;
      }
      if (activeFilter === "completed") {
        return matchSearch && item.procurement_status === "completed";
      }
      if (activeFilter === "exceptions") {
        const isException =
          item.procurement_status === "issue" ||
          Number(item.rejected_quantity || 0) > 0 ||
          Number(item.shortage_quantity || 0) > 0;
        return matchSearch && isException;
      }

      return matchSearch;
    });
  }, [items, searchTerm, activeFilter]);

  const isRowExpanded = (item) => {
    const hasShortage = Number(item.shortage_quantity || 0) > 0;
    const hasRejection = Number(item.rejected_quantity || 0) > 0;
    const hasExcess = Number(item.excess_quantity || 0) > 0;
    const hasCostOrVendorDiffers = Boolean(
      item.vendor_name ||
      item.unit_cost_paise ||
      item.bill_reference
    );
    return (
      expandedItemIds[item.id] ||
      hasShortage ||
      hasRejection ||
      hasExcess ||
      hasCostOrVendorDiffers
    );
  };

  const toggleRowExpand = (itemId) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      required_quantity: item.required_quantity ?? 0,
      purchased_quantity: item.purchased_quantity ?? 0,
      received_quantity: item.received_quantity ?? 0,
      rejected_quantity: item.rejected_quantity ?? 0,
      waste_quantity: item.waste_quantity ?? 0,
      unit_cost_rupees: item.unit_cost_paise ? (item.unit_cost_paise / 100).toString() : "",
      total_cost_rupees: item.total_cost_paise ? (item.total_cost_paise / 100).toString() : "",
      vendor_name: item.vendor_name || "",
      bill_reference: item.bill_reference || "",
      procurement_status: item.procurement_status || "pending",
      notes: item.notes || "",
    });
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;

    const unitCostPaise = editForm.unit_cost_rupees
      ? Math.round(parseFloat(editForm.unit_cost_rupees) * 100)
      : null;
    const totalCostPaise = editForm.total_cost_rupees
      ? Math.round(parseFloat(editForm.total_cost_rupees) * 100)
      : null;

    const payload = {
      required_quantity: parseDecimal(editForm.required_quantity),
      purchased_quantity: parseDecimal(editForm.purchased_quantity),
      received_quantity: parseDecimal(editForm.received_quantity),
      rejected_quantity: parseDecimal(editForm.rejected_quantity),
      waste_quantity: parseDecimal(editForm.waste_quantity),
      unit_cost_paise: unitCostPaise,
      total_cost_paise: totalCostPaise,
      vendor_name: editForm.vendor_name || null,
      bill_reference: editForm.bill_reference || null,
      procurement_status: editForm.procurement_status,
      notes: editForm.notes || null,
    };

    try {
      await onUpdateItem({ itemId: editingItem.id, payload });
      toast.success("Procurement item updated");
      setEditingItem(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update item");
    }
  };

  const handleShortcutReceivedExact = (item) => {
    const targetQty = item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity;
    onUpdateItem({
      itemId: item.id,
      payload: {
        purchased_quantity: item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity,
        received_quantity: parseDecimal(targetQty),
        rejected_quantity: 0,
        waste_quantity: item.waste_quantity ?? 0,
        procurement_status: "completed",
      },
    });
  };

  const handleShortcutPurchasedExact = (item) => {
    onUpdateItem({
      itemId: item.id,
      payload: {
        purchased_quantity: parseDecimal(item.required_quantity),
        received_quantity: item.received_quantity ?? 0,
        rejected_quantity: item.rejected_quantity ?? 0,
        waste_quantity: item.waste_quantity ?? 0,
        procurement_status: item.procurement_status || "pending",
      },
    });
  };

  const handleDraftChange = (itemId, field, value) => {
    setBulkDrafts((prev) => {
      const existing = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleBulkSave = async () => {
    const draftEntries = Object.entries(bulkDrafts);
    if (draftEntries.length === 0) {
      toast.info("No modified draft items to save.");
      return;
    }

    const payloadItems = draftEntries.map(([id, draft]) => {
      const origItem = items.find((i) => i.id === id) || {};
      const unitCostPaise = draft.unit_cost_rupees !== undefined
        ? (draft.unit_cost_rupees ? Math.round(parseFloat(draft.unit_cost_rupees) * 100) : null)
        : origItem.unit_cost_paise;
      const totalCostPaise = draft.total_cost_rupees !== undefined
        ? (draft.total_cost_rupees ? Math.round(parseFloat(draft.total_cost_rupees) * 100) : null)
        : origItem.total_cost_paise;

      return {
        id,
        purchased_quantity: parseDecimal(draft.purchased_quantity ?? origItem.purchased_quantity),
        received_quantity: parseDecimal(draft.received_quantity ?? origItem.received_quantity),
        rejected_quantity: parseDecimal(draft.rejected_quantity ?? origItem.rejected_quantity),
        waste_quantity: parseDecimal(draft.waste_quantity ?? origItem.waste_quantity),
        unit_cost_paise: unitCostPaise,
        total_cost_paise: totalCostPaise,
        vendor_name: draft.vendor_name ?? origItem.vendor_name,
        bill_reference: draft.bill_reference ?? origItem.bill_reference,
        procurement_status: draft.procurement_status ?? origItem.procurement_status,
        notes: draft.notes ?? origItem.notes,
      };
    });

    try {
      await onBulkUpdate({ items: payloadItems });
      toast.success(`Bulk updated ${payloadItems.length} items successfully`);
      setBulkDrafts({});
    } catch (err) {
      toast.error(err?.message || "Failed bulk procurement update");
    }
  };

  const handleConfirmAllReceivedAsPlanned = async () => {
    const pendingItems = items.filter(
      (item) => item.procurement_status !== "completed" && item.procurement_status !== "not_required"
    );

    if (pendingItems.length === 0) {
      toast.info("All items are already completed.");
      return;
    }

    const payloadItems = pendingItems.map((item) => {
      const targetQty = item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity;
      return {
        id: item.id,
        purchased_quantity: parseDecimal(item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity),
        received_quantity: parseDecimal(targetQty),
        rejected_quantity: 0,
        waste_quantity: item.waste_quantity ?? 0,
        procurement_status: "completed",
        vendor_name: item.vendor_name || null,
        bill_reference: item.bill_reference || null,
        notes: item.notes || null,
      };
    });

    try {
      await onBulkUpdate({ items: payloadItems });
      toast.success(`Bulk confirmed ${payloadItems.length} items as received.`);
    } catch (err) {
      toast.error(err?.message || "Bulk confirmation failed.");
    }
  };

  return (
    <div className="space-y-4">
      <PremiumWorkspaceHelper
        title="Mandi Purchase Guide (Step-by-Step)"
        description="Follow these easy steps to record vegetables purchased from the Mandi / Vendor."
        steps={[
          {
            title: "Check Product List",
            instruction: "Look at the table. It lists all the vegetables and quantities we need to buy.",
          },
          {
            title: "Confirm Perfect Buy",
            instruction: "If we got exactly what was requested, click the green 'Confirm All Received' button at the top.",
          },
          {
            title: "Correct Differences",
            instruction: "If we got less, more, or damaged items, click the Edit button (pencil) on that row.",
          },
          {
            title: "Save Your Work",
            instruction: "Type the actual amount received and vendor details, then click 'Save' or 'Save Drafts' at the top.",
          },
        ]}
      />

      {/* Hidden Print Layout */}
      {activePrintSheet === "buyer" ? (
        <MandiBuyerPrintSheet operation={operation} items={items} />
      ) : (
        <ProcurementPrintSheet operation={operation} items={items} />
      )}

      {/* Live Forecast Capability Diagnostics */}
      {(!capabilities.live_procurement_forecast || !capabilities.procurement_snapshot) && (
        <Card className="p-3 bg-slate-50 dark:bg-slate-900 border text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-slate-500" />
          <div>
            <span className="font-bold">Backend automation pending</span> — Live forecasting and procurement snapshotting are currently offline. Falling back to expected order quantities.
          </div>
        </Card>
      )}

      {/* Header controls & filter tabs */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 h-9"
              placeholder="Search product, pack, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold border">
            {[
              { key: "all", label: "All Items" },
              { key: "needs_confirmation", label: "Needs Confirming" },
              { key: "shortage", label: "Missing Items" },
              { key: "late_delta", label: "Late Orders" },
              { key: "completed", label: "Completed" },
              { key: "exceptions", label: "Exceptions" },
            ].map((f) => (
              <button
                key={f.key}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeFilter === f.key
                    ? "bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isClosed && (
            <Button
              size="sm"
              className="h-9 text-xs bg-dailyveg-600 hover:bg-dailyveg-700 text-white gap-1.5"
              onClick={handleConfirmAllReceivedAsPlanned}
              disabled={isUpdating}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm All Received as Planned
            </Button>
          )}

          {Object.keys(bulkDrafts).length > 0 && !isClosed && (
            <Button
              size="sm"
              className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleBulkSave}
              disabled={isUpdating}
            >
              <Save className="h-3.5 w-3.5" /> Save Drafts ({Object.keys(bulkDrafts).length})
            </Button>
          )}

          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 text-xs gap-1.5" 
            onClick={() => {
              setActivePrintSheet("manager");
              setTimeout(() => window.print(), 100);
            }}
          >
            <Printer className="h-3.5 w-3.5" /> Print Mandi Sheet
          </Button>
        </div>
      </div>

      {/* Procurement Data List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading procurement items...</div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p className="font-medium">No items found matching the selected filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto thin-scrollbar rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Product & Pack</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Estimated Sales</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Target Stock</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Late Orders</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Bought</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Received</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Missing</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Extra</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Damaged</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Unit Cost</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right">Total Cost</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-center">Status</th>
                <th className="py-3 px-3 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const draft = bulkDrafts[item.id] || {};
                const isDirty = Boolean(bulkDrafts[item.id]);
                const expanded = isRowExpanded(item);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 dark:border-slate-900 transition-colors ${
                      isDirty ? "bg-amber-50/40 dark:bg-amber-950/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.product_name || item.product?.name || "—"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {item.pack_label || item.pack?.pack_label || "—"}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300 font-semibold">
                      {capabilities.live_procurement_forecast && item.live_forecast_quantity !== undefined
                        ? formatQuantity(item.live_forecast_quantity)
                        : "—"}
                    </td>

                    <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300 font-semibold">
                      {capabilities.procurement_snapshot && item.frozen_procurement_quantity !== undefined
                        ? formatQuantity(item.frozen_procurement_quantity)
                        : formatQuantity(item.required_quantity, "0")}
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-indigo-600">
                      {Number(item.late_order_delta) > 0 ? `+${formatQuantity(item.late_order_delta)}` : "—"}
                    </td>

                    <td className="py-3 px-2 text-right">
                      {expanded ? (
                        <Input
                          type="number"
                          step="0.1"
                          disabled={isClosed}
                          className="w-16 h-7 text-xs text-right ml-auto rounded-sm"
                          value={draft.purchased_quantity ?? item.purchased_quantity ?? 0}
                          onChange={(e) => handleDraftChange(item.id, "purchased_quantity", e.target.value)}
                        />
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatQuantity(item.purchased_quantity, "0")}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-right">
                      {expanded ? (
                        <Input
                          type="number"
                          step="0.1"
                          disabled={isClosed}
                          className="w-16 h-7 text-xs text-right ml-auto rounded-sm"
                          value={draft.received_quantity ?? item.received_quantity ?? 0}
                          onChange={(e) => handleDraftChange(item.id, "received_quantity", e.target.value)}
                        />
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatQuantity(item.received_quantity, "0")}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-rose-600">
                      {Number(item.shortage_quantity) > 0 ? formatQuantity(item.shortage_quantity) : "—"}
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-emerald-600">
                      {Number(item.excess_quantity) > 0 ? formatQuantity(item.excess_quantity) : "—"}
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-orange-600">
                      {Number(item.rejected_quantity) > 0 ? formatQuantity(item.rejected_quantity) : "—"}
                    </td>

                    <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
                      {formatPaiseToRupees(item.unit_cost_paise)}
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-slate-900 dark:text-white">
                      {formatPaiseToRupees(item.total_cost_paise)}
                    </td>

                    <td className="py-3 px-2 text-center">
                      <StatusBadge value={item.procurement_status || "pending"} />
                    </td>

                    <td className="py-3 px-3 text-right">
                      {!isClosed && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-1 text-[10px]"
                            onClick={() => handleShortcutPurchasedExact(item)}
                          >
                            Pur. Exact
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-1 text-[10px] text-emerald-600"
                            onClick={() => handleShortcutReceivedExact(item)}
                          >
                            Rec. Exact
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-7 px-2 ${expanded ? "bg-slate-100" : ""}`}
                            onClick={() => toggleRowExpand(item.id)}
                            title="Toggle Full Row Inputs"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-1 text-[10px] text-slate-500"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Costs/Vendor Details"
                          >
                            Details
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
 
        <div className="flex justify-end pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 text-xs gap-1.5 text-dailyveg-700 border-dailyveg-200 hover:bg-dailyveg-50 hover:text-dailyveg-800 shadow-sm transition-all hover:scale-[1.02]" 
            onClick={() => {
              setActivePrintSheet("buyer");
              setTimeout(() => window.print(), 100);
            }}
          >
            <Printer className="h-3.5 w-3.5" /> Download Purchase PDF
          </Button>
        </div>
      </div>
    )}

      {/* Edit Item Modal */}
      {editingItem && (
        <Dialog open={Boolean(editingItem)} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Procurement Entry</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border">
                <p className="font-semibold text-sm text-slate-900 dark:text-white">
                  {editingItem.product_name || editingItem.product?.name}
                </p>
                <p className="text-slate-500">{editingItem.pack_label || editingItem.pack?.pack_label}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Required Qty</Label>
                  <Input type="number" step="0.001" disabled value={editForm.required_quantity} />
                </div>
                <div>
                  <Label className="text-xs">Purchased Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.purchased_quantity}
                    onChange={(e) => setEditForm({ ...editForm, purchased_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Received Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.received_quantity}
                    onChange={(e) => setEditForm({ ...editForm, received_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rejected Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.rejected_quantity}
                    onChange={(e) => setEditForm({ ...editForm, rejected_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Waste Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.waste_quantity}
                    onChange={(e) => setEditForm({ ...editForm, waste_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <PremiumSelect
                    value={editForm.procurement_status}
                    onChange={(val) => setEditForm({ ...editForm, procurement_status: val })}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "partial", label: "Partial" },
                      { value: "completed", label: "Completed" },
                      { value: "issue", label: "Issue" },
                      { value: "not_required", label: "Not Required" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Unit Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 25.50"
                    value={editForm.unit_cost_rupees}
                    onChange={(e) => setEditForm({ ...editForm, unit_cost_rupees: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Total Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 500.00"
                    value={editForm.total_cost_rupees}
                    onChange={(e) => setEditForm({ ...editForm, total_cost_rupees: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Vendor Name</Label>
                  <Input
                    placeholder="Vendor Name"
                    value={editForm.vendor_name}
                    onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Bill Reference</Label>
                  <Input
                    placeholder="Bill / Invoice #"
                    value={editForm.bill_reference}
                    onChange={(e) => setEditForm({ ...editForm, bill_reference: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="Procurement notes..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveItem} disabled={isUpdating}>
                  Save Details
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
