import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatQuantityWithUnit } from "../../../../utils/vendor-assignment";
import dailyVegLogo from "../../../../assets/dailyveg-logo-light.png";

Font.register({
  family: "MuktaVaani",
  fonts: [
    { src: "/fonts/MuktaVaani-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/MuktaVaani-SemiBold.ttf", fontWeight: 600 },
    { src: "/fonts/MuktaVaani-Bold.ttf", fontWeight: 700 },
  ],
});

const green = "#168546";
const ink = "#26364a";
const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 42, fontFamily: "MuktaVaani", fontSize: 10, color: ink },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: green, paddingBottom: 15 },
  logo: { width: 132, height: 33, objectFit: "contain" },
  title: { marginTop: 11, fontSize: 21, fontWeight: 600, color: ink },
  subtitle: { marginTop: 2, color: "#64748b", fontSize: 10 },
  copyPill: { marginTop: 2, borderWidth: 1, borderColor: "#bde3ca", borderRadius: 18, backgroundColor: "#f2fbf5", color: green, paddingVertical: 7, paddingHorizontal: 14, fontSize: 9, fontWeight: 700 },
  summary: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 26 },
  metric: { flex: 1, borderWidth: 1, borderColor: "#d5ddd9", borderRadius: 10, padding: 11, minHeight: 57 },
  metricLabel: { color: "#71808a", fontSize: 8, letterSpacing: 1.1 },
  metricValue: { color: ink, marginTop: 5, fontSize: 11, fontWeight: 700 },
  section: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 9 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: ink },
  sectionHint: { color: "#71808a", fontSize: 9 },
  table: { borderTopWidth: 1, borderTopColor: "#d8e0dd" },
  head: { flexDirection: "row", alignItems: "center", backgroundColor: "#eaf7ee", minHeight: 40 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#d9e1df", paddingVertical: 12 },
  number: { width: "8%", paddingHorizontal: 8, color: "#64748b", textAlign: "center" },
  product: { width: "30%", paddingHorizontal: 8 },
  packs: { width: "43%", paddingHorizontal: 7 },
  quantity: { width: "19%", paddingHorizontal: 8, textAlign: "right", fontWeight: 700, fontSize: 12 },
  headText: { fontSize: 9, fontWeight: 700, color: ink },
  productText: { fontWeight: 700, fontSize: 10.5, color: ink },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: { borderWidth: 1, borderColor: "#bde3ca", backgroundColor: "#f3fbf5", borderRadius: 6, paddingVertical: 4, paddingHorizontal: 7, fontSize: 8.5, color: ink },
  empty: { color: "#71808a", fontSize: 9 },
  note: { flexDirection: "row", marginTop: 17, borderLeftWidth: 4, borderLeftColor: green, backgroundColor: "#edf8f0", paddingVertical: 11, paddingHorizontal: 13 },
  noteStrong: { color: green, fontWeight: 700 },
  noteText: { color: ink, fontSize: 9.5 },
  footer: { position: "absolute", left: 42, right: 42, bottom: 20, borderTopWidth: 1, borderTopColor: "#d9e1df", paddingTop: 8, flexDirection: "row", justifyContent: "space-between", color: "#71808a", fontSize: 8.5 },
});

export function purchasePackRequirements(item) {
  if (item.pack_requirements?.length) return item.pack_requirements.map((requirement) => `${String(requirement.pack_label || "Pack").replace(/\s+/g, " ")} × ${Number(requirement.required_pack_quantity || 0)}`);
  const label = item.pack_label || item.pack?.pack_label || item.pack?.label;
  const count = item.ordered_pack_quantity ?? (item.procurement_mode === "pack" ? item.required_quantity : null);
  return label && count !== null && count !== undefined ? [`${label} × ${Number(count)}`] : [];
}

export function purchasePackRequirementsLabel(item) { return purchasePackRequirements(item).join(", ") || "—"; }

export function purchaseRequiredQuantity(item) {
  const value = Number(item.required_quantity || 0);
  return value ? formatQuantityWithUnit(value, item.procurement_unit || "unit", "0") : "0";
}

function Metric({ label, value }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }

export function PurchaseListPdf({ operation, items = [] }) {
  return <Document title={`Purchase List - ${operation?.delivery_date || "DailyVeg"}`} author="DailyVeg">
    <Page size="A4" style={styles.page}>
      <View style={styles.top}>
        <View><Image src={dailyVegLogo} style={styles.logo} /><Text style={styles.title}>Purchase List</Text><Text style={styles.subtitle}>Consolidated procurement · Next-day delivery</Text></View>
        <Text style={styles.copyPill}>WAREHOUSE COPY</Text>
      </View>
      <View style={styles.summary}><Metric label="WAREHOUSE" value={operation?.warehouse_name || "Warehouse"} /><Metric label="DELIVERY DATE" value={operation?.delivery_date || "—"} /><Metric label="DISTINCT PRODUCTS" value={String(items.length)} /></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Products to purchase</Text><Text style={styles.sectionHint}>Pack quantity × ordered count</Text></View>
      <View style={styles.table}>
        <View style={styles.head}><Text style={[styles.number, styles.headText]}>No.</Text><Text style={[styles.product, styles.headText]}>Product</Text><Text style={[styles.packs, styles.headText]}>Pack breakdown</Text><Text style={[styles.quantity, styles.headText]}>Buy quantity</Text></View>
        {items.map((item, index) => {
          const packs = purchasePackRequirements(item);
          return <View key={item.id || item.procurement_cost_id || index} style={styles.row} wrap={false}>
            <Text style={styles.number}>{index + 1}</Text><Text style={[styles.product, styles.productText]}>{item.product_name || item.product?.name || "—"}</Text>
            <View style={styles.packs}><View style={styles.chipWrap}>{packs.length ? packs.map((pack, packIndex) => <Text key={`${pack}-${packIndex}`} style={styles.chip}>{pack}</Text>) : <Text style={styles.empty}>—</Text>}</View></View>
            <Text style={styles.quantity}>{purchaseRequiredQuantity(item)}</Text>
          </View>;
        })}
      </View>
      <View style={styles.note}><Text style={styles.noteText}><Text style={styles.noteStrong}>PURCHASE NOTE · </Text>This list is prepared from locked customer orders. Please verify products and quantities before purchase.</Text></View>
      <View style={styles.footer} fixed><Text>DailyVeg · Operations Management</Text><Text>Purchase list · Page 1</Text></View>
    </Page>
  </Document>;
}

function MetricCard({ label, value }) { return <div className="rounded-xl border border-slate-300 px-4 py-3"><p className="text-[10px] tracking-widest text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p></div>; }

export function PurchaseListPrintSheet({ operation, items = [] }) {
  return <div className="hidden print:block print:bg-white print:p-0 print:text-[#26364a]">
    <style>{`@media print { body * { visibility: hidden; } #printable-purchase-list, #printable-purchase-list * { visibility: visible; } #printable-purchase-list { position: absolute; inset: 0; width: 100%; } @page { size: A4 portrait; margin: 12mm; } }`}</style>
    <div id="printable-purchase-list" className="min-h-[1000px] font-sans text-[#26364a]">
      <header className="flex items-start justify-between border-b-2 border-[#168546] pb-4"><div><img src={dailyVegLogo} alt="DailyVeg" className="h-8 w-auto object-contain object-left" /><h1 className="mt-3 text-2xl font-semibold">Purchase List</h1><p className="text-sm text-slate-500">Consolidated procurement · Next-day delivery</p></div><span className="rounded-full border border-[#bde3ca] bg-[#f2fbf5] px-4 py-2 text-[10px] font-bold text-[#168546]">WAREHOUSE COPY</span></header>
      <section className="my-5 grid grid-cols-3 gap-3"><MetricCard label="WAREHOUSE" value={operation?.warehouse_name || "Warehouse"} /><MetricCard label="DELIVERY DATE" value={operation?.delivery_date || "—"} /><MetricCard label="DISTINCT PRODUCTS" value={String(items.length)} /></section>
      <div className="mb-2 flex items-end justify-between"><h2 className="text-base font-bold">Products to purchase</h2><p className="text-xs text-slate-500">Pack quantity × ordered count</p></div>
      <table className="w-full border-collapse text-left text-xs"><thead><tr className="bg-[#eaf7ee]"><th className="w-[8%] px-3 py-3 text-center">No.</th><th className="w-[30%] px-3 py-3">Product</th><th className="w-[43%] px-3 py-3">Pack breakdown</th><th className="w-[19%] px-3 py-3 text-right">Buy quantity</th></tr></thead><tbody>{items.map((item, index) => { const packs = purchasePackRequirements(item); return <tr key={item.id || item.procurement_cost_id || index} className="border-b border-slate-300"><td className="px-3 py-3 text-center text-slate-500">{index + 1}</td><td className="px-3 py-3 font-bold">{item.product_name || item.product?.name || "—"}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-1.5">{packs.length ? packs.map((pack, packIndex) => <span key={`${pack}-${packIndex}`} className="rounded-md border border-[#bde3ca] bg-[#f3fbf5] px-2 py-1">{pack}</span>) : "—"}</div></td><td className="px-3 py-3 text-right text-sm font-bold">{purchaseRequiredQuantity(item)}</td></tr>; })}</tbody></table>
      <p className="mt-5 border-l-4 border-[#168546] bg-[#edf8f0] px-3 py-3 text-xs text-slate-700"><strong className="text-[#168546]">PURCHASE NOTE · </strong>This list is prepared from locked customer orders. Please verify products and quantities before purchase.</p>
      <footer className="mt-16 flex justify-between border-t border-slate-300 pt-2 text-[10px] text-slate-500"><span>DailyVeg · Operations Management</span><span>Purchase list</span></footer>
    </div>
  </div>;
}
