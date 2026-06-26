import { useId, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
                    "inline-flex cursor-pointer rounded-full border px-3 py-1 text-sm transition peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-dailyveg-500/35 " +
                    (active
                        ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200")
                }
            >
                {value}
            </label>
        </span>
    );
}

function RolesPicker({ value, onChange }) {

    const all = ["admin", "warehouse_manager", "customer", "delivery_partner"];

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

export function AdminUsersPage() {
    const toast = useToast();
    const [createdUser, setCreatedUser] = useState(null);
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

    listQuery

    return (
        <div className="">
            <PageHeader
                title="Admin Users"
                subtitle="Create users, assign roles, and search/list existing users."
            />

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end md:justify-between">
                    <div className="grid gap-2">
                        <Label>Search</Label>
                        <Input
                            value={listParams.q}
                            onChange={(e) => setListParams((s) => ({ ...s, page: 1, q: e.target.value }))}
                            placeholder="phone, name, email"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Role</Label>
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
                                { value: "delivery_partner", label: "Delivery Partner" },
                                { value: "customer", label: "Customer" },
                            ]}
                            placeholder="Select role"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Status</Label>
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

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                            {listQuery.isFetching ? "Refreshing..." : "Refresh"}
                        </Button>
                    </div>
                </div>

                <div className="mt-4 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="min-w-[900px] w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-300">
                            <tr>
                                <th className="px-3 py-2 text-left">User</th>
                                <th className="px-3 py-2 text-left">Phone</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Roles</th>
                                <th className="px-3 py-2 text-left">Created</th>
                                <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listQuery.isLoading ? (
                                <tr>
                                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                                        Loading...
                                    </td>
                                </tr>
                            ) : null}

                            {listQuery.isError ? (
                                <tr>
                                    <td className="px-3 py-6 text-center text-red-600" colSpan={7}>
                                        Failed to load users.
                                    </td>
                                </tr>
                            ) : null}

                            {!listQuery.isLoading && !listQuery.isError && (listQuery.data?.items || []).length === 0 ? (
                                <tr>
                                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                                        No users found.
                                    </td>
                                </tr>
                            ) : null}

                            {(listQuery.data?.items || []).map((u) => (
                                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{u.full_name || "—"}</div>
                                        <div className="text-xs text-slate-500">{u.id}</div>
                                    </td>
                                    <td className="px-3 py-2">{u.phone}</td>
                                    <td className="px-3 py-2">{u.email || "—"}</td>
                                    <td className="px-3 py-2">
                                        <Badge variant={u.status === "active" ? "default" : "destructive"}>{u.status}</Badge>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {(u.roles || []).length ? (
                                                u.roles.map((r) => (
                                                    <Badge key={r} variant="secondary">
                                                        {r}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-slate-500">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                rolesForm.setValue("user_id", u.id, { shouldValidate: true });
                                                rolesForm.setValue("roles", u.roles?.length ? [u.roles[0]] : [], { shouldValidate: true });
                                                rolesForm.setValue("warehouse_ids", u.warehouse_ids || [], { shouldValidate: true });
                                                toast.success("Loaded user into role editor");
                                            }}
                                        >
                                            Edit Roles
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                        Total: {listQuery.data?.total ?? "—"} | Page {listQuery.data?.page ?? "—"} of {listQuery.data?.total_pages ?? "—"}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setListParams((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
                            disabled={(listQuery.data?.page || 1) <= 1}
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setListParams((s) => ({ ...s, page: (s.page || 1) + 1 }))}
                            disabled={(listQuery.data?.page || 1) >= (listQuery.data?.total_pages || 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-4">
                    <h3 className="text-lg font-semibold">Create User</h3>
                    <p className="mt-1 text-sm text-slate-500">Creates user if not exists, and assigns roles.</p>

                    <form onSubmit={createForm.handleSubmit(submitCreate)} className="mt-4 grid gap-4">
                        <div className="grid gap-2">
                            <Label>Phone (format: 91XXXXXXXXXX)</Label>
                            <Input placeholder="918128635446" {...createForm.register("phone")} />
                            {createForm.formState.errors.phone ? (
                                <p className="text-sm text-red-600">{createForm.formState.errors.phone.message}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-2">
                            <Label>Full Name (optional)</Label>
                            <Input placeholder="Bhavin Patel" {...createForm.register("full_name")} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Email (optional)</Label>
                            <Input placeholder="bhavin@example.com" {...createForm.register("email")} />
                            {createForm.formState.errors.email ? (
                                <p className="text-sm text-red-600">{createForm.formState.errors.email.message}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-2">
                            <Label>Roles</Label>
                            <RolesPicker
                                value={createForm.watch("roles")}
                                onChange={(roles) => createForm.setValue("roles", roles, { shouldValidate: true })}
                            />
                            {createForm.formState.errors.roles ? (
                                <p className="text-sm text-red-600">{createForm.formState.errors.roles.message}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-2">
                            <Label>Warehouse Assignments</Label>
                            <WarehouseMultiSelect
                                warehouses={warehousesQuery.data || []}
                                value={createForm.watch("warehouse_ids")}
                                onChange={(warehouse_ids) => createForm.setValue("warehouse_ids", warehouse_ids, { shouldValidate: true })}
                            />

                            {createForm.formState.errors.warehouse_ids ? (
                                <p className="text-sm text-red-600">
                                    {createForm.formState.errors.warehouse_ids.message}
                                </p>
                            ) : null}

                            <p className="text-xs text-slate-500">
                                Assign warehouses for warehouse_manager access. Leave empty for admin-only users if needed.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={createMut.isPending}>
                                {createMut.isPending ? "Creating..." : "Create"}
                            </Button>
                        </div>

                        {createdUser ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/30">
                                <p className="font-medium">Created/Updated</p>
                                <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(createdUser, null, 2)}</pre>
                            </div>
                        ) : null}
                    </form>
                </Card>

                <Card className="p-4">
                    <h3 className="text-lg font-semibold">Set Roles</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Select a user from the list below or load a user from the table using “Edit Roles”.
                    </p>

                    <form onSubmit={rolesForm.handleSubmit(submitRoles)} className="mt-4 grid gap-4">
                        <div className="grid gap-2">
                            <Label>User</Label>
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
                                <p className="text-sm text-red-600">
                                    {rolesForm.formState.errors.user_id.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="grid gap-2">
                            <Label>Roles</Label>
                            <RolesPicker
                                value={rolesForm.watch("roles")}
                                onChange={(roles) => rolesForm.setValue("roles", roles, { shouldValidate: true })}
                            />
                            {rolesForm.formState.errors.roles ? (
                                <p className="text-sm text-red-600">{rolesForm.formState.errors.roles.message}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-2">
                            <Label>Warehouse Assignments</Label>
                            <WarehouseMultiSelect
                                warehouses={warehousesQuery.data || []}
                                value={rolesForm.watch("warehouse_ids")}
                                onChange={(warehouse_ids) =>
                                    rolesForm.setValue("warehouse_ids", warehouse_ids, { shouldValidate: true })
                                }
                            />

                            {rolesForm.formState.errors.warehouse_ids ? (
                                <p className="text-sm text-red-600">
                                    {rolesForm.formState.errors.warehouse_ids.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={setRolesMut.isPending}>
                                {setRolesMut.isPending ? "Updating..." : "Update Roles"}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
