import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Building2,
    Calendar,
    Shield,
    Lock,
    Unlock,
    RefreshCw,
    X,
    CheckCircle2,
    XCircle,
    UserRound,
} from "lucide-react";

import { AdminUsersService } from "../../../api/services/admin-users.service";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useAuth } from "../../../auth/auth-context";

const ROLE_LABELS = {
    admin: "Admin",
    warehouse_manager: "Warehouse Manager",
    vendor: "Vendor",
    delivery_partner: "Delivery Partner",
    customer: "Customer",
    support_manager: "Support Manager",
};

function getInitials(name) {
    const parts = String(name || "User").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

export function ViewUserDialog({ user, open, onOpenChange, warehouses = [] }) {
    const { roles: loggedInUserRoles } = useAuth();
    const isAdmin = loggedInUserRoles.includes("admin");

    const detailQuery = useQuery({
        queryKey: ["adminUsers", "detail", user?.id],
        queryFn: () => AdminUsersService.getById(user.id),
        enabled: open && Boolean(user?.id),
    });

    const detail = detailQuery.data?.user || detailQuery.data || user;

    const assignedWarehouses = React.useMemo(() => {
        if (!detail?.warehouse_ids || !warehouses) return [];
        return warehouses.filter((w) => detail.warehouse_ids.includes(w.id));
    }, [detail?.warehouse_ids, warehouses]);

    const isCustomer = (detail?.roles || []).includes("customer");
    const isWarehouseRole = (detail?.roles || []).some((role) =>
        ["warehouse_manager", "delivery_partner", "vendor"].includes(role)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto thin-scrollbar">
                <DialogHeader className="relative pr-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dailyveg-200/80 bg-gradient-to-br from-dailyveg-100 to-dailyveg-50 text-xl font-bold text-dailyveg-800 shadow-sm dark:border-dailyveg-800/70 dark:from-dailyveg-900 dark:to-dailyveg-950 dark:text-dailyveg-200">
                            {getInitials(detail?.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white truncate">
                                {detail?.full_name || "Unnamed User"}
                            </DialogTitle>
                            <DialogDescription className="mt-1 flex flex-wrap gap-1.5 items-center">
                                {(detail?.roles || []).map((role) => (
                                    <Badge key={role} variant="secondary" className="px-2.5 py-0.5 border-dailyveg-200 bg-dailyveg-50/50 text-dailyveg-700 dark:border-dailyveg-800 dark:bg-dailyveg-950/70 dark:text-dailyveg-300">
                                        {ROLE_LABELS[role] || role.replaceAll("_", " ")}
                                    </Badge>
                                ))}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {detailQuery.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <RefreshCw className="h-6 w-6 animate-spin text-dailyveg-500 mb-2" />
                        <span>Loading user profile…</span>
                    </div>
                ) : detailQuery.isError ? (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        Failed to load detailed profile. Some information might be missing.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Section: General Info */}
                        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-2">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">User ID</span>
                                <p className="font-mono text-xs mt-1 text-slate-800 dark:text-slate-200 break-all select-all">{detail?.id}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Status</span>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${detail?.status === "active" ? "border-dailyveg-200 bg-dailyveg-50 text-dailyveg-700 dark:border-dailyveg-800 dark:bg-dailyveg-950/70 dark:text-dailyveg-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${detail?.status === "active" ? "bg-dailyveg-500" : "bg-red-500"}`} />
                                        {detail?.status || "Unknown"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Phone Number</span>
                                <p className="mt-1 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    {detail?.phone || "—"}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Address</span>
                                <p className="mt-1 flex items-center gap-2 text-slate-700 dark:text-slate-200 truncate" title={detail?.email || ""}>
                                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="truncate">{detail?.email || "No email"}</span>
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Joined Date</span>
                                <p className="mt-1 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {detail?.created_at ? formatIndianDateTime(detail.created_at) : "—"}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last Login At</span>
                                <p className="mt-1 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {detail?.last_login_at ? formatIndianDateTime(detail.last_login_at) : "Never"}
                                </p>
                            </div>
                        </div>

                        {/* Section: Warehouse Assignments (for delivery_partner, warehouse_manager, vendor) */}
                        {isWarehouseRole && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-dailyveg-500" />
                                    Assigned Warehouses
                                </h4>
                                {assignedWarehouses.length > 0 ? (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {assignedWarehouses.map((w) => (
                                            <div key={w.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                                                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{w.name}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{w.city || "—"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800">
                                        No warehouses assigned to this user.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section: Customer Addresses & Serviceability */}
                        {isCustomer && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-dailyveg-500" />
                                    Customer Addresses
                                </h4>
                                {(detail?.addresses || []).length > 0 ? (
                                    <div className="space-y-3">
                                        {detail.addresses.map((addr) => (
                                            <div key={addr.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/20 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                            {addr.label || "Address"}
                                                        </span>
                                                        {addr.is_default ? (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dailyveg-300 text-dailyveg-600 bg-dailyveg-50/30">
                                                                Default
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <div>
                                                        {addr.is_serviceable && addr.serviceable_warehouse_name ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                                                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                                Serviceable via {addr.serviceable_warehouse_name}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                                                                <XCircle className="h-3 w-3 shrink-0" />
                                                                Not Serviceable
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                    {addr.name ? <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">{addr.name} {addr.phone ? `(${addr.phone})` : ""}</strong> : null}
                                                    {addr.address_line1}
                                                    {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                                                    {addr.landmark ? ` (Landmark: ${addr.landmark})` : ""}
                                                    {addr.area ? `, ${addr.area}` : ""}
                                                    {`, ${addr.city}, ${addr.state} - ${addr.pincode}`}
                                                </p>

                                                {addr.lat && addr.lng ? (
                                                    <p className="text-[10px] font-mono text-slate-400">
                                                        Coordinates: {addr.lat}, {addr.lng}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                                        No addresses found for this customer.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section: Security & Credentials (Only Admin) */}
                        {isAdmin && (
                            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-900">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-dailyveg-500" />
                                    Login &amp; Security Settings
                                </h4>
                                <div className="grid gap-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 text-xs dark:border-slate-800/80 dark:bg-slate-900/30 sm:grid-cols-2">
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500">Password Login status</span>
                                        <p className="mt-1 font-semibold flex items-center gap-1.5">
                                            {detail?.password_login_enabled ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                                    <Unlock className="h-3.5 w-3.5" /> Enabled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-slate-500">
                                                    <Lock className="h-3.5 w-3.5" /> Disabled
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500">Password Changed Date</span>
                                        <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                                            {detail?.password_changed_at ? formatIndianDateTime(detail.password_changed_at) : "N/A"}
                                        </p>
                                    </div>
                                    {detail?.password_locked_until && (
                                        <div className="sm:col-span-2">
                                            <span className="text-slate-400 dark:text-slate-500">Locked Until</span>
                                            <p className="mt-1 font-semibold text-amber-600">
                                                {formatIndianDateTime(detail.password_locked_until)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="border-t border-slate-100 pt-4 dark:border-slate-900">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Close View
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
