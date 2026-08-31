import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const procurementPage = readFileSync(new URL("../src/pages/ops/procurement/procurement-page.jsx", import.meta.url), "utf8");
const reportsService = readFileSync(new URL("../src/api/services/ops-reports.service.js", import.meta.url), "utf8");
const inventoryPage = readFileSync(new URL("../src/pages/ops/inventory/inventory-page.jsx", import.meta.url), "utf8");
const freshStockTab = readFileSync(new URL("../src/pages/ops/daily-operations/tabs/fresh-stock-tab.jsx", import.meta.url), "utf8");

test("procurement report requires and caches by the selected warehouse", () => {
  assert.match(procurementPage, /queryKey: \["procurement", date, warehouseId \|\| "none"\]/);
  assert.match(procurementPage, /warehouse_id: warehouseId/);
  assert.match(procurementPage, /enabled: Boolean\(date && warehouseId\)/);
  assert.match(reportsService, /\.\.\.\(warehouse_id \? \{ warehouse_id \} : \{\}\)/);
});

test("inventory summary, lots, and stock writes all use one explicit warehouse", () => {
  assert.match(inventoryPage, /getWarehouseInventorySummary\(warehouseId\)/);
  assert.match(inventoryPage, /listLots\(dialog\.product\.product_id, \{ warehouseId, status: "available" \}\)/);
  assert.match(inventoryPage, /warehouse_id: warehouseId/);
  assert.match(inventoryPage, /setDialog\(\{ open: false, mode: "add", product: null \}\)/);
});

test("daily Manage Stock passes its operation warehouse into lot management", () => {
  assert.match(freshStockTab, /useInventoryLots\(productId, \{ warehouseId \}\)/);
  assert.match(freshStockTab, /warehouse_id: warehouseId/);
});
