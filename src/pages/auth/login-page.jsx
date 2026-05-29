import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendOtpSchema, verifyOtpSchema } from "../../validations/auth";
import { sendOtp, verifyOtp } from "../../api/services/auth.service";
import { useToast } from "../../components/toast/toast-context";
import { useAuth } from "../../auth/auth-context";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

import Image from "../../assets/logo-bg.png";
import ImageDark from "../../assets/logo-bg-dark.png";

export function LoginPage() {
    const [step, setStep] = React.useState("send"); // send | verify
    const [otpRequestId, setOtpRequestId] = React.useState(null);
    const [phone, setPhone] = React.useState("");
    const [resendTimer, setResendTimer] = React.useState(0);

    const stored = localStorage.getItem("freshveg_admin_theme");
    const toast = useToast();
    const { login, isAuthed } = useAuth();
    const navigate = useNavigate();

    const CONSOLE_ROLES = ["admin", "warehouse_manager"];

    React.useEffect(() => {
        if (isAuthed) navigate("/", { replace: true });
    }, [isAuthed, navigate]);

    React.useEffect(() => {
        console.log("ppppppp");
        
    }, []);

    React.useEffect(() => {
        if (resendTimer <= 0) return;

        const interval = setInterval(() => {
            setResendTimer((prev) => Math.max(prev - 1, 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [resendTimer]);

    const formattedResendTimer = React.useMemo(() => {
        const minutes = Math.floor(resendTimer / 60);
        const seconds = resendTimer % 60;

        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, [resendTimer]);

    const sendForm = useForm({
        resolver: zodResolver(sendOtpSchema),
        defaultValues: { phone: "" },
    });

    const verifyForm = useForm({
        resolver: zodResolver(verifyOtpSchema),
        defaultValues: { otp_request_id: "", phone: "", otp: "" },
    });

    async function onSend(values) {
        console.log("SEND OTP CLICKED", values);
        try {
            const resp = await sendOtp(values);
            const id = resp?.data?.otp_request_id;

            if (!id) throw new Error("otp_request_id missing in response");

            setOtpRequestId(id);
            setPhone(values.phone);

            verifyForm.setValue("otp_request_id", id);
            verifyForm.setValue("phone", values.phone);
            verifyForm.setValue("otp", "");

            setStep("verify");
            setResendTimer(60);

            toast.push({
                variant: "success",
                title: "OTP sent",
                description: "Check your phone for OTP.",
            });
        } catch (e) {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed to send OTP";

            toast.push({
                variant: "error",
                title: "Send OTP failed",
                description: msg,
            });
        }
    }

    async function onVerify(values) {
        try {
            const resp = await verifyOtp(values);
            const roles = resp?.data?.user?.roles || [];
            const canAccessConsole = roles.some((role) => CONSOLE_ROLES.includes(role));

            if (!canAccessConsole) {
                toast.push({
                    variant: "error",
                    title: "Access denied",
                    description: "This account does not have admin or warehouse access.",
                });
                return;
            }

            login(resp);

            toast.push({
                variant: "success",
                title: "Logged in",
                description: "Welcome back.",
            });

            navigate("/", { replace: true });
        } catch (e) {
            const msg = e?.response?.data?.error?.message || e?.message || "OTP verification failed";

            toast.push({
                variant: "error",
                title: "Verify failed",
                description: msg,
            });
        }
    }

    function handleBackToSend() {
        setStep("send");
        setOtpRequestId(null);
        setPhone("");
        setResendTimer(0);
        sendForm.reset();
        verifyForm.reset();
    }

    function handleResendOtp() {
        if (!phone || resendTimer > 0) return;

        onSend({ phone });
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
            <div className="mx-auto max-w-md">
                <div className="mb-6 text-center">
                    {/* <div className="text-2xl font-bold tracking-tight"></div> */}
                    {stored === "dark" ? <img src={ImageDark} alt="FreshVeg" className="w-60 m-auto" /> : <img src={Image} alt="FreshVeg" className="w-60 m-auto" />}
                    <div className="mt-1 text-sm text-slate-500">OTP login</div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{step === "send" ? "Send OTP" : "Verify OTP"}</CardTitle>
                        <CardDescription>
                            {step === "send"
                                ? "Enter your phone number to receive an OTP."
                                : "Enter the OTP you received. Only admins / ops roles can access the console."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {step === "send" ? (
                            <form onSubmit={sendForm.handleSubmit(onSend)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        placeholder="91XXXXXXXXXX or XXXXXXXXXX"
                                        {...sendForm.register("phone")}
                                    />

                                    {sendForm.formState.errors.phone ? (
                                        <p className="text-xs text-red-600">
                                            {sendForm.formState.errors.phone.message}
                                        </p>
                                    ) : null}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={sendForm.formState.isSubmitting}
                                >
                                    {/* {sendForm.formState.isSubmitting ? "Sending…" : "Send OTP"} */}
                                    Send OTP
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/30">
                                    OTP request:{" "}
                                    <span className="font-mono text-xs">{otpRequestId}</span>
                                    <div className="mt-1 text-xs text-slate-500">
                                        Phone: {phone}
                                    </div>
                                </div>

                                <input type="hidden" {...verifyForm.register("otp_request_id")} />
                                <input type="hidden" {...verifyForm.register("phone")} />

                                <div className="space-y-2">
                                    <Label>OTP</Label>
                                    <Input
                                        placeholder="Enter OTP"
                                        {...verifyForm.register("otp")}
                                    />

                                    {verifyForm.formState.errors.otp ? (
                                        <p className="text-xs text-red-600">
                                            {verifyForm.formState.errors.otp.message}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="text-center text-sm">
                                    {resendTimer > 0 ? (
                                        <span className="text-slate-500">
                                            Resend OTP in {formattedResendTimer}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                                            onClick={handleResendOtp}
                                            disabled={sendForm.formState.isSubmitting}
                                        >
                                            {sendForm.formState.isSubmitting ? "Sending…" : "Resend OTP"}
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleBackToSend}
                                        disabled={verifyForm.formState.isSubmitting}
                                    >
                                        Back
                                    </Button>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={verifyForm.formState.isSubmitting}
                                    >
                                        {verifyForm.formState.isSubmitting
                                            ? "Verifying…"
                                            : "Verify & Login"}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-6 text-center text-xs text-slate-500">
                    Tip: In non-production, OTP bypass may be enabled in backend env.
                </div>
            </div>
        </div>
    );
}