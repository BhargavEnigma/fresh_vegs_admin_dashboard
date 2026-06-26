import { Bell, ExternalLink } from "lucide-react";
import { labelFor, NOTIFICATION_TYPES } from "./notification-utils";

export function NotificationPreview({ form }) {
    const title = form.title?.trim() || "Fresh offer from DailyVeg";
    const body = form.body?.trim() || "Your notification message preview will appear here.";
    const imageUrl = form.image_url?.trim();

    return (
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-3 shadow-2xl shadow-slate-300/50 dark:border-slate-800 dark:bg-black dark:shadow-black/40">
            <div className="rounded-[1.5rem] bg-slate-100 p-3 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>Now</span>
                    <span>DailyVeg</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    {imageUrl ? (
                        <div className="h-32 bg-slate-100 dark:bg-slate-900">
                            <img src={imageUrl} alt="Notification preview" className="h-full w-full object-cover" />
                        </div>
                    ) : null}

                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-dailyveg-500 text-white shadow-brand">
                                <Bell className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-950 dark:text-slate-50">DailyVeg</p>
                                    <span className="rounded-full bg-dailyveg-50 px-2 py-0.5 text-[10px] font-semibold text-dailyveg-800 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                        {labelFor(NOTIFICATION_TYPES, form.type)}
                                    </span>
                                </div>
                                <h3 className="mt-2 line-clamp-2 text-sm font-bold text-slate-950 dark:text-slate-50">{title}</h3>
                                <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{body}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="truncate">Deep link: {form.deep_link_type || "none"}{form.deep_link_value ? ` / ${form.deep_link_value}` : ""}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
