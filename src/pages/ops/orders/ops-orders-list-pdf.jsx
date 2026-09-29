import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../utils/order-identifier";
import { formatQuantity } from "../../../lib/utils";
import MuktaVaaniRegular from "../../../assets/fonts/MuktaVaani-Regular.ttf";
import MuktaVaaniBold from "../../../assets/fonts/MuktaVaani-Bold.ttf";
import DailyVegLogo from "../../../assets/dailyveg-logo-light.png";

// The built-in PDF fonts do not contain Gujarati glyphs. Register the font
// already bundled with the admin panel so bilingual item names remain intact.
Font.register({
    family: "MuktaVaani",
    fonts: [
        { src: MuktaVaaniRegular, fontWeight: 400 },
        { src: MuktaVaaniBold, fontWeight: 700 },
    ],
});

function money(paise) {
    return `Rs. ${(Number(paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function label(value) {
    return String(value || "-").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function addressText(order) {
    const address = order?.address || {};
    const values = [address.address_line1 || order?.delivery_address_line1, address.address_line2 || order?.delivery_address_line2, address.landmark || order?.delivery_landmark, address.area || order?.delivery_area, address.city || order?.delivery_city, address.state || order?.delivery_state, address.pincode || order?.delivery_pincode].filter(Boolean);
    return values.length ? values.join(", ") : "Address not available";
}

function filterText(filters) {
    if (filters?.exportScope === "all") {
        const scope = [`Delivery: ${filters?.delivery_date || "All dates"}`];
        if (filters?.warehouse_name) scope.push(`Warehouse: ${filters.warehouse_name}`);
        scope.push("Status, rider and search filters ignored");
        return scope.join(" | ");
    }
    const values = [];
    if (filters?.delivery_date) values.push(`Delivery: ${filters.delivery_date}`);
    if (filters?.warehouse_name) values.push(`Warehouse: ${filters.warehouse_name}`);
    if (filters?.delivery_partner_name) values.push(`Partner: ${filters.delivery_partner_name}`);
    if (filters?.status) values.push(`Status: ${label(filters.status)}`);
    if (filters?.assigned === true) values.push("Assigned only");
    if (filters?.assigned === false) values.push("Unassigned only");
    if (filters?.q) values.push(`Search: ${filters.q}`);
    return values.length ? values.join(" | ") : "All orders in the current operations scope";
}

const palette = { green: "#20844A", dark: "#102A1C", ink: "#15211A", muted: "#627067", line: "#D9E2DB", soft: "#F3F8F4", pale: "#E6F3E9", white: "#FFFFFF" };
const styles = StyleSheet.create({
    page: { paddingTop: 30, paddingBottom: 38, paddingHorizontal: 34, fontSize: 9, color: palette.ink, fontFamily: "MuktaVaani" },
    cover: { justifyContent: "space-between" },
    overline: { color: palette.green, fontSize: 9, fontFamily: "MuktaVaani", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" },
    title: { marginTop: 7, fontSize: 27, lineHeight: 1.15, fontFamily: "MuktaVaani", fontWeight: 700, color: palette.dark },
    subtitle: { marginTop: 8, fontSize: 11, lineHeight: 1.45, color: palette.muted, maxWidth: 380 },
    reportCard: { marginTop: 28, borderWidth: 1, borderColor: palette.line, borderRadius: 6, overflow: "hidden" },
    reportCardTop: { backgroundColor: palette.dark, paddingHorizontal: 16, paddingVertical: 13 }, reportCardTitle: { color: palette.white, fontSize: 12, fontFamily: "MuktaVaani", fontWeight: 700 }, reportCardBody: { padding: 16, backgroundColor: palette.white },
    metricRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: palette.line, paddingVertical: 8 }, metricLabel: { width: "39%", color: palette.muted, fontSize: 8, textTransform: "uppercase" }, metricValue: { flex: 1, fontFamily: "MuktaVaani", fontWeight: 700, fontSize: 9 }, footer: { flexDirection: "row", justifyContent: "space-between", color: palette.muted, fontSize: 8 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 3, borderBottomColor: palette.green, paddingBottom: 11 }, logo: { width: 104, height: 27, objectFit: "contain" }, documentType: { marginTop: 2, color: palette.muted, fontSize: 8, letterSpacing: 0.8, textTransform: "uppercase" }, orderTag: { backgroundColor: palette.dark, color: palette.white, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 3, fontSize: 9, fontFamily: "MuktaVaani", fontWeight: 700 },
    code: { marginTop: 13, fontSize: 19, fontFamily: "MuktaVaani", fontWeight: 700, color: palette.dark }, reference: { marginTop: 3, color: palette.muted, fontSize: 8 }, statusPill: { marginTop: 10, alignSelf: "flex-start", backgroundColor: palette.pale, color: palette.green, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 3, fontSize: 8, fontFamily: "MuktaVaani", fontWeight: 700 },
    summaryGrid: { flexDirection: "row", marginTop: 15, borderWidth: 1, borderColor: palette.line, borderRadius: 5, overflow: "hidden" }, summaryCell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: palette.line }, summaryCellLast: { borderRightWidth: 0 }, summaryLabel: { color: palette.muted, fontSize: 7, textTransform: "uppercase" }, summaryValue: { marginTop: 3, fontSize: 9, fontFamily: "MuktaVaani", fontWeight: 700 },
    section: { marginTop: 16 }, sectionTitle: { paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: palette.line, fontSize: 10, color: palette.dark, fontFamily: "MuktaVaani", fontWeight: 700 }, detailsRow: { flexDirection: "row", marginTop: 8 }, detailsColumn: { flex: 1, paddingRight: 14 }, detailsLabel: { color: palette.muted, fontSize: 7, textTransform: "uppercase" }, detailsValue: { marginTop: 2, fontSize: 9, lineHeight: 1.35 },
    table: { marginTop: 8, borderWidth: 1, borderColor: palette.line, borderRadius: 3, overflow: "hidden" }, tableHeader: { flexDirection: "row", backgroundColor: palette.soft, paddingVertical: 6, paddingHorizontal: 7 }, tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 7, borderTopWidth: 1, borderTopColor: palette.line }, tableHeaderText: { fontSize: 7, color: palette.muted, fontFamily: "MuktaVaani", fontWeight: 700, textTransform: "uppercase" }, itemName: { flex: 3.3 }, itemQty: { flex: 0.8, textAlign: "right" }, itemPrice: { flex: 1.2, textAlign: "right" }, itemTotal: { flex: 1.25, textAlign: "right" },
    totals: { marginLeft: "50%", marginTop: 11 }, totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, color: palette.muted }, grandTotal: { marginTop: 3, borderTopWidth: 1.5, borderTopColor: palette.dark, paddingTop: 6, color: palette.dark, fontSize: 11, fontFamily: "MuktaVaani", fontWeight: 700 }, pageFooter: { position: "absolute", bottom: 17, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 6, color: palette.muted, fontSize: 7 },
});

function PageFooter() { return <View fixed style={styles.pageFooter}><Text>DailyVeg Operations - confidential internal record</Text><Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} /></View>; }

function DetailPage({ order }) {
    const items = Array.isArray(order?.items) ? order.items : [];
    const grandTotal = order?.grand_total_paise ?? order?.total_paise;
    const customerName = order?.user?.full_name || order?.delivery_name || "Customer";
    const customerPhone = order?.user?.phone || order?.delivery_phone || "-";
    const partner = order?.delivery_partner?.full_name || "Unassigned";
    return <Page size="A4" style={styles.page}>
        <View style={styles.header}><View><Image src={DailyVegLogo} style={styles.logo} /><Text style={styles.documentType}>Operations order record</Text></View><Text style={styles.orderTag}>{getDailyOrderLabel(order) || "ORDER"}</Text></View>
        <Text style={styles.code}>{getPrimaryOrderLabel(order) || order?.id || "Order"}</Text><Text style={styles.reference}>Customer reference: {order?.order_number || "-"}  |  Created: {formatIndianDateTime(order?.created_at) || "-"}</Text><Text style={styles.statusPill}>{label(order?.status)}</Text>
        <View style={styles.summaryGrid}><View style={styles.summaryCell}><Text style={styles.summaryLabel}>Delivery date</Text><Text style={styles.summaryValue}>{formatIndianDateTime(order?.delivery_date) || "-"}</Text></View><View style={styles.summaryCell}><Text style={styles.summaryLabel}>Warehouse</Text><Text style={styles.summaryValue}>{order?.warehouse?.name || "-"}</Text></View><View style={[styles.summaryCell, styles.summaryCellLast]}><Text style={styles.summaryLabel}>Order value</Text><Text style={styles.summaryValue}>{money(grandTotal)}</Text></View></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Delivery and customer</Text><View style={styles.detailsRow}><View style={styles.detailsColumn}><Text style={styles.detailsLabel}>Customer</Text><Text style={styles.detailsValue}>{customerName}</Text><Text style={styles.detailsValue}>{customerPhone}</Text></View><View style={styles.detailsColumn}><Text style={styles.detailsLabel}>Delivery address</Text><Text style={styles.detailsValue}>{addressText(order)}</Text></View><View style={[styles.detailsColumn, { paddingRight: 0 }]}><Text style={styles.detailsLabel}>Assigned rider</Text><Text style={styles.detailsValue}>{partner}</Text><Text style={styles.detailsValue}>{order?.delivery_partner?.phone || "-"}</Text></View></View></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Order items ({items.length})</Text><View style={styles.table}><View style={styles.tableHeader}><Text style={[styles.itemName, styles.tableHeaderText]}>Product / pack</Text><Text style={[styles.itemQty, styles.tableHeaderText]}>Qty</Text><Text style={[styles.itemPrice, styles.tableHeaderText]}>Unit price</Text><Text style={[styles.itemTotal, styles.tableHeaderText]}>Line total</Text></View>{items.length ? items.map((item, index) => <View key={item.id || index} style={styles.tableRow} wrap={false}><Text style={styles.itemName}>{item.product_name || item.product?.name || "-"}{item.pack_label ? ` (${item.pack_label})` : ""}</Text><Text style={styles.itemQty}>{formatQuantity(item.quantity ?? 0, "0")}</Text><Text style={styles.itemPrice}>{money(item.unit_price_paise)}</Text><Text style={styles.itemTotal}>{money(item.line_total_paise)}</Text></View>) : <View style={styles.tableRow}><Text style={{ color: palette.muted }}>No line items were returned for this order.</Text></View>}</View></View>
        <View style={styles.totals}><View style={styles.totalRow}><Text>Subtotal</Text><Text>{money(order?.subtotal_paise)}</Text></View><View style={styles.totalRow}><Text>Delivery fee</Text><Text>{money(order?.delivery_fee_paise)}</Text></View><View style={styles.totalRow}><Text>Discount</Text><Text>{money(order?.discount_paise)}</Text></View><View style={styles.totalRow}><Text>GST</Text><Text>{money(order?.gst_amount_paise)}</Text></View><View style={[styles.totalRow, styles.grandTotal]}><Text>Grand total</Text><Text>{money(grandTotal)}</Text></View></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Operational notes</Text><View style={styles.detailsRow}><View style={styles.detailsColumn}><Text style={styles.detailsLabel}>Payment</Text><Text style={styles.detailsValue}>{label(order?.payment_method)} - {label(order?.payment_status)}</Text></View><View style={styles.detailsColumn}><Text style={styles.detailsLabel}>Order locked</Text><Text style={styles.detailsValue}>{order?.is_locked ? "Yes" : "No"}</Text></View><View style={[styles.detailsColumn, { paddingRight: 0 }]}><Text style={styles.detailsLabel}>Assigned at</Text><Text style={styles.detailsValue}>{formatIndianDateTime(order?.delivery_assigned_at) || "-"}</Text></View></View></View><PageFooter />
    </Page>;
}

export function OpsOrdersListPdf({ orders, filters }) {
    const list = Array.isArray(orders) ? orders : [];
    const generatedAt = formatIndianDateTime(new Date().toISOString());
    return <Document title="DailyVeg Operations Orders" author="DailyVeg"><Page size="A4" style={[styles.page, styles.cover]}><View><Text style={styles.overline}>DailyVeg operations</Text><Text style={styles.title}>{filters?.exportScope === "all" ? "All Orders for Selected Date" : "Filtered Orders Register"}</Text><Text style={styles.subtitle}>A complete, print-ready record with the delivery, customer, payment and line-item information required by operations.</Text><View style={styles.reportCard}><View style={styles.reportCardTop}><Text style={styles.reportCardTitle}>Export summary</Text></View><View style={styles.reportCardBody}><View style={styles.metricRow}><Text style={styles.metricLabel}>Scope</Text><Text style={styles.metricValue}>{filters?.exportScope === "all" ? "All orders for selected delivery date" : "Current filters"}</Text></View><View style={styles.metricRow}><Text style={styles.metricLabel}>Orders included</Text><Text style={styles.metricValue}>{list.length}</Text></View><View style={styles.metricRow}><Text style={styles.metricLabel}>Applied filters</Text><Text style={styles.metricValue}>{filterText(filters)}</Text></View><View style={[styles.metricRow, { borderBottomWidth: 0 }]}><Text style={styles.metricLabel}>Generated</Text><Text style={styles.metricValue}>{generatedAt}</Text></View></View></View></View><View style={styles.footer}><Text>Prepared for warehouse and delivery operations</Text><Text>Internal document</Text></View><PageFooter /></Page>{list.map((order) => <DetailPage key={order.id} order={order} />)}</Document>;
}
