import test from "node:test";
import assert from "node:assert/strict";

import {
  buildManualProcurementItems,
  isVendorManagedProcurement,
  procurementDisplayCosts,
  procurementDraftKey,
} from "../src/utils/procurement-cost.js";

test("vendor-managed procurement uses backend actual cost and is not manually saved", () => {
  const row = {
    id: "cost-1",
    delivery_date: "2026-07-30",
    warehouse_id: "warehouse-1",
    product_id: "product-1",
    ordered_quantity: 100,
    unit_cost_paise: 2000,
    total_cost_paise: 160000,
    committed_cost_paise: 200000,
    confirmed_cost_paise: 180000,
    actual_vendor_cost_paise: 160000,
    is_vendor_managed: true,
  };
  const key = procurementDraftKey(row);
  const display = procurementDisplayCosts(row);

  assert.equal(isVendorManagedProcurement(row), true);
  assert.equal(display.actualCostPaise, 160000);
  assert.equal(display.committedCostPaise, 200000);
  assert.deepEqual(
    buildManualProcurementItems([{ ...row, key }], { [key]: { notes: "attempt" } }),
    []
  );
});

test("only edited manual procurement rows are included in save payload", () => {
  const row = {
    id: "cost-2",
    delivery_date: "2026-07-30",
    warehouse_id: "warehouse-1",
    product_id: "product-2",
    product_name: "Emergency Tomato",
    ordered_quantity: 5,
    unit_cost_paise: 2400,
    notes: "Mandi",
    procurement_source: "manual",
  };
  const key = procurementDraftKey(row);
  const payload = buildManualProcurementItems(
    [{ ...row, key }],
    { [key]: { unit_cost_paise: 2400 } }
  );

  assert.equal(payload.length, 1);
  assert.equal(payload[0].unit_cost_paise, 2400);
  assert.match(key, /2026-07-30:warehouse-1:cost-2/);
});
