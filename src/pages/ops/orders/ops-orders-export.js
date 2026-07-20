function csvEscape(value) {
    const s = value == null ? "" : String(value);
    const needsQuotes = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
}

function money(paise) {
    return (Number(paise || 0) / 100).toFixed(2);
}

export function exportOrdersCsv({ orders, filters, filePrefix = "ops_orders" }) {
    const list = Array.isArray(orders) ? orders : [];

    const headers = [
        "daily_order_number",
        "operational_order_code",
        "order_number",
        "order_id",
        "status",
        "delivery_date",
        "warehouse",
        "customer_name",
        "customer_phone",
        "subtotal",
        "delivery_fee",
        "discount",
        "gst_amount",
        "total",
        "payment_method",
        "payment_status",
        "is_locked",
        "created_at",
    ];

    const rows = list.map((o) => [
        o.daily_order_number != null ? o.daily_order_number : "",
        o.operational_order_code || "",
        o.order_number || "",
        o.id || "",
        o.status || "",
        o.delivery_date || "",
        o.warehouse?.name || "",
        o.user?.full_name || "",
        o.user?.phone || "",
        money(o.subtotal_paise),
        money(o.delivery_fee_paise),
        money(o.discount_paise),
        money(o.gst_amount_paise),
        money(o.total_paise),
        o.payment_method || "",
        o.payment_status || "",
        o.is_locked ? "true" : "false",
        o.created_at || "",
    ]);

    const csv = [
        headers.map(csvEscape).join(","),
        ...rows.map((r) => r.map(csvEscape).join(",")),
    ].join("\n");

    const filterTagParts = [];
    if (filters?.status) filterTagParts.push(`status-${filters.status}`);
    if (filters?.delivery_date) filterTagParts.push(`date-${filters.delivery_date}`);
    const filterTag = filterTagParts.length ? `_${filterTagParts.join("_")}` : "";

    let fileName = `${filePrefix}${filterTag}_${new Date().toISOString().slice(0, 10)}.csv`;
    if (list.length === 1) {
        const singleOrder = list[0];
        const code = singleOrder.operational_order_code || singleOrder.order_number || singleOrder.id;
        if (code) {
            fileName = `order_${code}.csv`;
        }
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}
