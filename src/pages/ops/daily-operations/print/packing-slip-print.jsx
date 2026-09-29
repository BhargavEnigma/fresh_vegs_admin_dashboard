import React from "react";
import { formatIndianDateTime } from "../../../../utils/date-formatter";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../../utils/order-identifier";
import { formatQuantity } from "../../../../lib/utils";

function deliveryLocation(order = {}) {
  const address = order.address || order.delivery_address || {};
  return {
    area: address.area || order.delivery_area || "",
    city: address.city || order.delivery_city || "",
    pincode: address.pincode || order.delivery_pincode || "",
  };
}

function addressForPrint(order = {}) {
  const address = order.address || order.delivery_address || {};
  const parts = [
    address.address_line1 || order.delivery_address_line1,
    address.address_line2 || order.delivery_address_line2,
    address.landmark || order.delivery_landmark,
    address.area || order.delivery_area,
    address.city || order.delivery_city,
    address.state || order.delivery_state,
    address.pincode || order.delivery_pincode,
  ];
  return [...new Set(parts.filter(Boolean).map((part) => String(part).trim()))].join(", ") || "Address not available";
}

function statusForPrint(orderGroup, opsOrder) {
  const status = String(orderGroup?.order?.status || opsOrder?.status || "").toLowerCase();
  if (["packed", "out_for_delivery", "delivered", "delivery_failed"].includes(status)) return "Packed";
  if (orderGroup?.issue_count > 0 || ["issue", "failed"].includes(status)) return "Exception";
  if (orderGroup?.progress_percent > 0) return "In progress";
  return "Ready to pack";
}

function batchGroupsForPrint(orderGroups, opsOrdersMap) {
  const groups = new Map();
  orderGroups.forEach((orderGroup) => {
    const order = { ...(orderGroup.order || {}), ...(opsOrdersMap.get(orderGroup.order_id) || {}) };
    const location = deliveryLocation(order);
    const title = [location.area, location.city].filter(Boolean).join(", ") || "Address review";
    const key = [location.area, location.city, location.pincode]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|") || `order-${orderGroup.order_id}`;
    if (!groups.has(key)) groups.set(key, { key, title, orders: [] });
    groups.get(key).orders.push({ orderGroup, order });
  });

  return Array.from(groups.values()).sort((left, right) => (
    left.title.localeCompare(right.title) || left.key.localeCompare(right.key)
  ));
}

function printQty(item) {
  return formatQuantity(item.packed_quantity ?? item.required_quantity ?? item.ordered_quantity ?? 0, "1");
}

export function PackingSlipPrint({ operation, orderGroup, opsOrderContext }) {
  if (!orderGroup) return null;

  const printTime = formatIndianDateTime(new Date().toISOString());
  const order = orderGroup.order || {};
  const items = orderGroup.items || [];

  const customerName = opsOrderContext?.user?.full_name || opsOrderContext?.delivery_name || "Customer";
  const customerPhone = opsOrderContext?.user?.phone || opsOrderContext?.delivery_phone || "—";
  const area = opsOrderContext?.delivery_area || opsOrderContext?.address?.area || opsOrderContext?.delivery_city || "—";
  const dailyLabel = getDailyOrderLabel(order) || getDailyOrderLabel(opsOrderContext) || "";
  const primaryLabel = getPrimaryOrderLabel(order) || getPrimaryOrderLabel(opsOrderContext) || order.id || "—";

  return (
    <div className="hidden print:block print:p-6 print:bg-white text-slate-900 font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-packing-slip, #printable-packing-slip * {
            visibility: visible;
          }
          #printable-packing-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div id="printable-packing-slip">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">DailyVeg Packing Slip</h1>
              {dailyLabel && (
                <span className="text-xl font-black px-3 py-1 bg-slate-900 text-white rounded">
                  {dailyLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Order Code: <span className="font-mono font-bold text-slate-900">{primaryLabel}</span>
              {order.order_number && (
                <span className="ml-3 text-slate-500">Ref: <span className="font-mono">{order.order_number}</span></span>
              )}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Warehouse: {operation?.warehouse_name || "—"}</p>
            <p>Delivery Date: {operation?.delivery_date || "—"}</p>
            <p>Printed: {printTime}</p>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs p-3 bg-slate-50 border border-slate-200 rounded">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Customer Information</span>
            <p className="font-semibold text-sm text-slate-900 mt-0.5">{customerName}</p>
            <p className="text-slate-700 mt-0.5">Phone: {customerPhone}</p>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Delivery Area</span>
            <p className="font-semibold text-slate-900 mt-0.5">{area}</p>
            <p className="text-slate-600 text-[11px] mt-0.5">Assigned Rider: {order.delivery_partner?.full_name || "Not assigned"}</p>
          </div>
        </div>

        {/* Packing Items Table */}
        <table className="w-full text-left border-collapse text-xs mb-6">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100">
              <th className="py-2 px-2 font-bold text-slate-800">#</th>
              <th className="py-2 px-2 font-bold text-slate-800">Product</th>
              <th className="py-2 px-2 font-bold text-slate-800">Pack Label</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-right">Qty</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-center">Status</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-center">Check Box</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} className="border-b border-slate-200">
                <td className="py-2.5 px-2 font-mono text-slate-500">{idx + 1}</td>
                <td className="py-2.5 px-2 font-semibold text-slate-900">{item.product?.name || item.product_name || "—"}</td>
                <td className="py-2.5 px-2 text-slate-700">{item.pack?.pack_label || item.pack_label || "—"}</td>
                <td className="py-2.5 px-2 text-right font-bold text-sm">{formatQuantity(item.packed_quantity ?? item.ordered_quantity, "1")}</td>
                <td className="py-2.5 px-2 text-center uppercase text-[10px] font-bold">{item.packing_status || "pending"}</td>
                <td className="py-2.5 px-2 text-center">
                  <span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-sm"></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Packed By Signature:</p>
            <div className="w-48 border-b border-slate-400 mt-6"></div>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Quality Checked By Signature:</p>
            <div className="w-48 border-b border-slate-400 mt-6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A single print-only document for the entire packing day.  It intentionally
 * uses delivery-area groups instead of reproducing the interactive UI, so the
 * sheet can be carried on the packing floor and checked off by hand.
 */
export function BatchPackingSlipsPrint({ operation, orderGroups = [], opsOrdersMap = new Map() }) {
  const printTime = formatIndianDateTime(new Date().toISOString());
  const deliveryGroups = batchGroupsForPrint(orderGroups, opsOrdersMap);
  const totalItems = orderGroups.reduce((total, group) => total + (group.items?.length || 0), 0);

  return (
    <div className="hidden print:block print:bg-white print:text-slate-900">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-batch-packing-slips, #printable-batch-packing-slips * { visibility: visible; }
          #printable-batch-packing-slips { position: absolute; left: 0; top: 0; width: 100%; }
          .packing-print-group { break-inside: avoid; page-break-inside: avoid; }
          .packing-print-order { break-inside: avoid; page-break-inside: avoid; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      <main id="printable-batch-packing-slips" className="font-sans text-slate-900">
        <header className="mb-5 border-b-4 border-emerald-700 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">DailyVeg · Operations</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Daily Packing Register</h1>
              <p className="mt-1 text-xs text-slate-600">Grouped by delivery area · use this sheet for packing and quality checks</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right text-[10px] leading-relaxed">
              <p className="font-bold text-emerald-900">{operation?.warehouse_name || "Warehouse"}</p>
              <p>Delivery date: <span className="font-semibold">{operation?.delivery_date || "—"}</span></p>
              <p>Printed: {printTime}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 text-center text-xs">
            <div className="border-r border-slate-200 py-2"><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Delivery groups</span><span className="text-base font-black">{deliveryGroups.length}</span></div>
            <div className="border-r border-slate-200 py-2"><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Orders</span><span className="text-base font-black">{orderGroups.length}</span></div>
            <div className="py-2"><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Items to check</span><span className="text-base font-black">{totalItems}</span></div>
          </div>
        </header>

        {deliveryGroups.map((deliveryGroup, groupIndex) => (
          <section key={deliveryGroup.key} className="packing-print-group mb-5 border border-slate-300">
            <div className="flex items-center justify-between bg-slate-900 px-3 py-2 text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-emerald-950">{groupIndex + 1}</span>
                <h2 className="text-xs font-black uppercase tracking-wider">{deliveryGroup.title}</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-300">{deliveryGroup.orders.length} order{deliveryGroup.orders.length === 1 ? "" : "s"}</span>
            </div>

            {deliveryGroup.orders.map(({ orderGroup, order }, orderIndex) => {
              const context = opsOrdersMap.get(orderGroup.order_id) || {};
              const customerName = context.user?.full_name || context.delivery_name || "Customer";
              const customerPhone = context.user?.phone || context.delivery_phone || "—";
              const orderCode = getPrimaryOrderLabel(orderGroup.order) || getPrimaryOrderLabel(context) || orderGroup.order_id;
              const dailyLabel = getDailyOrderLabel(orderGroup.order) || getDailyOrderLabel(context);
              const status = statusForPrint(orderGroup, context);
              return (
                <article key={orderGroup.order_id} className={`packing-print-order px-3 py-3 ${orderIndex ? "border-t border-slate-300" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-700">{String(orderIndex + 1).padStart(2, "0")}</span>
                        <strong className="font-mono text-sm">{orderCode}</strong>
                        {dailyLabel && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">{dailyLabel}</span>}
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${status === "Packed" ? "bg-emerald-100 text-emerald-800" : status === "Exception" ? "bg-rose-100 text-rose-800" : status === "In progress" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>{status}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold">{customerName} <span className="font-normal text-slate-500">· {customerPhone}</span></p>
                      <p className="mt-0.5 max-w-[470px] text-[10px] leading-snug text-slate-600">{addressForPrint(order)}</p>
                    </div>
                    <div className="shrink-0 text-right text-[10px] text-slate-500">
                      <p>{orderGroup.packed_count}/{orderGroup.total_items} items packed</p>
                      <p className="mt-1 font-bold text-slate-700">Pack initials: __________</p>
                    </div>
                  </div>

                  <table className="mt-2 w-full border-collapse text-left text-[10px]">
                    <thead><tr className="border-y border-slate-300 bg-slate-100 text-[9px] uppercase tracking-wide text-slate-600"><th className="w-7 px-2 py-1.5">#</th><th className="px-2 py-1.5">Product / pack</th><th className="w-20 px-2 py-1.5 text-right">Required</th><th className="w-20 px-2 py-1.5 text-center">Current</th><th className="w-10 px-2 py-1.5 text-center">✓</th></tr></thead>
                    <tbody>{orderGroup.items.map((item, itemIndex) => <tr key={item.id || itemIndex} className="border-b border-slate-200"><td className="px-2 py-1.5 text-slate-500">{itemIndex + 1}</td><td className="px-2 py-1.5 font-semibold">{item.product?.name || item.product_name || "—"}<span className="ml-1 font-normal text-slate-500">· {item.pack?.pack_label || item.pack_label || "Base"}</span></td><td className="px-2 py-1.5 text-right font-bold">{formatQuantity(item.required_quantity ?? item.ordered_quantity ?? 0, "1")}</td><td className="px-2 py-1.5 text-center">{printQty(item)}</td><td className="px-2 py-1.5 text-center"><span className="inline-block h-3.5 w-3.5 border border-slate-500" /></td></tr>)}</tbody>
                  </table>
                </article>
              );
            })}
          </section>
        ))}
        <footer className="mt-6 flex justify-between border-t border-slate-400 pt-3 text-[10px] text-slate-600"><span>Prepared by: ____________________</span><span>Quality check: ____________________</span><span>Page __ of __</span></footer>
      </main>
    </div>
  );
}
