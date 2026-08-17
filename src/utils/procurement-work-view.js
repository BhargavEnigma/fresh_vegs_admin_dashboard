export const PROCUREMENT_VIEWS = Object.freeze({
  ACTIVE: "active",
  HISTORY: "history",
});

export const PROCUREMENT_STEP_LABELS = Object.freeze({
  assign_vendor: "Assign Vendor",
  vendor_confirmation: "Waiting for Vendor Confirmation",
  vendor_dispatch: "Waiting for Vendor Dispatch",
  warehouse_receipt: "Receive at Warehouse",
  receive_remaining: "Receive Remaining Stock",
  resolve_issue: "Check Problem",
  completed: "Completed",
});

export function procurementItemsForView(items = [], view = PROCUREMENT_VIEWS.ACTIVE) {
  return items.filter((item) => !item.work_view || item.work_view === view);
}

export function completedProcurementPortions(items = []) {
  return items.filter((item) => Number(item.received_quantity || 0) > 0);
}

export function procurementStepLabel(item) {
  return PROCUREMENT_STEP_LABELS[item?.next_action_code] || item?.next_action_label || "Check Details";
}

export function canStartVendorAssignment(item, view = PROCUREMENT_VIEWS.ACTIVE) {
  return view === PROCUREMENT_VIEWS.ACTIVE && item?.next_action_code === "assign_vendor";
}

export function autoAssignableProcurementCostIds(items = []) {
  return Array.from(new Set(items.flatMap((item) => {
    if (item?.work_view && item.work_view !== PROCUREMENT_VIEWS.ACTIVE) return [];
    if (item?.next_action_code !== "assign_vendor") return [];
    if (item?.has_unlocked_orders) return [];
    if (Number(item.quantity_to_assign ?? item.outstanding_quantity ?? 0) <= 0) return [];
    if (item.is_product_group && Array.isArray(item.child_procurement_cost_ids)) {
      return item.child_procurement_cost_ids.map(String);
    }
    const id = item.procurement_cost_id || item.id;
    return id ? [String(id)] : [];
  })));
}

export function procurementDisplayTotals(items = []) {
  return items.reduce(
    (totals, item) => {
      totals.outstanding += Number(item.outstanding_quantity || 0);
      totals.unassigned += Number(item.unassigned_quantity ?? item.quantity_to_assign ?? 0);
      if (["vendor_confirmation", "vendor_dispatch"].includes(item.next_action_code)) totals.waitingVendor += 1;
      if (["warehouse_receipt", "receive_remaining"].includes(item.next_action_code)) totals.waitingWarehouse += 1;
      return totals;
    },
    { outstanding: 0, unassigned: 0, waitingVendor: 0, waitingWarehouse: 0 }
  );
}

const CONFIRMED_ASSIGNMENT_STATUSES = new Set(["confirmed", "dispatched", "received"]);

export function groupFullyConfirmedProductRows(items = [], vendorAssignmentsByCost = {}) {
  const rowsByProduct = new Map();
  items.forEach((item) => {
    const key = String(item.product_id || item.product?.id || item.id || item.procurement_cost_id);
    const rows = rowsByProduct.get(key) || [];
    rows.push(item);
    rowsByProduct.set(key, rows);
  });

  return Array.from(rowsByProduct.entries()).flatMap(([productId, rows]) => {
    if (rows.length < 2) return rows;
    const assignmentsForRow = (row) => (
      vendorAssignmentsByCost[String(row.procurement_cost_id || row.id)] || []
    ).filter((assignment) => !["cancelled", "rejected"].includes(assignment.status));
    const isConfirmedCycle = (row) => {
      const assignments = assignmentsForRow(row);
      return assignments.length > 0
        && assignments.every((assignment) => CONFIRMED_ASSIGNMENT_STATUSES.has(assignment.status))
        && Number(row.unassigned_quantity ?? row.quantity_to_assign ?? 0) <= 0
        && row.next_action_code !== "assign_vendor";
    };
    const confirmedRows = rows.filter(isConfirmedCycle);
    const currentRows = rows.filter((row) => !isConfirmedCycle(row));
    if (!confirmedRows.length) return rows;

    const assignments = confirmedRows.flatMap(assignmentsForRow);
    const confirmedGroup = {
      ...confirmedRows[0],
      id: `confirmed-product:${productId}`,
      procurement_cost_id: null,
      product_group_rows: confirmedRows,
      product_group_assignments: assignments,
      pack_label: `${assignments.length} confirmed assignment${assignments.length === 1 ? "" : "s"}`,
      next_action_code: assignments.some((assignment) => assignment.status === "confirmed")
        ? "vendor_dispatch"
        : assignments.some((assignment) => assignment.status === "dispatched")
          ? "warehouse_receipt"
          : "completed",
    };
    return currentRows.length ? [confirmedGroup, ...currentRows] : [confirmedGroup];
  });
}
