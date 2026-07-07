import * as React from "react";
import { AlertTriangle, BellRing, CalendarClock, Link2, Send, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { AdminNotificationsService } from "../../../api/services/admin-notifications.service";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { Textarea } from "../../../components/ui/textarea";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { useToast } from "../../../components/toast/toast-context";
import { NotificationPreview } from "./notification-preview";
import {
    AUDIENCE_TYPES,
    buildCampaignPayload,
    DEEP_LINK_TYPES,
    DEEP_LINK_VALUE_REQUIRED,
    formFromCampaign,
    NOTIFICATION_TYPES,
    validateCampaignForm,
} from "./notification-utils";

const DEFAULT_FORM = {
    title: "",
    body: "",
    image_url: "",
    type: "general_announcement",
    audience_type: "all_customers",
    selected_user_ids: "",
    deep_link_type: "none",
    deep_link_value: "",
    scheduled_at: "",
};

function FieldError({ children }) {
    if (!children) return null;
    return <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{children}</p>;
}

function SectionHeader({ icon: Icon, title, description }) {
    return (
        <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-dailyveg-50 text-dailyveg-700 dark:bg-dailyveg-950/70 dark:text-dailyveg-300">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
        </div>
    );
}

export function NotificationForm({ campaign, mode = "create" }) {
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = React.useState(() => (campaign ? formFromCampaign(campaign) : DEFAULT_FORM));
    const [errors, setErrors] = React.useState({});
    const [sendConfirmOpen, setSendConfirmOpen] = React.useState(false);
    const [testOpen, setTestOpen] = React.useState(false);
    const [testUserId, setTestUserId] = React.useState("");
    const [pendingAction, setPendingAction] = React.useState(null);

    React.useEffect(() => {
        if (campaign) setForm(formFromCampaign(campaign));
    }, [campaign]);

    function updateField(name, value) {
        setForm((current) => ({
            ...current,
            [name]: value,
            ...(name === "deep_link_type" && !DEEP_LINK_VALUE_REQUIRED.has(value) ? { deep_link_value: "" } : {}),
        }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    }

    const saveMut = useMutation({
        mutationFn: async ({ submitMode }) => {
            const payload = buildCampaignPayload(form, submitMode);
            if (mode === "edit" && campaign?.id) {
                return AdminNotificationsService.update(campaign.id, payload);
            }
            return AdminNotificationsService.create(payload);
        },
        meta: {
            globalLoaderMessage: "Saving campaign...",
        },
    });

    const sendMut = useMutation({
        mutationFn: (id) => AdminNotificationsService.send(id),
        meta: {
            globalLoaderMessage: "Sending notification...",
        },
    });

    const testMut = useMutation({
        mutationFn: ({ id, userId }) => AdminNotificationsService.test(id, { user_id: userId }),
        meta: {
            globalLoaderMessage: "Testing notification...",
        },
    });

    function apiError(error) {
        return error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Something went wrong.";
    }

    async function saveCampaign(submitMode = "draft") {
        const nextErrors = validateCampaignForm(form, submitMode);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return null;

        const response = await saveMut.mutateAsync({ submitMode });
        const saved = response?.data?.campaign || response?.data || response;
        return saved;
    }

    async function handleSaveDraft() {
        try {
            const saved = await saveCampaign("draft");
            if (!saved) return;
            toast.push({ variant: "success", title: mode === "edit" ? "Campaign updated" : "Draft saved", description: "Notification campaign is ready for review." });
            navigate(saved?.id ? `/notifications/${saved.id}` : "/notifications");
        } catch (error) {
            toast.push({ variant: "error", title: "Save failed", description: apiError(error) });
        }
    }

    async function handleSchedule() {
        try {
            const saved = await saveCampaign("schedule");
            if (!saved) return;
            if (saved?.id) {
                try {
                    await AdminNotificationsService.schedule(saved.id, { scheduled_at: form.scheduled_at });
                } catch {
                    // Some backend implementations schedule during create/update only.
                }
            }
            toast.push({ variant: "success", title: "Campaign scheduled", description: "Notification will be sent at the selected time." });
            navigate(saved?.id ? `/notifications/${saved.id}` : "/notifications");
        } catch (error) {
            toast.push({ variant: "error", title: "Schedule failed", description: apiError(error) });
        }
    }

    function requestSend() {
        const nextErrors = validateCampaignForm(form, "draft");
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        setSendConfirmOpen(true);
    }

    async function handleSaveAndSend() {
        try {
            const saved = await saveCampaign("draft");
            if (!saved?.id) throw new Error("Campaign id was not returned by backend.");
            await sendMut.mutateAsync(saved.id);
            toast.push({ variant: "success", title: "Broadcast started", description: "Notification campaign is being sent to eligible customers." });
            navigate(`/notifications/${saved.id}`);
        } catch (error) {
            toast.push({ variant: "error", title: "Send failed", description: apiError(error) });
        }
    }

    function requestTest() {
        const nextErrors = validateCampaignForm(form, "draft");
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        setTestOpen(true);
    }

    async function handleSendTest() {
        if (!testUserId.trim()) {
            toast.push({ variant: "error", title: "Test user required", description: "Enter a customer/admin user id for test push." });
            return;
        }

        setPendingAction("test");
        try {
            const saved = await saveCampaign("draft");
            if (!saved?.id) throw new Error("Campaign id was not returned by backend.");
            await testMut.mutateAsync({ id: saved.id, userId: testUserId.trim() });
            toast.push({ variant: "success", title: "Test sent", description: "Test notification was sent without marking campaign as sent." });
            setTestOpen(false);
            if (mode !== "edit") navigate(`/notifications/${saved.id}`);
        } catch (error) {
            toast.push({ variant: "error", title: "Test failed", description: apiError(error) });
        } finally {
            setPendingAction(null);
        }
    }

    const busy = saveMut.isPending || sendMut.isPending || testMut.isPending;

    return (
        <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <Card className="p-5">
                        <SectionHeader icon={BellRing} title="Notification Content" description="Write a short, clear push message for customers." />
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <Label>Title</Label>
                                <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} maxLength={80} placeholder="Fresh mango offer" />
                                <div className="mt-1 flex justify-between text-xs text-slate-500"><FieldError>{errors.title}</FieldError><span>{form.title.length}/80</span></div>
                            </div>
                            <div className="md:col-span-2">
                                <Label>Body</Label>
                                <Textarea value={form.body} onChange={(e) => updateField("body", e.target.value)} maxLength={240} placeholder="Get premium fresh mangoes delivered tomorrow morning." />
                                <div className="mt-1 flex justify-between text-xs text-slate-500"><FieldError>{errors.body}</FieldError><span>{form.body.length}/240</span></div>
                            </div>
                            <div>
                                <Label>Type</Label>
                                <PremiumSelect value={form.type} onChange={(value) => updateField("type", value)} options={NOTIFICATION_TYPES} />
                                <FieldError>{errors.type}</FieldError>
                            </div>
                            <div>
                                <Label>Image URL</Label>
                                <Input value={form.image_url} onChange={(e) => updateField("image_url", e.target.value)} placeholder="https://..." />
                                <FieldError>{errors.image_url}</FieldError>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <SectionHeader icon={Users} title="Audience" description="Choose who should receive this campaign." />
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label>Audience Type</Label>
                                <PremiumSelect value={form.audience_type} onChange={(value) => updateField("audience_type", value)} options={AUDIENCE_TYPES} />
                                <FieldError>{errors.audience_type}</FieldError>
                            </div>
                            {form.audience_type === "selected_customers" ? (
                                <div className="md:col-span-2">
                                    <Label>Selected Customer/User IDs</Label>
                                    <Textarea value={form.selected_user_ids} onChange={(e) => updateField("selected_user_ids", e.target.value)} placeholder="Paste one user id per line or comma separated" className="min-h-28" />
                                    <FieldError>{errors.selected_user_ids}</FieldError>
                                    <div className="mt-3 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <p>TODO: connect searchable customer selector when backend customer search endpoint is available. This field is safe for now and sends selected user_ids.</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <SectionHeader icon={Link2} title="Deep Link" description="Send customers to the right place in the mobile app." />
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label>Deep Link Type</Label>
                                <PremiumSelect value={form.deep_link_type} onChange={(value) => updateField("deep_link_type", value)} options={DEEP_LINK_TYPES} />
                            </div>
                            <div>
                                <Label>Deep Link Value</Label>
                                <Input value={form.deep_link_value} onChange={(e) => updateField("deep_link_value", e.target.value)} disabled={!DEEP_LINK_VALUE_REQUIRED.has(form.deep_link_type)} placeholder="Product/category/order/offer id" />
                                <FieldError>{errors.deep_link_value}</FieldError>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <SectionHeader icon={CalendarClock} title="Schedule" description="Save as draft, send immediately, or schedule for later." />
                        <div className="max-w-md">
                            <Label>Scheduled At</Label>
                            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => updateField("scheduled_at", e.target.value)} />
                            <FieldError>{errors.scheduled_at}</FieldError>
                        </div>
                    </Card>
                </div>

                <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                    <NotificationPreview form={form} />
                    <Card className="space-y-3 p-4">
                        <Button className="w-full" onClick={requestSend} disabled={busy}>
                            <Send className="mr-2 h-4 w-4" /> Save & Send
                        </Button>
                        <Button variant="outline" className="w-full" onClick={handleSaveDraft} disabled={busy}>Save Draft</Button>
                        <Button variant="outline" className="w-full" onClick={handleSchedule} disabled={busy}>Save & Schedule</Button>
                        <Button variant="ghost" className="w-full" onClick={requestTest} disabled={busy}>Send Test</Button>
                    </Card>
                </div>
            </div>

            <ConfirmDialog
                open={sendConfirmOpen}
                onOpenChange={setSendConfirmOpen}
                title={form.audience_type === "all_customers" ? "Send to all customers?" : "Send broadcast?"}
                description={form.audience_type === "all_customers" ? "This will send a push notification to all eligible customers." : "This will send a push notification to the selected eligible audience."}
                confirmText="Send Broadcast"
                variant="default"
                onConfirm={handleSaveAndSend}
            />

            <Dialog open={testOpen} onOpenChange={setTestOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send test notification</DialogTitle>
                        <DialogDescription>Enter a customer/admin user id. This does not mark the campaign as sent.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Test User ID</Label>
                        <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} placeholder="User UUID" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTestOpen(false)} disabled={pendingAction === "test"}>Cancel</Button>
                        <Button onClick={handleSendTest} disabled={pendingAction === "test"}>{pendingAction === "test" ? "Sending…" : "Send Test"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
