import test from "node:test";
import assert from "node:assert/strict";

import {
  getProcurementActionFlow,
  getProcurementDisplayStatus,
} from "../src/utils/procurement-action-flow.js";

const flow = (item, overrides = {}) =>
  getProcurementActionFlow({
    item,
    isAdmin: true,
    isClosed: false,
    isUpdating: false,
    vendorManaged: false,
    assignmentsLocked: false,
    ...overrides,
  });

test("manual procurement starts with purchase confirmation before receipt", () => {
  const actions = flow({
    procurement_status: "pending",
    required_quantity: 10,
    purchased_quantity: 0,
  });

  assert.equal(actions.canMarkPurchasedExact, true);
  assert.equal(actions.canMarkReceivedExact, false);
  assert.equal(actions.canEditInline, true);
  assert.equal(actions.canAssignVendor, true);
});

test("receipt becomes available after a manual purchase is recorded", () => {
  const actions = flow({
    procurement_status: "partial",
    required_quantity: 10,
    purchased_quantity: 10,
  });

  assert.equal(actions.canMarkPurchasedExact, false);
  assert.equal(actions.canMarkReceivedExact, true);
});

test("vendor-managed procurement executes through assignment and check-in flow", () => {
  const actions = flow(
    { procurement_status: "pending", required_quantity: 10, purchased_quantity: 0 },
    { vendorManaged: true, assignments: [{ status: "assigned" }] }
  );

  assert.equal(actions.canMarkPurchasedExact, false);
  assert.equal(actions.canMarkReceivedExact, false);
  assert.equal(actions.canEditInline, false);
  assert.equal(actions.canAssignVendor, true);
  assert.equal(actions.canEditDetails, false);
});

test("completed, not-required, closed, and non-admin rows cannot execute actions", () => {
  for (const actions of [
    flow({ procurement_status: "completed", required_quantity: 10, purchased_quantity: 10 }),
    flow({ procurement_status: "not_required", required_quantity: 10, purchased_quantity: 0 }),
    flow({ procurement_status: "pending", required_quantity: 10, purchased_quantity: 0 }, { isClosed: true }),
    flow({ procurement_status: "pending", required_quantity: 10, purchased_quantity: 0 }, { isAdmin: false }),
  ]) {
    assert.equal(actions.canMarkPurchasedExact, false);
    assert.equal(actions.canMarkReceivedExact, false);
    assert.equal(actions.canEditInline, false);
    assert.equal(actions.canEditDetails, false);
    assert.equal(actions.canAssignVendor, false);
  }
});

test("locked vendor assignments cannot be replaced", () => {
  const actions = flow(
    { procurement_status: "pending", required_quantity: 10, purchased_quantity: 0 },
    { assignmentsLocked: true }
  );

  assert.equal(actions.canAssignVendor, false);
});

test("dispatched vendor assignment exposes check-in and drives row status", () => {
  const assignments = [{ status: "dispatched" }];
  const actions = flow(
    { procurement_status: "pending", required_quantity: 10, purchased_quantity: 0 },
    { vendorManaged: true, assignmentsLocked: true, assignments }
  );

  assert.equal(actions.canOpenVendorCheckIn, true);
  assert.equal(actions.canAssignVendor, false);
  assert.equal(
    getProcurementDisplayStatus({ procurement_status: "pending" }, assignments),
    "dispatched"
  );
});

test("received vendor assignments complete the displayed procurement status", () => {
  assert.equal(
    getProcurementDisplayStatus(
      { procurement_status: "pending" },
      [{ status: "received" }, { status: "received" }]
    ),
    "completed"
  );
  assert.equal(
    getProcurementDisplayStatus(
      { procurement_status: "pending" },
      [{ status: "received" }, { status: "dispatched" }]
    ),
    "partial"
  );
});
