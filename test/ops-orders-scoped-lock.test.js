import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const endpoints = readFileSync(new URL("../src/api/endpoints.js", import.meta.url), "utf8");
const jobsService = readFileSync(new URL("../src/api/services/ops-jobs.service.js", import.meta.url), "utf8");
const ordersPage = readFileSync(new URL("../src/pages/ops/orders/ops-orders-page.jsx", import.meta.url), "utf8");

test("Orders Ops uses the warehouse-scoped lock endpoint", () => {
  assert.match(endpoints, /lockScopedOrders:\s*"\/v1\/ops\/jobs\/lock-orders\/scoped"/);
  assert.match(jobsService, /lockScopedOrders\(payload\)[\s\S]*ENDPOINTS\.ops\.jobs\.lockScopedOrders/);
  assert.match(ordersPage, /OpsJobsService\.lockScopedOrders\(\{[\s\S]*warehouse_id: filters\.warehouse_id,[\s\S]*order_ids: selectedIds/);
});

test("Run Lock Job requires a selected warehouse and clears selections after success", () => {
  assert.match(ordersPage, /disabled=\{!filters\.delivery_date \|\| !filters\.warehouse_id \|\| lockOrdersMut\.isPending\}/);
  assert.match(ordersPage, /onSuccess: \(data\) => \{[\s\S]*setSelectedIds\(\[\]\)/);
  assert.match(ordersPage, /`Lock Selected \(\$\{selectedIds\.length\}\)`/);
});
