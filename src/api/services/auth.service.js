import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export async function sendOtp({ phone }) {
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
