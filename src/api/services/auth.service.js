import api from "../axios";
import { ENDPOINTS } from "../endpoints";
import { getDeviceId, getDeviceName } from "../../auth/device";
import { AUTHORIZED_ADMIN_ROLES, getPayloadRoles, hasAuthorizedAdminRole } from "../../auth/roles";

const ACCESS_DENIED_MESSAGE = "This account does not have access to the admin panel.";

export class AccessDeniedError extends Error {
  constructor() {
    super(ACCESS_DENIED_MESSAGE);
    this.name = "AccessDeniedError";
    this.code = "ACCESS_DENIED";
  }
}

export async function checkConsoleAccess({ phone }) {
  try {
    const res = await api.post(ENDPOINTS.auth.consoleAccess, {
      phone,
      roles: AUTHORIZED_ADMIN_ROLES,
    });

    return res.data;
  } catch (e) {
    const code = e?.response?.data?.error?.code;
    if (e?.response?.status === 403 || code === "ACCESS_DENIED") {
      throw new AccessDeniedError();
    }

    throw e;
  }
}

export async function sendOtp({ phone }) {
  const accessResp = await checkConsoleAccess({ phone });
  const roles = getPayloadRoles(accessResp);
  const hasAccess = accessResp?.data?.has_access === true || accessResp?.has_access === true;

  if (!hasAccess || (roles.length > 0 && !hasAuthorizedAdminRole(roles))) {
    throw new AccessDeniedError();
  }

  const res = await api.post(ENDPOINTS.auth.sendOtp, { phone, purpose: "login" });
  return res.data;
}

export async function verifyOtp({ otp_request_id, phone, otp }) {
  const device = {
    device_id: getDeviceId(),
    device_name: getDeviceName(),
  };
  const res = await api.post(ENDPOINTS.auth.verifyOtp, {
    otp_request_id,
    phone,
    otp,
    device,
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
