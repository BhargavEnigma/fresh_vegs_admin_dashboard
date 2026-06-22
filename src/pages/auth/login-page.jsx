// import * as React from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { sendOtpSchema, verifyOtpSchema } from "../../validations/auth";
// import { AccessDeniedError, sendOtp, verifyOtp } from "../../api/services/auth.service";
// import { useToast } from "../../components/toast/toast-context";
// import { useAuth } from "../../auth/auth-context";
// import { useNavigate } from "react-router-dom";

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
// import { Button } from "../../components/ui/button";
// import { Input } from "../../components/ui/input";
// import { Label } from "../../components/ui/label";

// import Image from "../../assets/logo-light-trans.png";
// import ImageDark from "../../assets/logo-dark-trans.png";

// function useActiveThemeLogo() {
//     const [isDark, setIsDark] = React.useState(() => {
//         if (typeof document === "undefined") return false;
//         return document.documentElement.classList.contains("dark");
//     });

//     React.useEffect(() => {
//         const root = document.documentElement;
//         const syncTheme = () => {
//             const storedTheme = localStorage.getItem("freshveg_admin_theme");

//             if (storedTheme === "dark") {
//                 root.classList.add("dark");
//             } else if (storedTheme === "light") {
//                 root.classList.remove("dark");
//             }

//             setIsDark(root.classList.contains("dark"));
//         };

//         syncTheme();

//         const observer = new MutationObserver(syncTheme);
//         observer.observe(root, {
//             attributes: true,
//             attributeFilter: ["class"],
//         });

//         return () => observer.disconnect();
//     }, []);

//     return isDark ? ImageDark : Image;
// }

// export function LoginPage() {
//     const [step, setStep] = React.useState("send"); // send | verify
//     const [otpRequestId, setOtpRequestId] = React.useState(null);
//     const [phone, setPhone] = React.useState("");
//     const [resendTimer, setResendTimer] = React.useState(0);

//     const logoSrc = useActiveThemeLogo();
//     const toast = useToast();
//     const { login, isAuthed } = useAuth();
//     const navigate = useNavigate();

//     const CONSOLE_ROLES = ["admin", "warehouse_manager"];

//     React.useEffect(() => {
//         if (isAuthed) navigate("/", { replace: true });
//     }, [isAuthed, navigate]);

//     React.useEffect(() => {
//         if (resendTimer <= 0) return;

//         const interval = setInterval(() => {
//             setResendTimer((prev) => Math.max(prev - 1, 0));
//         }, 1000);

//         return () => clearInterval(interval);
//     }, [resendTimer]);

//     const formattedResendTimer = React.useMemo(() => {
//         const minutes = Math.floor(resendTimer / 60);
//         const seconds = resendTimer % 60;

//         return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
//     }, [resendTimer]);

//     const sendForm = useForm({
//         resolver: zodResolver(sendOtpSchema),
//         defaultValues: { phone: "" },
//     });

//     const verifyForm = useForm({
//         resolver: zodResolver(verifyOtpSchema),
//         defaultValues: { otp_request_id: "", phone: "", otp: "" },
//     });

//     async function onSend(values) {
//         try {
//             const resp = await sendOtp(values);
//             const id = resp?.data?.otp_request_id;

//             if (!id) throw new Error("otp_request_id missing in response");

//             setOtpRequestId(id);
//             setPhone(values.phone);

//             verifyForm.setValue("otp_request_id", id);
//             verifyForm.setValue("phone", values.phone);
//             verifyForm.setValue("otp", "");

//             setStep("verify");
//             setResendTimer(60);

//             toast.push({
//                 variant: "success",
//                 title: "OTP sent",
//                 description: "Check your phone for OTP.",
//             });
//         } catch (e) {
//             const msg = e?.response?.data?.error?.message || e?.message || "Failed to send OTP";

//             toast.push({
//                 variant: "error",
//                 title: e instanceof AccessDeniedError ? "Access Denied Error" : "Send OTP failed",
//                 description: msg,
//             });
//         }
//     }

//     async function onVerify(values) {
//         try {
//             const resp = await verifyOtp(values);
//             const roles = resp?.data?.user?.roles || [];
//             const canAccessConsole = roles.some((role) => CONSOLE_ROLES.includes(role));

//             if (!canAccessConsole) {
//                 toast.push({
//                     variant: "error",
//                     title: "Access denied",
//                     description: "This account does not have admin or warehouse access.",
//                 });
//                 return;
//             }

//             login(resp);

//             toast.push({
//                 variant: "success",
//                 title: "Logged in",
//                 description: "Welcome back.",
//             });

//             navigate("/", { replace: true });
//         } catch (e) {
//             const msg = e?.response?.data?.error?.message || e?.message || "OTP verification failed";

//             toast.push({
//                 variant: "error",
//                 title: "Verify failed",
//                 description: msg,
//             });
//         }
//     }

//     function handleBackToSend() {
//         setStep("send");
//         setOtpRequestId(null);
//         setPhone("");
//         setResendTimer(0);
//         sendForm.reset();
//         verifyForm.reset();
//     }

//     function handleResendOtp() {
//         if (!phone || resendTimer > 0) return;

//         onSend({ phone });
//     }

//     return (
//         <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
//             <div className="mx-auto max-w-md">
//                 <div className="mb-6 text-center">
//                     <img src={logoSrc} alt="FreshVeg" className="m-auto w-60" />
//                     <div className="mt-1 text-sm text-slate-500">OTP login</div>
//                 </div>

//                 <Card>
//                     <CardHeader>
//                         <CardTitle>{step === "send" ? "Send OTP" : "Verify OTP"}</CardTitle>
//                         <CardDescription>
//                             {step === "send"
//                                 ? "Enter your phone number to receive an OTP."
//                                 : "Enter the OTP you received. Only admins / ops roles can access the console."}
//                         </CardDescription>
//                     </CardHeader>

//                     <CardContent>
//                         {step === "send" ? (
//                             <form onSubmit={sendForm.handleSubmit(onSend)} className="space-y-4">
//                                 <div className="space-y-2">
//                                     <Label>Phone</Label>
//                                     <Input
//                                         placeholder="91XXXXXXXXXX or XXXXXXXXXX"
//                                         {...sendForm.register("phone")}
//                                     />

//                                     {sendForm.formState.errors.phone ? (
//                                         <p className="text-xs text-red-600">
//                                             {sendForm.formState.errors.phone.message}
//                                         </p>
//                                     ) : null}
//                                 </div>

//                                 <Button
//                                     type="submit"
//                                     className="w-full"
//                                     disabled={sendForm.formState.isSubmitting}
//                                 >
//                                     {/* {sendForm.formState.isSubmitting ? "Sending…" : "Send OTP"} */}
//                                     Send OTP
//                                 </Button>
//                             </form>
//                         ) : (
//                             <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
//                                 <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/30">
//                                     OTP request:{" "}
//                                     <span className="font-mono text-xs">{otpRequestId}</span>
//                                     <div className="mt-1 text-xs text-slate-500">
//                                         Phone: {phone}
//                                     </div>
//                                 </div>

//                                 <input type="hidden" {...verifyForm.register("otp_request_id")} />
//                                 <input type="hidden" {...verifyForm.register("phone")} />

//                                 <div className="space-y-2">
//                                     <Label>OTP</Label>
//                                     <Input
//                                         placeholder="Enter OTP"
//                                         {...verifyForm.register("otp")}
//                                     />

//                                     {verifyForm.formState.errors.otp ? (
//                                         <p className="text-xs text-red-600">
//                                             {verifyForm.formState.errors.otp.message}
//                                         </p>
//                                     ) : null}
//                                 </div>

//                                 <div className="text-center text-sm">
//                                     {resendTimer > 0 ? (
//                                         <span className="text-slate-500">
//                                             Resend OTP in {formattedResendTimer}
//                                         </span>
//                                     ) : (
//                                         <button
//                                             type="button"
//                                             className="font-medium text-slate-900 hover:underline dark:text-slate-100"
//                                             onClick={handleResendOtp}
//                                             disabled={sendForm.formState.isSubmitting}
//                                         >
//                                             {sendForm.formState.isSubmitting ? "Sending…" : "Resend OTP"}
//                                         </button>
//                                     )}
//                                 </div>

//                                 <div className="flex gap-2">
//                                     <Button
//                                         type="button"
//                                         variant="outline"
//                                         className="w-full"
//                                         onClick={handleBackToSend}
//                                         disabled={verifyForm.formState.isSubmitting}
//                                     >
//                                         Back
//                                     </Button>

//                                     <Button
//                                         type="submit"
//                                         className="w-full"
//                                         disabled={verifyForm.formState.isSubmitting}
//                                     >
//                                         {verifyForm.formState.isSubmitting
//                                             ? "Verifying…"
//                                             : "Verify & Login"}
//                                     </Button>
//                                 </div>
//                             </form>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <div className="mt-6 text-center text-xs text-slate-500">
//                     Tip: In non-production, OTP bypass may be enabled in backend env.
//                 </div>
//             </div>
//         </div>
//     );
// }



import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usernamePasswordLoginSchema } from "../../validations/auth";
import { AccessDeniedError, loginWithPassword } from "../../api/services/auth.service";
import { useToast } from "../../components/toast/toast-context";
import { useAuth } from "../../auth/auth-context";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

import Image from "../../assets/logo-light-trans.png";
import ImageDark from "../../assets/logo-dark-trans.png";
import { Eye, EyeOff } from "lucide-react";

function useActiveThemeLogo() {
    const [isDark, setIsDark] = React.useState(() => {
        if (typeof document === "undefined") return false;
        return document.documentElement.classList.contains("dark");
    });

    React.useEffect(() => {
        const root = document.documentElement;

        const syncTheme = () => {
            const storedTheme = localStorage.getItem("freshveg_admin_theme");

            if (storedTheme === "dark") root.classList.add("dark");
            else if (storedTheme === "light") root.classList.remove("dark");

            setIsDark(root.classList.contains("dark"));
        };

        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(root, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return isDark ? ImageDark : Image;
}

export function LoginPage() {
    const logoSrc = useActiveThemeLogo();
    const toast = useToast();
    const { login, isAuthed } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = React.useState(false);
    const [isBlocked, setIsBlocked] = React.useState(false);
    const [blockUntil, setBlockUntil] = React.useState(0);

    const CONSOLE_ROLES = ["admin", "warehouse_manager"];

    React.useEffect(() => {
        if (isAuthed) navigate("/", { replace: true });
    }, [isAuthed, navigate]);

    const loginForm = useForm({
        resolver: zodResolver(usernamePasswordLoginSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    // login attempt throttling state stored per-session
    React.useEffect(() => {
        try {
            const raw = sessionStorage.getItem("login_failed_v1");
            if (!raw) return;
            const obj = JSON.parse(raw);
            const until = obj?.blockUntil || 0;
            if (until > Date.now()) {
                setIsBlocked(true);
                setBlockUntil(until);
            }
        } catch {
            // ignore
        }
    }, []);

    const [remainingMs, setRemainingMs] = React.useState(() => Math.max(0, blockUntil - Date.now()));

    React.useEffect(() => {
        if (!isBlocked) return;
        setRemainingMs(Math.max(0, blockUntil - Date.now()));
        const t = setInterval(() => {
            const rem = Math.max(0, blockUntil - Date.now());
            setRemainingMs(rem);
            if (rem <= 0) {
                setIsBlocked(false);
                sessionStorage.removeItem("login_failed_v1");
                clearInterval(t);
            }
        }, 1000);

        return () => clearInterval(t);
    }, [isBlocked, blockUntil]);

    async function onLogin(values) {
        try {
            const resp = await loginWithPassword(values);

            const payload = resp?.data?.data;
            const roles = payload?.user?.roles || [];

            const canAccessConsole = roles.some((role) =>
                CONSOLE_ROLES.includes(String(role).toLowerCase())
            );

            if (!canAccessConsole) {
                toast.push({
                    variant: "error",
                    title: "Access denied",
                    description: "This account does not have admin or warehouse access.",
                });
                return;
            }

            login({
                data: payload,
            });

            toast.push({
                variant: "success",
                title: "Logged in",
                description: "Welcome back.",
            });

            navigate("/", { replace: true });
        } catch (e) {
            // Increase failed attempt counter and apply exponential backoff per-session
            try {
                const raw = sessionStorage.getItem("login_failed_v1");
                const obj = raw ? JSON.parse(raw) : { attempts: 0 };
                obj.attempts = (obj.attempts || 0) + 1;

                const baseDelay = 2000; // 2 seconds
                const maxDelay = 5 * 60 * 1000; // 5 minutes
                const delay = Math.min(Math.pow(2, Math.min(obj.attempts, 6)) * baseDelay, maxDelay);
                const until = Date.now() + delay;
                obj.blockUntil = until;
                sessionStorage.setItem("login_failed_v1", JSON.stringify(obj));
                setIsBlocked(true);
                setBlockUntil(until);
            } catch {
                // ignore storage errors
            }

            // For security, avoid echoing server error details that enable username enumeration.
            if (e instanceof AccessDeniedError) {
                toast.push({ variant: "error", title: "Access denied", description: e.message });
            } else if (e?.response?.status === 401) {
                toast.push({ variant: "error", title: "Login failed", description: "Invalid username or password." });
            } else {
                toast.push({ variant: "error", title: "Login failed", description: "Login failed, please try again later." });
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
            <div className="mx-auto max-w-md">
                <div className="mb-6 text-center">
                    <img src={logoSrc} alt="DailyVeg" className="m-auto w-60" />
                    <div className="mt-1 text-sm text-slate-500">
                        Admin login
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                            Enter your username and password. Only admins / ops roles can access the console.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    placeholder="Enter username"
                                    autoComplete="username"
                                    {...loginForm.register("username")}
                                />

                                {loginForm.formState.errors.username ? (
                                    <p className="text-xs text-red-600">
                                        {loginForm.formState.errors.username.message}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label>Password</Label>

                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter password"
                                        autoComplete="current-password"
                                        className="pr-10"
                                        {...loginForm.register("password")}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {loginForm.formState.errors.password ? (
                                    <p className="text-xs text-red-600">
                                        {loginForm.formState.errors.password.message}
                                    </p>
                                ) : null}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loginForm.formState.isSubmitting || isBlocked}
                            >
                                {loginForm.formState.isSubmitting ? "Logging in…" : "Login"}
                            </Button>

                            {isBlocked ? (
                                <p className="mt-2 text-center text-xs text-red-600">
                                    Too many failed attempts. Try again in {new Date(remainingMs).toISOString().substr(14, 5)}.
                                </p>
                            ) : null}
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-6 text-center text-xs text-slate-500">
                    Use your admin username and password to access the console.
                </div>
            </div>
        </div>
    );
}