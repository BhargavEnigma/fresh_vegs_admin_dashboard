import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SettingsAdminService } from "../../../api/services/settings-admin.service";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../components/toast/toast-context";

function safeStringify(value) {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export function AdminSettingsPage() {
    const toast = useToast();
    const qc = useQueryClient();
    const [edit, setEdit] = useState(null);
    const [draft, setDraft] = useState("{");
    const [parseError, setParseError] = useState(null);

    const query = useQuery({
        queryKey: ["adminSettings"],
        queryFn: async () => {
            const data = await SettingsAdminService.list();
            return data?.settings || [];
        },
    });

    const upsertMut = useMutation({
        mutationFn: ({ key, value }) => SettingsAdminService.upsert(key, value),
        meta: {
            globalLoaderMessage: "Saving setting...",
        },
        onSuccess: () => {
            toast.success("Setting saved");
            setEdit(null);
            qc.invalidateQueries({ queryKey: ["adminSettings"] });
        },
        onError: (e) => toast.error(e?.message || "Failed to save"),
    });

    const columns = useMemo(
        () => [
            { accessorKey: "key", header: "Key" },
            {
                id: "updated_at",
                header: "Updated",
                cell: ({ row }) => {
                    const v = row.original.updated_at;
                    return <span className="text-sm text-slate-600">{v ? new Date(v).toLocaleString() : "—"}</span>;
                },
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex items-center justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setParseError(null);
                                setEdit(row.original);
                                setDraft(safeStringify(row.original.value));
                            }}
                        >
                            Edit
                        </Button>
                    </div>
                ),
            },
        ],
        []
    );

    const onSave = () => {
        if (!edit) return;
        try {
            const parsed = JSON.parse(draft);
            setParseError(null);
            upsertMut.mutate({ key: edit.key, value: parsed });
        } catch (e) {
            setParseError(e?.message || "Invalid JSON");
        }
    };

    return (
        <div className="">
            <PageHeader
                title="Settings"
                subtitle="Admin settings stored as JSON (Setting table)."
            />

            <Card className="p-4">
                <DataTable
                    columns={columns}
                    data={query.data || []}
                    isLoading={query.isLoading}
                    emptyTitle="No settings"
                    emptyDescription="No settings found. Settings are stored in the backend Setting table."
                />
            </Card>

            <Dialog open={!!edit} onOpenChange={(v) => (!v ? setEdit(null) : null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Setting</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label>Key</Label>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm">
                            {edit?.key}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Value (JSON)</Label>
                        <Textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="min-h-[260px] font-mono text-sm"
                        />
                        {parseError ? <p className="text-sm text-red-600">{parseError}</p> : null}
                        <p className="text-xs text-slate-500">Must be valid JSON. (Numbers/booleans/arrays/objects supported.)</p>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEdit(null)} disabled={upsertMut.isPending}>
                            Cancel
                        </Button>
                        <Button onClick={onSave} disabled={upsertMut.isPending}>
                            {upsertMut.isPending ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}