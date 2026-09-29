import test from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

const pageSource = readFileSync(
  new URL("../src/pages/ops/orders/ops-orders-page.jsx", import.meta.url),
  "utf8",
);
const serviceSource = readFileSync(
  new URL("../src/api/services/ops-orders.service.js", import.meta.url),
  "utf8",
);
const pdfSource = readFileSync(
  new URL("../src/pages/ops/orders/ops-orders-list-pdf.jsx", import.meta.url),
  "utf8",
);

test("orders exports provide only PDF-based All and Filtered actions", () => {
  assert.match(pageSource, /Export All/);
  assert.match(pageSource, /Export Filtered/);
  assert.doesNotMatch(pageSource, />Export PDF</);
  assert.doesNotMatch(pageSource, />Export Visible</);
  assert.match(pageSource, /pdf\(<OpsOrdersListPdf/);
});

test("all export keeps only the selected delivery date while filtered export retains every active filter", () => {
  const allBranchStart = pageSource.indexOf("const exportFilters = isAll");
  const filteredBranchStart = pageSource.indexOf("                    : {", allBranchStart);
  const allBranch = pageSource.slice(allBranchStart, filteredBranchStart);

  assert.match(pageSource, /if \(!filters\.delivery_date\)/);
  assert.match(pageSource, /Select a delivery date before exporting orders/);
  assert.match(allBranch, /delivery_date: filters\.delivery_date/);
  assert.doesNotMatch(allBranch, /warehouse_id:/);
  assert.match(pageSource, /status: queueToStatusFilter\(queue\)/);
  assert.match(pageSource, /isOrderAssigned: queueToAssignedFilter\(queue\)/);
});

test("PDF export retrieves every full-detail page and renders detailed order records", () => {
  assert.match(serviceSource, /async listAllForPdf/);
  assert.match(serviceSource, /view: "full"/);
  assert.match(serviceSource, /for \(let page = 2; page <= pages; page \+= 1\)/);
  assert.match(pdfSource, /Filtered Orders Register/);
  assert.match(pdfSource, /MuktaVaani/);
  assert.match(pdfSource, /All orders for selected delivery date/);
  assert.match(pdfSource, /Delivery and customer/);
  assert.match(pdfSource, /Order items/);
  assert.match(pdfSource, /Grand total/);
});
