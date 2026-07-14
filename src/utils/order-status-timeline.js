export const ORDER_STATUS_LABELS = {
    payment_pending: "Payment pending",
    placed: "Order placed",
    confirmed: "Order confirmed",
    locked: "Order locked",
    accepted: "Order accepted",
    packed: "Order packed",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered safely",
    delivery_failed: "Delivery failed",
    cancelled: "Order cancelled",
    refunded: "Refunded",
};

export const ORDER_STATUS_SOURCE_LABELS = {
    checkout: "Checkout",
    payment: "Payment system",
    customer: "Customer",
    ops: "Operations",
    scheduler: "Scheduler",
    delivery: "Delivery",
    support: "Support",
    system: "System",
};

export function getOrderStatusLabel(status) {
    if (!status) return "";
    const s = String(status).toLowerCase();
    if (ORDER_STATUS_LABELS[s]) {
        return ORDER_STATUS_LABELS[s];
    }
    return status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function getOrderStatusTone(status) {
    const s = String(status || "").toLowerCase();
    if (["payment_pending", "locked"].includes(s)) {
        return "amber";
    }
    if (["cancelled", "delivery_failed"].includes(s)) {
        return "red";
    }
    if ([
        "placed",
        "confirmed",
        "accepted",
        "packed",
        "out_for_delivery",
        "delivered",
        "refunded",
    ].includes(s)) {
        return "green";
    }
    return "slate";
}

export function getOrderStatusSourceLabel(source) {
    if (!source) return "System";
    const s = String(source).toLowerCase();
    if (ORDER_STATUS_SOURCE_LABELS[s]) {
        return ORDER_STATUS_SOURCE_LABELS[s];
    }
    return source
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function isLegacyStatusTransitionEvent(event) {
    const kind = event?.meta?.event_kind;

    if (kind === "status_transition") {
        return true;
    }

    if (kind && kind !== "status_transition") {
        return false;
    }

    return (
        event?.from_status == null ||
        String(event.from_status) !== String(event.to_status)
    );
}

function sanitizeActor(actor) {
    if (!actor) return null;
    return {
        id: actor.id || null,
        full_name: actor.full_name || null,
    };
}

export function normalizeOrderStatusTimeline(order) {
    if (!order) {
        return [];
    }

    let rawEvents = [];
    if (Array.isArray(order.status_timeline)) {
        rawEvents = order.status_timeline.map((item) => ({
            id: item.id || null,
            from_status: item.from_status !== undefined ? item.from_status : null,
            status: item.status || null,
            occurred_at: item.occurred_at || null,
            source: item.source || "system",
            note: item.note || null,
            actor: sanitizeActor(item.actor),
        }));
    } else if (Array.isArray(order.status_events)) {
        rawEvents = order.status_events
            .filter(isLegacyStatusTransitionEvent)
            .map((event) => ({
                id: event.id || null,
                from_status: event.from_status !== undefined ? event.from_status : null,
                status: event.to_status || null,
                occurred_at: event.created_at || null,
                source: event.meta?.source || "system",
                note: event.note || null,
                actor: sanitizeActor(event.actor),
            }));
    } else {
        return [];
    }

    const validEvents = rawEvents.filter((event) => event && event.status);

    return sortOrderStatusTimeline(validEvents);
}

export function sortOrderStatusTimeline(items) {
    if (!Array.isArray(items)) return [];
    return [...items].sort((a, b) => {
        const timeA = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
        const timeB = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;

        const isInvalidA = !a.occurred_at || Number.isNaN(timeA);
        const isInvalidB = !b.occurred_at || Number.isNaN(timeB);

        const valA = isInvalidA ? 0 : timeA;
        const valB = isInvalidB ? 0 : timeB;

        if (valA !== valB) {
            return valA - valB;
        }

        return String(a.id || "").localeCompare(String(b.id || ""));
    });
}

export function getCurrentStatusAt(order) {
    if (!order) return null;

    if (order.current_status_at) {
        const d = new Date(order.current_status_at);
        if (!Number.isNaN(d.getTime())) {
            return order.current_status_at;
        }
    }

    const timeline = normalizeOrderStatusTimeline(order);
    if (timeline.length > 0) {
        const lastItem = timeline[timeline.length - 1];
        if (lastItem && lastItem.occurred_at) {
            const d = new Date(lastItem.occurred_at);
            if (!Number.isNaN(d.getTime())) {
                return lastItem.occurred_at;
            }
        }
    }

    return null;
}
