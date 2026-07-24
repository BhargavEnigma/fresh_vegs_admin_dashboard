/**
 * Normalizes backend automation capabilities, defaulting all missing ones to false.
 */
export function normalizeAutomationCapabilities(rawCapabilities) {
  const defaults = {
    automatic_operation_open: false,
    automatic_order_lock: false,
    live_procurement_forecast: false,
    procurement_snapshot: false,
    bulk_exact_receipt: false,
    atomic_clean_packing: false,
    delivery_plan_generation: false,
    delivery_plan_approval: false,
    automatic_cod_reconciliation: false,
    automatic_exception_detection: false,
    automatic_operation_close: false,
  };

  if (!rawCapabilities) return defaults;

  const caps = typeof rawCapabilities === "object" ? rawCapabilities : {};
  const normalized = {};
  for (const key of Object.keys(defaults)) {
    normalized[key] = Boolean(
      caps[key] !== undefined ? caps[key] : (caps.automation_capabilities?.[key] !== undefined ? caps.automation_capabilities[key] : false)
    );
  }
  return normalized;
}

/**
 * Normalizes product-list response handling by resolving property discrepancies
 * (singular "product" vs plural "products", array wrappers, nested data, etc).
 */
export function normalizeProductListResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.product)) return data.product;
  
  if (data.data) {
    if (Array.isArray(data.data.products)) return data.data.products;
    if (Array.isArray(data.data.product)) return data.data.product;
    if (Array.isArray(data.data)) return data.data;
  }
  
  return [];
}

/**
 * Reusable helper to lookup and match a scanned packing order.
 * It matches using:
 * 1. Daily order number (exactly or clean format)
 * 2. Operational code (case-insensitive)
 * 3. Customer-facing order number (case-insensitive)
 * 4. UUID / order_id (exactly as final fallback)
 */
export function findOrderForPacking(orders = [], searchTerm = "") {
  if (!searchTerm || !Array.isArray(orders)) return null;
  const cleanSearch = searchTerm.trim().toLowerCase();
  if (!cleanSearch) return null;

  // Helpers to safely get codes
  const getCleanVal = (val) => String(val || "").trim().toLowerCase();

  // 1. Match by daily order number (e.g. "12", "#012", "012")
  const numericSearch = cleanSearch.replace(/[^0-9]/g, "");
  if (numericSearch) {
    const parsedSearchNum = parseInt(numericSearch, 10);
    const dailyMatch = orders.find((o) => {
      const dailyNum = o.daily_number || o.order?.daily_number || o.daily_order_number || o.order?.daily_order_number;
      if (dailyNum === undefined || dailyNum === null) return false;
      return parseInt(dailyNum, 10) === parsedSearchNum;
    });
    if (dailyMatch) return dailyMatch;
  }

  // 2. Match by operational code (exact or contains)
  const opCodeMatch = orders.find((o) => {
    const opCode = getCleanVal(o.operational_code || o.order?.operational_code || o.operational_order_code || o.order?.operational_order_code);
    return opCode && opCode === cleanSearch;
  });
  if (opCodeMatch) return opCodeMatch;

  // 3. Match by customer-facing order number (order_number)
  const orderNumMatch = orders.find((o) => {
    const orderNum = getCleanVal(o.order_number || o.order?.order_number);
    return orderNum && orderNum === cleanSearch;
  });
  if (orderNumMatch) return orderNumMatch;

  // 4. Fallback: UUID exact match on ID
  const uuidMatch = orders.find((o) => {
    const id = getCleanVal(o.id || o.order_id || o.order?.id);
    return id && id === cleanSearch;
  });
  
  return uuidMatch || null;
}
