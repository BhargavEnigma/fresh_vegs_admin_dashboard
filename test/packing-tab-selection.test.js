import test from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

const packingTabSource = readFileSync(
  new URL("../src/pages/ops/daily-operations/tabs/packing-tab.jsx", import.meta.url),
  "utf8",
);

function handlerSource(name, nextName) {
  const start = packingTabSource.indexOf(`const ${name} =`);
  const end = packingTabSource.indexOf(`const ${nextName} =`, start);

  assert.notStrictEqual(start, -1, `${name} handler should exist`);
  assert.notStrictEqual(end, -1, `${nextName} handler should follow ${name}`);
  return packingTabSource.slice(start, end);
}

test("packing actions keep the currently selected queue tab", () => {
  const actionHandlers = [
    handlerSource("handleStart", "handleCleanConfirm"),
    handlerSource("handleCleanConfirm", "handleOpenEditItem"),
    handlerSource("handleSavePackingItem", "handlePackedExactShortcut"),
    handlerSource("handleCompleteOrder", "handlePrintSlip"),
  ];

  for (const source of actionHandlers) {
    assert.doesNotMatch(source, /setActivePackingStage\(/);
  }
});

test("manual tab selection and packing search can still select a queue tab", () => {
  assert.match(packingTabSource, /if \(matchedStage\) setActivePackingStage\(matchedStage\)/);
  assert.match(packingTabSource, /onClick=\{\(\) => setActivePackingStage\(stage\.key\)\}/);
});

test("packing can return to the original ungrouped order list", () => {
  assert.match(packingTabSource, /showNearbyGroups/);
  assert.match(packingTabSource, /Standard List/);
  assert.match(packingTabSource, /setShowNearbyGroups\(\(current\) => !current\)/);
  assert.match(packingTabSource, /if \(!showNearbyGroups\) return <div className="space-y-3">\{queueOrders\.map\(renderOrderCard\)\}<\/div>;/);
});

test("batch packing print includes every packing queue and renders the grouped register", () => {
  const batchStart = packingTabSource.indexOf("const handleBatchPrint =");
  const batchEnd = packingTabSource.indexOf("const renderOrderCard =", batchStart);
  const batchHandler = packingTabSource.slice(batchStart, batchEnd);
  const printSource = readFileSync(
    new URL("../src/pages/ops/daily-operations/print/packing-slip-print.jsx", import.meta.url),
    "utf8",
  );

  assert.match(batchHandler, /setBatchPrintingGroups\(orderGroups\)/);
  assert.doesNotMatch(batchHandler, /setBatchPrintingGroups\(queues\.ready\)/);
  assert.match(printSource, /export function BatchPackingSlipsPrint/);
  assert.match(printSource, /Grouped by delivery area/);
  assert.match(printSource, /statusForPrint/);
});
