import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";

export function SupportCustomersPage() {
    const [q, setQ] = useState("");
    const query = useQuery({
        queryKey: ["support", "customers", q],
        queryFn: ({ signal }) => SupportService.searchCustomers({ q, page: 1, limit: 20 }, { signal }),
        enabled: q.trim().length >= 3,
    });

    return (
        <div>
            <PageHeader title="Support Customers" subtitle="Search safe customer summaries returned by the support API." />
            <Card className="p-4">
                <Label>Customer Search</Label>
                <Input className="mt-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="At least 3 characters" />
            </Card>
            <div className="mt-5 grid gap-3">
                {q.trim().length > 0 && q.trim().length < 3 ? <Card className="p-5 text-sm text-amber-600">Enter at least 3 characters.</Card> : null}
                {query.isError ? <Card className="p-5 text-sm text-red-600">Unable to search customers.</Card> : null}
                {(query.data?.customers || []).map((customer) => (
                    <Card key={customer.id} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="font-semibold">{customer.full_name || "Unnamed customer"}</div>
                                <div className="text-sm text-slate-500">{customer.phone_masked || "—"} • {customer.email_masked || "—"} • {customer.status || "—"}</div>
                            </div>
                            <Button asChild variant="outline"><Link to={`/support/customers/${customer.id}`}>Open Context</Link></Button>
                        </div>
                    </Card>
                ))}
                {query.isSuccess && !query.data?.customers?.length ? <Card className="p-5 text-sm text-slate-500">No customers found.</Card> : null}
            </div>
        </div>
    );
}
