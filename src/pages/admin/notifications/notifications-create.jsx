import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { NotificationForm } from "./notification-form";

export function NotificationsCreatePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
                        <Link to="/notifications"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Create Notification</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create, preview, test, schedule, or send a broadcast campaign.</p>
                </div>
            </div>
            <NotificationForm />
        </div>
    );
}
