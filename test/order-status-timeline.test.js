import test from "node:test";
import assert from "node:assert";

import {
    getOrderStatusLabel,
    getOrderStatusTone,
    getOrderStatusSourceLabel,
    isLegacyStatusTransitionEvent,
    normalizeOrderStatusTimeline,
    sortOrderStatusTimeline,
    getCurrentStatusAt,
} from "../src/utils/order-status-timeline.js";

import { formatOrderStatusDateTime } from "../src/utils/date-formatter.js";

// Test suite for labels and tones
test("17. Unknown status codes receive a readable label", () => {
    assert.strictEqual(getOrderStatusLabel("placed"), "Order placed");
    assert.strictEqual(getOrderStatusLabel("future_unknown_status"), "Future Unknown Status");
    assert.strictEqual(getOrderStatusLabel(""), "");
    assert.strictEqual(getOrderStatusLabel(null), "");
});

test("18. Unknown sources receive a readable label", () => {
    assert.strictEqual(getOrderStatusSourceLabel("scheduler"), "Scheduler");
    assert.strictEqual(getOrderStatusSourceLabel("unknown_source_name"), "Unknown Source Name");
    assert.strictEqual(getOrderStatusSourceLabel(null), "System");
});

test("Tones mapping works correctly", () => {
    assert.strictEqual(getOrderStatusTone("payment_pending"), "amber");
    assert.strictEqual(getOrderStatusTone("locked"), "amber");
    assert.strictEqual(getOrderStatusTone("cancelled"), "red");
    assert.strictEqual(getOrderStatusTone("delivery_failed"), "red");
    assert.strictEqual(getOrderStatusTone("delivered"), "green");
    assert.strictEqual(getOrderStatusTone("placed"), "green");
    assert.strictEqual(getOrderStatusTone("unknown"), "slate");
});

// Test suite for date formatting
test("Date-format tests verify IST behavior explicitly", () => {
    // 2026-07-14T03:45:20.000Z in UTC is 2026-07-14T09:15:20.000+05:30 in IST
    const val = "2026-07-14T03:45:20.000Z";
    assert.strictEqual(formatOrderStatusDateTime(val), "14 Jul 2026, 9:15 AM");
});

test("16. Handles invalid dates without throwing", () => {
    assert.strictEqual(formatOrderStatusDateTime("invalid-date-string"), "Time unavailable");
    assert.strictEqual(formatOrderStatusDateTime(null), "Time unavailable");
    assert.strictEqual(formatOrderStatusDateTime(undefined), "Time unavailable");
});

// Test suite for legacy events filtering
test("7, 8, 9, 10. Legacy event filtering (isLegacyStatusTransitionEvent)", () => {
    // 8. Excludes event_kind: operational_action
    assert.strictEqual(
        isLegacyStatusTransitionEvent({ meta: { event_kind: "operational_action" } }),
        false
    );
    // 9. Includes event_kind: status_transition
    assert.strictEqual(
        isLegacyStatusTransitionEvent({ meta: { event_kind: "status_transition" } }),
        true
    );
    // 10. Includes initial events where from_status is null
    assert.strictEqual(
        isLegacyStatusTransitionEvent({ from_status: null, to_status: "placed" }),
        true
    );
    // 7. Excludes legacy same-status operational events
    assert.strictEqual(
        isLegacyStatusTransitionEvent({ from_status: "placed", to_status: "placed" }),
        false
    );
    // Transitions between different status are included
    assert.strictEqual(
        isLegacyStatusTransitionEvent({ from_status: "placed", to_status: "locked" }),
        true
    );
});

// Test suite for normalization and sorting
test("1, 4. Handles null and malformed timeline safely", () => {
    assert.deepEqual(normalizeOrderStatusTimeline(null), []);
    assert.deepEqual(normalizeOrderStatusTimeline({}), []);
    assert.deepEqual(normalizeOrderStatusTimeline({ status_timeline: null }), []);
});

test("5, 9. Removes malformed entries that do not have a status", () => {
    const order = {
        status_timeline: [
            { id: "1", status: "placed", occurred_at: "2026-07-14T03:45:20.000Z" },
            { id: "2", occurred_at: "2026-07-14T03:50:20.000Z" }, // no status
        ],
    };
    const res = normalizeOrderStatusTimeline(order);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].status, "placed");
});

test("2. Uses backend status_timeline when available", () => {
    const order = {
        status_timeline: [
            { id: "1", status: "placed", occurred_at: "2026-07-14T03:45:20.000Z" }
        ],
        status_events: [
            { id: "2", to_status: "locked", created_at: "2026-07-14T03:50:20.000Z", meta: { event_kind: "status_transition" } }
        ]
    };
    const res = normalizeOrderStatusTimeline(order);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].status, "placed");
});

test("6. Uses raw status_events only when normalized timeline is absent", () => {
    const order = {
        status_events: [
            { id: "2", from_status: "placed", to_status: "locked", created_at: "2026-07-14T03:50:20.000Z", meta: { event_kind: "status_transition" } }
        ]
    };
    const res = normalizeOrderStatusTimeline(order);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].status, "locked");
    assert.strictEqual(res[0].from_status, "placed");
});

test("2, 3. Sorts by occurred_at ASC and uses ID as deterministic tie-breaker", () => {
    const order = {
        status_timeline: [
            { id: "B", status: "locked", occurred_at: "2026-07-14T03:45:20.000Z" },
            { id: "A", status: "placed", occurred_at: "2026-07-14T03:45:20.000Z" }, // same occurred_at, smaller ID
            { id: "C", status: "accepted", occurred_at: "2026-07-14T03:40:20.000Z" } // earlier occurred_at
        ]
    };
    const res = normalizeOrderStatusTimeline(order);
    assert.strictEqual(res.length, 3);
    assert.strictEqual(res[0].id, "C");
    assert.strictEqual(res[1].id, "A");
    assert.strictEqual(res[2].id, "B");
});

test("11, 12. Removes unsafe actor fields, preserving only ID and full name", () => {
    const order = {
        status_timeline: [
            {
                id: "1",
                status: "placed",
                occurred_at: "2026-07-14T03:45:20.000Z",
                actor: {
                    id: "staff-1",
                    full_name: "Warehouse Manager",
                    phone: "+919999999999",
                    email: "manager@dailyveg.com"
                }
            }
        ]
    };
    const res = normalizeOrderStatusTimeline(order);
    assert.strictEqual(res.length, 1);
    const actor = res[0].actor;
    assert.ok(actor);
    assert.strictEqual(actor.id, "staff-1");
    assert.strictEqual(actor.full_name, "Warehouse Manager");
    assert.strictEqual(actor.phone, undefined);
    assert.strictEqual(actor.email, undefined);
});

// Test suite for current status timestamp
test("13. Uses current_status_at from backend when valid", () => {
    const order = {
        current_status_at: "2026-07-14T04:00:00.000Z",
        status_timeline: [
            { id: "1", status: "placed", occurred_at: "2026-07-14T03:45:20.000Z" }
        ]
    };
    assert.strictEqual(getCurrentStatusAt(order), "2026-07-14T04:00:00.000Z");
});

test("14. Falls back to the final timeline event occurred_at when current_status_at is invalid/missing", () => {
    const order = {
        current_status_at: "invalid-date",
        status_timeline: [
            { id: "1", status: "placed", occurred_at: "2026-07-14T03:45:20.000Z" },
            { id: "2", status: "locked", occurred_at: "2026-07-14T03:50:20.000Z" }
        ]
    };
    assert.strictEqual(getCurrentStatusAt(order), "2026-07-14T03:50:20.000Z");
});

test("15. Never falls back to order.updated_at", () => {
    const order = {
        current_status_at: null,
        updated_at: "2026-07-14T05:00:00.000Z",
        status_timeline: []
    };
    assert.strictEqual(getCurrentStatusAt(order), null);
});
