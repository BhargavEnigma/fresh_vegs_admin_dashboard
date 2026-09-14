import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ENDPOINTS } from "../src/api/endpoints.js";

const serviceSource = readFileSync(
  new URL("../src/api/services/vendor.service.js", import.meta.url),
  "utf8"
);
const checkInSource = readFileSync(
  new URL("../src/pages/ops/daily-operations/tabs/vendor-check-in-tab.jsx", import.meta.url),
  "utf8"
);

test("vendor receipt endpoints preserve single-item and expose bulk receipt", () => {
  assert.equal(ENDPOINTS.ops.vendor.receiveMany, "/v1/ops/vendor/assignments/receive");
  assert.equal(
    ENDPOINTS.ops.vendor.receive("assignment-1"),
    "/v1/ops/vendor/assignments/assignment-1/receive"
  );
});

test("vendor service wraps bulk assignments in the backend request contract", () => {
  assert.match(
    serviceSource,
    /api\.post\(ENDPOINTS\.ops\.vendor\.receiveMany, \{ assignments \}\)/
  );
});

test("vendor check-in submits one atomic bulk request and keeps drafts on failure", () => {
  const mutationStart = checkInSource.indexOf("const receiveMutation = useMutation");
  const mutationEnd = checkInSource.indexOf("const singleReceiveMutation", mutationStart);
  const mutationSource = checkInSource.slice(mutationStart, mutationEnd);

  assert.match(mutationSource, /VendorService\.receiveMany/);
  assert.doesNotMatch(mutationSource, /VendorService\.receive\(/);
  assert.doesNotMatch(mutationSource, /for \(const entry of entries\)/);
  assert.doesNotMatch(mutationSource, /admin_override/);

  const onErrorSource = mutationSource.slice(mutationSource.indexOf("onError:"));
  assert.doesNotMatch(onErrorSource, /setDrafts\(\{\}\)/);
});

test("receipt success merges the response into check-in cache without an immediate refetch", () => {
  const refreshStart = checkInSource.indexOf("const refreshReceiptData");
  const refreshEnd = checkInSource.indexOf("const receiveMutation", refreshStart);
  const refreshSource = checkInSource.slice(refreshStart, refreshEnd);

  assert.match(refreshSource, /queryClient\.setQueryData/);
  assert.match(refreshSource, /result\?\.assignments/);
  assert.doesNotMatch(refreshSource, /assignmentsQuery\.refetch/);
  assert.doesNotMatch(refreshSource, /\["ops", "dailyOperations"\]\s*\}/);
  assert.doesNotMatch(refreshSource, /\["admin", "vendorAssignments"\]\s*\}/);
  assert.match(refreshSource, /\["admin", "vendorAssignments", operationId\]/);
  assert.match(refreshSource, /\["ops", "dailyOperations", "inventorySummary", operationId\]/);
});

test("check-in history and warehouse filtering are opt-in query dimensions", () => {
  assert.match(serviceSource, /warehouse_id: warehouseId/);
  assert.match(serviceSource, /include_history: includeHistory/);
  assert.match(checkInSource, /warehouseId \|\| "all", includeHistory/);
  assert.match(checkInSource, /if \(!includeHistory\) setIncludeHistory\(true\)/);
});

test("each product can be received through the existing single-item API", () => {
  const mutationStart = checkInSource.indexOf("const singleReceiveMutation = useMutation");
  const mutationEnd = checkInSource.indexOf("const vendorOptions", mutationStart);
  const mutationSource = checkInSource.slice(mutationStart, mutationEnd);

  assert.match(mutationSource, /VendorService\.receive\(entry\.id/);
  assert.match(checkInSource, /onClick=\{\(\) => submitSingle\(assignment\)\}/);
  assert.match(checkInSource, /: "Receive item"/);
  assert.doesNotMatch(mutationSource, /VendorService\.receiveMany/);
});

test("product cards use the simplified premium presentation", () => {
  assert.match(checkInSource, /shadow-\[0_8px_30px_rgba\(15,23,42,0\.05\)\]/);
  assert.match(checkInSource, /…\{assignment\.id\.slice\(-8\)\}/);
  assert.doesNotMatch(checkInSource, /hover:scale-\[1\.006\]/);
  assert.doesNotMatch(checkInSource, /This assignment has been dispatched and is ready to be received/);
});
