import test from "node:test";
import assert from "node:assert";

import {
    getOperationalOrderCode,
    getDailyOrderLabel,
    getPrimaryOrderLabel,
    getOrderSecondaryReferences
} from "../src/utils/order-identifier.js";

test("1. Daily number 1 displays as #001", () => {
    assert.strictEqual(getDailyOrderLabel({ daily_order_number: 1 }), "#001");
});

test("2. Number 12 displays as #012", () => {
    assert.strictEqual(getDailyOrderLabel({ daily_order_number: 12 }), "#012");
});

test("3. Number 1000 displays as #1000", () => {
    assert.strictEqual(getDailyOrderLabel({ daily_order_number: 1000 }), "#1000");
});

test("4. Operational code is preferred over order_number", () => {
    const order = {
        operational_order_code: "DV-260718-012",
        order_number: "FV123",
        id: "some-uuid"
    };
    assert.strictEqual(getPrimaryOrderLabel(order), "DV-260718-012");
    assert.strictEqual(getOperationalOrderCode(order), "DV-260718-012");
});

test("5. order_number is used when operational code is absent", () => {
    const order = {
        order_number: "FV123",
        id: "some-uuid"
    };
    assert.strictEqual(getPrimaryOrderLabel(order), "FV123");
    assert.strictEqual(getOperationalOrderCode(order), null);
});

test("6. UUID is used only as the last fallback", () => {
    const order = {
        id: "some-uuid"
    };
    assert.strictEqual(getPrimaryOrderLabel(order), "some-uuid");
    assert.strictEqual(getOperationalOrderCode(order), null);
});

test("7. Null values do not produce broken text", () => {
    assert.strictEqual(getDailyOrderLabel(null), "");
    assert.strictEqual(getDailyOrderLabel({}), "");
    assert.strictEqual(getDailyOrderLabel({ daily_order_number: null }), "");
    assert.strictEqual(getDailyOrderLabel({ daily_order_number: undefined }), "");
    assert.strictEqual(getDailyOrderLabel({ daily_order_number: "invalid" }), "");

    assert.strictEqual(getPrimaryOrderLabel(null), "");
    assert.strictEqual(getPrimaryOrderLabel({}), "");
    
    assert.strictEqual(getOperationalOrderCode(null), null);
    assert.strictEqual(getOperationalOrderCode({}), null);

    const refs = getOrderSecondaryReferences(null);
    assert.strictEqual(refs.order_number, "");
    assert.strictEqual(refs.id, "");
});
