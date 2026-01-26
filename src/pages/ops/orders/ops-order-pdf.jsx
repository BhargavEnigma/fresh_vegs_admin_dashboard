import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";

function money(paise) {
    const n = Number(paise || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "INR" });
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

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>FreshVeg - Order Details</Text>
                        <Text style={styles.muted}>Generated from Admin Panel</Text>
                    </View>
                    <View>
                        <Text>Order: {order?.order_number || order?.id}</Text>
                        <Text>Date: {order?.created_at || "—"}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Status: </Text>{order?.status || "—"}</Text>
                            <Text style={styles.kv}><Text style={styles.kvLabel}>Delivery Date: </Text>{order?.delivery_date || "—"}</Text>
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
                                <Text style={styles.tdQty}>{it.quantity || "0"}</Text>
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
