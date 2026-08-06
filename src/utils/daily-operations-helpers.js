export function formatPaiseToRupees(paise) {
  if (paise === null || paise === undefined) return "—";
  const num = Number(paise);
  if (Number.isNaN(num)) return "—";
  const rupees = num / 100;
  return rupees.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export function parseDecimal(val, maxDecimals = 3) {
  if (val === null || val === undefined || val === "") return 0;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (Number.isNaN(num)) return 0;
  const factor = Math.pow(10, maxDecimals);
  return Math.round(num * factor) / factor;
}

export function groupPackingItemsByOrder(packingItems = []) {
  if (!Array.isArray(packingItems)) return [];

  const map = new Map();

  for (const item of packingItems) {
    const orderId = item.order_id || item.order?.id || "unknown";
    if (!map.has(orderId)) {
      map.set(orderId, {
        order_id: orderId,
        order: item.order || { id: orderId },
        items: [],
        total_items: 0,
        packed_count: 0,
        partial_count: 0,
        issue_count: 0,
        pending_count: 0,
        progress_percent: 0,
        is_complete: false,
      });
    }

    const group = map.get(orderId);
    group.items.push(item);
    group.total_items += 1;

    const status = String(item.status || item.packing_status || "").toLowerCase();
    if (status === "packed") {
      group.packed_count += 1;
    } else if (status === "partial") {
      group.partial_count += 1;
    } else if (status === "issue") {
      group.issue_count += 1;
    } else {
      group.pending_count += 1;
    }
  }

  const result = Array.from(map.values());

  for (const group of result) {
    if (group.total_items > 0) {
      group.progress_percent = Math.round((group.packed_count / group.total_items) * 100);
      group.is_complete = group.packed_count === group.total_items;
    }
  }

  return result;
}

export const FRIENDLY_EVENT_LABELS = {
  opened: "Operation Opened",
  procurement_refreshed: "Procurement Refreshed",
  procurement_updated: "Procurement Item Updated",
  packing_started: "Order Packing Started",
  packing_completed: "Order Packing Completed",
  run_created: "Delivery Run Created",
  run_handed_over: "Delivery Run Handed Over",
  run_cod_reconciled: "Delivery Run COD Reconciled",
  exception_created: "Operational Exception Logged",
  exception_resolved: "Operational Exception Resolved",
  waste_recorded: "Inventory Waste Recorded",
  handover_note_updated: "Handover Note Updated",
  closed: "Daily Operation Closed",
  force_closed: "Daily Operation Force Closed",
  reopened: "Daily Operation Reopened",
};

export function mapEventToFriendlyLabel(eventType) {
  if (!eventType) return "Operational Activity";
  const key = String(eventType).toLowerCase();
  return FRIENDLY_EVENT_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export const ERROR_CODE_MESSAGES = {
  WAREHOUSE_ID_REQUIRED: "Warehouse selection is required.",
  WAREHOUSE_SCOPE_MISSING: "No warehouse access assigned to your user account.",
  FORBIDDEN: "You do not have access to this warehouse or action.",
  OPERATION_NOT_FOUND: "No daily operation record was found for the selected date and warehouse.",
  OPERATION_ALREADY_CLOSED: "This daily operation is closed. Reopen it first to make changes.",
  CLOSING_BLOCKED: "Cannot close operations due to open blockers.",
  OVERRIDE_REASON_REQUIRED: "An explanation is required to override closing or packing blockers.",
  OPERATION_NOT_CLOSED: "This operation is currently open and cannot be reopened.",
  REASON_REQUIRED: "Please provide a reason for reopening this operation.",
  PROCUREMENT_ITEM_NOT_FOUND: "Procurement item not found.",
  VENDOR_MANAGED_PROCUREMENT_MANUAL_RECEIPT_FORBIDDEN: "Vendor-managed procurement must be received through Vendor Check-In.",
  QUANTITY_MISMATCH: "Quantity values provided do not match required metrics.",
  INVALID_QUANTITY: "Quantities cannot be negative or invalid.",
  INVENTORY_IDEMPOTENCY_KEY_REQUIRED: "This inventory update is missing its retry-safe reference. Refresh and try again.",
  ORDER_NOT_LOCKED: "Order must be locked before starting packing.",
  ORDER_INVALID_STATUS: "Order is not in a valid state for this action.",
  PACKING_ITEM_NOT_FOUND: "Packing item record not found.",
  QUANTITY_EXCEEDS_REQUIRED: "Packed quantity cannot exceed the ordered item quantity.",
  PACKING_ITEMS_MISSING: "Some order items are missing packing entries.",
  PACKING_INCOMPLETE: "All items must be packed before completing order packing.",
  RUN_NOT_FOUND: "Delivery run not found.",
  RUN_LOCKED: "This delivery run has already been handed over or locked.",
  ORDER_ALREADY_IN_RUN: "Selected order is already assigned to a delivery run.",
  ORDER_MISMATCH: "Selected order does not belong to this warehouse or date.",
  RUN_EMPTY: "Delivery run must contain at least one packed order.",
  HANDOVER_BLOCKED: "Delivery run handover is blocked. Ensure all orders are packed.",
  RUN_ALREADY_HANDED_OVER: "Delivery run is already handed over.",
  EXCEPTION_NOT_FOUND: "Operational exception not found.",
  INSUFFICIENT_STOCK: "Insufficient inventory stock available.",
  INVENTORY_NOT_FOUND: "Inventory record not found.",
};

export function mapErrorCodeToUserMessage(errorObj) {
  if (!errorObj) return "An unexpected error occurred.";
  if (typeof errorObj === "string") {
    return ERROR_CODE_MESSAGES[errorObj] || errorObj;
  }

  const code = errorObj?.code || errorObj?.response?.data?.error?.code;
  const message = errorObj?.response?.data?.error?.message || errorObj?.message;

  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }

  return message || "An unexpected operational error occurred.";
}

export function filterEligibleRunOrders(opsOrders = [], allRunOrders = []) {
  const existingRunOrderIds = new Set(
    (allRunOrders || []).map((ro) => ro.order_id || ro.id || ro.order?.id).filter(Boolean)
  );

  return (opsOrders || []).filter((order) => {
    const status = String(order.status || "").toLowerCase();
    const isPacked = status === "packed";
    return isPacked && !existingRunOrderIds.has(order.id);
  });
}

export function canReconcileRunCod(run = {}) {
  return run.status === "completed";
}

export function canResolveRunCodVariance(run = {}) {
  return canReconcileRunCod(run)
    && run.cod_reconciliation_status === "variance"
    && Number(run.cod_variance_paise || 0) !== 0;
}

export {
  normalizeAutomationCapabilities,
  normalizeProductListResponse,
  findOrderForPacking,
} from "./daily-operations-normalizers.js";
