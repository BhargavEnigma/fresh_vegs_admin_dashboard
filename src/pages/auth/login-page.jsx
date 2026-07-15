import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Mail, Phone, ShieldCheck } from "lucide-react";
import { AccessDeniedError, loginWithPassword, sendOtp, verifyOtp } from "../../api/services/auth.service";
import { useAuth } from "../../auth/auth-context";
import { passwordLoginSchema, sendOtpSchema, verifyOtpSchema } from "../../validations/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { PasswordField } from "../../components/auth/password-field";
import Image from "../../assets/logo-light-trans.png";
import ImageDark from "../../assets/logo-dark-trans.png";
import { useGlobalLoader } from "../../components/common/global-loader-context";

const ACCESS_DENIED_MESSAGE = "This account does not have access to the admin panel.";

function useActiveThemeLogo() {
  const [isDark, setIsDark] = React.useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  React.useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      const storedTheme = localStorage.getItem("freshveg_admin_theme");
      if (storedTheme === "dark") root.classList.add("dark");
      if (storedTheme === "light") root.classList.remove("dark");
      setIsDark(root.classList.contains("dark"));
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark ? ImageDark : Image;
}

function maskPhone(phone) {
  const nationalNumber = phone.startsWith("91") && phone.length === 12 ? phone.slice(2) : phone;
  return `+91 ••••••${nationalNumber.slice(-4)}`;
}

function formatCountdown(seconds) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function getAuthErrorMessage(error, phase) {
  if (error instanceof AccessDeniedError || error?.code === "ACCESS_DENIED") return ACCESS_DENIED_MESSAGE;
  const status = error?.response?.status;
  if (phase === "send" && [401, 403, 404].includes(status)) return ACCESS_DENIED_MESSAGE;
  if (status === 403) return ACCESS_DENIED_MESSAGE;
  if (status === 429) return "Too many attempts. Please wait before trying again.";
  if (status >= 500) return "The login service is temporarily unavailable. Please try again.";
  if (phase === "verify" && [400, 401].includes(status)) return "The OTP is invalid or has expired. Request a new OTP and try again.";
  if (status === 400) return "Check the phone number and try again.";
  return phase === "verify" ? "We could not verify the OTP. Please try again." : "We could not send an OTP. Please try again.";
}

export function getPasswordLoginErrorMessage(error) {
  if (error instanceof AccessDeniedError || error?.code === "ACCESS_DENIED") return ACCESS_DENIED_MESSAGE;
  const code = error?.response?.data?.error?.code;
  if (code === "INVALID_CREDENTIALS" || error?.response?.status === 401) return "Phone/email or password is incorrect.";
  if (["TOO_MANY_LOGIN_ATTEMPTS", "PASSWORD_LOGIN_RATE_LIMITED", "RATE_LIMITED"].includes(code) || error?.response?.status === 429) return "Too many login attempts. Please wait before trying again.";
  if (code === "USER_BLOCKED") return "This account is currently blocked. Contact the system administrator.";
  return "Unable to sign in right now. Check your connection and try again.";
}

export function LoginPage() {
  const logoSrc = useActiveThemeLogo();
  const { login, isAuthenticated } = useAuth();
  const { withLoader } = useGlobalLoader();
  const navigate = useNavigate();
  const location = useLocation();
  const otpInputRef = React.useRef(null);
  const [loginMethod, setLoginMethod] = React.useState("password");
  const [otpStep, setOtpStep] = React.useState("phone");
  const [phone, setPhone] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState(0);
  const [resendAvailableAt, setResendAvailableAt] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());
  const [requestError, setRequestError] = React.useState("");
  const [isResending, setIsResending] = React.useState(false);
  const [showPasswordChangedNotice] = React.useState(() => Boolean(location.state?.passwordChanged));
  const requestedDestination = location.state?.from;
  const destination = typeof requestedDestination === "string" && requestedDestination.startsWith("/") ? requestedDestination : "/";

  const passwordLoginForm = useForm({ resolver: zodResolver(passwordLoginSchema), defaultValues: { identifier: "", password: "" } });
  const otpPhoneForm = useForm({ resolver: zodResolver(sendOtpSchema), defaultValues: { phone: "" } });
  const otpVerifyForm = useForm({ resolver: zodResolver(verifyOtpSchema), defaultValues: { otp_request_id: "", phone: "", otp: "" } });
  const identifier = passwordLoginForm.watch("identifier");

  React.useEffect(() => { if (isAuthenticated) navigate(destination, { replace: true }); }, [destination, isAuthenticated, navigate]);
  React.useEffect(() => {
    if (location.state?.passwordChanged) navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state?.passwordChanged, navigate]);
  React.useEffect(() => {
    if (otpStep !== "verify" || loginMethod !== "otp") return undefined;
    otpInputRef.current?.focus();
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [otpStep, loginMethod]);

  const expirySeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const otpRegistration = otpVerifyForm.register("otp");

  function switchMethod(method) {
    if (method === loginMethod) return;
    setRequestError("");
    if (method === "otp") passwordLoginForm.reset({ identifier: "", password: "" });
    setLoginMethod(method);
  }

  async function handlePasswordLogin(values) {
    setRequestError("");
    try {
      const response = await withLoader(loginWithPassword(values), "Signing in securely...");
      passwordLoginForm.setValue("password", "");
      login(response);
      navigate(destination, { replace: true });
    } catch (error) {
      passwordLoginForm.setValue("password", "", { shouldValidate: false });
      setRequestError(getPasswordLoginErrorMessage(error));
    }
  }

  function applyOtpResponse(response, submittedPhone) {
    const data = response?.data;
    const requestId = data?.otp_request_id;
    const expiresInSeconds = Number(data?.expires_in_seconds);
    if (!requestId || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) throw new Error("Invalid OTP response");
    const timestamp = Date.now();
    setPhone(submittedPhone);
    setExpiresAt(timestamp + expiresInSeconds * 1000);
    setResendAvailableAt(timestamp + Math.min(60, expiresInSeconds) * 1000);
    setNow(timestamp);
    otpVerifyForm.reset({ otp_request_id: requestId, phone: submittedPhone, otp: "" });
    setRequestError("");
    setOtpStep("verify");
  }

  async function handleContinue(values) {
    setRequestError("");
    try { applyOtpResponse(await withLoader(sendOtp(values), "Checking access..."), values.phone); }
    catch (error) { setRequestError(getAuthErrorMessage(error, "send")); }
  }
  async function handleVerify(values) {
    setRequestError("");
    try { const response = await withLoader(verifyOtp(values), "Verifying OTP..."); login(response); navigate(destination, { replace: true }); }
    catch (error) {
      if ([400, 401].includes(error?.response?.status)) { otpVerifyForm.setValue("otp", "", { shouldValidate: false }); window.requestAnimationFrame(() => otpInputRef.current?.focus()); }
      setRequestError(getAuthErrorMessage(error, "verify"));
    }
  }
  async function handleResend() {
    if (!phone || resendSeconds > 0 || isResending) return;
    setIsResending(true); setRequestError("");
    try { applyOtpResponse(await withLoader(sendOtp({ phone }), "Resending OTP..."), phone); }
    catch (error) { setRequestError(getAuthErrorMessage(error, "send")); }
    finally { setIsResending(false); }
  }
  function handleChangePhone() {
    setOtpStep("phone"); setExpiresAt(0); setResendAvailableAt(0); setRequestError(""); otpVerifyForm.reset();
    window.requestAnimationFrame(() => otpPhoneForm.setFocus("phone"));
  }

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-slate-50 px-3 py-8 dark:bg-slate-950 sm:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(76,174,57,0.14),_transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-5 text-center"><img src={logoSrc} alt="DailyVeg" className="m-auto w-52 sm:w-60" /><p className="mt-1 text-sm font-medium text-slate-500">Admin / Operations</p></div>
        {showPasswordChangedNotice ? <div role="status" className="mb-4 rounded-xl border border-dailyveg-200 bg-dailyveg-50 p-3 text-sm text-dailyveg-800 dark:border-dailyveg-800 dark:bg-dailyveg-950/60 dark:text-dailyveg-200">Your password was changed successfully. Sign in again with your new password.</div> : null}
        <Card className="border-slate-200/80 shadow-xl shadow-dailyveg-900/5 dark:border-slate-800">
          <CardHeader className="pb-4"><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300"><ShieldCheck className="h-5 w-5" /></div><CardTitle>{loginMethod === "password" ? "Welcome back" : otpStep === "phone" ? "Sign in with OTP" : "Enter your OTP"}</CardTitle><CardDescription>{loginMethod === "password" ? "Use your authorized phone number or email." : otpStep === "phone" ? "Use the Indian mobile number linked to your account." : `We sent a one-time password to ${maskPhone(phone)}.`}</CardDescription></CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900" role="group" aria-label="Login method">
              {[{ id: "password", label: "Password", icon: KeyRound }, { id: "otp", label: "OTP", icon: Phone }].map((method) => <button key={method.id} type="button" aria-pressed={loginMethod === method.id} onClick={() => switchMethod(method.id)} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dailyveg-500/40 ${loginMethod === method.id ? "bg-white text-dailyveg-700 shadow-sm dark:bg-slate-800 dark:text-dailyveg-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}><method.icon className="h-4 w-4" />{method.label}</button>)}
            </div>
            {requestError ? <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{requestError}</div> : null}
            {loginMethod === "password" ? (
              <form onSubmit={passwordLoginForm.handleSubmit(handlePasswordLogin)} className="space-y-4" noValidate>
                <div className="space-y-2"><Label htmlFor="identifier">Phone number or email</Label><div className="relative">{identifier?.includes("@") ? <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /> : <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}<Input id="identifier" autoComplete="username" placeholder="admin@dailyveg.co.in or 9990000001" className="pl-10" aria-invalid={Boolean(passwordLoginForm.formState.errors.identifier)} aria-describedby={passwordLoginForm.formState.errors.identifier ? "identifier-error" : undefined} {...passwordLoginForm.register("identifier")} /></div>{passwordLoginForm.formState.errors.identifier ? <p id="identifier-error" role="alert" className="text-xs text-red-600">{passwordLoginForm.formState.errors.identifier.message}</p> : null}</div>
                <PasswordField id="login-password" label="Password" error={passwordLoginForm.formState.errors.password} {...passwordLoginForm.register("password")} />
                <Button type="submit" className="w-full" disabled={passwordLoginForm.formState.isSubmitting}>{passwordLoginForm.formState.isSubmitting ? "Signing in…" : "Sign in securely"}</Button>
              </form>
            ) : otpStep === "phone" ? (
              <form onSubmit={otpPhoneForm.handleSubmit(handleContinue)} className="space-y-4" noValidate><div className="space-y-2"><Label htmlFor="phone">Indian mobile number</Label><Input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9876543210" maxLength={12} aria-invalid={Boolean(otpPhoneForm.formState.errors.phone)} {...otpPhoneForm.register("phone")} /><p className="text-xs text-slate-500">Enter 10 digits, or 12 digits beginning with 91.</p>{otpPhoneForm.formState.errors.phone ? <p role="alert" className="text-xs text-red-600">{otpPhoneForm.formState.errors.phone.message}</p> : null}</div><Button type="submit" className="w-full" disabled={otpPhoneForm.formState.isSubmitting}>{otpPhoneForm.formState.isSubmitting ? "Checking access…" : "Continue"}</Button></form>
            ) : (
              <form onSubmit={otpVerifyForm.handleSubmit(handleVerify)} className="space-y-4" noValidate><input type="hidden" {...otpVerifyForm.register("otp_request_id")} /><input type="hidden" {...otpVerifyForm.register("phone")} /><div className="space-y-2"><Label htmlFor="otp">One-time password</Label><Input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} placeholder="Enter the 4–8 digit OTP." aria-invalid={Boolean(otpVerifyForm.formState.errors.otp)} {...otpRegistration} ref={(element) => { otpRegistration.ref(element); otpInputRef.current = element; }} />{otpVerifyForm.formState.errors.otp ? <p role="alert" className="text-xs text-red-600">{otpVerifyForm.formState.errors.otp.message}</p> : null}</div><div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{expirySeconds > 0 ? `OTP expires in ${formatCountdown(expirySeconds)}` : "OTP expired"}</span><button type="button" className="font-semibold text-dailyveg-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dailyveg-500/35 disabled:text-slate-400 dark:text-dailyveg-300" onClick={handleResend} disabled={resendSeconds > 0 || isResending || otpVerifyForm.formState.isSubmitting}>{isResending ? "Sending…" : resendSeconds > 0 ? `Resend in ${formatCountdown(resendSeconds)}` : "Resend OTP"}</button></div><Button type="submit" className="w-full" disabled={otpVerifyForm.formState.isSubmitting || isResending}>{otpVerifyForm.formState.isSubmitting ? "Verifying…" : "Verify and sign in"}</Button><Button type="button" variant="ghost" className="w-full" onClick={handleChangePhone} disabled={otpVerifyForm.formState.isSubmitting || isResending}>Change Phone</Button></form>
            )}
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-slate-500">Access is restricted to authorized DailyVeg administrators.</p>
      </div>
    </main>
  );
}
