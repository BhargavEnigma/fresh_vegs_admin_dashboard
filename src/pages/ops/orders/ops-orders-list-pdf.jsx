import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

function money(paise) {
    const n = Number(paise || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "INR" });
}

const styles = StyleSheet.create({
    page: { padding: 18, fontSize: 9 },
    title: { fontSize: 14, fontWeight: 700 },
    muted: { color: "#666" },
    header: { marginBottom: 10 },

    table: { borderWidth: 1, borderColor: "#ddd" },
    tr: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingVertical: 5,
        paddingHorizontal: 6,
    },
    th: { fontWeight: 700, backgroundColor: "#f6f6f6" },

    cell: {
        minWidth: 0,
        overflow: "hidden",
        paddingRight: 6,
    },

    cOrder: { width: 125 },
    cStatus: { width: 60 },
    cDate: { width: 70 },
    cCustomer: { width: 210 },
    cTotal: { width: 70, textAlign: "right" },
    cPay: { width: 70 },

    payLine: { fontSize: 8, color: "#444" },
});

function filterLine(filters) {
    if (!filters) return "No filters";
    const parts = [];
    if (filters.status) parts.push(`status=${filters.status}`);
    if (filters.delivery_date) parts.push(`delivery_date=${filters.delivery_date}`);
    if (filters.warehouse_id) parts.push(`warehouse_id=${filters.warehouse_id}`);
    if (filters.q) parts.push(`q=${filters.q}`);
    return parts.length ? parts.join(", ") : "No filters";
}

export function OpsOrdersListPdf({ orders, filters }) {
    const list = Array.isArray(orders) ? orders : [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>FreshVeg - Ops Orders Export</Text>
                    <Text style={styles.muted}>Filters: {filterLine(filters)}</Text>
                    <Text style={styles.muted}>Rows: {list.length}</Text>
                </View>

                <View style={styles.table}>
                    {/* Header */}
                    <View style={[styles.tr, styles.th]}>
                        <Text style={[styles.cell, styles.cOrder]}>Order</Text>
                        <Text style={[styles.cell, styles.cStatus]}>Status</Text>
                        <Text style={[styles.cell, styles.cDate]}>Delivery</Text>
                        <Text style={[styles.cell, styles.cCustomer]}>Customer</Text>
                        <Text style={[styles.cell, styles.cTotal]}>Total</Text>
                        <Text style={[styles.cell, styles.cPay]}>Payment</Text>
                    </View>

                    {/* Rows */}
                    {list.map((o) => (
                        <View key={o.id} style={styles.tr}>
                            <Text style={[styles.cell, styles.cOrder]}>{o.order_number || o.id}</Text>
                            <Text style={[styles.cell, styles.cStatus]}>{o.status || "—"}</Text>
                            <Text style={[styles.cell, styles.cDate]}>{o.delivery_date || "—"}</Text>

                            <Text style={[styles.cell, styles.cCustomer]}>
                                {(o.user?.full_name || "—") + (o.user?.phone ? ` (${o.user.phone})` : "")}
                            </Text>

                            <Text style={[styles.cell, styles.cTotal]}>{money(o.total_paise)}</Text>

                            <View style={[styles.cell, styles.cPay]}>
                                <Text style={styles.payLine}>{o.payment_method || "—"}</Text>
                                <Text style={styles.payLine}>{o.payment_status || "—"}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ marginTop: 10 }}>
                    <Text style={styles.muted}>
                        Tip: Use CSV export for large datasets (100+ rows).
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
