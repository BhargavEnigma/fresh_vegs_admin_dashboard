import React from "react";
import { formatIndianDateTime, formatOrderStatusDateTime } from "../../../utils/date-formatter";
import { getOrderStatusLabel, getOrderStatusSourceLabel } from "../../../utils/order-status-timeline";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../utils/order-identifier";
import { formatQuantity } from "../../../lib/utils";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";

function money(paise) {
    const n = Number(paise || 0) / 100;
    // React PDF's built-in Helvetica font does not contain the rupee glyph.
    // Using the glyph makes it render as a tiny superscript-like "1" in the PDF.
    return `Rs. ${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

const styles = StyleSheet.create({
    page: { padding: 24, fontSize: 10 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    title: { fontSize: 16, fontWeight: 700 },
    muted: { color: "#666" },

    section: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#ddd" },
    sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6 },

    row: { flexDirection: "row", gap: 12 },
    col: { flex: 1 },

    kv: { marginBottom: 3 },
    kvLabel: { fontWeight: 700 },

    table: { marginTop: 8, borderWidth: 1, borderColor: "#ddd" },
    tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 6, paddingHorizontal: 6 },
    th: { fontWeight: 700, backgroundColor: "#f6f6f6" },

    tdName: { flex: 3 },
    tdQty: { flex: 1, textAlign: "right" },
    tdPrice: { flex: 1.5, textAlign: "right" },
    tdTotal: { flex: 1.5, textAlign: "right" },
});

export function OpsOrderPdf({ order }) {
    const items = order?.items || [];
    console.log("ITEMS : ", items);
    
    const timeline = order?.status_timeline || [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerRow}>
                    <View>
                        {getDailyOrderLabel(order) ? (
                            <Text style={{ fontSize: 24, fontWeight: "extrabold", color: "#111" }}>
                                ORDER {getDailyOrderLabel(order)}
                            </Text>
                        ) : (
                            <Text style={styles.title}>FreshVeg - Order Details</Text>
                        )}
                        {order?.operational_order_code ? (
                            <Text style={{ fontSize: 13, fontWeight: "bold", color: "#333", marginTop: 2 }}>
                                {order.operational_order_code}
                            </Text>
                        ) : null}
                        <Text style={[styles.muted, { marginTop: 4 }]}>Generated from Operations Panel</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", textAlign: "right" }}>
                        {order?.order_number && (
                            <Text>Customer Reference: {order.order_number}</Text>
                        )}
                        <Text>Delivery Date: {formatIndianDateTime(order?.delivery_date)}</Text>
                        <Text>Internal ID: {order?.id}</Text>
                        <Text>Date: {formatIndianDateTime(order?.created_at)}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Status: </Text>{getOrderStatusLabel(order?.status)}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Delivery Date: </Text>{formatIndianDateTime(order?.delivery_date)}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Warehouse: </Text>{order?.warehouse?.name || "—"}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Payment Method: </Text>{order?.payment_method || "—"}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Payment Status: </Text>{order?.payment_status || "—"}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Locked: </Text>{order?.is_locked ? "Yes" : "No"}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Customer & Address</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Name: </Text>{order?.user?.full_name || "—"}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Phone: </Text>{order?.user?.phone || "—"}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Label: </Text>{order?.address?.label || "—"}</Text>
                            <Text style={styles.kv}>
                                <Text style={styles.kvLabel}>Address: </Text>
                                {(order?.address?.address_line1 || "") +
                                    (order?.address?.address_line2 ? `, ${order.address.address_line2}` : "")}
                            </Text>
                            <Text style={styles.kv}>
                                {(order?.address?.area || "") +
                                    (order?.address?.landmark ? `, ${order.address.landmark}` : "")}
                            </Text>
                            <Text style={styles.kv}>
                                {(order?.address?.city || "") +
                                    (order?.address?.state ? `, ${order.address.state}` : "") +
                                    (order?.address?.pincode ? ` - ${order.address.pincode}` : "")}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Charges</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Subtotal: </Text>{money(order?.subtotal_paise)}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Delivery Fee: </Text>{money(order?.delivery_fee_paise)}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Discount: </Text>{money(order?.discount_paise)}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>GST: </Text>{money(order?.gst_amount_paise)} ({order?.gst_rate_bps || 0} bps)</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Total: </Text>{money(order?.total_paise)}</Text>
                            <Text style={styles.kv}>
                                <Text style={styles.kvLabel}>Grand Total: </Text>
                                {money(order?.grand_total_paise || order?.total_paise)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status Timeline</Text>
                    {timeline && timeline.length > 0 ? (
                        <View style={styles.table}>
                            <View style={[styles.tr, styles.th]}>
                                <Text style={{ flex: 2, fontWeight: 700 }}>Status</Text>
                                <Text style={{ flex: 3, fontWeight: 700 }}>Date & Time (IST)</Text>
                                <Text style={{ flex: 3, fontWeight: 700 }}>Updated By</Text>
                            </View>
                            {timeline.map((item, idx) => {
                                const actorText = item.actor?.full_name 
                                    ? item.actor.full_name 
                                    : item.source === "scheduler" 
                                    ? "Scheduler" 
                                    : item.source === "payment" 
                                    ? "Payment system" 
                                    : getOrderStatusSourceLabel(item.source);

                                return (
                                    <View key={item.id || idx} style={styles.tr} wrap={false}>
                                        <Text style={{ flex: 2 }}>{getOrderStatusLabel(item.status)}</Text>
                                        <Text style={{ flex: 3 }}>{formatOrderStatusDateTime(item.occurred_at)}</Text>
                                        <Text style={{ flex: 3 }}>{actorText}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text style={styles.muted}>Status timeline unavailable for this order.</Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>

                    <View style={styles.table}>
                        <View style={[styles.tr, styles.th]}>
                            <Text style={styles.tdName}>Product</Text>
                            <Text style={styles.tdQty}>Qty</Text>
                            <Text style={styles.tdPrice}>Unit Price</Text>
                            <Text style={styles.tdTotal}>Line Total</Text>
                        </View>

                        {items.map((it) => (
                            <View key={it.id} style={styles.tr}>
                                <Text style={styles.tdName}>
                                    {it.product_name || "—"} {it.pack_label ? `(${it.pack_label})` : ""}
                                </Text>
                                <Text style={styles.tdQty}>{formatQuantity(it.quantity, "0")}</Text>
                                <Text style={styles.tdPrice}>{money(it.unit_price_paise)}</Text>
                                <Text style={styles.tdTotal}>{money(it.line_total_paise)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ marginTop: 18 }}>
                    <Text style={styles.muted}>
                        Note: This PDF is generated from admin data. Prices are shown in INR converted from paise.
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
