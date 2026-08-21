import test from "node:test";
import assert from "node:assert/strict";

import {
  acceptedPayoutPaise,
  addQuantities,
  assignmentCoverageScaled,
  buildFullAcceptanceDraft,
  buildFullRejectionDraft,
  formatQuantityWithUnit,
  formatProcurementQuantity,
  normalizeVendorAssignment,
  parseQuantityScaled,
  remainingAssignmentQuantity,
  maxAllocationWithExtraScaled,
  referenceUnitCostPaise,
  vendorUnitCostPaise,
  formatVendorPriceUpdatedAt,
  rupeesToPaise,
  validateReceiptQuantities,
} from "../src/utils/vendor-assignment.js";

test("quantity parsing preserves three-decimal precision", () => {
  assert.equal(parseQuantityScaled("0.125"), 125n);
  assert.equal(addQuantities(["0.500", "1", "2.000"]), 3500n);
  assert.throws(() => parseQuantityScaled("0.0001"), /3 decimal/);
});

test("assignment preserves the locked vendor unit price", () => {
  const result = normalizeVendorAssignment({
    procurement_mode: "bulk",
    procurement_unit: "kg",
    unit_cost_paise: 2200,
  });
  assert.equal(result.procurement_mode, "bulk");
  assert.equal(result.procurement_unit, "kg");
  assert.equal(result.approved_unit_cost_paise, 2200);
  assert.equal(formatQuantityWithUnit("35", result.procurement_unit), "35 KG");
});

test("legacy assignment defaults to pack without inventing KG", () => {
  const result = normalizeVendorAssignment({ pack_label: "500g" });
  assert.equal(result.procurement_mode, "pack");
  assert.equal(result.procurement_unit, "500g");
});

test("vendor price parser retains backward compatibility with legacy catalog data", () => {
  assert.equal(referenceUnitCostPaise({ reference_unit_cost_paise: 2100, default_unit_cost_paise: 2000 }), 2100);
  assert.equal(referenceUnitCostPaise({ default_unit_cost_paise: 2000 }), 2000);
  assert.equal(vendorUnitCostPaise({ vendor_unit_cost_paise: 2500 }), 2500);
  assert.equal(vendorUnitCostPaise({}), 0);
  assert.equal(
    formatVendorPriceUpdatedAt("2026-07-27T13:40:00.000Z"),
    "27 Jul 2026, 07:10 pm"
  );
  assert.equal(formatVendorPriceUpdatedAt(null), "—");
});

test("piece procurement is displayed as PC", () => {
  const result = normalizeVendorAssignment({
    procurement_mode: "bulk",
    procurement_unit: "piece",
    unit_cost_paise: 500,
  });
  assert.equal(result.procurement_unit, "pc");
  assert.equal(formatQuantityWithUnit("4", result.procurement_unit), "4 PC");
});

test("pack demand is displayed in the vendor buying unit", () => {
  assert.equal(
    formatProcurementQuantity(
      { procurement_mode: "pack", procurement_unit: "unit", pack_label: "250g" },
      "4"
    ),
    "1 KG"
  );
  assert.equal(
    formatProcurementQuantity(
      { procurement_mode: "pack", procurement_unit: "unit", pack: { base_quantity: 1, base_unit: "kg" } },
      "3"
    ),
    "3 KG"
  );
  assert.equal(
    formatProcurementQuantity(
      { procurement_mode: "pack", procurement_unit: "unit", pack_label: "2 pcs" },
      "4"
    ),
    "8 PC"
  );
});

test("unknown pack sizes use PACK instead of ambiguous UNIT", () => {
  assert.equal(
    formatProcurementQuantity(
      { procurement_mode: "pack", procurement_unit: "unit", pack_label: "Small bundle" },
      "4"
    ),
    "4 PACK"
  );
});

test("rupee conversion is decimal-safe", () => {
  assert.equal(rupeesToPaise("22.05"), 2205);
  assert.throws(() => rupeesToPaise("22.005"), /2 decimal/);
});

test("receipt validation and payout exclude rejected quantity", () => {
  assert.equal(validateReceiptQuantities("34.250", "0.750", "35"), null);
  assert.match(validateReceiptQuantities("35", "0.001", "35"), /cannot exceed/);
  assert.equal(acceptedPayoutPaise("34.250", 2200), 75350);
});

test("warehouse receipt helpers prepare full acceptance and rejection safely", () => {
  assert.deepEqual(
    buildFullAcceptanceDraft([
      { id: "ready", status: "dispatched", supplied_quantity: "1.250" },
      { id: "waiting", status: "assigned", supplied_quantity: "2" },
    ]),
    {
      ready: { received_quantity: "1.250", rejected_quantity: "0" },
    }
  );
  assert.deepEqual(
    buildFullRejectionDraft({ supplied_quantity: "0.500" }),
    { received_quantity: "0", rejected_quantity: "0.500" }
  );
});

test("remaining assignment quantity follows assignment lifecycle coverage", () => {
  const assignments = [
    { status: "assigned", allocated_quantity: "20" },
    { status: "confirmed", allocated_quantity: "30", supplied_quantity: "25" },
    {
      status: "received",
      allocated_quantity: "40",
      supplied_quantity: "35",
      received_quantity: "32",
    },
    { status: "cancelled", allocated_quantity: "50" },
  ];

  assert.equal(assignmentCoverageScaled(assignments[0]), 20000n);
  assert.equal(remainingAssignmentQuantity("100", assignments), 23000n);
});

test("new allocation extra is calculated from still-to-assign quantity", () => {
  const remaining = remainingAssignmentQuantity("4", [
    { status: "dispatched", supplied_quantity: "2.5" },
  ]);

  assert.equal(remaining, 1500n);
  assert.equal(maxAllocationWithExtraScaled(remaining), 1875n);
});
