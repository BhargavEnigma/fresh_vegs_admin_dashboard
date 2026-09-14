import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hooksSource = readFileSync(
  new URL("../src/api/services/daily-operations.hooks.js", import.meta.url),
  "utf8",
);

test("packing item mutation patches overview and order caches without full refetch", () => {
  const start = hooksSource.indexOf("const updatePackingItemMutation");
  const end = hooksSource.indexOf("const completePackingMutation", start);
  const source = hooksSource.slice(start, end);

  assert.match(source, /queryClient\.setQueryData/);
  assert.match(source, /dailyOperationsKeys\.packing\(operationId\)/);
  assert.match(source, /dailyOperationsKeys\.packingOrder\(operationId, orderId\)/);
  const successSource = source.slice(source.indexOf("onSuccess:"), source.indexOf("onError:"));
  assert.doesNotMatch(successSource, /invalidateQueries\(\{ queryKey: dailyOperationsKeys\.packing(?:Order)?\(/);
});

test("packing item mutation optimistically patches, rolls back, and rejects stale responses", () => {
  const start = hooksSource.indexOf("const updatePackingItemMutation");
  const end = hooksSource.indexOf("const completePackingMutation", start);
  const source = hooksSource.slice(start, end);

  assert.match(source, /onMutate:/);
  assert.match(source, /cancelQueries/);
  assert.match(source, /previousItem/);
  assert.match(source, /__packingMutationId/);
  assert.match(source, /patchIfCurrentMutation/);
  assert.match(source, /onError:/);
  assert.match(source, /context\?\.mutationId/);
  assert.match(source, /data\?\.order_summary/);
});
