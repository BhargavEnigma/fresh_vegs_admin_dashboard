import { Badge } from "../ui/badge";

export function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();
  let variant = "secondary";
  if (v === "active" || v === "true") variant = "success";
  if (v === "inactive" || v === "false") variant = "outline";
  if (v.includes("cancel") || v.includes("failed")) variant = "danger";
  if (v.includes("pending") || v.includes("locked")) variant = "warning";
  return <Badge variant={variant}>{String(value)}</Badge>;
}
