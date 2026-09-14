import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/admin/cost/cost-page.jsx", import.meta.url),
  "utf8",
);

test("cost overview labels actual and projected revenue bases explicitly", () => {
  assert.match(source, /Delivered and collected sales/);
  assert.match(source, /profit\.projected_revenue_paise \?\? profit\.booked_sales_paise/);
  assert.match(source, /lifecycle cost/);
});
