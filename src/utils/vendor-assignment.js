export const VENDOR_ASSIGNMENT_STATUS = {
  assigned: { label: "Waiting for confirmation", variant: "warning" },
  // Legacy API states retained for old records. Vendor prices now come from
  // the vendor catalogue, so both map into the confirmation stage.
  pending_quote: { label: "Waiting for confirmation", variant: "warning" },
  quoted: { label: "Ready for confirmation", variant: "secondary" },
  approved: { label: "Ready to confirm (legacy)", variant: "success" },
  confirmed: { label: "Confirmed", variant: "success" },
  dispatched: { label: "Dispatched", variant: "secondary" },
  received: { label: "Received", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export function getVendorAssignmentStatus(status) {
  return VENDOR_ASSIGNMENT_STATUS[status] || {
    label: String(status || "Unknown").replaceAll("_", " "),
    variant: "outline",
  };
}

export function formatVendorMoney(paise, fallback = "—") {
  if (paise === null || paise === undefined || paise === "") return fallback;
  const value = Number(paise);
  if (!Number.isFinite(value)) return fallback;
  return (value / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const QUANTITY_SCALE = 1000n;

export function normalizeProcurementMode(value) {
  return value === "bulk" ? "bulk" : "pack";
}

export function normalizeProcurementUnit(value, mode = "pack", packLabel = "") {
  const explicit = String(value || "").trim().toLowerCase();
  if (["piece", "pieces", "pcs", "pc"].includes(explicit)) return "pc";
  if (explicit) return explicit;
  if (normalizeProcurementMode(mode) === "pack") {
    return String(packLabel || "pack").trim() || "pack";
  }
  return "";
}

export function parseQuantityScaled(value, { allowEmpty = false } = {}) {
  const raw = String(value ?? "").trim();
  if (allowEmpty && raw === "") return null;
  if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) {
    throw new Error("Quantity must be non-negative with at most 3 decimal places");
  }
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(3, "0"));
}

export function formatScaledQuantity(value) {
  const scaled = typeof value === "bigint" ? value : parseQuantityScaled(value);
  const whole = scaled / QUANTITY_SCALE;
  const fractionVal = scaled % QUANTITY_SCALE;
  if (fractionVal === 0n) {
    return String(whole);
  }
  const fractionStr = String(fractionVal).padStart(3, "0").replace(/0+$/, "");
  return `${whole}.${fractionStr}`;
}

export function confirmedBufferRecommendation(assignments = [], lateDemand = 0) {
  const confirmed = assignments.filter((assignment) =>
    ["confirmed", "dispatched"].includes(assignment?.status)
  );
  const assignedScaled = confirmed.reduce(
    (sum, assignment) => sum + parseQuantityScaled(
      assignment.supplied_quantity || assignment.allocated_quantity || 0
    ),
    0n
  );
  const demandCoverageScaled = confirmed.reduce(
    (sum, assignment) => sum + parseQuantityScaled(
      assignment.demand_coverage_quantity
        ?? assignment.supplied_quantity
        ?? assignment.allocated_quantity
        ?? 0
    ),
    0n
  );
  const confirmedExtraScaled = assignedScaled > demandCoverageScaled
    ? assignedScaled - demandCoverageScaled
    : 0n;
  const lateDemandScaled = typeof lateDemand === "bigint"
    ? lateDemand
    : parseQuantityScaled(lateDemand || 0);
  return {
    confirmedAssignmentCount: confirmed.length,
    previouslyConfirmedScaled: assignedScaled,
    confirmedDemandCoverageScaled: demandCoverageScaled,
    confirmedExtraScaled,
    lateDemandScaled,
    recommendedNewAllocationScaled: lateDemandScaled > confirmedExtraScaled
      ? lateDemandScaled - confirmedExtraScaled
      : 0n,
    fullLateDemandScaled: lateDemandScaled,
  };
}

export function formatQuantityWithUnit(value, unit, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    const label = String(unit || "").trim().toLowerCase();
    const formattedQty = formatScaledQuantity(value);
    const numVal = Number(formattedQty);
    
    if (numVal > 0 && numVal < 1) {
      if (label === "kg") {
        return `${Math.round(numVal * 1000)} G`;
      }
      if (label === "l") {
        return `${Math.round(numVal * 1000)} ML`;
      }
    }
    return `${formattedQty}${label ? ` ${label.toUpperCase()}` : ""}`;
  } catch {
    return fallback;
  }
}

const WEIGHT_UNIT_IN_KG = {
  kg: 1,
  kilogram: 1,
  kilograms: 1,
  g: 0.001,
  gm: 0.001,
  gram: 0.001,
  grams: 0.001,
};

const PIECE_UNITS = new Set(["pc", "pcs", "piece", "pieces"]);

function packMeasure(item = {}) {
  const pack = item.pack || item.product_pack || {};
  let quantity = Number(pack.base_quantity);
  let unit = String(pack.base_unit || "").trim().toLowerCase();

  if (!Number.isFinite(quantity) || quantity <= 0 || !unit) {
    const label = String(
      item.pack_label || pack.pack_label || pack.label || ""
    ).trim();
    const match = label.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|gm|grams?|pcs?|pieces?)\b/i);
    if (!match) return null;
    quantity = Number(match[1]);
    unit = match[2].toLowerCase();
  }

  return { quantity, unit };
}

/**
 * Formats quantities for the procurement workspace in the vendor's buying unit.
 * Pack demand is converted to total KG or PC; it is never shown as the ambiguous
 * generic "UNIT". Values on bulk rows are already expressed in procurement units.
 */
export function procurementQuantityForDisplay(item, value) {
  if (value === null || value === undefined || value === "") return null;

  if (item?.quantities_normalized || item?.is_product_group) {
    return {
      quantity: Number(value),
      unit: normalizeProcurementUnit(item?.procurement_unit, "bulk"),
    };
  }

  const mode = normalizeProcurementMode(item?.procurement_mode);
  const rawUnit = normalizeProcurementUnit(
    item?.procurement_unit,
    mode,
    item?.pack_label || item?.pack?.pack_label || item?.product_pack?.pack_label
  );

  if (mode === "bulk") {
    const unit = ["unit", "units", ""].includes(rawUnit) ? "pc" : rawUnit;
    return { quantity: Number(value), unit };
  }

  const measure = packMeasure(item);
  if (!measure) {
    return { quantity: Number(value), unit: PIECE_UNITS.has(rawUnit) ? "pc" : "pack" };
  }

  const count = Number(value);
  if (!Number.isFinite(count)) return null;

  if (WEIGHT_UNIT_IN_KG[measure.unit]) {
    const totalKg = count * measure.quantity * WEIGHT_UNIT_IN_KG[measure.unit];
    return { quantity: Number(totalKg.toFixed(3)), unit: "kg" };
  }

  if (PIECE_UNITS.has(measure.unit)) {
    return { quantity: Number((count * measure.quantity).toFixed(3)), unit: "pc" };
  }

  return { quantity: Number(value), unit: "pack" };
}

export function formatProcurementQuantity(item, value, fallback = "—") {
  const display = procurementQuantityForDisplay(item, value);
  if (!display || !Number.isFinite(display.quantity)) return fallback;
  return formatQuantityWithUnit(String(display.quantity), display.unit, fallback);
}

export function addQuantities(values) {
  return values.reduce((total, value) => total + parseQuantityScaled(value), 0n);
}

export function assignmentCoverageScaled(assignment = {}) {
  if (["assigned", "approved"].includes(assignment.status)) {
    return parseQuantityScaled(
      assignment.demand_coverage_quantity ?? assignment.allocated_quantity ?? "0"
    );
  }
  if (["confirmed", "dispatched"].includes(assignment.status)) {
    const supplied = parseQuantityScaled(assignment.supplied_quantity || "0");
    const demandCoverage = parseQuantityScaled(
      assignment.demand_coverage_quantity
        ?? assignment.supplied_quantity
        ?? assignment.allocated_quantity
        ?? "0"
    );
    return supplied < demandCoverage ? supplied : demandCoverage;
  }
  if (assignment.status === "received") {
    return parseQuantityScaled(assignment.received_quantity || "0");
  }
  return 0n;
}

export function remainingAssignmentQuantity(requiredQuantity, assignments = []) {
  const required = parseQuantityScaled(requiredQuantity || "0");
  const covered = assignments.reduce(
    (sum, assignment) => sum + assignmentCoverageScaled(assignment),
    0n
  );
  return covered >= required ? 0n : required - covered;
}

export function maxAllocationWithExtraScaled(remainingQuantity, extraPercent = 25n) {
  const remaining = typeof remainingQuantity === "bigint"
    ? remainingQuantity
    : parseQuantityScaled(remainingQuantity || "0");
  return (remaining * (100n + extraPercent)) / 100n;
}

export function acceptedPayoutPaise(quantity, unitCostPaise) {
  const scaled = parseQuantityScaled(quantity);
  const cost = BigInt(String(unitCostPaise ?? 0));
  return Number((scaled * cost + 500n) / QUANTITY_SCALE);
}

export function rupeesToPaise(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Price must be non-negative with at most 2 decimal places");
  }
  const [whole, fraction = ""] = raw.split(".");
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (paise > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Price is outside the supported range");
  return Number(paise);
}

export function vendorUnitCostPaise(value) {
  return value?.vendor_unit_cost_paise ?? value?.reference_unit_cost_paise ?? value?.default_unit_cost_paise ?? 0;
}

export function formatVendorPriceUpdatedAt(value, fallback = "—") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  const hour = part("hour").padStart(2, "0");
  const dayPeriod = part("dayPeriod").replaceAll(".", "").trim().toLowerCase();
  return `${part("day")} ${part("month")} ${part("year")}, ${hour}:${part("minute")} ${dayPeriod}`;
}

// Kept as a compatibility alias while Daily Operations is migrated separately.
export function referenceUnitCostPaise(value) {
  return vendorUnitCostPaise(value);
}

export function normalizeVendorAssignment(value = {}) {
  const procurement = value.procurement_cost || {};
  const mode = normalizeProcurementMode(
    value.procurement_mode ?? procurement.procurement_mode
  );
  const packLabel = value.pack_label ?? procurement.pack_label ?? "";
  return {
    ...value,
    procurement_mode: mode,
    procurement_unit: normalizeProcurementUnit(
      value.procurement_unit ?? procurement.procurement_unit,
      mode,
      packLabel
    ),
    pack_label: packLabel || null,
    approved_unit_cost_paise:
      value.approved_unit_cost_paise ?? value.unit_cost_paise ?? null,
    price_locked_at: value.price_locked_at ?? null,
    vendor_product_id: value.vendor_product_id ?? null,
    vendor_unit_cost_paise: vendorUnitCostPaise(value),
    price_updated_at: value.price_updated_at ?? null,
    reference_unit_cost_paise: vendorUnitCostPaise(value),
  };
}

export function validateReceiptQuantities(received, rejected, supplied) {
  const receivedScaled = parseQuantityScaled(received || "0");
  const rejectedScaled = parseQuantityScaled(rejected || "0");
  const suppliedScaled = parseQuantityScaled(supplied || "0");
  if (receivedScaled + rejectedScaled <= 0n) {
    return "Received plus rejected quantity must be greater than zero";
  }
  if (receivedScaled + rejectedScaled > suppliedScaled) {
    return "Received plus rejected quantity cannot exceed supplied quantity";
  }
  return null;
}

export function buildFullAcceptanceDraft(assignments = []) {
  return assignments.reduce((drafts, assignment) => {
    if (!["confirmed", "dispatched"].includes(assignment?.status)) return drafts;
    return {
      ...drafts,
      [assignment.id]: {
        received_quantity: String(assignment.supplied_quantity || "0"),
        rejected_quantity: "0",
      },
    };
  }, {});
}

export function buildFullRejectionDraft(assignment) {
  return {
    received_quantity: "0",
    rejected_quantity: String(assignment?.supplied_quantity || "0"),
  };
}
