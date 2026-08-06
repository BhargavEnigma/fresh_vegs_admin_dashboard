export function buildCostProcurementFilters({
    deliveryDate,
    fromDate,
    toDate,
    procurementWarehouseId,
    warehouseId,
} = {}) {
    const params = {
        warehouse_id: procurementWarehouseId || warehouseId || undefined,
    };

    if (deliveryDate) {
        params.delivery_date = deliveryDate;
        return params;
    }

    params.from_date = fromDate || undefined;
    params.to_date = toDate || undefined;
    return params;
}

export function procurementItemsFromResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}
