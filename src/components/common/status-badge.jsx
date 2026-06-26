import { Badge } from "../ui/badge";

export function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();

  let variant = "secondary";
  if (v === "active" || v === "true" || v === "in_stock") variant = "secondary";
  if (v === "inactive" || v === "false" || v === "out_of_stock") variant = "warning";
  if (v === "cancelled" || v === "delivery_failed" || v === "refund_failed" || v === "failed") variant = "danger";
  if (v === "refunded" || v === "success" || v === "succeeded") variant = "success";
  if (v.includes("pending") || v === "refund_pending" || v === "locked") variant = "warning";
  return <Badge variant={variant}>{String(value)}</Badge>;
}
