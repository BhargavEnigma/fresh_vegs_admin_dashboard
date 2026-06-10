import { Badge } from "../ui/badge";

export function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();

  // console.log("V : ", v);
  
  let variant = "secondary";
  if (v === "active" || v === "true" || v === 'in_stock') variant = "secondary";
  if (v === "inactive" || v === "false" || v === 'out_of_stock') variant = "warning";
  if (v.includes("cancel") || v.includes("failed")) variant = "danger";
  if (v.includes("pending") || v.includes("locked")) variant = "warning";
  return <Badge variant={variant}>{String(value)}</Badge>;
}
