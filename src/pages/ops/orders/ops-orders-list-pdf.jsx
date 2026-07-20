import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../utils/order-identifier";

function money(paise) {
    const n = Number(paise || 0) / 100;
    // Keep PDF text within Helvetica's supported glyph set.
    return `Rs. ${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function getOrderItemsCount(o) {
    if (typeof o?.item_count === "number") return o.item_count;
    if (typeof o?.items_count === "number") return o.items_count;
    if (typeof o?.total_items === "number") return o.total_items;
    if (Array.isArray(o?.items)) return o.items.length;
    return 0;
}

function getOrderArea(o) {
    return (
        o?.delivery_area ||
        o?.address?.area ||
        o?.delivery_city ||
        o?.address?.city ||
        o?.area ||
        "—"
    );
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

    cDailyNo: { width: 45 },
    cOpsCode: { width: 90 },
    cCustRef: { width: 60 },
    cStatus: { width: 55 },
    cCustomer: { width: 110 },
    cArea: { width: 90 },
    cItems: { width: 35, textAlign: "right" },
    cTotal: { width: 55, textAlign: "right" },
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
                        <Text style={[styles.cell, styles.cDailyNo]}>Daily No.</Text>
                        <Text style={[styles.cell, styles.cOpsCode]}>Operational Code</Text>
                        <Text style={[styles.cell, styles.cCustRef]}>Customer Ref.</Text>
                        <Text style={[styles.cell, styles.cStatus]}>Status</Text>
                        <Text style={[styles.cell, styles.cCustomer]}>Customer</Text>
                        <Text style={[styles.cell, styles.cArea]}>Area</Text>
                        <Text style={[styles.cell, styles.cItems]}>Items</Text>
                        <Text style={[styles.cell, styles.cTotal]}>Total</Text>
                    </View>

                    {/* Rows */}
                    {list.map((o) => (
                        <View key={o.id} style={styles.tr}>
                            <Text style={[styles.cell, styles.cDailyNo]}>{getDailyOrderLabel(o) || "—"}</Text>
                            <Text style={[styles.cell, styles.cOpsCode]}>{getPrimaryOrderLabel(o) || "—"}</Text>
                            <Text style={[styles.cell, styles.cCustRef]}>{o.order_number || "—"}</Text>
                            <Text style={[styles.cell, styles.cStatus]}>{o.status || "—"}</Text>
                            <Text style={[styles.cell, styles.cCustomer]}>
                                {o.user?.full_name || "—"}
                            </Text>
                            <Text style={[styles.cell, styles.cArea]}>{getOrderArea(o)}</Text>
                            <Text style={[styles.cell, styles.cItems]}>{getOrderItemsCount(o)}</Text>
                            <Text style={[styles.cell, styles.cTotal]}>{money(o.total_paise)}</Text>
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
