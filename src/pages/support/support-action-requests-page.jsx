import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { useAuth } from "../../auth/auth-context";
import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { PremiumSelect } from "../../components/ui/premium-select";
import { useToast } from "../../components/toast/toast-context";
import { ACTION_TYPES, AUTOMATED_ACTION_TYPES } from "./support-constants";
import { ActionTypeBadge, ExecutionStatusBadge, ReviewStatusBadge, SupportNotice, apiError, apiErrorCode, formatDate, isManagerRole, optionList } from "./support-utils";

export function SupportActionRequestsPage() {
    const { roles } = useAuth();
    const manager = isManagerRole(roles);
    const [searchParams, setSearchParams] = useSearchParams();
    const params = useMemo(() => ({
        page: Number(searchParams.get("page") || 1),
        limit: 20,
        status: searchParams.get("status") || "",
        execution_status: searchParams.get("execution_status") || "",
        action_type: searchParams.get("action_type") || "",
    }), [searchParams]);

    const query = useQuery({
        queryKey: ["support", "actionRequests", params],
        queryFn: () => SupportService.listActionRequests(params),
    });

    function patch(patchParams) {
        const next = new URLSearchParams(searchParams);
        Object.entries({ ...patchParams, page: patchParams.page || 1 }).forEach(([key, value]) => {
            if (!value) next.delete(key);
            else next.set(key, String(value));
        });
        setSearchParams(next);
    }

    const rows = query.data?.action_requests || [];

    return (
        <div>
            <PageHeader
                title="Action Requests"
                subtitle={manager ? "Review and execute supported sensitive actions." : "Requests created by you are shown here."}
                actions={<Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
            />
            <SupportNotice tone="warning">Only Full Refund and Notification Resend execute automatically. Other approved action types remain manual authorization records.</SupportNotice>
            <Card className="my-5 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <PremiumSelect value={params.status} onChange={(value) => patch({ status: value })} options={[{ value: "", label: "All Review States" }, ...optionList(["pending", "approved", "rejected", "cancelled"])]} />
                    <PremiumSelect value={params.execution_status} onChange={(value) => patch({ execution_status: value })} options={[{ value: "", label: "All Execution States" }, ...optionList(["not_started", "processing", "succeeded", "failed"])]} />
                    <PremiumSelect value={params.action_type} onChange={(value) => patch({ action_type: value })} options={[{ value: "", label: "All Action Types" }, ...optionList(ACTION_TYPES)]} />
                </div>
            </Card>
            <Card className="overflow-hidden">
                <div className="overflow-x-auto thin-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="bg-dailyveg-50/80 text-left dark:bg-dailyveg-950/50">
                            <tr>
                                {["Action", "Ticket", "Review", "Execution", "Requested", "Failure", ""].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {query.isLoading ? <tr><td colSpan={7} className="px-4 py-10 text-center">Loading action requests…</td></tr> : null}
                            {query.isError ? <tr><td colSpan={7} className="px-4 py-10 text-center text-red-600">Unable to load action requests.</td></tr> : null}
                            {!query.isLoading && !rows.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No action requests returned.</td></tr> : null}
                            {rows.map((request) => <ActionRequestTableRow key={request.id} request={request} manager={manager} />)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function ActionRequestTableRow({ request, manager }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const automated = AUTOMATED_ACTION_TYPES.includes(request.action_type);
    const mutation = useMutation({
        mutationFn: () => SupportService.executeActionRequest(request.id),
        onSuccess: () => {
            toast.success("Execution completed by backend");
            queryClient.invalidateQueries({ queryKey: ["support"] });
        },
        onError: (error) => {
            toast.error(apiErrorCode(error) || "Execution failed", apiError(error));
            queryClient.invalidateQueries({ queryKey: ["support"] });
        },
    });

    return (
        <tr className="border-t border-slate-100 dark:border-slate-900">
            <td className="px-4 py-3">
                <ActionTypeBadge value={request.action_type} />
                {!automated ? <div className="mt-1 text-xs font-semibold text-amber-600">Manual execution required</div> : null}
            </td>
            <td className="px-4 py-3">{request.ticket_id ? <Link className="text-dailyveg-700 dark:text-dailyveg-300" to={`/support/tickets/${request.ticket_id}`}>Open ticket</Link> : "—"}</td>
            <td className="px-4 py-3"><ReviewStatusBadge value={request.status} /></td>
            <td className="px-4 py-3"><ExecutionStatusBadge value={request.execution_status} /></td>
            <td className="px-4 py-3">{formatDate(request.created_at)}</td>
            <td className="px-4 py-3">{request.failure_code ? `${request.failure_code}: ${request.failure_message}` : "—"}</td>
            <td className="px-4 py-3 text-right">
                <Button
                    size="sm"
                    disabled={!manager || !automated || request.status !== "approved" || request.execution_status === "processing" || request.execution_status === "succeeded" || mutation.isPending}
                    onClick={() => mutation.mutate()}
                >
                    {automated ? "Execute" : "Manual Only"}
                </Button>
            </td>
        </tr>
    );
}
