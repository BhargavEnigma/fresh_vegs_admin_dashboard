import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";

import { AdminNotificationsService } from "../../../api/services/admin-notifications.service";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { NotificationForm } from "./notification-form";
import { campaignFromResponse, EDITABLE_STATUSES } from "./notification-utils";

export function NotificationsEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useQuery({
        queryKey: ["notification-campaign", id],
        queryFn: () => AdminNotificationsService.getById(id),
        enabled: Boolean(id),
    });
    const campaign = campaignFromResponse(data);
    const editable = EDITABLE_STATUSES.has(String(campaign?.status || "draft"));

    if (isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;
    if (isError || !campaign) {
        return <Card className="p-8 text-center text-slate-500">Campaign not found.</Card>;
    }
    if (!editable) {
        return (
            <Card className="mx-auto max-w-xl p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900">
                    <Lock className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-50">Campaign is locked</h1>
                <p className="mt-2 text-sm text-slate-500">Only draft or scheduled campaigns can be edited.</p>
                <Button className="mt-5" onClick={() => navigate(`/notifications/${id}`)}>View Details</Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link to={`/notifications/${id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Edit Notification</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update this campaign before sending.</p>
            </div>
            <NotificationForm campaign={campaign} mode="edit" />
        </div>
    );
}
