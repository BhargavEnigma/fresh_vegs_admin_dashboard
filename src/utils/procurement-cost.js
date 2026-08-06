export function isVendorManagedProcurement(item) {
  return Boolean(
    item?.is_vendor_managed ||
      item?.isVendorManaged ||
      item?.procurement_source === "vendor" ||
      item?.procurement_source === "mixed" ||
      Number(item?.vendor_assignment_count || item?.vendor_summary?.active_assignment_count || 0) > 0
  );
}

export function procurementDraftKey(item) {
  return [
    item?.delivery_date || "no-date",
    item?.warehouse_id || "no-warehouse",
    item?.id || item?.procurement_cost_id || item?.product_id || "no-product",
    item?.product_pack_id || "base",
  ].join(":");
}

export function procurementDisplayCosts(item) {
  const vendorManaged = isVendorManagedProcurement(item);
  return {
    vendorManaged,
    committedCostPaise: Number(
      item?.committed_cost_paise || item?.vendor_summary?.committed_cost_paise || 0
    ),
    confirmedCostPaise: Number(
      item?.confirmed_cost_paise || item?.vendor_summary?.confirmed_cost_paise || 0
    ),
    actualCostPaise: Number(
      item?.actual_vendor_cost_paise ??
        item?.vendor_summary?.actual_cost_paise ??
        item?.total_cost_paise ??
        0
    ),
  };
}

export function buildManualProcurementItems(rows, drafts) {
  return rows
    .filter((item) => !isVendorManagedProcurement(item) && drafts[item.key])
    .map((item) => ({
      product_id: item.product_id,
      product_pack_id: item.product_pack_id || null,
      product_name: item.product_name,
      pack_label: item.pack_label || null,
      ordered_quantity: Number(item.ordered_quantity || 0),
      unit_cost_paise: Number(item.unit_cost_paise || 0),
      notes: item.notes || null,
    }));
}
