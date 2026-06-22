import api from "../axios";
import { ENDPOINTS } from "../endpoints";

const CONSOLE_ACCESS_ROLES = ["admin", "warehouse_manager"];

export class AccessDeniedError extends Error {
  constructor(message = "This account does not have admin or warehouse access.") {
    super(message);
    this.name = "AccessDeniedError";
    this.code = "ACCESS_DENIED";
  }
}

export async function loginWithPassword(payload) {

  return api.post(ENDPOINTS.auth.loginWithPassword, payload);

}

export async function checkConsoleAccess({ phone }) {
  try {
    const res = await api.post(ENDPOINTS.auth.consoleAccess, {
      phone,
      roles: CONSOLE_ACCESS_ROLES,
    });

    return res.data;
  } catch (e) {
    const code = e?.response?.data?.error?.code;
    const message = e?.response?.data?.error?.message;

    if (e?.response?.status === 403 || code === "ACCESS_DENIED") {
      throw new AccessDeniedError(message);
    }

    throw e;
  }
}

export async function sendOtp({ phone }) {
  const accessResp = await checkConsoleAccess({ phone });
  const roles = accessResp?.data?.roles || [];
  const hasAccess = accessResp?.data?.has_access ?? roles.some((role) => CONSOLE_ACCESS_ROLES.includes(role));

  if (!hasAccess) {
    throw new AccessDeniedError();
  }

  const res = await api.post(ENDPOINTS.auth.sendOtp, { phone, purpose: "login" });
  return res.data;
}

export async function verifyOtp({ otp_request_id, phone, otp }) {
  const device = {
    device_id: "web",
    device_name: navigator.userAgent,
  };
  const res = await api.post(ENDPOINTS.auth.verifyOtp, {
    otp_request_id,
    phone,
    otp,
    device,
    fcm_token: null,
  });
  return res.data;
}

export async function getMe() {
  const res = await api.get(ENDPOINTS.auth.me);
  return res.data;
}

export async function logout({ refresh_token }) {
  const res = await api.post(ENDPOINTS.auth.logout, { refresh_token });
  return res.data;
}
