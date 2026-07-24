import React from "react";
import { formatIndianDateTime } from "../../../../utils/date-formatter";
import { formatPaiseToRupees } from "../../../../utils/daily-operations-helpers";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../../utils/order-identifier";

export function RunManifestPrint({ runDetail }) {
  if (!runDetail) return null;

  const printTime = formatIndianDateTime(new Date().toISOString());
  const partnerName = runDetail.delivery_partner?.full_name || runDetail.delivery_partner?.phone || "Rider Unassigned";
  const partnerPhone = runDetail.delivery_partner?.phone || "—";
  const orders = runDetail.orders || runDetail.run_orders || [];

  return (
    <div className="hidden print:block print:p-6 print:bg-white text-slate-900 font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-run-manifest, #printable-run-manifest * {
            visibility: visible;
          }
          #printable-run-manifest {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <div id="printable-run-manifest">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">DailyVeg Delivery Run Manifest</h1>
              <span className="text-lg font-mono font-bold px-2.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-900 rounded">
                {runDetail.run_code || `RUN #${runDetail.id?.slice(0, 8)}`}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Rider: <span className="font-semibold text-slate-900">{partnerName}</span> ({partnerPhone}) | Warehouse:{" "}
              <span className="font-semibold text-slate-900">{runDetail.warehouse_name || runDetail.warehouse?.name || "—"}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Delivery Date: <span className="font-semibold text-slate-900">{runDetail.delivery_date || "—"}</span></p>
            <p>Status: <span className="uppercase font-bold text-slate-900">{runDetail.status}</span></p>
            <p className="mt-0.5">Generated IST: {printTime}</p>
          </div>
        </div>

        {/* Orders Table */}
        <table className="w-full text-left border-collapse text-xs mb-6">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100">
              <th className="py-2 px-2 font-bold text-slate-800 text-center w-10">Seq</th>
              <th className="py-2 px-2 font-bold text-slate-800">Daily No. / Code</th>
              <th className="py-2 px-2 font-bold text-slate-800">Customer</th>
              <th className="py-2 px-2 font-bold text-slate-800">Phone</th>
              <th className="py-2 px-2 font-bold text-slate-800">Area & Address</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-center">Payment</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-right">COD Due</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-center w-24">Customer Signature</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((item, idx) => {
              const order = item.order || item;
              const seq = item.sequence_number ?? idx + 1;
              const dailyNo = getDailyOrderLabel(order);
              const code = getPrimaryOrderLabel(order);
              const isCod = String(order.payment_method || "").toLowerCase() === "cod";
              const codAmount = isCod ? formatPaiseToRupees(order.grand_total_paise || order.total_paise || 0) : "₹0.00";

              return (
                <tr key={order.id || idx} className="border-b border-slate-200">
                  <td className="py-2.5 px-2 text-center font-bold text-slate-900 text-sm">{seq}</td>
                  <td className="py-2.5 px-2">
                    {dailyNo && <span className="font-extrabold text-sm block">{dailyNo}</span>}
                    <span className="font-mono text-[11px] text-slate-600">{code}</span>
                  </td>
                  <td className="py-2.5 px-2 font-semibold text-slate-900">
                    {order.user?.full_name || order.delivery_name || "—"}
                  </td>
                  <td className="py-2.5 px-2 text-slate-700 font-mono">
                    {order.user?.phone || order.delivery_phone || "—"}
                  </td>
                  <td className="py-2.5 px-2 text-slate-700 max-w-xs">
                    <span className="font-semibold text-slate-900 block">
                      {order.delivery_area || order.address?.area || order.delivery_city || "—"}
                    </span>
                    <span className="text-[11px] text-slate-500 line-clamp-2">
                      {order.delivery_address_line1 || order.address?.address_line1 || "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isCod ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                      {isCod ? "COD" : "Prepaid"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-sm text-slate-900">
                    {isCod ? codAmount : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="inline-block w-full h-8 border border-slate-300 rounded"></span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Handover & Cash Reconciliation Summary */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 text-xs text-slate-700">
          <div className="p-3 border border-slate-200 rounded">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2">Manifest Summary</h4>
            <p>Total Orders assigned: <span className="font-bold">{orders.length}</span></p>
            <p>Expected COD Cash Collection: <span className="font-bold text-slate-900">{formatPaiseToRupees(runDetail.expected_cod_paise || 0)}</span></p>
          </div>
          <div className="p-3 border border-slate-200 rounded flex justify-between items-end">
            <div>
              <p className="font-bold text-slate-900">Rider Signature:</p>
              <div className="w-40 border-b border-slate-400 mt-6"></div>
            </div>
            <div>
              <p className="font-bold text-slate-900">Dispatcher Signature:</p>
              <div className="w-40 border-b border-slate-400 mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
