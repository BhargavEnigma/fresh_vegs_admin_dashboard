import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { OpsJobsService } from "../../../api/services/ops-jobs.service";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/toast/toast-context";

export function OpsJobsPage() {
    const toast = useToast();
    const [result, setResult] = useState(null);

    const lockMut = useMutation({
        mutationFn: () => OpsJobsService.lockOrders(),
        onSuccess: (data) => {
            setResult(data);
            toast.success("Lock orders job executed");
        },
        onError: (e) => toast.error(e?.message || "Failed to run job"),
    });

    return (
        <div className="p-4 sm:p-6">
            <PageHeader
                title="Ops Jobs"
                subtitle="Run operational jobs (currently: lock orders)."
            />

            <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="font-medium">Lock Orders</p>
                        <p className="text-sm text-slate-500">Locks eligible orders (same logic as scheduler).</p>
                    </div>
                    <Button onClick={() => lockMut.mutate()} disabled={lockMut.isPending}>
                        {lockMut.isPending ? "Running..." : "Run Now"}
                    </Button>
                </div>

                {result ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/30">
                        <p className="font-medium">Result</p>
                        <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                ) : null}
            </Card>
        </div>
    );
}