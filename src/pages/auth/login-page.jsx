import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { AccessDeniedError, sendOtp, verifyOtp } from "../../api/services/auth.service";
import { useAuth } from "../../auth/auth-context";
import { sendOtpSchema, verifyOtpSchema } from "../../validations/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import Image from "../../assets/logo-light-trans.png";
import ImageDark from "../../assets/logo-dark-trans.png";

const ACCESS_DENIED_MESSAGE = "This account does not have access to the admin panel.";

function useActiveThemeLogo() {
  const [isDark, setIsDark] = React.useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

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
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function getAuthErrorMessage(error, phase) {
  if (error instanceof AccessDeniedError || error?.code === "ACCESS_DENIED") {
    return ACCESS_DENIED_MESSAGE;
  }

  const status = error?.response?.status;
  if (phase === "send" && [401, 403, 404].includes(status)) return ACCESS_DENIED_MESSAGE;
  if (status === 403) return ACCESS_DENIED_MESSAGE;
  if (status === 429) return "Too many attempts. Please wait before trying again.";
  if (status >= 500) return "The login service is temporarily unavailable. Please try again.";

  if (phase === "verify" && (status === 400 || status === 401)) {
    return "The code is invalid or has expired. Request a new code and try again.";
  }

  if (status === 400) return "Check the phone number and try again.";
  return phase === "verify"
    ? "We could not verify the code. Please try again."
    : "We could not send a code. Please try again.";
}

export function LoginPage() {
  const logoSrc = useActiveThemeLogo();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const otpInputRef = React.useRef(null);
  const [step, setStep] = React.useState("phone");
  const [phone, setPhone] = React.useState("");
  const [otpRequestId, setOtpRequestId] = React.useState(null);
  const [expiresAt, setExpiresAt] = React.useState(0);
  const [resendAvailableAt, setResendAvailableAt] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());
  const [requestError, setRequestError] = React.useState("");
  const [isResending, setIsResending] = React.useState(false);

  const requestedDestination = location.state?.from;
  const destination =
    typeof requestedDestination === "string" && requestedDestination.startsWith("/")
      ? requestedDestination
      : "/";

  const phoneForm = useForm({
    resolver: zodResolver(sendOtpSchema),
    defaultValues: { phone: "" },
  });
  const otpForm = useForm({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp_request_id: "", phone: "", otp: "" },
  });

  React.useEffect(() => {
    if (isAuthenticated) navigate(destination, { replace: true });
  }, [destination, isAuthenticated, navigate]);

  React.useEffect(() => {
    if (step !== "otp") return undefined;

    otpInputRef.current?.focus();
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [step]);

  const expirySeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const otpRegistration = otpForm.register("otp");

  function applyOtpResponse(response, submittedPhone) {
    const data = response?.data;
    const requestId = data?.otp_request_id;
    const expiresInSeconds = Number(data?.expires_in_seconds);

    if (!requestId || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
      throw new Error("Invalid OTP response");
    }

    const timestamp = Date.now();
    setPhone(submittedPhone);
    setOtpRequestId(requestId);
    setExpiresAt(timestamp + expiresInSeconds * 1000);
    setResendAvailableAt(timestamp + Math.min(60, expiresInSeconds) * 1000);
    setNow(timestamp);
    otpForm.reset({ otp_request_id: requestId, phone: submittedPhone, otp: "" });
    setRequestError("");
    setStep("otp");
  }

  async function handleContinue(values) {
    setRequestError("");

    try {
      const response = await sendOtp(values);
      applyOtpResponse(response, values.phone);
    } catch (error) {
      setRequestError(getAuthErrorMessage(error, "send"));
    }
  }

  async function handleVerify(values) {
    setRequestError("");

    try {
      const response = await verifyOtp(values);
      login(response);
      navigate(destination, { replace: true });
    } catch (error) {
      const status = error?.response?.status;
      if (status === 400 || status === 401) {
        otpForm.setValue("otp", "", { shouldValidate: false });
        window.requestAnimationFrame(() => otpInputRef.current?.focus());
      }
      setRequestError(getAuthErrorMessage(error, "verify"));
    }
  }

  async function handleResend() {
    if (!phone || resendSeconds > 0 || isResending) return;
    setIsResending(true);
    setRequestError("");

    try {
      const response = await sendOtp({ phone });
      applyOtpResponse(response, phone);
    } catch (error) {
      setRequestError(getAuthErrorMessage(error, "send"));
    } finally {
      setIsResending(false);
    }
  }

  function handleChangePhone() {
    setStep("phone");
    setOtpRequestId(null);
    setExpiresAt(0);
    setResendAvailableAt(0);
    setRequestError("");
    otpForm.reset();
    window.requestAnimationFrame(() => phoneForm.setFocus("phone"));
  }

  return (
    <main className="flex min-h-screen items-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <img src={logoSrc} alt="FreshVeg" className="m-auto w-60" />
          <p className="mt-1 text-sm text-slate-500">Admin panel</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{step === "phone" ? "Sign in" : "Enter your code"}</CardTitle>
            <CardDescription>
              {step === "phone"
                ? "Use the Indian mobile number linked to your admin account."
                : `We sent an SMS code to ${maskPhone(phone)}.`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div aria-live="polite" aria-atomic="true">
              {requestError ? (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {requestError}
                </div>
              ) : null}
            </div>

            {step === "phone" ? (
              <form onSubmit={phoneForm.handleSubmit(handleContinue)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="phone">Indian mobile number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9876543210"
                    maxLength={12}
                    aria-invalid={Boolean(phoneForm.formState.errors.phone)}
                    aria-describedby={phoneForm.formState.errors.phone ? "phone-error" : "phone-help"}
                    {...phoneForm.register("phone")}
                  />
                  <p id="phone-help" className="text-xs text-slate-500">Enter 10 digits, or 12 digits beginning with 91.</p>
                  {phoneForm.formState.errors.phone ? (
                    <p id="phone-error" role="alert" className="text-xs text-red-600">
                      {phoneForm.formState.errors.phone.message}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" className="w-full" disabled={phoneForm.formState.isSubmitting}>
                  {phoneForm.formState.isSubmitting ? "Checking access…" : "Continue"}
                </Button>
              </form>
            ) : (
              <form onSubmit={otpForm.handleSubmit(handleVerify)} className="space-y-4" noValidate>
                <input type="hidden" {...otpForm.register("otp_request_id")} />
                <input type="hidden" {...otpForm.register("phone")} />

                <div className="space-y-2">
                  <Label htmlFor="otp">OTP or admin access code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="Enter 4–8 digits"
                    aria-invalid={Boolean(otpForm.formState.errors.otp)}
                    aria-describedby="otp-status otp-error"
                    {...otpRegistration}
                    ref={(element) => {
                      otpRegistration.ref(element);
                      otpInputRef.current = element;
                    }}
                  />
                  {otpForm.formState.errors.otp ? (
                    <p id="otp-error" role="alert" className="text-xs text-red-600">
                      {otpForm.formState.errors.otp.message}
                    </p>
                  ) : null}
                </div>

                <div id="otp-status" className="flex items-center justify-between text-xs text-slate-500">
                  <span>{expirySeconds > 0 ? `Code expires in ${formatCountdown(expirySeconds)}` : "Code expired"}</span>
                  <button
                    type="button"
                    className="font-semibold text-dailyveg-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-dailyveg-300"
                    onClick={handleResend}
                    disabled={resendSeconds > 0 || isResending || otpForm.formState.isSubmitting}
                  >
                    {isResending
                      ? "Sending…"
                      : resendSeconds > 0
                        ? `Resend in ${formatCountdown(resendSeconds)}`
                        : "Resend OTP"}
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting || isResending}>
                  {otpForm.formState.isSubmitting ? "Verifying…" : "Verify and Login"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleChangePhone}
                  disabled={otpForm.formState.isSubmitting || isResending}
                >
                  Change Phone
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Access is restricted to authorized FreshVeg administrators.
        </p>
      </div>
    </main>
  );
}
