import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/ops/daily-operations/tabs/exceptions-close-tab.jsx", import.meta.url),
  "utf8",
);

test("Close Day always exposes an explicit premium manual confirmation", () => {
  assert.match(source, /Manual closure confirmation required/);
  assert.match(source, /Close Day — Final Confirmation/);
  assert.match(source, /disabled=\{isClosing \|\| !canClose\}/);
  assert.doesNotMatch(source, /Auto-Closure Mode Active/);
  assert.doesNotMatch(source, /handleAutoCloseEvaluate/);
});
