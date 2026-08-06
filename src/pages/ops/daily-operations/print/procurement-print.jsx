import React from "react";
import { formatIndianDateTime } from "../../../../utils/date-formatter";
import { formatPaiseToRupees } from "../../../../utils/daily-operations-helpers";
import { formatQuantity } from "../../../../lib/utils";

export function calculateTotalWeight(qty, packLabel, packObj, procurementUnit) {
  if (!qty || qty <= 0) return "—";
  
  let baseQty = packObj?.base_quantity;
  let baseUnit = packObj?.base_unit;

  if (!baseQty || !baseUnit) {
    const label = packLabel || "";
    const match = label.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    if (match) {
      baseQty = parseFloat(match[1]);
      baseUnit = match[2].toLowerCase();
    } else {
      const u = String(procurementUnit || "pc").toLowerCase().trim();
      if (u === "kg") {
        if (qty < 1) {
          return `${Math.round(qty * 1000)}g`;
        }
        return `${parseFloat(Number(qty).toFixed(3))}kg`;
      }
      if (u === "l") {
        if (qty < 1) {
          return `${Math.round(qty * 1000)}ml`;
        }
        return `${parseFloat(Number(qty).toFixed(3))}l`;
      }
      if (u === "g" || u === "gm") {
        const total = qty;
        if (total >= 1000) {
          return `${parseFloat((total / 1000).toFixed(3))}kg`;
        }
        return `${parseFloat(total.toFixed(3))}g`;
      }
      return `${qty}${u}`;
    }
  }

  const total = qty * baseQty;
  
  if (baseUnit === "kg") {
    if (total < 1) {
      return `${Math.round(total * 1000)}g`;
    }
    return `${parseFloat(total.toFixed(3))}kg`;
  } else if (baseUnit === "g" || baseUnit === "gm") {
    if (total >= 1000) {
      return `${parseFloat((total / 1000).toFixed(3))}kg`;
    } else {
      return `${parseFloat(total.toFixed(3))}g`;
    }
  } else if (baseUnit === "l") {
    if (total < 1) {
      return `${Math.round(total * 1000)}ml`;
    }
    return `${parseFloat(total.toFixed(3))}l`;
  } else if (baseUnit === "ml") {
    if (total >= 1000) {
      return `${parseFloat((total / 1000).toFixed(3))}l`;
    } else {
      return `${parseFloat(total.toFixed(3))}ml`;
    }
  } else if (baseUnit === "pc" || baseUnit === "pcs") {
    return `${total}pc`;
  } else {
    return `${total}${baseUnit}`;
  }
}

export function ProcurementPrintSheet({ operation, items = [] }) {
  const printTime = formatIndianDateTime(new Date().toISOString());

  return (
    <div className="hidden print:block print:p-6 print:text-black print:bg-white text-slate-900 font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-procurement-sheet, #printable-procurement-sheet * {
            visibility: visible;
          }
          #printable-procurement-sheet {
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

      <div id="printable-procurement-sheet">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">DailyVeg Procurement Sheet</h1>
            <p className="text-sm text-slate-600 mt-1">
              Warehouse: <span className="font-semibold text-slate-900">{operation?.warehouse_name || "Warehouse"}</span> | Date:{" "}
              <span className="font-semibold text-slate-900">{operation?.delivery_date || "—"}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Generated IST: {printTime}</p>
            <p className="font-mono mt-0.5">Op ID: {operation?.id || "—"}</p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100">
              <th className="py-2 px-2 font-bold text-slate-800">#</th>
              <th className="py-2 px-2 font-bold text-slate-800">Product Name</th>
              <th className="py-2 px-2 font-bold text-slate-800">Pack</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-right">Total Weight</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-right">Bought</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-right">Received</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-right">Missing</th>
              <th className="py-2 px-2 font-bold text-slate-800 text-right">Extra</th>
              <th className="py-2 px-2 font-bold text-slate-800">Vendor / Bill</th>
              <th className="py-2 px-2 font-bold text-slate-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} className="border-b border-slate-200">
                <td className="py-2 px-2 font-mono text-slate-500">{idx + 1}</td>
                <td className="py-2 px-2 font-semibold text-slate-900">{item.product_name || item.product?.name || "—"}</td>
                <td className="py-2 px-2 text-slate-700">{item.ordered_packs || item.pack_label || item.pack?.pack_label || "—"}</td>
                <td className="py-2 px-2 text-right font-medium">
                  {calculateTotalWeight(item.required_quantity, item.pack_label || item.pack?.pack_label, item.pack, item.procurement_unit)}
                </td>
                <td className="py-2 px-2 text-right font-medium">{formatQuantity(item.purchased_quantity, "0")}</td>
                <td className="py-2 px-2 text-right font-medium">{formatQuantity(item.received_quantity, "0")}</td>
                <td className="py-2 px-2 text-right text-rose-700 font-semibold">{Number(item.shortage_quantity) > 0 ? formatQuantity(item.shortage_quantity) : "—"}</td>
                <td className="py-2 px-2 text-right text-emerald-700 font-semibold">{Number(item.excess_quantity) > 0 ? formatQuantity(item.excess_quantity) : "—"}</td>
                <td className="py-2 px-2 text-slate-700">
                  {item.vendor_name || "—"}{item.bill_reference ? ` (${item.bill_reference})` : ""}
                </td>
                <td className="py-2 px-2 uppercase text-[10px] font-bold tracking-wider">{item.procurement_status || "pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500">
          <p>Total Items: {items.length}</p>
          <p>DailyVeg Operations Management System</p>
        </div>
      </div>
    </div>
  );
}

export function MandiBuyerPrintSheet({ operation, items = [] }) {
  const printTime = formatIndianDateTime(new Date().toISOString());

  return (
    <div className="hidden print:block print:p-6 print:text-black print:bg-white text-slate-900 font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-mandi-buyer-sheet, #printable-mandi-buyer-sheet * {
            visibility: visible;
          }
          #printable-mandi-buyer-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div id="printable-mandi-buyer-sheet">
        {/* Header */}
        <div className="border-b-4 border-slate-900 pb-3 mb-5 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">ખરીદી પત્રક / Mandi Purchase Sheet</h1>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              તારીખ (Date): <span className="font-bold text-slate-950 text-sm mr-4">{operation?.delivery_date || "—"}</span> 
              ડેપો (Warehouse): <span className="font-bold text-slate-950 text-sm">{operation?.warehouse_name || "Nikol"}</span>
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-500 font-medium">
            <p>Generated: {printTime}</p>
          </div>
        </div>

        {/* Mandi Buyer Guide Warning */}
        <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-[11px] mb-5 leading-relaxed font-semibold">
          <span className="font-bold text-slate-950">ખરીદનાર માટે સૂચના (Instructions for Buyer):</span>
          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-800">
            <li>આ લિસ્ટમાં દર્શાવેલ <strong>"બાકી ખરીદી (Remaining)"</strong> નો જથ્થો ખાસ પૂરો કરવાનો રહેશે.</li>
            <li>શાકભાજી ખરીદ્યા પછી જમણી બાજુના ખાલી ખાનામાં <strong>ખરેખર ખરીદેલું વજન/કિંમત</strong> બોલપેનથી લખી લેવું.</li>
          </ul>
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b-3 border-slate-800 bg-slate-100/80">
              <th className="py-2.5 px-2 font-black text-slate-950 border border-slate-300">#</th>
              <th className="py-2.5 px-3 font-black text-slate-950 border border-slate-300 text-sm">શાકભાજી નું નામ<br/><span className="text-[10px] text-slate-500 font-bold uppercase">Item Name</span></th>
              <th className="py-2.5 px-2 font-black text-slate-950 border border-slate-300">પેકિંગ<br/><span className="text-[10px] text-slate-500 font-bold uppercase">Pack</span></th>
              <th className="py-2.5 px-2 font-black text-slate-950 border border-slate-300 text-right">કુલ વજન<br/><span className="text-[10px] text-slate-500 font-bold uppercase">Total Weight</span></th>
              <th className="py-2.5 px-2 font-black text-slate-950 border border-slate-300 text-right">ખરીદેલું<br/><span className="text-[10px] text-slate-500 font-bold uppercase">Bought</span></th>
              <th className="py-2.5 px-3 font-black text-slate-950 border border-slate-300 text-right bg-amber-50/50">બાકી ખરીદી<br/><span className="text-[10px] text-amber-700 font-bold uppercase">To Buy</span></th>
              <th className="py-2.5 px-3 font-black text-slate-950 border border-slate-300 w-[150px] text-center">લખવા માટે<br/><span className="text-[10px] text-slate-500 font-bold uppercase">Actual / Price</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const reqQty = Number(item.required_quantity || 0);
              const boughtQty = Number(item.purchased_quantity || 0);
              const remainingQty = Math.max(0, reqQty - boughtQty);
              const isCompleted = remainingQty === 0;

              return (
                <tr key={item.id || idx} className="border-b border-slate-300 last:border-b-2 last:border-slate-800 hover:bg-slate-50">
                  <td className="py-2.5 px-2 font-mono text-slate-500 border border-slate-200 text-center font-bold">{idx + 1}</td>
                  
                  <td className="py-2.5 px-3 font-black text-slate-950 border border-slate-200 text-sm">
                    {item.product_name || item.product?.name || "—"}
                  </td>
                  
                  <td className="py-2.5 px-2 text-slate-800 border border-slate-200 font-bold text-center text-[10px]">
                    {item.ordered_packs || item.pack_label || item.pack?.pack_label || "—"}
                  </td>
                  
                  <td className="py-2.5 px-2 text-right border border-slate-200 text-slate-900 font-bold">
                    {calculateTotalWeight(reqQty, item.pack_label || item.pack?.pack_label, item.pack, item.procurement_unit)}
                  </td>
                  
                  <td className="py-2.5 px-2 text-right border border-slate-200 text-emerald-800 font-bold">
                    {formatQuantity(boughtQty, "0")}
                  </td>
                  
                  <td className={`py-2.5 px-3 text-right border border-slate-300 font-black text-sm bg-amber-50/30`}>
                    {isCompleted ? (
                      <span className="text-emerald-700 text-xs font-black">ખરીદાઈ ગયું ✓</span>
                    ) : (
                      <span className="text-rose-600 font-black text-sm">
                        {calculateTotalWeight(remainingQty, item.pack_label || item.pack?.pack_label, item.pack, item.procurement_unit)}
                      </span>
                    )}
                  </td>
                  
                  <td className="py-2.5 px-3 border border-slate-200 text-center relative">
                    <div className="h-6 w-full border-b border-dashed border-slate-400"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-slate-900 flex justify-between text-xs text-slate-500 font-semibold">
          <p>કુલ આઈટમ (Total Items): {items.length}</p>
          <p>DailyVeg Operations Management System</p>
        </div>
      </div>
    </div>
  );
}
