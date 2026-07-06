export const SUPPORT_ROLES = ["support_manager", "admin"];
export const SUPPORT_MANAGER_ROLES = ["support_manager", "admin"];

export const SUPPORT_STATUSES = [
    "new",
    "open",
    "waiting_for_customer",
    "waiting_for_warehouse",
    "waiting_for_delivery",
    "waiting_for_payment_team",
    "waiting_for_admin",
    "escalated",
    "resolved",
    "closed",
    "reopened",
];

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"];
export const SUPPORT_SOURCES = ["mobile_app", "whatsapp", "phone", "email", "admin_panel", "automatic", "other"];
export const SUPPORT_TEAMS = ["support", "warehouse", "delivery", "payment", "admin", "technical"];
export const MESSAGE_CHANNELS = ["in_app", "whatsapp", "phone", "email", "admin_panel", "system"];

export const SUPPORT_CATEGORIES = [
    "account_login",
    "otp",
    "profile",
    "address",
    "serviceability",
    "product_information",
    "product_availability",
    "cart",
    "pricing_discount",
    "checkout",
    "payment_failed",
    "payment_pending",
    "payment_deducted_order_missing",
    "duplicate_payment",
    "order_status",
    "order_delay",
    "cancellation",
    "delivery_issue",
    "delivery_failed",
    "marked_delivered_not_received",
    "missing_item",
    "wrong_item",
    "damaged_item",
    "product_quality",
    "weight_quantity_issue",
    "refund",
    "refund_delayed",
    "notification",
    "app_technical_issue",
    "feedback",
    "other",
];

export const ACTION_TYPES = [
    "order_cancellation",
    "full_refund",
    "partial_refund",
    "redelivery",
    "replacement",
    "notification_resend",
    "address_correction",
    "profile_correction",
    "exceptional_status_review",
    "other",
];

export const AUTOMATED_ACTION_TYPES = ["full_refund", "notification_resend"];

export const RESOLUTION_CODES = [
    "information_provided",
    "customer_guided",
    "payment_confirmed",
    "refund_requested",
    "refund_completed",
    "cancellation_completed",
    "replacement_arranged",
    "redelivery_arranged",
    "missing_item_confirmed",
    "no_issue_found",
    "duplicate_request",
    "customer_unreachable",
    "technical_fix_applied",
    "other",
];

export const ATTACHMENT_TYPES = [
    "product_image",
    "damaged_item_image",
    "delivery_proof",
    "payment_screenshot",
    "address_screenshot",
    "document",
    "other",
];
