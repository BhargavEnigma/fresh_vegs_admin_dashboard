import test from "node:test";
import assert from "node:assert/strict";

import { createProductSchema } from "../src/validations/products.js";
import { vendorProductSchema } from "../src/validations/vendors.js";

const product = {
  category_id: "00000000-0000-4000-8000-000000000001",
  name: "Tomato",
  description: "",
  tag: "",
  unit: "kg",
  base_quantity: 1,
  mrp_paise: 100,
  selling_price_paise: 90,
  is_out_of_stock: false,
  is_active: true,
};

test("bulk product requires a supported procurement unit", () => {
  assert.equal(createProductSchema.safeParse({ ...product, procurement_mode: "bulk", procurement_unit: "" }).success, false);
  assert.equal(createProductSchema.safeParse({ ...product, procurement_mode: "bulk", procurement_unit: "kg" }).success, true);
});

test("pack product remains supported without a procurement unit", () => {
  assert.equal(createProductSchema.safeParse({ ...product, procurement_mode: "pack", procurement_unit: "" }).success, true);
});

test("vendor capacity accepts three decimals and rejects excess precision", () => {
  const base = {
    product_id: "00000000-0000-4000-8000-000000000001",
    product_pack_id: null,
    is_available: true,
    maximum_quantity: null,
    lead_time_hours: "",
    status: "active",
  };
  assert.equal(vendorProductSchema.safeParse({ ...base, minimum_quantity: "0.125" }).success, true);
  assert.equal(vendorProductSchema.safeParse({ ...base, minimum_quantity: "0.1251" }).success, false);
  const optional = vendorProductSchema.parse({
    ...base,
    minimum_quantity: "",
    maximum_quantity: "",
    lead_time_hours: "",
  });
  assert.equal(optional.minimum_quantity, null);
  assert.equal(optional.maximum_quantity, null);
  assert.equal(optional.lead_time_hours, null);
});
