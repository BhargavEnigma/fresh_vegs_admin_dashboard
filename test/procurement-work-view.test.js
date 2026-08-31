import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PROCUREMENT_VIEWS,
  canStartVendorAssignment,
  autoAssignableProcurementCostIds,
  completedProcurementPortions,
  completedUnitCostPerKgPaise,
  groupFullyConfirmedProductRows,
  procurementDisplayTotals,
  procurementItemsForView,
  procurementStepLabel,
} from "../src/utils/procurement-work-view.js";

const rows = [
  { id: "active", work_view: "active", outstanding_quantity: "2", unassigned_quantity: "2", next_action_code: "assign_vendor" },
  { id: "warehouse", work_view: "active", outstanding_quantity: "1.5", unassigned_quantity: "0", next_action_code: "warehouse_receipt" },
  { id: "done", work_view: "history", outstanding_quantity: "0", next_action_code: "completed" },
];

test("Active Work is the default procurement view", () => {
  assert.equal(PROCUREMENT_VIEWS.ACTIVE, "active");
  assert.deepEqual(procurementItemsForView(rows).map((row) => row.id), ["active", "warehouse"]);
});

test("completed rows are kept in History and excluded from Active Work", () => {
  assert.deepEqual(procurementItemsForView(rows, "history").map((row) => row.id), ["done"]);
  assert.equal(procurementItemsForView(rows, "active").some((row) => row.id === "done"), false);
});

test("Completed excludes a previously received product when it has new pending demand", () => {
  const allRows = [
    { id: "lemon", work_view: "active", received_quantity: "6.25", outstanding_quantity: "2.75", next_action_code: "assign_vendor" },
    { id: "onion", work_view: "history", received_quantity: "1", outstanding_quantity: "0", next_action_code: "completed" },
    { id: "new", work_view: "active", received_quantity: "0", outstanding_quantity: "1" },
  ];
  assert.deepEqual(completedProcurementPortions(allRows).map((row) => row.id), ["onion"]);
});

test("Completed unit cost is always derived per KG from final cost and purchased quantity", () => {
  assert.equal(completedUnitCostPerKgPaise({
    total_cost_paise: 150000,
    purchased_quantity: 5,
    unit_cost_paise: 40000,
  }), 30000);
  assert.equal(completedUnitCostPerKgPaise({
    total_cost_paise: 6250,
    purchased_quantity: 6.25,
  }), 1000);
});

test("active display totals use outstanding quantity and backend next actions", () => {
  assert.deepEqual(procurementDisplayTotals(procurementItemsForView(rows, "active")), {
    outstanding: 3.5,
    unassigned: 2,
    waitingVendor: 0,
    waitingWarehouse: 1,
  });
});

test("action labels and assignment guard follow next_action_code", () => {
  assert.equal(procurementStepLabel(rows[0]), "Assign Vendor");
  assert.equal(procurementStepLabel(rows[1]), "Receive at Warehouse");
  assert.equal(canStartVendorAssignment(rows[0], "active"), true);
  assert.equal(canStartVendorAssignment(rows[1], "active"), false);
  assert.equal(canStartVendorAssignment(rows[0], "history"), false);
  assert.equal(canStartVendorAssignment(rows[2], "history"), false);
});

test("Auto Assign sends only active rows that need a vendor", () => {
  assert.deepEqual(autoAssignableProcurementCostIds([
    { id: "cost-carrot", work_view: "active", next_action_code: "assign_vendor", quantity_to_assign: "2" },
    { id: "cost-onion", work_view: "active", next_action_code: "warehouse_receipt", quantity_to_assign: "2" },
    { id: "cost-done", work_view: "history", next_action_code: "assign_vendor", quantity_to_assign: "2" },
    { procurement_cost_id: "cost-tomato", work_view: "active", next_action_code: "assign_vendor", outstanding_quantity: "2" },
    { id: "cost-zero", work_view: "active", next_action_code: "assign_vendor", quantity_to_assign: "0" },
  ]), ["cost-carrot", "cost-tomato"]);
});

test("confirmed assignments use one row while a current assignment stays separate", () => {
  const productRows = [
    { id: "onion-1kg", product_id: "onion", product_name: "Onion" },
    { id: "onion-2kg", product_id: "onion", product_name: "Onion" },
  ];
  const assignments = {
    "onion-1kg": [{ id: "a1", status: "confirmed" }],
    "onion-2kg": [{ id: "a2", status: "assigned" }],
  };

  assert.deepEqual(
    groupFullyConfirmedProductRows(productRows, assignments).map((row) => row.id),
    ["confirmed-product:onion", "onion-2kg"]
  );
});

test("duplicate products collapse after all assignments are confirmed", () => {
  const productRows = [
    { id: "onion-1kg", product_id: "onion", product_name: "Onion" },
    { id: "onion-2kg", product_id: "onion", product_name: "Onion" },
  ];
  const assignments = {
    "onion-1kg": [{ id: "a1", status: "dispatched", procurement_cost_id: "onion-1kg" }],
    "onion-2kg": [{ id: "a2", status: "confirmed", procurement_cost_id: "onion-2kg" }],
  };
  const grouped = groupFullyConfirmedProductRows(productRows, assignments);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].product_group_rows.length, 2);
  assert.deepEqual(grouped[0].product_group_assignments.map((assignment) => assignment.id), ["a1", "a2"]);
  assert.equal(grouped[0].next_action_code, "vendor_dispatch");
});

test("new demand remains separate from the confirmed assignment popup until confirmed", () => {
  const productRows = [
    { id: "onion-old", product_id: "onion", product_name: "Onion", unassigned_quantity: 0, next_action_code: "vendor_dispatch" },
    { id: "onion-new", product_id: "onion", product_name: "Onion", unassigned_quantity: 3, next_action_code: "assign_vendor" },
  ];
  const assignments = {
    "onion-old": [{ id: "a1", status: "confirmed", procurement_cost_id: "onion-old" }],
    "onion-new": [],
  };
  const grouped = groupFullyConfirmedProductRows(productRows, assignments);

  assert.deepEqual(grouped.map((row) => row.id), ["confirmed-product:onion", "onion-new"]);
  assert.deepEqual(grouped[0].product_group_assignments.map((assignment) => assignment.id), ["a1"]);
});

test("procurement requests and query keys are separated by active/history view", () => {
  const service = readFileSync(new URL("../src/api/services/daily-operations.service.js", import.meta.url), "utf8");
  const hooks = readFileSync(new URL("../src/api/services/daily-operations.hooks.js", import.meta.url), "utf8");
  assert.match(service, /ENDPOINTS\.admin\.cost\.procurementItems/);
  assert.match(service, /delivery_date: deliveryDate/);
  assert.match(service, /warehouse_id: warehouseId/);
  assert.match(hooks, /queryKey: dailyOperationsKeys\.procurement\(operationId, view, deliveryDate, warehouseId\)/);
  assert.match(hooks, /view,\s+deliveryDate,\s+warehouseId,/);
});

test("view switching is procurement-local and existing action callbacks stay wired", () => {
  const page = readFileSync(new URL("../src/pages/ops/daily-operations/daily-operations-page.jsx", import.meta.url), "utf8");
  const tab = readFileSync(new URL("../src/pages/ops/daily-operations/tabs/procurement-tab.jsx", import.meta.url), "utf8");
  assert.match(page, /const \[procurementView, setProcurementView\] = useState\("active"\)/);
  assert.match(page, /onWorkViewChange=\{setProcurementView\}/);
  assert.match(page, /procurementView === "history" \? "all" : procurementView/);
  assert.match(tab, /onAssignVendor=\{openAssignModal\}/);
  assert.match(tab, /onAutoAssign=\{\(\) => setConfirmAutoAssign\(true\)\}/);
  assert.match(tab, /openVendorCheckIn\(item\) : handleShortcutReceivedExact\(item\)/);
  assert.match(tab, /onCheckProblem=\{handleOpenEdit\}/);
  assert.match(tab, /procurement_cost_ids: autoAssignableIds/);
  assert.match(tab, /Manage vendor capacity/);
  assert.match(tab, /increase the maximum quantity for these products or add another available vendor/);
});

test("grouped procurement rows preserve an explicit zero still-to-assign value", () => {
  const table = readFileSync(new URL("../src/pages/ops/daily-operations/tabs/procurement-work-table.jsx", import.meta.url), "utf8");
  assert.match(
    table,
    /field === "unassigned_quantity"[\s\S]*value !== null[\s\S]*\(item\.is_product_group \|\| item\.product_group_rows\?\.length\)[\s\S]*return formatProcurementQuantity\(item, value, "0"\)/
  );
});
