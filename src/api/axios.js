import axios from "axios";
import { ENDPOINTS } from "./endpoints";
import { clearAuth, getAccessToken, getAuth, setAuth } from "../lib/storage";
import { getDeviceId } from "../auth/device";
import {
  AUTH_UPDATED_EVENT,
  SESSION_EXPIRED_EVENT,
  dispatchAuthEvent,
} from "../auth/auth-events";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  config.headers = config.headers || {};

  if (token) config.headers.Authorization = `Bearer ${token}`;

  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  } else {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

let refreshPromise = null;

export function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const auth = getAuth();
  const refreshToken = auth?.tokens?.refresh_token;

  if (!refreshToken) {
    clearAuth();
    dispatchAuthEvent(SESSION_EXPIRED_EVENT);
    return Promise.reject(new Error("No refresh token available"));
  }

  refreshPromise = axios
    .post(
      `${import.meta.env.VITE_API_BASE_URL}${ENDPOINTS.auth.refresh}`,
      {
        refresh_token: refreshToken,
        device_id: getDeviceId(),
      },
      { headers: { "Content-Type": "application/json" } }
    )
    .then((response) => {
      const data = response?.data?.data;
      const accessToken = data?.access_token;

      if (!accessToken) throw new Error("Refresh response did not include an access token");

      const nextAuth = {
        ...auth,
        tokens: {
          ...auth.tokens,
          access_token: accessToken,
          access_expires_in_seconds: data?.access_expires_in_seconds,
        },
      };

      setAuth(nextAuth);
      dispatchAuthEvent(AUTH_UPDATED_EVENT);
      return accessToken;
    })
    .catch((error) => {
      clearAuth();
      dispatchAuthEvent(SESSION_EXPIRED_EVENT);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

const NO_REFRESH_ENDPOINTS = [
  ENDPOINTS.auth.consoleAccess,
  ENDPOINTS.auth.sendOtp,
  ENDPOINTS.auth.verifyOtp,
  ENDPOINTS.auth.refresh,
  ENDPOINTS.auth.logout,
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const canRefresh =
      error?.response?.status === 401 &&
      original &&
      !original._retry &&
      !NO_REFRESH_ENDPOINTS.some((endpoint) => original.url?.includes(endpoint));

    if (!canRefresh) return Promise.reject(error);

    original._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export default api;
