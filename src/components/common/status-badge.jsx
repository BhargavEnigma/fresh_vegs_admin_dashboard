import { Badge } from "../ui/badge";

export function StatusBadge({ value, label, className }) {
  const v = String(value || "").toLowerCase();

  let variant = "secondary";
  if (v === "payment_pending") {
    variant = "warning";
  } else if (v === "placed") {
    variant = "secondary";
  } else if (v === "confirmed") {
    variant = "secondary";
  } else if (v === "locked") {
    variant = "warning";
  } else if (v === "accepted") {
    variant = "secondary";
  } else if (v === "packed") {
    variant = "secondary";
  } else if (v === "out_for_delivery") {
    variant = "default";
  } else if (v === "delivered") {
    variant = "success";
  } else if (v === "delivery_failed") {
    variant = "danger";
  } else if (v === "cancelled") {
    variant = "danger";
  } else if (v === "refunded") {
    variant = "success";
  } else if (v === "active" || v === "true" || v === "in_stock") {
    variant = "secondary";
  } else if (v === "inactive" || v === "false" || v === "out_of_stock") {
    variant = "warning";
  } else if (v === "refund_failed" || v === "failed") {
    variant = "danger";
  } else if (v === "success" || v === "succeeded") {
    variant = "success";
  } else if (v.includes("pending") || v === "refund_pending") {
    variant = "warning";
  }

  return <Badge variant={variant} className={className}>{label || String(value || "")}</Badge>;
}

