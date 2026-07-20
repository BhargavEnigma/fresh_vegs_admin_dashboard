/**
 * Helper to retrieve the operational order code from an order object.
 *
 * @param {Object} [order]
 * @returns {string|null}
 */
export function getOperationalOrderCode(order) {
    return order?.operational_order_code || null;
}

/**
 * Formats the daily order number as a label padded with a leading hash (e.g. #012).
 * Supports numbers above 999 without truncation. Safe for null/missing values.
 *
 * @param {Object} [order]
 * @returns {string}
 */
export function getDailyOrderLabel(order) {
    if (order?.daily_order_number === undefined || order?.daily_order_number === null) {
        return "";
    }
    const num = Number(order.daily_order_number);
    if (Number.isNaN(num)) {
        return "";
    }
    return `#${String(num).padStart(3, "0")}`;
}

/**
 * Returns the primary order identifier label following display priority hierarchy:
 * 1. operational_order_code
 * 2. order_number
 * 3. id (UUID)
 *
 * @param {Object} [order]
 * @returns {string}
 */
export function getPrimaryOrderLabel(order) {
    if (!order) return "";
    return order.operational_order_code || order.order_number || order.id || "";
}

/**
 * Returns secondary order references (order_number and id).
 *
 * @param {Object} [order]
 * @returns {{ order_number: string, orderNumber: string, id: string }}
 */
export function getOrderSecondaryReferences(order) {
    if (!order) return { order_number: "", orderNumber: "", id: "" };
    const ref = order.order_number || "";
    return {
        order_number: ref,
        orderNumber: ref,
        id: order.id || "",
    };
}
