import test from "node:test";
import assert from "node:assert";

import {
  formatPaiseToRupees,
  parseDecimal,
  groupPackingItemsByOrder,
  orderedPackForPackingItem,
  isPackingGroupExactlyPacked,
  mapEventToFriendlyLabel,
  mapErrorCodeToUserMessage,
  filterEligibleRunOrders,
  isDeliveryRunDispatched,
  canHandoverDeliveryRun,
  canReconcileRunCod,
  isRunCashReconciled,
  FRIENDLY_EVENT_LABELS,
  ERROR_CODE_MESSAGES,
  matchesStockFilter,
} from "../src/utils/daily-operations-helpers.js";
import { getCodCollection, getDeliveryQrAttempts } from "../src/utils/payment-collection.js";
import fs from "node:fs";
import { ENDPOINTS } from "../src/api/endpoints.js";

test("1. DECIMAL quantity parsing supports up to 3 decimal places without rounding errors", () => {
  assert.strictEqual(parseDecimal("1.23456"), 1.235);
  assert.strictEqual(parseDecimal(2.5), 2.5);
  assert.strictEqual(parseDecimal("0.001"), 0.001);
  assert.strictEqual(parseDecimal(null), 0);
  assert.strictEqual(parseDecimal(undefined), 0);
  assert.strictEqual(parseDecimal("invalid"), 0);
});

test("2. Paise to Rupees currency formatting converts integers safely", () => {
  assert.strictEqual(formatPaiseToRupees(1000000), "₹10,000.00");
  assert.strictEqual(formatPaiseToRupees(2550), "₹25.50");
  assert.strictEqual(formatPaiseToRupees(0), "₹0.00");
  assert.strictEqual(formatPaiseToRupees(null), "—");
});

test("stock tab filters use stock, demand, expiry, and vendor shortfall semantics", () => {
  const inStock = { opening_usable_stock_quantity: "3", available_stock_quantity: "0" };
  const covered = { gross_order_demand_quantity: "5", net_vendor_required_quantity: "0", next_action_code: "covered_from_fresh_stock" };
  const noDemand = { gross_order_demand_quantity: "0", net_vendor_required_quantity: "0", next_action_code: "covered_from_fresh_stock" };
  const expired = { expired_stock_quantity: "1.5" };
  const expiringSoon = { expiring_soon_stock_quantity: "0.25" };
  const toProcure = { net_vendor_required_quantity: "2", next_action_code: "vendor_purchase_needed" };

  assert.equal(matchesStockFilter(inStock, "in_stock"), true);
  assert.equal(matchesStockFilter(covered, "covered"), true);
  assert.equal(matchesStockFilter(noDemand, "covered"), false);
  assert.equal(matchesStockFilter(expired, "expiry_attention"), true);
  assert.equal(matchesStockFilter(expiringSoon, "expiry_attention"), true);
  assert.equal(matchesStockFilter(toProcure, "to_procure"), true);
  assert.equal(matchesStockFilter({ ...toProcure, net_vendor_required_quantity: 0 }, "to_procure"), false);
});

test("3. Flat packing items list is correctly grouped by order_id with progress calculation", () => {
  const flatItems = [
    {
      id: "item-1",
      order_id: "order-101",
      packing_status: "packed",
      order: { id: "order-101", order_number: "FV-101" },
    },
    {
      id: "item-2",
      order_id: "order-101",
      packing_status: "pending",
      order: { id: "order-101", order_number: "FV-101" },
    },
    {
      id: "item-3",
      order_id: "order-102",
      packing_status: "packed",
      order: { id: "order-102", order_number: "FV-102" },
    },
  ];

  const groups = groupPackingItemsByOrder(flatItems);
  assert.strictEqual(groups.length, 2);

  const g1 = groups.find((g) => g.order_id === "order-101");
  assert.ok(g1);
  assert.strictEqual(g1.total_items, 2);
  assert.strictEqual(g1.packed_count, 1);
  assert.strictEqual(g1.progress_percent, 50);
  assert.strictEqual(g1.is_complete, false);

  const g2 = groups.find((g) => g.order_id === "order-102");
  assert.ok(g2);
  assert.strictEqual(g2.total_items, 1);
  assert.strictEqual(g2.packed_count, 1);
  assert.strictEqual(g2.progress_percent, 100);
  assert.strictEqual(g2.is_complete, true);
});

test("packing edit details show only the selected packing row", () => {
  assert.deepStrictEqual(
    orderedPackForPackingItem({ pack: { label: "2kg" }, required_quantity: "1" }),
    { label: "2kg", quantity: 1 },
  );
});

test("resolved manual checklist is recognized as ready for finalization", () => {
  assert.strictEqual(isPackingGroupExactlyPacked({
    items: [{ status: "packed", required_quantity: "2.000", packed_quantity: "2.000", missing_quantity: "0", damaged_quantity: "0" }],
  }), true);
  assert.strictEqual(isPackingGroupExactlyPacked({
    items: [{ status: "issue", required_quantity: "2", packed_quantity: "1", missing_quantity: "1", damaged_quantity: "0" }],
  }), false);
});

test("4. Audit event types map to friendly user labels", () => {
  assert.strictEqual(mapEventToFriendlyLabel("opened"), "Operation Opened");
  assert.strictEqual(mapEventToFriendlyLabel("procurement_refreshed"), "Procurement Refreshed");
  assert.strictEqual(mapEventToFriendlyLabel("run_handed_over"), "Delivery Run Handed Over");
  assert.strictEqual(mapEventToFriendlyLabel("force_closed"), "Daily Operation Force Closed");
  assert.strictEqual(mapEventToFriendlyLabel("custom_future_event"), "Custom Future Event");
});

test("5. Error code mapping returns human-readable operational messages", () => {
  assert.strictEqual(
    mapErrorCodeToUserMessage("OPERATION_ALREADY_CLOSED"),
    "This daily operation is closed. Reopen it first to make changes."
  );
  assert.strictEqual(
    mapErrorCodeToUserMessage("CLOSING_BLOCKED"),
    "Cannot close operations due to open blockers."
  );
  assert.strictEqual(
    mapErrorCodeToUserMessage({ code: "OVERRIDE_REASON_REQUIRED" }),
    "An explanation is required to override closing or packing blockers."
  );
  assert.strictEqual(
    mapErrorCodeToUserMessage({ message: "Custom backend error details" }),
    "Custom backend error details"
  );
});

test("6. Eligible run orders filtering excludes orders already assigned to any run", () => {
  const opsOrders = [
    { id: "o1", status: "packed" },
    { id: "o2", status: "packed" },
    { id: "o3", status: "locked" },
  ];
  const runOrders = [{ order_id: "o1" }];

  const eligible = filterEligibleRunOrders(opsOrders, runOrders);
  assert.strictEqual(eligible.length, 1);
  assert.strictEqual(eligible[0].id, "o2");
});

test("6a. Rider-started orders make a stale ready run dispatched and not handover eligible", () => {
  const riderStartedRun = {
    status: "ready",
    run_orders: [{ order: { id: "o1", status: "out_for_delivery" } }],
  };
  const packedRun = {
    status: "ready",
    orders: [{ id: "o2", status: "packed" }],
  };

  assert.strictEqual(isDeliveryRunDispatched(riderStartedRun), true);
  assert.strictEqual(canHandoverDeliveryRun(riderStartedRun), false);
  assert.strictEqual(isDeliveryRunDispatched(packedRun), false);
  assert.strictEqual(canHandoverDeliveryRun(packedRun), true);
});

test("6b. A stale run with all terminal orders can proceed to COD reconciliation", () => {
  assert.strictEqual(canReconcileRunCod({
    status: "ready",
    orders: [
      { status: "delivered" },
      { status: "delivered" },
    ],
  }), true);
  assert.strictEqual(canReconcileRunCod({
    status: "in_progress",
    orders: [{ status: "out_for_delivery" }],
  }), false);
});

test("cash reconciliation relies on the backend matched status, including zero-cash runs", () => {
  assert.strictEqual(isRunCashReconciled({ status: "in_progress", expected_cod_paise: 0, cod_reconciliation_status: "pending" }), false);
  assert.strictEqual(isRunCashReconciled({ status: "completed", expected_cod_paise: 0, cod_reconciliation_status: "matched" }), true);
});

test("COD collection audit distinguishes cash, delivery QR, and pending collection", () => {
  const cash = getCodCollection({ legacy_payments: [{ status: "paid", collection_method: "cash", amount_paise: 12000, collected_by_user_id: "rider-1" }] });
  assert.strictEqual(cash.state, "Physical cash collected");
  assert.strictEqual(cash.payment.amount_paise, 12000);

  const qr = getCodCollection({ legacy_payments: [{ status: "paid", collection_method: "upi_qr", provider_payment_id: "pay_qr" }] });
  assert.strictEqual(qr.state, "Delivery UPI QR paid");
  assert.strictEqual(qr.payment.provider_payment_id, "pay_qr");

  assert.strictEqual(getCodCollection({ legacy_payments: [] }).state, "Pending collection");
  assert.deepStrictEqual(getDeliveryQrAttempts({ payment_attempts: [{ attempt_type: "online" }, { attempt_type: "delivery_cod_qr", provider_qr_id: "qr_1" }] }), [{ attempt_type: "delivery_cod_qr", provider_qr_id: "qr_1" }]);
});

test("COD manifest and reconciliation UI use physical-cash language", () => {
  const manifest = fs.readFileSync(new URL("../src/pages/ops/daily-operations/print/run-manifest-print.jsx", import.meta.url), "utf8");
  const reconciliation = fs.readFileSync(new URL("../src/pages/ops/daily-operations/tabs/exceptions-close-tab.jsx", import.meta.url), "utf8");
  assert.match(manifest, /COD order total/);
  assert.doesNotMatch(manifest, /COD Due/);
  assert.match(reconciliation, /Expected physical cash/);
  assert.doesNotMatch(reconciliation, /Expected COD \(Delivered\)/);
});

test("online prepaid payment and refund controls remain isolated from COD collection UI", () => {
  const orderDetail = fs.readFileSync(new URL("../src/pages/ops/orders/ops-order-detail-page.jsx", import.meta.url), "utf8");
  assert.match(orderDetail, /isOnlinePaymentMethod\(order\.payment_method\)/);
  assert.match(orderDetail, /Initiate \/ Retry Refund/);
  assert.match(orderDetail, /paymentMethod !== "cod"/);
});

test("7. Endpoints configuration includes dailyOperations endpoints with expected patterns", () => {
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.overview, "/v1/ops/daily-operations/overview");
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.open, "/v1/ops/daily-operations/open");
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.getById("op123"), "/v1/ops/daily-operations/op123");
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.refresh("op123"), "/v1/ops/daily-operations/op123/refresh");
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.notes("op123"), "/v1/ops/daily-operations/op123/notes");

  assert.strictEqual(ENDPOINTS.ops.dailyOperations.procurement("op123"), "/v1/ops/daily-operations/op123/procurement");
  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.updateProcurementItem("op123", "item456"),
    "/v1/ops/daily-operations/op123/procurement/item456"
  );

  assert.strictEqual(ENDPOINTS.ops.dailyOperations.packing("op123"), "/v1/ops/daily-operations/op123/packing");
  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.updatePackingItem("op123", "ord101", "pitem99"),
    "/v1/ops/daily-operations/op123/packing/orders/ord101/items/pitem99"
  );

  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.deliveryRunDetail("run99"),
    "/v1/ops/daily-operations/delivery-runs/run99"
  );
  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.addRunOrders("run99"),
    "/v1/ops/daily-operations/delivery-runs/run99/orders"
  );
  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.removeRunOrder("run99", "ord101"),
    "/v1/ops/daily-operations/delivery-runs/run99/orders/ord101"
  );
  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.reorderRunOrders("run99"),
    "/v1/ops/daily-operations/delivery-runs/run99/reorder"
  );
  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.handoverRun("run99"),
    "/v1/ops/daily-operations/delivery-runs/run99/handover"
  );
  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.reconcileRun("run99"),
    "/v1/ops/daily-operations/delivery-runs/run99/reconcile"
  );

  assert.strictEqual(
    ENDPOINTS.ops.dailyOperations.updateException("exc123"),
    "/v1/ops/daily-operations/exceptions/exc123"
  );
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.waste("op123"), "/v1/ops/daily-operations/op123/waste");
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.close("op123"), "/v1/ops/daily-operations/op123/close");
  assert.strictEqual(ENDPOINTS.ops.dailyOperations.reopen("op123"), "/v1/ops/daily-operations/op123/reopen");
});
