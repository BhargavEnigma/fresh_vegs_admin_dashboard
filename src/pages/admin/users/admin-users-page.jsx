import { useId, useMemo, useState } from "react";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AtSign,
    Building2,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    KeyRound,
    Mail,
    Phone,
    RefreshCw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    UserRound,
    UserPlus,
    UsersRound,
    Eye,
} from "lucide-react";

import { AdminUsersService } from "../../../api/services/admin-users.service";
import { adminUserCreateSchema, adminSetRolesSchema } from "../../../validations/admin-users";
import { WarehousesService } from "../../../api/services/warehouses.service";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../components/toast/toast-context";
import { Badge } from "../../../components/ui/badge";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { UserPasswordLoginDialog } from "./user-password-login-dialog";
import { PasswordLoginStatusBadge } from "./password-login-status-badge";
import { EditUserDialog } from "./edit-user-dialog";
import { ViewUserDialog } from "./view-user-dialog";

function RoleRadio({ value, active, name, onSelect }) {
    const id = `${name}-${value}`;

    return (
        <span>
            <input
                id={id}
                type="radio"
                name={name}
                value={value}
                checked={active}
                onChange={() => onSelect(value)}
                className="peer sr-only"
            />
            <label
                htmlFor={id}
                className={
                    "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-dailyveg-500/35 " +
                    (active
                        ? "border-dailyveg-500 bg-dailyveg-50 text-dailyveg-800 shadow-sm shadow-dailyveg-100 dark:border-dailyveg-700 dark:bg-dailyveg-950/80 dark:text-dailyveg-200 dark:shadow-none"
                        : "border-slate-200 bg-white text-slate-600 hover:border-dailyveg-300 hover:bg-dailyveg-50/50 hover:text-dailyveg-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-dailyveg-800 dark:hover:bg-dailyveg-950/50")
                }
            >
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? "border-dailyveg-500 bg-dailyveg-500 text-white" : "border-slate-300 dark:border-slate-700"}`}>
                    {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                {ROLE_LABELS[value] || value.replaceAll("_", " ")}
            </label>
        </span>
    );
}

function RolesPicker({ value, onChange }) {

    const all = ["admin", "warehouse_manager", "vendor", "customer", "delivery_partner", "support_manager"];

    all.splice(0, 1)

    const name = `role-${useId().replace(/:/g, "")}`;
    const selectedRole = Array.isArray(value) ? value[0] : value;

    return (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Role">
            {all.map((r) => (
                <RoleRadio
                    key={r}
                    value={r}
                    name={name}
                    active={selectedRole === r}
                    onSelect={(role) => onChange([role])}
                />
            ))}
        </div>
    );
}

function WarehouseMultiSelect({ warehouses, value, onChange }) {
    return (
        <PremiumSelect
            isMulti
            value={value || []}
            onChange={(selected) => onChange(selected || [])}
            options={warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: `${warehouse.name} (${warehouse.city || "—"})`,
            }))}
            placeholder="Select warehouses"
        />
    );
}

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

function UserAvatar({ user, size = "md" }) {
    return (
        <div className={`${size === "sm" ? "h-10 w-10 text-xs" : "h-11 w-11 text-sm"} flex shrink-0 items-center justify-center rounded-2xl border border-dailyveg-200/80 bg-gradient-to-br from-dailyveg-100 to-dailyveg-50 font-bold text-dailyveg-800 shadow-sm dark:border-dailyveg-800/70 dark:from-dailyveg-900 dark:to-dailyveg-950 dark:text-dailyveg-200`}>
            {getInitials(user.full_name)}
        </div>
    );
}

function RoleBadges({ roles }) {
    return (roles || []).length ? (
        <div className="flex flex-wrap gap-1.5">
            {roles.map((role) => (
                <Badge key={role} variant="secondary" className="max-w-none border-dailyveg-200/70 bg-dailyveg-50/80 px-2.5 py-1 font-medium dark:border-dailyveg-800/60">
                    {ROLE_LABELS[role] || role.replaceAll("_", " ")}
                </Badge>
            ))}
        </div>
    ) : <span className="text-slate-400">No role assigned</span>;
}

export function AdminUsersPage() {
    const toast = useToast();
    const [createdUser, setCreatedUser] = useState(null);
    const [securityUser, setSecurityUser] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [viewingUser, setViewingUser] = useState(null);
    const [listParams, setListParams] = useState({ page: 1, limit: 20, q: "", role: "", status: "" });

    const queryParams = useMemo(() => {
        const p = {
            page: listParams.page,
            limit: listParams.limit,
        };
        if (listParams.q) p.q = listParams.q;
        if (listParams.role) p.role = listParams.role;
        if (listParams.status) p.status = listParams.status;
        return p;
    }, [listParams]);

    const warehousesQuery = useQuery({
        queryKey: ["adminUserWarehouses"],
        queryFn: () => WarehousesService.list({ includeInactive: false }),
    });

    const listQuery = useQuery({
        queryKey: ["adminUsers", queryParams],
        queryFn: () => AdminUsersService.list(queryParams),
        keepPreviousData: true,
    });

    const createForm = useForm({
        resolver: zodResolver(adminUserCreateSchema),
        defaultValues: {
            phone: "91",
            full_name: "",
            email: "",
            roles: ["warehouse_manager"],
            warehouse_ids: [],
        },
    });

    const rolesForm = useForm({
        resolver: zodResolver(adminSetRolesSchema),
        defaultValues: {
            user_id: "",
            roles: ["warehouse_manager"],
            warehouse_ids: [],
        },
    });

    const createMut = useMutation({
        mutationFn: (payload) => AdminUsersService.create(payload),
        meta: {
            globalLoaderMessage: "Creating admin user...",
        },
        onSuccess: (data) => {
            setCreatedUser(data);
            toast.success("User created");
            listQuery.refetch();
            // if backend returns user.id, help user quickly assign roles later
            if (data?.user?.id) {
                rolesForm.setValue("user_id", data.user.id);
            }
        },
        onError: (e) => toast.error(e?.message || "Failed to create user"),
    });

    const setRolesMut = useMutation({
        mutationFn: ({ user_id, roles, warehouse_ids }) =>
            AdminUsersService.setRoles(user_id, roles, warehouse_ids),
        meta: {
            globalLoaderMessage: "Updating user roles...",
        },
        onSuccess: () => {
            toast.success("Roles updated");
            listQuery.refetch();
        },
        onError: (e) => toast.error(e?.message || "Failed to update roles"),
    });

    const submitCreate = (values) => {
        const phone = String(values.phone || "").trim();
        createMut.mutate({
            phone,
            full_name: values.full_name || null,
            email: values.email || null,
            roles: values.roles,
            warehouse_ids: values.warehouse_ids || [],
        });
    };

    const submitRoles = (values) => {
        setRolesMut.mutate({
            user_id: values.user_id,
            roles: values.roles,
            warehouse_ids: values.warehouse_ids || [],
        });
    };

    return (
        <div className="">
            <PageHeader
                title="Admin Users"
                subtitle="Create users, assign roles, and search/list existing users."
            />

            <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800/80 dark:bg-slate-950 dark:shadow-brand-dark">
                <div className="border-b border-slate-200/80 bg-gradient-to-r from-dailyveg-50/80 via-white to-white px-4 py-5 dark:border-slate-800/80 dark:from-dailyveg-950/60 dark:via-slate-950 dark:to-slate-950 sm:px-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-dailyveg-700 dark:text-dailyveg-300">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-dailyveg-100 dark:bg-dailyveg-900/70"><UsersRound className="h-4 w-4" /></span>
                                User directory
                            </div>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review access, roles and login security across your team.</p>
                        </div>

                        <div className="grid w-full gap-3 md:grid-cols-3 xl:max-w-4xl">
                            <div className="grid gap-1.5 md:col-span-1">
                                <Label htmlFor="admin-user-search" className="text-xs font-semibold text-slate-500">Search users</Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="admin-user-search"
                                        className="pl-9"
                                        value={listParams.q}
                                        onChange={(e) => setListParams((s) => ({ ...s, page: 1, q: e.target.value }))}
                                        placeholder="Name, phone or email"
                                    />
                                </div>
                            </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-500">Role</Label>
                        <PremiumSelect
                            value={listParams.role}
                            onChange={(value) =>
                                setListParams((s) => ({
                                    ...s,
                                    page: 1,
                                    role: value || "",
                                }))
                            }
                            options={[
                                { value: "", label: "All Roles" },
                                { value: "admin", label: "Admin" },
                                { value: "warehouse_manager", label: "Warehouse Manager" },
                                { value: "vendor", label: "Vendor" },
                                { value: "delivery_partner", label: "Delivery Partner" },
                                { value: "customer", label: "Customer" },
                                { value: "support_manager", label: "Support Manager" },
                            ]}
                            placeholder="Select role"
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-500">Status</Label>
                        <PremiumSelect
                            value={listParams.status}
                            onChange={(value) =>
                                setListParams((s) => ({
                                    ...s,
                                    page: 1,
                                    status: value || "",
                                }))
                            }
                            options={[
                                { value: "", label: "All Status" },
                                { value: "active", label: "Active" },
                                { value: "blocked", label: "Blocked" },
                            ]}
                            placeholder="Select status"
                        />
                    </div>

                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-900 sm:px-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {listQuery.data?.total ?? 0} {listQuery.data?.total === 1 ? "user" : "users"}
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                        <RefreshCw className={`h-3.5 w-3.5 ${listQuery.isFetching ? "animate-spin" : ""}`} />
                        {listQuery.isFetching ? "Refreshing" : "Refresh"}
                    </Button>
                </div>

                <div className="hidden w-full overflow-x-auto thin-scrollbar md:block">
                    <table className="premium-table min-w-[1120px]">
                        <thead className="text-left">
                            <tr>
                                {['#', 'User', 'Contact', 'Status', 'Roles & access', 'Login security', 'Joined', 'Actions'].map((heading) => (
                                    <th key={heading} className={`whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${heading === 'Actions' ? 'text-right' : ''}`}>{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {listQuery.isLoading ? (
                                <tr>
                                    <td className="px-5 py-14 text-center text-slate-500" colSpan={8}>
                                        <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-dailyveg-500" /> Loading users…
                                    </td>
                                </tr>
                            ) : null}

                            {listQuery.isError ? (
                                <tr>
                                    <td className="px-5 py-14 text-center text-red-600" colSpan={8}>
                                        Failed to load users.
                                    </td>
                                </tr>
                            ) : null}

                            {!listQuery.isLoading && !listQuery.isError && (listQuery.data?.items || []).length === 0 ? (
                                <tr>
                                    <td className="px-5 py-14 text-center text-slate-500" colSpan={8}>
                                        <UserRound className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                                        <span className="font-medium text-slate-700 dark:text-slate-200">No users found</span>
                                        <p className="mt-1 text-xs">Try changing your search or filters.</p>
                                    </td>
                                </tr>
                            ) : null}

                            {(listQuery.data?.items || []).map((u, index) => {
                                const serialNumber = ((listQuery.data?.page ?? listParams.page ?? 1) - 1) * (listParams.limit ?? 20) + index + 1;
                                return (
                                    <tr key={u.id} className="group border-t border-slate-100 transition-colors hover:bg-dailyveg-50/50 dark:border-slate-900 dark:hover:bg-dailyveg-950/30">
                                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {serialNumber}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={u} />
                                                <div className="min-w-0">
                                                    <div className="max-w-[190px] truncate font-semibold text-slate-900 dark:text-white">{u.full_name || "Unnamed user"}</div>
                                                    <div className="mt-0.5 max-w-[190px] truncate font-mono text-[10px] text-slate-400" title={u.id}>ID · {u.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><Phone className="h-3.5 w-3.5 text-slate-400" />{u.phone || "—"}</div>
                                                <div className="flex max-w-[210px] items-center gap-2 truncate text-slate-500" title={u.email || ""}><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{u.email || "No email"}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${u.status === "active" ? "border-dailyveg-200 bg-dailyveg-50 text-dailyveg-700 dark:border-dailyveg-800 dark:bg-dailyveg-950/70 dark:text-dailyveg-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-dailyveg-500" : "bg-red-500"}`} />{u.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="max-w-[220px] px-5 py-4"><RoleBadges roles={u.roles} /></td>
                                        <td className="px-5 py-4"><PasswordLoginStatusBadge user={u} /></td>
                                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500"><div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />{formatIndianDateTime(u.created_at)}</div></td>
                                        <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1.5">
                                            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setViewingUser(u)}><Eye className="h-3.5 w-3.5" /> View</Button>
                                            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setEditingUser(u)}><UserRound className="h-3.5 w-3.5" /> Edit</Button>
                                            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setSecurityUser(u)}><KeyRound className="h-3.5 w-3.5" /> Login</Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                onClick={() => {
                                                    rolesForm.setValue("user_id", u.id, { shouldValidate: true });
                                                    rolesForm.setValue("roles", u.roles?.length ? [u.roles[0]] : [], { shouldValidate: true });
                                                    rolesForm.setValue("warehouse_ids", u.warehouse_ids || [], { shouldValidate: true });
                                                    toast.success("Loaded user into role editor");
                                                }}
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5" /> Roles
                                            </Button>
                                        </div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-900 md:hidden">
                    {(listQuery.data?.items || []).map((u) => (
                        <article key={u.id} className="p-4">
                            <div className="flex items-start gap-3">
                                <UserAvatar user={u} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div><h3 className="truncate font-semibold text-slate-900 dark:text-white">{u.full_name || "Unnamed user"}</h3><p className="mt-0.5 truncate text-xs text-slate-500">{u.email || u.phone || "No contact details"}</p></div>
                                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${u.status === "active" ? "bg-dailyveg-500" : "bg-red-500"}`} title={u.status} />
                                    </div>
                                    <div className="mt-3"><RoleBadges roles={u.roles} /></div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-900">
                                        <PasswordLoginStatusBadge user={u} />
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setViewingUser(u)}><Eye className="h-4 w-4" /><span className="sr-only">View details</span></Button>
                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingUser(u)}><UserRound className="h-4 w-4" /><span className="sr-only">Edit details</span></Button>
                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSecurityUser(u)}><KeyRound className="h-4 w-4" /><span className="sr-only">Manage login</span></Button>
                                            <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2.5" onClick={() => { rolesForm.setValue("user_id", u.id, { shouldValidate: true }); rolesForm.setValue("roles", u.roles?.length ? [u.roles[0]] : [], { shouldValidate: true }); rolesForm.setValue("warehouse_ids", u.warehouse_ids || [], { shouldValidate: true }); toast.success("Loaded user into role editor"); }}><ShieldCheck className="h-3.5 w-3.5" /> Roles</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                    {listQuery.isLoading ? <div className="p-10 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-dailyveg-500" />Loading users…</div> : null}
                    {!listQuery.isLoading && !listQuery.isError && !(listQuery.data?.items || []).length ? <div className="p-10 text-center text-sm text-slate-500">No users match these filters.</div> : null}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/20 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="text-xs text-slate-500">
                        Page <span className="font-semibold text-slate-700 dark:text-slate-200">{listQuery.data?.page ?? 1}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{listQuery.data?.total_pages ?? 1}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setListParams((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
                            disabled={(listQuery.data?.page || 1) <= 1}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setListParams((s) => ({ ...s, page: (s.page || 1) + 1 }))}
                            disabled={(listQuery.data?.page || 1) >= (listQuery.data?.total_pages || 1)}
                        >
                            Next <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-2">
                <Card className="overflow-hidden">
                    <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-dailyveg-50 via-white to-white px-5 py-5 dark:border-slate-800 dark:from-dailyveg-950/70 dark:via-slate-950 dark:to-slate-950 sm:px-6">
                        <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-dailyveg-200/30 blur-2xl dark:bg-dailyveg-800/20" />
                        <div className="relative flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-dailyveg-500 text-white shadow-brand"><UserPlus className="h-5 w-5" /></div>
                            <div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Create User</h3><Badge variant="secondary" className="px-2 py-0.5">New account</Badge></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add a team member and configure their initial access.</p></div>
                        </div>
                    </div>

                    <form onSubmit={createForm.handleSubmit(submitCreate)} className="grid gap-6 p-5 sm:p-6">
                        <div>
                            <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-900"><UserRound className="h-3.5 w-3.5" /></span><div><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Personal details</h4><p className="text-xs text-slate-500">Primary identity and contact information</p></div></div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="create-user-phone">Phone number <span className="text-red-500">*</span></Label>
                                    <div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="create-user-phone" className="h-11 pl-10" placeholder="918128635446" {...createForm.register("phone")} /></div>
                                    <p className="text-xs text-slate-500">Use the country code format: 91XXXXXXXXXX</p>
                            {createForm.formState.errors.phone ? (
                                        <p className="text-xs font-medium text-red-600">{createForm.formState.errors.phone.message}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-2">
                                    <Label htmlFor="create-user-name">Full name <span className="font-normal text-slate-400">Optional</span></Label>
                                    <div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="create-user-name" className="h-11 pl-10" placeholder="Bhavin Patel" {...createForm.register("full_name")} /></div>
                        </div>

                        <div className="grid gap-2">
                                    <Label htmlFor="create-user-email">Email <span className="font-normal text-slate-400">Optional</span></Label>
                                    <div className="relative"><AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="create-user-email" className="h-11 pl-10" placeholder="bhavin@example.com" {...createForm.register("email")} /></div>
                            {createForm.formState.errors.email ? (
                                        <p className="text-xs font-medium text-red-600">{createForm.formState.errors.email.message}</p>
                            ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-5 dark:border-slate-900">
                            <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-dailyveg-50 text-dailyveg-600 dark:bg-dailyveg-950 dark:text-dailyveg-300"><ShieldCheck className="h-3.5 w-3.5" /></span><div><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Access configuration</h4><p className="text-xs text-slate-500">Choose a role and permitted warehouses</p></div></div>
                            <div className="grid gap-5">
                                <div className="grid gap-2"><Label>Primary role</Label>
                            <RolesPicker
                                value={createForm.watch("roles")}
                                onChange={(roles) => createForm.setValue("roles", roles, { shouldValidate: true })}
                            />
                            {createForm.formState.errors.roles ? (
                                        <p className="text-xs font-medium text-red-600">{createForm.formState.errors.roles.message}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-2">
                                    <Label>Warehouse assignments</Label>
                            <WarehouseMultiSelect
                                warehouses={warehousesQuery.data || []}
                                value={createForm.watch("warehouse_ids")}
                                onChange={(warehouse_ids) => createForm.setValue("warehouse_ids", warehouse_ids, { shouldValidate: true })}
                            />

                            {createForm.formState.errors.warehouse_ids ? (
                                        <p className="text-xs font-medium text-red-600">
                                    {createForm.formState.errors.warehouse_ids.message}
                                </p>
                            ) : null}

                                    <div className="flex gap-2 rounded-xl border border-dailyveg-100 bg-dailyveg-50/60 p-3 text-xs leading-5 text-dailyveg-800 dark:border-dailyveg-900 dark:bg-dailyveg-950/40 dark:text-dailyveg-300"><Building2 className="mt-0.5 h-4 w-4 shrink-0" /><p>Warehouse managers need at least one assigned location. Other roles can remain unassigned.</p></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-900">
                            <p className="hidden text-xs text-slate-500 sm:block">Fields marked <span className="text-red-500">*</span> are required</p>
                            <Button className="w-full gap-2 sm:w-auto" type="submit" disabled={createMut.isPending}>
                                {createMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{createMut.isPending ? "Creating…" : "Create User"}
                            </Button>
                        </div>

                        {createdUser ? (
                            <div className="flex gap-3 rounded-2xl border border-dailyveg-200 bg-dailyveg-50 p-4 text-sm dark:border-dailyveg-800 dark:bg-dailyveg-950/50">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-dailyveg-600" /><div><p className="font-semibold text-dailyveg-800 dark:text-dailyveg-200">User created successfully</p>
                                <p className="mt-1 text-xs text-dailyveg-700 dark:text-dailyveg-300">
                                    {createdUser?.user?.full_name || createdUser?.full_name || "User"}
                                    {createdUser?.user?.phone || createdUser?.phone ? ` · ${createdUser?.user?.phone || createdUser?.phone}` : ""}
                                </p></div>
                            </div>
                        ) : null}
                    </form>
                </Card>

                <Card className="overflow-hidden">
                    <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-dailyveg-50/40 px-5 py-5 dark:border-slate-800 dark:from-slate-900/80 dark:via-slate-950 dark:to-dailyveg-950/40 sm:px-6">
                        <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-dailyveg-200/25 blur-2xl dark:bg-dailyveg-800/20" />
                        <div className="relative flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-dailyveg-200 bg-white text-dailyveg-700 shadow-sm dark:border-dailyveg-800 dark:bg-dailyveg-950 dark:text-dailyveg-300"><ShieldCheck className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Set Roles</h3><Sparkles className="h-4 w-4 text-dailyveg-500" /></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fine-tune permissions for an existing team member.</p></div></div>
                    </div>

                    <form onSubmit={rolesForm.handleSubmit(submitRoles)} className="grid gap-6 p-5 sm:p-6">
                        <div className="grid gap-2">
                            <Label>Select user <span className="text-red-500">*</span></Label>
                            <PremiumSelect
                                value={rolesForm.watch("user_id")}
                                onChange={(userId) => {
                                    const selectedUser = (listQuery.data?.items || []).find((u) => u.id === userId);

                                    rolesForm.setValue("user_id", userId || "", { shouldValidate: true });

                                    if (selectedUser) {
                                        rolesForm.setValue(
                                            "roles",
                                            selectedUser.roles?.length ? [selectedUser.roles[0]] : [],
                                            { shouldValidate: true }
                                        );
                                        rolesForm.setValue("warehouse_ids", selectedUser.warehouse_ids || [], {
                                            shouldValidate: true,
                                        });
                                    }
                                }}
                                options={(listQuery.data?.items || []).map((u) => ({
                                    value: u.id,
                                    label: `${u.full_name || "No Name"}${u.phone ? ` (${u.phone})` : ""}`,
                                }))}
                                placeholder={listQuery.isLoading ? "Loading users..." : "Select user"}
                                isDisabled={listQuery.isLoading}
                            />

                            {rolesForm.formState.errors.user_id ? (
                                <p className="text-xs font-medium text-red-600">
                                    {rolesForm.formState.errors.user_id.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/30 sm:p-5">
                            <div className="grid gap-2"><Label>Primary role</Label>
                            <RolesPicker
                                value={rolesForm.watch("roles")}
                                onChange={(roles) => rolesForm.setValue("roles", roles, { shouldValidate: true })}
                            />
                            {rolesForm.formState.errors.roles ? (
                                    <p className="text-xs font-medium text-red-600">{rolesForm.formState.errors.roles.message}</p>
                            ) : null}
                        </div>

                            <div className="my-5 h-px bg-slate-200 dark:bg-slate-800" />
                            <div className="grid gap-2"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-dailyveg-600" /><Label>Warehouse assignments</Label></div>
                            <WarehouseMultiSelect
                                warehouses={warehousesQuery.data || []}
                                value={rolesForm.watch("warehouse_ids")}
                                onChange={(warehouse_ids) =>
                                    rolesForm.setValue("warehouse_ids", warehouse_ids, { shouldValidate: true })
                                }
                            />

                            {rolesForm.formState.errors.warehouse_ids ? (
                                    <p className="text-xs font-medium text-red-600">
                                    {rolesForm.formState.errors.warehouse_ids.message}
                                </p>
                            ) : null}
                                <p className="text-xs leading-5 text-slate-500">Selected locations define where this user can manage daily operations.</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-dashed border-dailyveg-200 bg-dailyveg-50/40 p-4 dark:border-dailyveg-900 dark:bg-dailyveg-950/30"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-dailyveg-600" /><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Access changes apply immediately</p><p className="mt-1 text-xs leading-5 text-slate-500">Review the selected role and warehouses before saving. Existing access may be replaced.</p></div></div></div>

                        <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-900">
                            <Button className="w-full gap-2 sm:w-auto" type="submit" disabled={setRolesMut.isPending}>
                                {setRolesMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{setRolesMut.isPending ? "Updating…" : "Update Access"}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
            <UserPasswordLoginDialog user={securityUser} open={Boolean(securityUser)} onOpenChange={(open) => { if (!open) setSecurityUser(null); }} />
            <EditUserDialog user={editingUser} open={Boolean(editingUser)} onOpenChange={(open) => { if (!open) setEditingUser(null); }} onSuccess={() => listQuery.refetch()} />
            <ViewUserDialog user={viewingUser} open={Boolean(viewingUser)} onOpenChange={(open) => { if (!open) setViewingUser(null); }} warehouses={warehousesQuery.data || []} />
        </div>
    );
}
