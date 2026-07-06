import { Badge } from "../../components/ui/badge";

export function labelize(value) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value)
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
}

export function money(paise) {
    const value = Number(paise || 0) / 100;
    return value.toLocaleString(undefined, { style: "currency", currency: "INR" });
}

export function apiError(error, fallback = "Something went wrong") {
    return error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback;
}

export function apiErrorCode(error) {
    return error?.response?.data?.error?.code || error?.response?.data?.code || "";
}

export function isManagerRole(roles = []) {
    return roles.some((role) => role === "admin" || role === "support_manager");
}

export function isMasked(value) {
    return !value || String(value).includes("*");
}

export function optionList(values) {
    return values.map((value) => ({ value, label: labelize(value) }));
}

export function TicketStatusBadge({ value }) {
    const v = String(value || "");
    let variant = "outline";
    if (["open", "new", "reopened"].includes(v)) variant = "secondary";
    if (v.startsWith("waiting_") || v === "escalated") variant = "warning";
    if (v === "resolved") variant = "success";
    if (v === "closed") variant = "outline";
    return <Badge variant={variant}>{labelize(value)}</Badge>;
}

export function TicketPriorityBadge({ value }) {
    const v = String(value || "");
    let variant = "outline";
    if (v === "normal") variant = "secondary";
    if (v === "high") variant = "warning";
    if (v === "urgent") variant = "danger";
    return <Badge variant={variant}>{labelize(value)}</Badge>;
}

export function ActionTypeBadge({ value }) {
    const automated = value === "full_refund" || value === "notification_resend";
    return <Badge variant={automated ? "secondary" : "warning"}>{labelize(value)}</Badge>;
}

export function ReviewStatusBadge({ value }) {
    const v = String(value || "");
    let variant = "outline";
    if (v === "pending") variant = "warning";
    if (v === "approved") variant = "success";
    if (v === "rejected" || v === "cancelled") variant = "danger";
    return <Badge variant={variant}>{labelize(value)}</Badge>;
}

export function ExecutionStatusBadge({ value }) {
    const v = String(value || "");
    let variant = "outline";
    if (v === "processing") variant = "warning";
    if (v === "succeeded") variant = "success";
    if (v === "failed") variant = "danger";
    return <Badge variant={variant}>{labelize(value)}</Badge>;
}

export function SupportNotice({ children, tone = "info" }) {
    const cls = tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-dailyveg-200 bg-dailyveg-50 text-dailyveg-900 dark:border-dailyveg-900/60 dark:bg-dailyveg-950/40 dark:text-dailyveg-200";
    return <div className={`rounded-xl border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}
