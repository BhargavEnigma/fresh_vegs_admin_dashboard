import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { OpsReportsService } from "../../../api/services/ops-reports.service";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function ProcurementPage() {
    const [date, setDate] = useState(todayISO());

    const query = useQuery({
        queryKey: ["procurement", date],
        queryFn: () => OpsReportsService.procurement({ date }),
        enabled: !!date,
    });

    const columns = useMemo(
        () => [
            { accessorKey: "product_name", header: "Product" },
            { accessorKey: "pack_label", header: "Pack" },
            { accessorKey: "total_quantity", header: "Total Qty" },
        ],
        []
    );

    const rows = query.data?.items || [];

    return (
        <div className="">
            <PageHeader
                title="Procurement"
                subtitle="Locked & paid orders procurement summary for a delivery date."
            />

            <Card className="p-4">
                <div className="grid gap-2 sm:max-w-sm">
                    <Label>Delivery Date</Label>
                    <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
                    <p className="text-xs text-slate-500">Backend requires date query param. Example: 2026-01-09</p>
                </div>

                <div className="mt-6">
                    <DataTable
                        columns={columns}
                        data={rows}
                        isLoading={query.isLoading}
                        emptyTitle="No items"
                        emptyDescription="No locked+paid orders found for the selected date."
                    />
                    {query.isError ? (
                        <p className="mt-3 text-sm text-red-600">
                            Failed to load report. Ensure there are locked orders and you are authenticated with correct role.
                        </p>
                    ) : null}
                </div>
            </Card>
        </div>
    );
}
