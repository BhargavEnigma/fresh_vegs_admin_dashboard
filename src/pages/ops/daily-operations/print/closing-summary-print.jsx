import React from "react";
import { formatIndianDateTime } from "../../../../utils/date-formatter";
import { formatPaiseToRupees } from "../../../../utils/daily-operations-helpers";
import { formatQuantity } from "../../../../lib/utils";

export function ClosingSummaryPrint({ operation, overview, reconciliation }) {
  if (!operation) return null;

  const printTime = formatIndianDateTime(new Date().toISOString());
  const orderMetrics = overview?.order_metrics || reconciliation?.order_metrics || {};
  const recMetrics = overview?.reconciliation_metrics || reconciliation?.reconciliation_metrics || {};
  const finSummary = overview?.financial_summary || reconciliation?.financial_summary || null;
  const procMetrics = overview?.procurement_metrics || {};

  return (
    <div className="hidden print:block print:p-6 print:bg-white text-slate-900 font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-closing-summary, #printable-closing-summary * {
            visibility: visible;
          }
          #printable-closing-summary {
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

      <div id="printable-closing-summary">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">DailyVeg Daily Operations Closing Report</h1>
            <p className="text-sm text-slate-600 mt-1">
              Warehouse: <span className="font-semibold text-slate-900">{operation?.warehouse_name || "Warehouse"}</span> | Date:{" "}
              <span className="font-semibold text-slate-900">{operation?.delivery_date || "—"}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Operation Status: <span className="font-bold uppercase text-slate-900">{operation?.status}</span></p>
            <p>Printed IST: {printTime}</p>
          </div>
        </div>

        {/* Overview Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div className="p-3 border border-slate-200 rounded bg-slate-50">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 border-b border-slate-200 pb-1">Order Fulfillment Metrics</h3>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <p>Total Orders: <span className="font-bold text-slate-900">{orderMetrics.total_orders ?? 0}</span></p>
              <p>Delivered: <span className="font-bold text-emerald-800">{orderMetrics.status_counts?.delivered ?? 0}</span></p>
              <p>Delivery Failed: <span className="font-bold text-rose-800">{orderMetrics.status_counts?.delivery_failed ?? 0}</span></p>
              <p>Cancelled: <span className="font-bold text-slate-800">{orderMetrics.status_counts?.cancelled ?? 0}</span></p>
            </div>
          </div>

          <div className="p-3 border border-slate-200 rounded bg-slate-50">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 border-b border-slate-200 pb-1">Procurement Metrics</h3>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <p>Total Items: <span className="font-bold text-slate-900">{procMetrics.total_items ?? 0}</span></p>
              <p>Completed Items: <span className="font-bold text-emerald-800">{procMetrics.completed_items ?? 0}</span></p>
              <p>Shortage Qty: <span className="font-bold text-rose-800">{formatQuantity(procMetrics.total_shortage_qty, "0")}</span></p>
              <p>Excess Qty: <span className="font-bold text-emerald-800">{formatQuantity(procMetrics.total_excess_qty, "0")}</span></p>
            </div>
          </div>
        </div>

        {/* COD Reconciliation Summary */}
        <div className="mb-6 p-4 border border-slate-200 rounded text-xs bg-slate-50">
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-3 border-b border-slate-200 pb-1">COD & Cash Reconciliation</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Expected COD</span>
              <p className="font-bold text-sm text-slate-900 mt-1">{formatPaiseToRupees(recMetrics.cod_expected_paise)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Reported COD</span>
              <p className="font-bold text-sm text-slate-900 mt-1">{formatPaiseToRupees(recMetrics.cod_reported_paise)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Handed-Over Cash</span>
              <p className="font-bold text-sm text-slate-900 mt-1">{formatPaiseToRupees(recMetrics.cod_handed_over_paise)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Variance</span>
              <p className={`font-bold text-sm mt-1 ${(recMetrics.cod_variance_paise || 0) !== 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {formatPaiseToRupees(recMetrics.cod_variance_paise)}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary if Available (Admin Only) */}
        {finSummary && (
          <div className="mb-6 p-4 border border-slate-200 rounded text-xs bg-slate-50">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-3 border-b border-slate-200 pb-1">Financial Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-slate-700">
              <p>Total Sales: <span className="font-bold text-slate-900 block">{formatPaiseToRupees(finSummary.total_sales_paise)}</span></p>
              <p>Online Paid: <span className="font-bold text-slate-900 block">{formatPaiseToRupees(finSummary.online_paid_paise)}</span></p>
              <p>Procurement Cost: <span className="font-bold text-slate-900 block">{formatPaiseToRupees(finSummary.procurement_cost_paise)}</span></p>
              <p>Estimated Margin: <span className="font-bold text-emerald-800 block">{formatPaiseToRupees(finSummary.estimated_margin_paise)}</span></p>
            </div>
          </div>
        )}

        {/* Handover & Close Notes */}
        {operation?.handover_note && (
          <div className="mb-4 text-xs">
            <span className="font-bold text-slate-700">Handover Note:</span>
            <p className="p-2 border border-slate-200 rounded bg-slate-50 text-slate-800 mt-1">{operation.handover_note}</p>
          </div>
        )}
        {operation?.close_note && (
          <div className="mb-4 text-xs">
            <span className="font-bold text-slate-700">Close Note:</span>
            <p className="p-2 border border-slate-200 rounded bg-slate-50 text-slate-800 mt-1">{operation.close_note}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-700">
          <div>
            <p className="font-semibold text-slate-800">Closed By User:</p>
            <p className="text-slate-600 mt-1">{operation?.closed_by?.full_name || "—"}</p>
            <div className="w-48 border-b border-slate-400 mt-6"></div>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Manager Sign-Off:</p>
            <div className="w-48 border-b border-slate-400 mt-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
