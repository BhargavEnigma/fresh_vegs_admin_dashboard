import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("VendorService and procurement tab are wired to bulk catalogues endpoint", () => {
  const serviceCode = readFileSync(
    new URL("../src/api/services/vendor.service.js", import.meta.url),
    "utf8"
  );
  const endpointsCode = readFileSync(
    new URL("../src/api/endpoints.js", import.meta.url),
    "utf8"
  );
  const procurementTabCode = readFileSync(
    new URL("../src/pages/ops/daily-operations/tabs/procurement-tab.jsx", import.meta.url),
    "utf8"
  );

  assert.match(endpointsCode, /catalogues:\s*["']\/v1\/admin\/vendor\/catalogues["']/);
  assert.match(serviceCode, /async getCatalogues\(\{/);
  assert.match(serviceCode, /ENDPOINTS\.admin\.vendor\.catalogues/);
  assert.match(
    procurementTabCode,
    /queryFn:\s*\(\)\s*=>\s*VendorService\.getCatalogues\(\{\s*warehouseId:\s*operation\?\.warehouse_id\s*\}\)/
  );
  assert.match(procurementTabCode, /queryKey:\s*\["admin",\s*"vendorCatalogues",\s*operation\?\.warehouse_id\]/);
});
