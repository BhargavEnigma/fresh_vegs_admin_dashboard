import test from "node:test";
import assert from "node:assert/strict";

import {
    buildCostProcurementFilters,
    procurementItemsFromResponse,
} from "../src/utils/cost-procurement-filter.js";

test("delivery date takes precedence over the selected date range", () => {
    assert.deepEqual(buildCostProcurementFilters({
        deliveryDate: "2026-08-05",
        fromDate: "2026-08-01",
        toDate: "2026-08-10",
        procurementWarehouseId: "warehouse-2",
        warehouseId: "warehouse-1",
    }), {
        delivery_date: "2026-08-05",
        warehouse_id: "warehouse-2",
    });
});

test("selected date range is used when delivery date is empty", () => {
    assert.deepEqual(buildCostProcurementFilters({
        fromDate: "2026-08-01",
        toDate: "2026-08-10",
        warehouseId: "warehouse-1",
    }), {
        from_date: "2026-08-01",
        to_date: "2026-08-10",
        warehouse_id: "warehouse-1",
    });
});

test("procurement items support the API's common collection response shapes", () => {
    const rows = [{ id: "item-1" }];

    assert.equal(procurementItemsFromResponse(rows), rows);
    assert.equal(procurementItemsFromResponse({ items: rows }), rows);
    assert.equal(procurementItemsFromResponse({ rows }), rows);
    assert.equal(procurementItemsFromResponse({ data: rows }), rows);
    assert.deepEqual(procurementItemsFromResponse(null), []);
});
