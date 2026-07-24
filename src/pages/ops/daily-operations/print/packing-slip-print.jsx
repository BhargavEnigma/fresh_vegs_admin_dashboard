import React from "react";
import { formatIndianDateTime } from "../../../../utils/date-formatter";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../../utils/order-identifier";
import { formatQuantity } from "../../../../lib/utils";

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
