export const NOTIFICATION_TYPES = [
    { value: "product_offer", label: "Product Offer" },
    { value: "banner", label: "Banner" },
    { value: "general_announcement", label: "General Announcement" },
    { value: "new_arrival", label: "New Arrival" },
    { value: "stock_back", label: "Back in Stock" },
    { value: "festival_offer", label: "Festival Offer" },
    { value: "service_update", label: "Service Update" },
    { value: "re_engagement", label: "Re-engagement" },
];

export const AUDIENCE_TYPES = [
    { value: "all_customers", label: "All Customers" },
    { value: "selected_customers", label: "Selected Customers" },
    { value: "active_customers", label: "Active Customers" },
    { value: "customers_with_orders", label: "Customers With Orders" },
    { value: "customers_without_orders", label: "Customers Without Orders" },
];

export const DEEP_LINK_TYPES = [
    { value: "none", label: "None" },
    { value: "home", label: "Home" },
    { value: "product_detail", label: "Product Detail" },
    { value: "category_detail", label: "Category Detail" },
    { value: "cart", label: "Cart" },
    { value: "orders", label: "Orders" },
    { value: "order_detail", label: "Order Detail" },
    { value: "offer_detail", label: "Offer Detail" },
];

export const CAMPAIGN_STATUSES = [
    { value: "", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "scheduled", label: "Scheduled" },
    { value: "sending", label: "Sending" },
    { value: "sent", label: "Sent" },
    { value: "partially_failed", label: "Partially Failed" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
];

export const EDITABLE_STATUSES = new Set(["draft", "scheduled"]);
export const DEEP_LINK_VALUE_REQUIRED = new Set(["product_detail", "category_detail", "order_detail", "offer_detail"]);

export function labelFor(options, value) {
    return options.find((option) => option.value === value)?.label || value || "—";
}

function parseLocalDateTime(value) {
    if (!value) return null;
    const normalized = String(value).trim().replace(/([+-]\d{2}:\d{2}|Z)$/, "");
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})[T ]([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:\.[0-9]+)?)?$/.exec(normalized);
    if (!match) return null;

    const [, year, month, day, hour, minute, second] = match;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second || "0")
    );
}

function formatLocalDateTimeInput(value) {
    const date = parseLocalDateTime(value);
    if (!date || Number.isNaN(date.getTime())) return "";
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTime(value) {
    if (!value) return "—";
    const date = parseLocalDateTime(value);
    if (!date || Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatStatus(value) {
    return String(value || "draft").replaceAll("_", " ");
}

export function campaignListFromResponse(data) {
    const payload = data?.data;
    if (Array.isArray(payload)) return payload;
    return payload?.campaigns || payload?.items || payload?.rows || payload?.data || [];
}

export function campaignFromResponse(data) {
    const payload = data?.data;
    return payload?.campaign || payload || null;
}

export function validateCampaignForm(form, mode = "draft") {
    const errors = {};
    const title = form.title?.trim();
    const body = form.body?.trim();
    const imageUrl = form.image_url?.trim();

    if (!title) errors.title = "Title is required.";
    if (title && title.length > 80) errors.title = "Title must be 80 characters or less.";
    if (!body) errors.body = "Body is required.";
    if (body && body.length > 240) errors.body = "Body must be 240 characters or less.";
    if (!form.type) errors.type = "Type is required.";
    if (!form.audience_type) errors.audience_type = "Audience is required.";
    if (imageUrl) {
        try {
            new URL(imageUrl);
        } catch {
            errors.image_url = "Image URL must be valid.";
        }
    }
    if (DEEP_LINK_VALUE_REQUIRED.has(form.deep_link_type) && !form.deep_link_value?.trim()) {
        errors.deep_link_value = "Deep link value is required for this destination.";
    }
    if (form.audience_type === "selected_customers" && !form.selected_user_ids?.trim()) {
        errors.selected_user_ids = "Add at least one customer/user ID.";
    }
    if (mode === "schedule" && !form.scheduled_at) {
        errors.scheduled_at = "Schedule date/time is required.";
    }

    return errors;
}

export function buildCampaignPayload(form, mode = "draft") {
    const userIds = String(form.selected_user_ids || "")
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean);

    return {
        title: form.title.trim(),
        body: form.body.trim(),
        image_url: form.image_url?.trim() || null,
        type: form.type,
        audience_type: form.audience_type,
        audience_filters: form.audience_type === "selected_customers" ? { user_ids: userIds } : {},
        deep_link_type: form.deep_link_type || "none",
        deep_link_value: form.deep_link_value?.trim() || null,
        payload: {
            source: "admin_panel",
        },
        scheduled_at: mode === "schedule" ? form.scheduled_at : null,
    };
}

export function formFromCampaign(campaign) {
    const filters = campaign?.audience_filters || {};
    return {
        title: campaign?.title || "",
        body: campaign?.body || "",
        image_url: campaign?.image_url || "",
        type: campaign?.type || "general_announcement",
        audience_type: campaign?.audience_type || "all_customers",
        selected_user_ids: Array.isArray(filters.user_ids) ? filters.user_ids.join("\n") : "",
        deep_link_type: campaign?.deep_link_type || "none",
        deep_link_value: campaign?.deep_link_value || "",
        scheduled_at: formatLocalDateTimeInput(campaign?.scheduled_at),
    };
}
