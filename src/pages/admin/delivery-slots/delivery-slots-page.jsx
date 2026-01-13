import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { DeliverySlotsService } from "../../../api/services/delivery-slots.service";
import { deliverySlotCreateSchema, deliverySlotUpdateSchema } from "../../../validations/delivery-slots";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { StatusBadge } from "../../../components/common/status-badge";
import { useToast } from "../../../components/toast/toast-context";

function SlotForm({ mode, initialValues, onSubmit, onCancel, isSubmitting }) {
    const schema = mode === "create" ? deliverySlotCreateSchema : deliverySlotUpdateSchema;

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: initialValues,
    });

    return (
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
        >
            <div className="grid gap-2">
                <Label>Name</Label>
                <Input placeholder="Morning" {...form.register("name")} />
                {form.formState.errors.name ? (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Start Time</Label>
                    <Input placeholder="09:00" {...form.register("start_time")} />
                    {form.formState.errors.start_time ? (
                        <p className="text-sm text-red-600">{form.formState.errors.start_time.message}</p>
                    ) : null}
                </div>

                <div className="grid gap-2">
                    <Label>End Time</Label>
                    <Input placeholder="12:00" {...form.register("end_time")} />
                    {form.formState.errors.end_time ? (
                        <p className="text-sm text-red-600">{form.formState.errors.end_time.message}</p>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
            </div>
        </form>
    );
}

export function DeliverySlotsAdminPage() {
    const toast = useToast();
    const qc = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [edit, setEdit] = useState(null);
    const [toggle, setToggle] = useState(null);

    const query = useQuery({
        queryKey: ["adminDeliverySlots"],
        queryFn: () => DeliverySlotsService.list(),
    });

    const createMut = useMutation({
        mutationFn: (payload) => DeliverySlotsService.create(payload),
        onSuccess: () => {
            toast.success("Delivery slot created");
            setCreateOpen(false);
            qc.invalidateQueries({ queryKey: ["adminDeliverySlots"] });
        },
        onError: (e) => toast.error(e?.message || "Failed to create"),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, payload }) => DeliverySlotsService.update(id, payload),
        onSuccess: () => {
            toast.success("Delivery slot updated");
            setEdit(null);
            qc.invalidateQueries({ queryKey: ["adminDeliverySlots"] });
        },
        onError: (e) => toast.error(e?.message || "Failed to update"),
    });

    const toggleMut = useMutation({
        mutationFn: ({ id, is_active }) => DeliverySlotsService.setActive(id, is_active),
        onSuccess: () => {
            toast.success("Updated active status");
            setToggle(null);
            qc.invalidateQueries({ queryKey: ["adminDeliverySlots"] });
        },
        onError: (e) => toast.error(e?.message || "Failed to update"),
    });

    const columns = useMemo(
        () => [
            { accessorKey: "name", header: "Name" },
            { accessorKey: "start_time", header: "Start" },
            { accessorKey: "end_time", header: "End" },
            {
                id: "active",
                header: "Active",
                cell: ({ row }) => <StatusBadge value={row.original.is_active ? "Active" : "Inactive"} />, 
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEdit(row.original)}>
                            Edit
                        </Button>
                        <Button
                            variant={row.original.is_active ? "destructive" : "default"}
                            onClick={() => setToggle(row.original)}
                        >
                            {row.original.is_active ? "Disable" : "Enable"}
                        </Button>
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <div className="p-4 sm:p-6">
            <PageHeader
                title="Delivery Slots"
                subtitle="Manage delivery time windows."
                actions={(
                    <Button onClick={() => setCreateOpen(true)}>
                        New Slot
                    </Button>
                )}
            />

            <Card className="p-4">
                <DataTable
                    columns={columns}
                    data={query.data || []}
                    isLoading={query.isLoading}
                    emptyTitle="No delivery slots"
                    emptyDescription="Create your first delivery slot to start scheduling deliveries."
                />
            </Card>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Delivery Slot</DialogTitle>
                    </DialogHeader>
                    <SlotForm
                        mode="create"
                        initialValues={{ name: "", start_time: "", end_time: "", is_active: true }}
                        isSubmitting={createMut.isPending}
                        onCancel={() => setCreateOpen(false)}
                        onSubmit={(values) => createMut.mutate(values)}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={!!edit} onOpenChange={(v) => (!v ? setEdit(null) : null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Delivery Slot</DialogTitle>
                    </DialogHeader>
                    {edit ? (
                        <SlotForm
                            mode="edit"
                            initialValues={{
                                name: edit.name ?? "",
                                start_time: edit.start_time ?? "",
                                end_time: edit.end_time ?? "",
                            }}
                            isSubmitting={updateMut.isPending}
                            onCancel={() => setEdit(null)}
                            onSubmit={(values) => updateMut.mutate({ id: edit.id, payload: values })}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!toggle}
                onOpenChange={(v) => (!v ? setToggle(null) : null)}
                title={toggle?.is_active ? "Disable Slot" : "Enable Slot"}
                description={
                    toggle?.is_active
                        ? "This slot will no longer be available for customers."
                        : "This slot will become available for customers."
                }
                confirmText={toggle?.is_active ? "Disable" : "Enable"}
                confirmVariant={toggle?.is_active ? "destructive" : "default"}
                onConfirm={() => toggleMut.mutate({ id: toggle.id, is_active: !toggle.is_active })}
                isConfirming={toggleMut.isPending}
            />
        </div>
    );
}
